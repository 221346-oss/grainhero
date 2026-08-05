"""
rag_ingest.py — GrainHero RAG Custom Data Ingestion Pipeline
==============================================================
Phase 1 of the GrainHero Industrial RAG system.

This script is the FIRST custom component of the RAG pipeline.
It handles the complete data ingestion flow:

  1. Document Loading   — Reads PDFs, plain-text, Markdown, CSV files.
  2. Document Parsing   — Extracts raw text, preserving structural context.
  3. Data Cleaning      — Strips noise, normalizes whitespace, removes headers/footers.
  4. Semantic Chunking  — Splits text into overlapping, context-preserving chunks.
  5. Metadata Extraction— Tags each chunk with category, grain type, source file, page.
  6. Embedding          — Converts each chunk to a high-dimensional vector.
  7. Vector Storage     — Pushes chunks + vectors to Supabase (pgvector) with RLS.
  8. Audit Logging      — Records every ingestion run in rag_ingestion_log.

Usage:
    # Ingest a single file
    python rag_ingest.py --file path/to/silo_manual.pdf --category manual --tenant-id <UUID>

    # Ingest an entire directory
    python rag_ingest.py --dir path/to/docs/ --category protocol --tenant-id <UUID>

Environment Variables (same as existing ml-deploy setup):
    SUPABASE_URL              — Your Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY — Service-role key (bypasses RLS for writes)
    OPENAI_API_KEY            — OpenAI API key for text-embedding-3-small
                                (Set to 'local' to use HuggingFace instead)
    EMBEDDING_MODEL           — Optional override. Default: 'openai'
                                Use 'huggingface' for on-premise / private deployment.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Generator, List, Optional

import httpx

# ── Logging Configuration ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("rag_ingest")

# ── Environment ───────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "gemini").lower()

# ── Ingestion Configuration ───────────────────────────────────────────────────
CHUNK_SIZE = 512          # Max tokens per chunk (approximate word-based split)
CHUNK_OVERLAP = 64        # Overlap in words between consecutive chunks
EMBEDDING_BATCH_SIZE = 20 # Number of chunks to embed in one API call
MAX_RETRIES = 3           # Retry failed API calls this many times
RETRY_DELAY_SEC = 2.0     # Seconds to wait between retries

# Supabase REST headers
_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# =============================================================================
# Data Structures
# =============================================================================

@dataclass
class DocumentChunk:
    """
    Represents a single text chunk extracted from a document.
    This is the atomic unit that will be embedded and stored in the vector DB.
    """
    document_id: str
    document_title: str
    category: str
    tenant_id: str
    chunk_index: int
    chunk_content: str
    metadata: dict = field(default_factory=dict)
    embedding: Optional[List[float]] = None

    def to_supabase_row(self) -> dict:
        """Serializes the chunk to a dict ready for Supabase insert."""
        if self.embedding is None:
            raise ValueError(f"Chunk {self.chunk_index} has no embedding. Run embed() first.")
        return {
            "tenant_id":      self.tenant_id,
            "document_id":    self.document_id,
            "document_title": self.document_title,
            "category":       self.category,
            "chunk_index":    self.chunk_index,
            "chunk_content":  self.chunk_content,
            "metadata":       self.metadata,
            "embedding":      self.embedding,
        }


# =============================================================================
# Step 1 & 2: Document Loading & Parsing
# =============================================================================

class DocumentLoader:
    """
    Loads documents from disk and extracts raw text.
    Supports: .pdf, .txt, .md, .csv
    Designed to be extended with new file types easily.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv"}

    def load(self, file_path: Path) -> tuple[str, dict]:
        """
        Loads a file and returns (raw_text, base_metadata).
        Raises ValueError for unsupported file types.
        """
        ext = file_path.suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: '{ext}'. Supported: {self.SUPPORTED_EXTENSIONS}")

        logger.info("Loading file: %s", file_path.name)

        if ext == ".pdf":
            return self._load_pdf(file_path)
        elif ext in (".txt", ".md"):
            return self._load_text(file_path)
        elif ext == ".csv":
            return self._load_csv(file_path)
        else:
            raise ValueError(f"Handler not implemented for: {ext}")

    def _load_pdf(self, path: Path) -> tuple[str, dict]:
        """
        Extracts text from PDF using PyMuPDF (fitz).
        Preserves page numbers in metadata for traceability.
        """
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise ImportError("PyMuPDF not installed. Run: pip install pymupdf")

        doc = fitz.open(str(path))
        pages_text = []
        page_map = {}  # char_offset → page_number

        char_offset = 0
        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            page_map[char_offset] = page_num + 1
            pages_text.append(text)
            char_offset += len(text)

        full_text = "\n\n".join(pages_text)
        metadata = {
            "source_file":  path.name,
            "file_type":    "pdf",
            "total_pages":  len(doc),
            "file_hash":    self._hash_file(path),
        }
        doc.close()
        logger.info("PDF loaded: %d pages, %d chars", metadata["total_pages"], len(full_text))
        return full_text, metadata

    def _load_text(self, path: Path) -> tuple[str, dict]:
        """Loads plain text or Markdown files."""
        raw = path.read_text(encoding="utf-8", errors="replace")
        metadata = {
            "source_file": path.name,
            "file_type":   path.suffix.lstrip("."),
            "file_hash":   self._hash_file(path),
        }
        logger.info("Text file loaded: %d chars", len(raw))
        return raw, metadata

    def _load_csv(self, path: Path) -> tuple[str, dict]:
        """
        Converts CSV rows into readable natural language sentences.
        This makes CSV data searchable via semantic and keyword search.
        Example row: temperature=32.5, humidity=78, grain_type=wheat
        → "Sensor reading: grain_type=wheat, temperature=32.5, humidity=78"
        """
        import csv
        rows = []
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sentence = "Sensor reading: " + ", ".join(f"{k}={v}" for k, v in row.items())
                rows.append(sentence)

        full_text = "\n".join(rows)
        metadata = {
            "source_file": path.name,
            "file_type":   "csv",
            "total_rows":  len(rows),
            "file_hash":   self._hash_file(path),
        }
        logger.info("CSV loaded: %d rows → %d chars", len(rows), len(full_text))
        return full_text, metadata

    @staticmethod
    def _hash_file(path: Path) -> str:
        """SHA-256 hash of the file. Used to detect duplicate ingestions."""
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()


# =============================================================================
# Step 3: Data Cleaning & Preprocessing
# =============================================================================

class TextCleaner:
    """
    Cleans raw extracted text before chunking.
    Removes document artifacts that pollute the vector space:
      - Repeated whitespace and blank lines
      - Page numbers and headers/footers (common patterns)
      - Control characters and encoding artifacts
    """

    # Common PDF footer/header patterns to strip
    _NOISE_PATTERNS = [
        r"Page\s+\d+\s+of\s+\d+",   # "Page 1 of 24"
        r"^\s*\d+\s*$",              # Lone page numbers on their own line
        r"©\s*\d{4}.*$",             # Copyright lines
        r"www\.[^\s]+",              # URLs (often in footers)
        r"Confidential\s*[-–]?\s*.*$",  # "Confidential — Internal Use"
    ]

    def clean(self, text: str) -> str:
        """Applies all cleaning steps in sequence."""
        text = self._strip_noise(text)
        text = self._normalize_whitespace(text)
        text = self._remove_control_chars(text)
        return text.strip()

    def _strip_noise(self, text: str) -> str:
        """Removes header/footer artifacts using regex patterns."""
        for pattern in self._NOISE_PATTERNS:
            text = re.sub(pattern, "", text, flags=re.MULTILINE | re.IGNORECASE)
        return text

    def _normalize_whitespace(self, text: str) -> str:
        """Collapses multiple blank lines into a single blank line."""
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text

    def _remove_control_chars(self, text: str) -> str:
        """Removes non-printable control characters except newlines and tabs."""
        return re.sub(r"[^\x09\x0A\x0D\x20-\x7E\x80-\xFF]", "", text)


# =============================================================================
# Step 4: Semantic Text Chunking
# =============================================================================

class TextChunker:
    """
    Splits cleaned text into overlapping chunks suitable for embedding.

    Strategy: Word-based sliding window.
      - Splits by words (not characters) to avoid breaking mid-sentence on arbitrary offsets.
      - Overlap between consecutive chunks ensures that sentences crossing chunk
        boundaries are represented in at least one full chunk.
      - Each chunk targets ~CHUNK_SIZE words with CHUNK_OVERLAP words of shared context.

    Why not character-based or token-based?
      Character splits can cut mid-word. True token counting requires loading a
      tokenizer (slow). Word-based is a strong, fast approximation for production.
    """

    def __init__(self, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, text: str) -> List[str]:
        """Returns a list of text chunk strings."""
        words = text.split()
        chunks = []
        start = 0

        while start < len(words):
            end = start + self.chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words).strip()

            # Skip empty or very short chunks (likely whitespace artifacts)
            if len(chunk_text) >= 50:
                chunks.append(chunk_text)

            # Slide window forward, stepping back by 'overlap' to create overlap
            step = self.chunk_size - self.overlap
            start += max(1, step)  # Safety: always advance at least 1

        logger.info("Text chunked into %d chunks (size=%d, overlap=%d)",
                    len(chunks), self.chunk_size, self.overlap)
        return chunks


# =============================================================================
# Step 5: Metadata Extraction
# =============================================================================

class MetadataExtractor:
    """
    Extracts and enriches metadata for each chunk.
    Metadata is critical for:
      - Filtering by grain type, category, or date during retrieval.
      - Source attribution in the AI's generated answer.
      - Debugging and auditing ingestion quality.
    """

    # Known grain types in GrainHero
    GRAIN_TYPES = {"wheat", "rice", "maize", "sorghum", "barley"}

    def extract(self, chunk_text: str, base_metadata: dict,
                document_title: str, category: str) -> dict:
        """
        Enriches base file metadata with chunk-level insights.
        Returns the final metadata dict to attach to each DocumentChunk.
        """
        enriched = {**base_metadata}

        # Detect grain types mentioned in the chunk
        mentioned_grains = [
            g for g in self.GRAIN_TYPES
            if g in chunk_text.lower()
        ]
        if mentioned_grains:
            enriched["grain_types"] = mentioned_grains

        # Detect if this chunk appears to be a warning or critical instruction
        if any(kw in chunk_text.lower() for kw in ["warning", "danger", "critical", "do not", "must not"]):
            enriched["contains_warning"] = True

        enriched["document_title"] = document_title
        enriched["category"] = category
        enriched["word_count"] = len(chunk_text.split())

        return enriched


# =============================================================================
# Step 6: Embedding Generation
# =============================================================================

class EmbeddingEngine:
    """
    Converts text chunks into dense vectors (embeddings).

    Supports two providers:
      - 'gemini'      : Uses text-embedding-004 via Google API (768 dims). Fast, free tier.
      - 'openai'      : Uses text-embedding-3-small via OpenAI API (1536 dims).
      - 'huggingface' : Uses all-MiniLM-L6-v2 locally (384 dims).
    """

    def __init__(self, provider: str = EMBEDDING_MODEL):
        self.provider = provider
        self._hf_model = None  # Lazy-loaded only if provider='huggingface'
        logger.info("EmbeddingEngine initialized with provider: '%s'", provider)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if self.provider == "gemini":
            return self._embed_gemini(texts)
        elif self.provider == "openai":
            return self._embed_openai(texts)
        elif self.provider == "huggingface":
            return self._embed_huggingface(texts)
        else:
            raise ValueError(f"Unknown embedding provider: '{self.provider}'. Use 'gemini', 'openai' or 'huggingface'.")

    def _embed_gemini(self, texts: List[str]) -> List[List[float]]:
        """Calls Google Gemini Embeddings API (gemini-embedding-001, 1500 RPM free tier)."""
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

        embeddings = []
        with httpx.Client(timeout=30.0) as client:
            for i, text in enumerate(texts):
                for attempt in range(1, MAX_RETRIES + 1):
                    try:
                        resp = client.post(
                            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}",
                            headers={"Content-Type": "application/json"},
                            json={
                                "model": "models/gemini-embedding-001",
                                "content": {"parts": [{"text": text}]},
                                "outputDimensionality": 768,
                            },
                        )
                        resp.raise_for_status()
                        data = resp.json()
                        embeddings.append(data["embedding"]["values"])
                        break
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 429:
                            wait = 30 * attempt  # 30s, 60s, 90s
                            logger.warning(
                                "Rate limited (chunk %d, attempt %d/%d). Waiting %ds...",
                                i, attempt, MAX_RETRIES, wait,
                            )
                            if attempt < MAX_RETRIES:
                                time.sleep(wait)
                            else:
                                raise
                        else:
                            logger.warning(
                                "Gemini API error (chunk %d, attempt %d/%d): %s",
                                i, attempt, MAX_RETRIES, e.response.text[:300],
                            )
                            if attempt < MAX_RETRIES:
                                time.sleep(RETRY_DELAY_SEC * attempt)
                            else:
                                raise
        logger.debug("Gemini embedded %d texts", len(texts))
        return embeddings


    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Calls OpenAI Embeddings API with retry logic."""
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={
                            "Authorization": f"Bearer {OPENAI_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "text-embedding-3-small",
                            "input": texts,
                        },
                    )
                resp.raise_for_status()
                data = resp.json()
                # OpenAI returns embeddings sorted by index
                embeddings = [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
                logger.debug("OpenAI embedded %d texts (attempt %d)", len(texts), attempt)
                return embeddings

            except httpx.HTTPStatusError as e:
                logger.warning("OpenAI API error (attempt %d/%d): %s", attempt, MAX_RETRIES, e)
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SEC * attempt)
                else:
                    raise

    def _embed_huggingface(self, texts: List[str]) -> List[List[float]]:
        # Call HuggingFace Inference API to prevent local memory crashes
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            raise RuntimeError("HF_TOKEN environment variable is not set in run_rag_ingest.ps1.")

        api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
        headers = {"Authorization": f"Bearer {hf_token}"}

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(api_url, headers=headers, json={"inputs": texts})
                resp.raise_for_status()
                embeddings = resp.json()
                logger.debug("HuggingFace API embedded %d texts (attempt %d)", len(texts), attempt)
                return embeddings
            except httpx.HTTPStatusError as e:
                logger.warning("HuggingFace API error (attempt %d/%d): %s", attempt, MAX_RETRIES, e.response.text[:300])
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_SEC * attempt)
                else:
                    raise


# =============================================================================
# Step 7: Vector Storage — Push to Supabase
# =============================================================================

class SupabaseVectorStore:
    """
    Pushes embedded DocumentChunks to Supabase (rag_knowledge_base table).
    Uses the service_role key which bypasses RLS — this is intentional for
    the backend ingestion script. The RLS policies protect the frontend/user.
    Batches inserts to avoid request size limits.
    """

    INSERT_BATCH_SIZE = 50  # Max rows per Supabase REST insert

    def insert_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Inserts all chunks into Supabase in batches.
        Returns the total number of successfully inserted rows.
        """
        total_inserted = 0
        batch_count = 0

        for i in range(0, len(chunks), self.INSERT_BATCH_SIZE):
            batch = chunks[i : i + self.INSERT_BATCH_SIZE]
            rows = [c.to_supabase_row() for c in batch]
            batch_count += 1

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    with httpx.Client(timeout=30.0) as client:
                        resp = client.post(
                            f"{SUPABASE_URL}/rest/v1/rag_knowledge_base",
                            headers=_HEADERS,
                            json=rows,
                        )
                        resp.raise_for_status()
                    total_inserted += len(batch)
                    logger.info("Batch %d: inserted %d chunks (%d total so far)",
                                batch_count, len(batch), total_inserted)
                    break

                except httpx.HTTPStatusError as e:
                    logger.warning("Supabase insert error (attempt %d/%d): %s",
                                   attempt, MAX_RETRIES, e.response.text[:300])
                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY_SEC * attempt)
                    else:
                        logger.error("Batch %d failed permanently. Skipping.", batch_count)

        return total_inserted

    def log_ingestion(self, log_row: dict) -> None:
        """Writes a record to rag_ingestion_log. Fire-and-forget."""
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    f"{SUPABASE_URL}/rest/v1/rag_ingestion_log",
                    headers=_HEADERS,
                    json=log_row,
                )
                resp.raise_for_status()
        except Exception as exc:
            logger.warning("Failed to write ingestion log: %s", exc)

    def update_ingestion_log(self, log_id_hint: dict, updates: dict) -> None:
        """Patches an existing rag_ingestion_log row."""
        try:
            params = {k: f"eq.{v}" for k, v in log_id_hint.items()}
            with httpx.Client(timeout=10.0) as client:
                resp = client.patch(
                    f"{SUPABASE_URL}/rest/v1/rag_ingestion_log",
                    headers={**_HEADERS, "Prefer": "return=minimal"},
                    params=params,
                    json=updates,
                )
                resp.raise_for_status()
        except Exception as exc:
            logger.warning("Failed to update ingestion log: %s", exc)


# =============================================================================
# Step 8: Master Orchestrator — Ingest Pipeline
# =============================================================================

class RAGIngestionPipeline:
    """
    Orchestrates all 7 stages of the Data Ingestion pipeline in sequence.
    This is the main entry point for ingesting any document into GrainHero RAG.
    """

    def __init__(self):
        self.loader    = DocumentLoader()
        self.cleaner   = TextCleaner()
        self.chunker   = TextChunker()
        self.meta_extractor = MetadataExtractor()
        self.embedder  = EmbeddingEngine()
        self.store     = SupabaseVectorStore()

    def ingest_file(
        self,
        file_path: Path,
        tenant_id: str,
        category: str,
        document_title: Optional[str] = None,
    ) -> dict:
        """
        Full ingestion pipeline for a single file.
        Returns a summary dict with status and stats.
        """
        start_time = time.time()
        document_id = str(uuid.uuid4())
        title = document_title or file_path.stem.replace("_", " ").title()

        # Log ingestion start
        log_filter = {"document_id": document_id}
        self.store.log_ingestion({
            "tenant_id":      tenant_id,
            "document_id":    document_id,
            "document_title": title,
            "source_file":    file_path.name,
            "category":       category,
            "status":         "running",
        })

        try:
            # ── Stage 1 & 2: Load + Parse ─────────────────────────────────────
            logger.info("=== [1/7] Loading: %s ===", file_path.name)
            raw_text, base_metadata = self.loader.load(file_path)
            base_metadata["tenant_id"] = tenant_id

            # ── Stage 3: Clean ────────────────────────────────────────────────
            logger.info("=== [2/7] Cleaning text ===")
            cleaned_text = self.cleaner.clean(raw_text)

            # ── Stage 4: Chunk ────────────────────────────────────────────────
            logger.info("=== [3/7] Chunking text ===")
            chunks_text = self.chunker.chunk(cleaned_text)

            # ── Stage 5: Metadata Extraction ──────────────────────────────────
            logger.info("=== [4/7] Extracting metadata for %d chunks ===", len(chunks_text))
            doc_chunks: List[DocumentChunk] = []
            for idx, text in enumerate(chunks_text):
                meta = self.meta_extractor.extract(text, base_metadata, title, category)
                doc_chunks.append(DocumentChunk(
                    document_id    = document_id,
                    document_title = title,
                    category       = category,
                    tenant_id      = tenant_id,
                    chunk_index    = idx,
                    chunk_content  = text,
                    metadata       = meta,
                ))

            # ── Stage 6: Embed ────────────────────────────────────────────────
            logger.info("=== [5/7] Generating embeddings (batch_size=%d) ===", EMBEDDING_BATCH_SIZE)
            for batch_start in range(0, len(doc_chunks), EMBEDDING_BATCH_SIZE):
                batch = doc_chunks[batch_start : batch_start + EMBEDDING_BATCH_SIZE]
                texts = [c.chunk_content for c in batch]
                embeddings = self.embedder.embed_batch(texts)
                for chunk, emb in zip(batch, embeddings):
                    chunk.embedding = emb
                logger.info("  Embedded chunks %d–%d",
                            batch_start, batch_start + len(batch) - 1)

            # ── Stage 7: Store ────────────────────────────────────────────────
            logger.info("=== [6/7] Storing %d chunks in Supabase ===", len(doc_chunks))
            total_stored = self.store.insert_chunks(doc_chunks)

            # ── Stage 8: Audit Log ────────────────────────────────────────────
            duration = round(time.time() - start_time, 2)
            logger.info("=== [7/7] Ingestion complete: %d chunks stored in %.2fs ===",
                        total_stored, duration)
            self.store.update_ingestion_log(log_filter, {
                "status":           "success",
                "total_chunks":     total_stored,
                "duration_seconds": duration,
                "completed_at":     "now()",
            })

            return {
                "status":        "success",
                "document_id":   document_id,
                "document_title":title,
                "total_chunks":  total_stored,
                "duration_sec":  duration,
            }

        except Exception as exc:
            duration = round(time.time() - start_time, 2)
            logger.error("Ingestion FAILED for '%s': %s", file_path.name, exc, exc_info=True)
            self.store.update_ingestion_log(log_filter, {
                "status":           "failed",
                "fail_reason":      str(exc)[:500],
                "duration_seconds": duration,
                "completed_at":     "now()",
            })
            return {"status": "failed", "error": str(exc)}

    def ingest_directory(self, dir_path: Path, tenant_id: str, category: str) -> List[dict]:
        """Ingests all supported files in a directory. Returns a list of result summaries."""
        results = []
        files = [
            f for f in dir_path.iterdir()
            if f.is_file() and f.suffix.lower() in DocumentLoader.SUPPORTED_EXTENSIONS
        ]
        logger.info("Found %d supported files in '%s'", len(files), dir_path)

        for file_path in files:
            logger.info("─── Ingesting: %s ───", file_path.name)
            result = self.ingest_file(file_path, tenant_id, category)
            results.append(result)

        logger.info("Directory ingestion done. %d/%d files succeeded.",
                    sum(1 for r in results if r["status"] == "success"), len(results))
        return results


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="GrainHero RAG — Industrial Data Ingestion Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Ingest a single PDF:
    python rag_ingest.py --file docs/silo_manual.pdf --category manual --tenant-id <UUID>

  Ingest all files in a folder:
    python rag_ingest.py --dir docs/ --category protocol --tenant-id <UUID>

  Use HuggingFace embeddings (fully private, no API key needed):
    EMBEDDING_MODEL=huggingface python rag_ingest.py --file report.pdf --category report --tenant-id <UUID>
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", type=Path, help="Path to a single document file.")
    group.add_argument("--dir",  type=Path, help="Path to a directory of documents.")
    parser.add_argument("--category",  required=True,
                        choices=["manual", "protocol", "report", "guideline", "sensor_log", "other"],
                        help="Document category for metadata tagging.")
    parser.add_argument("--tenant-id", required=True,
                        help="UUID of the farm/organization this document belongs to.")
    parser.add_argument("--title", default=None,
                        help="Optional custom document title (overrides filename).")
    args = parser.parse_args()

    pipeline = RAGIngestionPipeline()

    if args.file:
        if not args.file.exists():
            logger.error("File not found: %s", args.file)
            sys.exit(1)
        result = pipeline.ingest_file(args.file, args.tenant_id, args.category, args.title)
        print("\n✅ Ingestion Result:", json.dumps(result, indent=2))

    elif args.dir:
        if not args.dir.is_dir():
            logger.error("Directory not found: %s", args.dir)
            sys.exit(1)
        results = pipeline.ingest_directory(args.dir, args.tenant_id, args.category)
        print("\n✅ Ingestion Summary:")
        for r in results:
            status_icon = "✅" if r["status"] == "success" else "❌"
            print(f"  {status_icon} {r.get('document_title', 'unknown')} — {r['status']}")


if __name__ == "__main__":
    main()
