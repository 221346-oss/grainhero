-- =============================================================================
-- GrainHero RAG — Knowledge Base Schema
-- Run in: Supabase SQL Editor → Run
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- Prerequisites: pgvector extension must be enabled in your Supabase project.
--   Go to: Database → Extensions → Search "vector" → Enable
-- =============================================================================

-- ── 0. Enable pgvector ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1. knowledge_base ────────────────────────────────────────────────────────
-- Stores text chunks from all ingested documents alongside their vector
-- embeddings. Each row belongs to exactly one tenant (farm/organization).
-- The embedding column uses 768 dimensions (Gemini gemini-embedding-001, 1500 RPM free tier).
-- If using OpenAI (text-embedding-3-small), change to vector(1536).
CREATE TABLE IF NOT EXISTS rag_knowledge_base (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,   -- enforces strict multi-tenancy
    document_id     UUID        NOT NULL,   -- groups chunks from the same file
    document_title  TEXT        NOT NULL,
    category        TEXT        NOT NULL,   -- e.g. 'manual', 'protocol', 'report'
    chunk_index     INTEGER     NOT NULL,   -- 0-based position of chunk in source doc
    chunk_content   TEXT        NOT NULL,   -- raw text of the chunk
    metadata        JSONB       DEFAULT '{}'::JSONB,
    -- e.g. {"source_file": "silo_manual.pdf", "page": 4, "grain_type": "wheat"}
    embedding       VECTOR(768) NOT NULL,  -- dense embedding vector
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. HNSW index ────────────────────────────────────────────────────────────
-- HNSW is preferred over IVFFlat: no training step, superior recall & speed.
-- cosine distance (vector_cosine_ops) works best with normalized embeddings
-- from OpenAI / HuggingFace sentence-transformers.
CREATE INDEX IF NOT EXISTS idx_rag_kb_embedding_hnsw
    ON rag_knowledge_base
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ── 3. Full-Text Search index (for the sparse / lexical search path) ─────────
-- This powers the BM25-style keyword search in the hybrid retrieval strategy.
CREATE INDEX IF NOT EXISTS idx_rag_kb_fts
    ON rag_knowledge_base
    USING GIN (to_tsvector('english', chunk_content));

-- ── 4. Tenant lookup index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rag_kb_tenant
    ON rag_knowledge_base (tenant_id, created_at DESC);

-- ── 5. Row-Level Security ─────────────────────────────────────────────────────
-- Service role (used by our Python ingestion script) bypasses RLS.
-- Authenticated users can ONLY read chunks that belong to their own tenant.
ALTER TABLE rag_knowledge_base ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Service role: full access (Python backend uses this key)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'rag_knowledge_base'
          AND policyname = 'rag_service_role_all'
    ) THEN
        CREATE POLICY "rag_service_role_all"
            ON rag_knowledge_base
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;

    -- Authenticated users: read-only, own tenant ONLY
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'rag_knowledge_base'
          AND policyname = 'rag_authenticated_read_own_tenant'
    ) THEN
        CREATE POLICY "rag_authenticated_read_own_tenant"
            ON rag_knowledge_base
            FOR SELECT
            TO authenticated
            USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
    END IF;
END $$;

-- ── 6. Ingestion audit log ─────────────────────────────────────────────────────
-- Tracks every ingestion run: file name, how many chunks, how long it took.
-- Useful for debugging and monitoring the ingestion pipeline.
CREATE TABLE IF NOT EXISTS rag_ingestion_log (
    id              BIGSERIAL   PRIMARY KEY,
    tenant_id       UUID        NOT NULL,
    document_id     UUID        NOT NULL,
    document_title  TEXT        NOT NULL,
    source_file     TEXT        NOT NULL,
    category        TEXT        NOT NULL,
    total_chunks    INTEGER     NOT NULL DEFAULT 0,
    status          TEXT        NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'failed'
    fail_reason     TEXT,
    duration_seconds REAL,
    ingested_at     TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

ALTER TABLE rag_ingestion_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'rag_ingestion_log'
          AND policyname = 'rag_log_service_role_all'
    ) THEN
        CREATE POLICY "rag_log_service_role_all"
            ON rag_ingestion_log
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'rag_ingestion_log'
          AND policyname = 'rag_log_authenticated_read'
    ) THEN
        CREATE POLICY "rag_log_authenticated_read"
            ON rag_ingestion_log
            FOR SELECT
            TO authenticated
            USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);
    END IF;
END $$;

-- ── 7. RPC: match_documents (Dense / Semantic Search) ─────────────────────────
-- Called by the retrieval script to find semantically similar chunks.
-- Filters by tenant_id BEFORE the vector search for security & performance.
-- Parameters:
--   query_embedding : the embedded user query vector
--   query_tenant_id : the user's tenant — hard filter, no leakage possible
--   match_threshold : minimum cosine similarity score (0.0 – 1.0), e.g. 0.75
--   match_count     : max number of results to return, e.g. 20
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding  VECTOR(768),
    query_tenant_id  UUID,
    match_threshold  FLOAT  DEFAULT 0.75,
    match_count      INT    DEFAULT 20
)
RETURNS TABLE (
    id             UUID,
    document_title TEXT,
    category       TEXT,
    chunk_content  TEXT,
    metadata       JSONB,
    similarity     FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        kb.id,
        kb.document_title,
        kb.category,
        kb.chunk_content,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM rag_knowledge_base kb
    WHERE
        kb.tenant_id = query_tenant_id
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ── 8. RPC: keyword_search (Sparse / Lexical Search) ──────────────────────────
-- Called by the retrieval script to find exact keyword matches (BM25-style).
-- Complements match_documents in the Hybrid Search strategy.
CREATE OR REPLACE FUNCTION keyword_search(
    query_text       TEXT,
    query_tenant_id  UUID,
    match_count      INT DEFAULT 20
)
RETURNS TABLE (
    id             UUID,
    document_title TEXT,
    category       TEXT,
    chunk_content  TEXT,
    metadata       JSONB,
    rank           FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        kb.id,
        kb.document_title,
        kb.category,
        kb.chunk_content,
        kb.metadata,
        ts_rank_cd(
            to_tsvector('english', kb.chunk_content),
            plainto_tsquery('english', query_text)
        ) AS rank
    FROM rag_knowledge_base kb
    WHERE
        kb.tenant_id = query_tenant_id
        AND to_tsvector('english', kb.chunk_content) @@ plainto_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT match_count;
$$;
