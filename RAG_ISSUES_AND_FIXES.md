# GrainHero RAG — Issues, Fixes & Pending Decisions

**Date:** August 2026  
**Files affected:** `rag/rag_agent.py`, `rag/rag_retrieval.py`, `src/components/AIAssistant.tsx`  
**Status key:** ✅ Fixed | 🔴 Critical pending | 🟠 High pending | 🟡 Medium pending | 🟢 Low pending

---

## FIXED ISSUES (already done, no action needed)

---

### ✅ F1 — Hardcoded secrets in source code
**File:** `rag_agent.py`, `rag_retrieval.py`  
**What was wrong:**
```python
# Old code — real credentials visible to anyone reading the file
SUPABASE_KEY = os.getenv("KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6LLHE...")
```
Anyone who reads the code, forks the repo, or sees a git commit gets the Supabase service role key — which has full admin access to the entire database, bypassing all Row Level Security.

**What was done:**
- Removed all hardcoded fallback values
- Added startup validation — if any required env var is missing, the server crashes immediately with a clear error message ("fail fast" pattern)

---

### ✅ F3 — Broken Gemini model name + URL built at import time
**File:** `rag_agent.py`  
**What was wrong:**
```python
# "gemini-flash-latest" is not a real model name — causes silent API failures
# URL built at module level = uses stale GEMINI_API_KEY if env loaded late
GEMINI_GEN_URL = "https://.../gemini-flash-latest:generateContent?key=" + GEMINI_API_KEY
```

**What was done:**
- Changed to `gemini-2.0-flash` (real, stable model name)
- Moved URL construction inside `call_gemini()` function so it always uses the current key value

---

### ✅ F4 — Intent classifier too rigid / wrong triggers
**File:** `rag_agent.py`  
**What was wrong:**
- `"silo"`, `"now"`, `"today"` in LIVE_DATA_TRIGGERS caused "what is a silo?" to trigger a live Supabase query unnecessarily
- Knowledge base was only queried when specific keywords matched — missed many valid grain questions

**What was done:**
- Knowledge base is now **always** queried (cheap, almost always useful)
- Live triggers narrowed to genuinely real-time phrases only ("right now", "current reading", etc.)

---

### ✅ F5 — Telemetry not filtered by tenant
**File:** `rag_agent.py`  
**What was wrong:**
```python
# Fetched last 5 readings from the ENTIRE table — no tenant filter
supabase.table("sensor_readings").select("*").order("created_at", desc=True).limit(5)
```
In a multi-tenant system (multiple farms), one user could see another farm's sensor data.

**What was done:**
- Added `.eq("admin_id", tenant_id)` filter to all telemetry queries

---

### ✅ F7 — match_threshold too low (0.3)
**File:** `rag_retrieval.py`  
**What was wrong:**
`match_threshold=0.3` means "return any chunk with at least 30% similarity" — this returns many irrelevant chunks as noise in the AI's context.

**What was done:**
- Changed to `0.55` — only return chunks with ≥55% cosine similarity to the query

---

### ✅ F8 — Conflicting prompt instructions
**File:** `rag_agent.py`  
**What was wrong:**
- `SYSTEM_PROMPT` said: "refuse off-topic questions"
- `build_prompt` said: "Never refuse to answer grain science facts"
- Two opposing instructions — Gemini followed whichever one came last

**What was done:**
- Removed "Never refuse" from `build_prompt`
- Out-of-scope handling is now only in `SYSTEM_PROMPT` where it belongs

---

### ✅ F9 — Chunk truncated at 600 chars + hardcoded output tokens
**File:** `rag_agent.py`  
**What was wrong:**
```python
text = chunk.get("chunk_content", "").strip()[:600]  # cuts 80% of chunk content
"maxOutputTokens": 1024  # hardcoded for every question regardless of complexity
```

**What was done:**
- Removed `[:600]` truncation — full chunk content is now sent
- `maxOutputTokens` is now dynamic:
  - 512 for simple questions
  - 768 when live sensor data is present
  - 1024 for complex/multi-part questions

---

### ✅ F0 — Chatbot answering out-of-scope questions (grades, personal topics)
**File:** `rag_agent.py`  
**What was wrong:**
System prompt said "answer small talk in a friendly way" — Gemini interpreted this as permission to answer anything.

**What was done:**
- Added explicit SCOPE section (what it CAN answer)
- Added explicit OUT OF SCOPE section with exact fallback response text
- Removed "answer small talk" from personality

---

## PENDING ISSUES (not fixed yet — ask sir)

---

### 🟠 P1 — No conversation memory (stateless chatbot)
**File:** `rag_agent.py`, `src/components/AIAssistant.tsx`  
**Severity:** High  

**What's wrong:**
Every message is processed as a completely fresh query. The AI has zero memory of the current conversation.

```
User: "What's safe storage temperature for wheat?"
Bot:  "15°C is ideal for long-term wheat storage."

User: "What about rice?"        ← user means "what temperature for rice"
Bot:  Processes as new query, has no idea what "about" refers to
```

This makes multi-turn conversations confusing and frustrating for users.

**Solution options:**

**Option A — Pass last N messages to Gemini** ⭐ RECOMMENDED
- Keep the last 5-10 messages in the frontend (`AIAssistant.tsx`)
- Send them as Gemini's `contents` array (it supports multi-turn natively)
- Backend receives `{ query, history: [{role, content}...], tenant_id }`
- Gemini understands "what about rice?" in context of previous message
- Cost: slightly larger API payload per request
- Complexity: Low

**Option B — Store conversation history in Supabase**
- Create a `chat_sessions` table in Supabase
- Every message saved with session_id, user_id, role, content, timestamp
- Agent fetches last N messages from DB on each query
- Pros: persistent history across browser refreshes, visible in admin panel
- Cons: extra DB round-trip per query, needs new table/migration
- Complexity: Medium

**Option C — Use Gemini's built-in context caching**
- For long conversations, Gemini allows caching system prompt + history
- Reduces token costs for repeated context
- Complexity: High (requires Gemini API Pro plan)

> **My recommendation: Option A**
> 
> The history already lives in `AIAssistant.tsx` (the `messages` state array) — we just need to send the last 6 messages along with the query. Zero new infrastructure, zero new database tables, and Gemini's multi-turn API is specifically built for this. Option B is better for a production SaaS where admins need to audit conversations, but for the current stage it's over-engineering. Option C requires a paid plan and is only worth it at scale (1000+ daily queries).
>
> **Sir's decision needed:** Is conversation audit/history in the admin panel a requirement? If yes → Option B. If no → Option A.

---

### 🟡 P2 — New Supabase connection created on every query
**File:** `rag_agent.py`  
**Severity:** Medium  

**What's wrong:**
```python
# Called on EVERY single user message — 3 new DB connections per query
def tool_query_knowledge_base(...):
    retriever = HybridRetriever()          # new Supabase connection
    
def tool_get_live_telemetry(...):
    supabase = create_client(URL, KEY)     # new Supabase connection

def tool_get_actuator_status(...):
    supabase = create_client(URL, KEY)     # new Supabase connection
```

Under load (many simultaneous users), this creates a large number of database connections and slows down response time.

**Solution options:**

**Option A — Connection pooling on GrainHeroAgent (recommended)**
- Create one `HybridRetriever` and one `supabase` client per `GrainHeroAgent` instance
- Store as `self.retriever` and `self.supabase` 
- `GrainHeroAgent` is already created per request in `app.py` — this is minimal change
- Complexity: Low

**Option B — Module-level singleton clients**
- Create Supabase client once at module load and reuse globally
- Risk: not thread-safe if FastAPI uses multiple workers
- Complexity: Low but risky

**Option C — Supabase connection pool (PgBouncer)**
- Configure connection pooling at the Supabase/database level
- Handles hundreds of connections efficiently
- Complexity: Infrastructure change (Supabase dashboard setting)

> **My recommendation: Option A**
>
> It's a 5-minute code change — move client creation into `__init__` instead of inside every tool function. Option B risks race conditions if FastAPI runs with multiple workers (which Render does in production). Option C (PgBouncer) is a good production optimization but it solves a different problem — fix the code first, then optimize infrastructure later.

---

### 🟡 P3 — arXiv harvester pulls irrelevant papers
**File:** `rag/rag_harvester.py`  
**Severity:** Medium  

**What's wrong:**
arXiv searches `"grain storage hotspot temperature detection"` and returns physics papers about grain boundaries in metal crystals — completely unrelated to agriculture.

Examples of bad downloads:
- `"Motion of grain boundaries incorporating dislocation structure"` — material science
- `"Coarse-Grained Finite-Temperature Theory for the Condensate"` — quantum physics
- `"Writhing Dynamics of Cables with Self-contact"` — mechanical engineering

These get ingested into the knowledge base and pollute the chatbot's context.

**Solution options:**

**Option A — Add arXiv category filter (recommended)**
- arXiv has subject categories: `cs.SY` (systems), `eess.SP` (signal processing), `q-bio.QM` (quantitative biology)
- Change search: `cat:cs.SY+OR+cat:eess.SP+AND+all:grain+storage`
- Filters out pure physics/math papers
- Complexity: Low (just change the URL parameter)

**Option B — Post-download relevance check**
- After downloading each PDF, check if its text contains at least N grain-related keywords
- If not relevant → delete the file + log it
- Complexity: Low

**Option C — Remove arXiv entirely, use only CORE + Semantic Scholar**
- CORE and Semantic Scholar both filter by field of study
- arXiv is a preprint server — quality varies widely for agricultural topics
- Simplest solution
- Complexity: Trivial (just remove arXiv from sources list)

> **My recommendation: Option B (post-download relevance check)**
>
> Option A (category filters) sounds good but arXiv's categories don't map cleanly to grain agriculture — you'd still get some noise. Option C (remove arXiv entirely) would lose genuinely useful IoT and ML papers like the ones already in the knowledge base. Option B is the most robust: download the PDF, extract first 500 words, check if it contains at least 2 grain-related keywords (wheat, rice, maize, silo, grain, storage, moisture, mycotoxin, etc.). If not — delete it. This catches irrelevant papers regardless of source, not just arXiv.

---

### 🟡 P4 — No deduplication of knowledge base chunks
**File:** `rag/rag_ingest.py`  
**Severity:** Medium  

**What's wrong:**
If you run `npm run ingest` twice on the same file (or the same paper appears from two different sources), duplicate chunks get inserted into Supabase. The chatbot then retrieves the same content twice in the same response.

The current skip logic checks document title but:
1. Title matching is case-insensitive but not fuzzy — "Managing Stored Grain" vs "Managing Stored Grain v2" would both get ingested
2. If you delete and re-add a document, it creates duplicate entries

**Solution options:**

**Option A — Hash-based deduplication (recommended)**
- SHA-256 hash of file content stored in Supabase alongside chunks
- Before ingesting, check if a document with the same hash already exists
- Identical file = skip entirely
- Changed file (updated version) = delete old chunks + ingest new
- Complexity: Low

**Option B — Unique constraint on (tenant_id, document_title, chunk_index)**
- Add a PostgreSQL UNIQUE constraint to the `rag_knowledge_base` table
- INSERT fails silently on duplicates (use `ON CONFLICT DO NOTHING`)
- Complexity: Low (one SQL migration)

> **My recommendation: Option B (unique constraint)**
>
> Option A (file hash) is more thorough but requires storing the hash somewhere and doing a lookup before every ingest. Option B is a database-level guarantee — you literally cannot insert duplicates, no matter what the application code does. One SQL migration, zero application code change, and it's permanent. This is the more robust solution because it protects against bugs in the application logic too.

---

### 🟢 P5 — No logging of what chunks were retrieved per query
**File:** `rag/rag_agent.py`  
**Severity:** Low  

**What's wrong:**
When the chatbot gives a bad answer, there's no way to debug which chunks it retrieved, how relevant they were, or why it made the answer it did. You can only see the final output.

**Solution options:**

**Option A — Log retrieved chunks to console (quick)**
```python
logger.info("Retrieved chunks: %s", [c['document_title'] for c in knowledge_chunks])
```
- Complexity: Trivial

**Option B — Store query + retrieved chunks in Supabase (proper)**
- Create `rag_query_log` table
- Every query: save `{query, tenant_id, chunks_retrieved, answer, duration, timestamp}`
- Enables admin panel showing "what did the AI use to answer this?"
- Complexity: Low-Medium

> **My recommendation: Option A now, Option B later**
>
> Start with Option A (console logging) — it takes 2 minutes and immediately helps debug bad answers during development. Option B (Supabase logging) is the right long-term solution for production because it lets you build an admin panel showing "what did users ask?" and "which papers did the AI use?". This is valuable for improving the system over time. Do Option A now, upgrade to Option B before the final demo.

---

### 🟢 P6 — Gemini embedding API called one chunk at a time
**File:** `rag/rag_ingest.py`  
**Severity:** Low (performance only)  

**What's wrong:**
The Gemini embedding API is called in a loop, one chunk at a time:
```python
for i, text in enumerate(texts):
    resp = client.post(GEMINI_EMBED_URL, json={"content": {"parts": [{"text": text}]}})
```

This means for a 30-chunk document = 30 separate HTTP requests. That's why ingestion is slow and hits rate limits frequently.

**Solution options:**

**Option A — Use Gemini batch embedding endpoint**
- Gemini has a `batchEmbedContents` endpoint that embeds multiple texts in one request
- 20 chunks → 1 HTTP request instead of 20
- 20x fewer API calls, 10-15x faster ingestion
- Complexity: Low (change one function)

**Option B — Parallel embedding with asyncio**
- Run multiple embedding calls concurrently
- Risk: more likely to hit rate limits
- Complexity: Medium

> **My recommendation: Option A (batch embedding)**
>
> The Gemini `batchEmbedContents` endpoint is specifically designed for this use case. It takes an array of texts and returns all embeddings in one HTTP round-trip. This directly fixes the root cause: too many API calls. Option B (asyncio parallelism) would make things faster but also more likely to trigger rate limits — you'd be firing 20 requests simultaneously instead of one batch request. Option A is cleaner, faster, and friendlier to the API quota. Do this before deploying to Render since ingestion currently takes 30-60 minutes for 42 documents — with batching it would take 5-10 minutes.

---

## QUESTIONS FOR SIR

1. **Conversation memory (P1):** Should chat history be stored in Supabase (persistent, survives refresh) or just kept in the browser during the session (simpler)?

2. **arXiv noise (P3):** Should we remove arXiv as a source entirely, or add category filters? (arXiv has great IoT/ML papers but poor agriculture coverage)

3. **Query logging (P5):** Should every chatbot query be logged to Supabase so admins can see what users asked and how the AI answered?

4. **Batch embedding (P6):** Is it worth refactoring ingestion to use batch embedding (10x faster) before deploying to Render?

---

## FILE REFERENCE

| Issue | File | Line area |
|---|---|---|
| F1 secrets | `rag_agent.py` line ~45, `rag_retrieval.py` line ~30 | Fixed |
| F3 model name | `rag_agent.py` `call_gemini()` | Fixed |
| F4 intent | `rag_agent.py` `IntentClassifier` class | Fixed |
| F5 tenant filter | `rag_agent.py` `tool_get_live_telemetry()` | Fixed |
| F7 threshold | `rag_retrieval.py` `dense_search()` | Fixed |
| F8 prompt conflict | `rag_agent.py` `build_prompt()` | Fixed |
| F9 truncation | `rag_agent.py` `assemble_context()` + `call_gemini()` | Fixed |
| P1 memory | `rag_agent.py` `GrainHeroAgent.run()` + `AIAssistant.tsx` | Pending |
| P2 connections | `rag_agent.py` tool functions | Pending |
| P3 arXiv noise | `rag_harvester.py` `search_arxiv()` | Pending |
| P4 deduplication | `rag_ingest.py` `ingest_directory()` | Pending |
| P5 query logging | `rag_agent.py` `GrainHeroAgent.run()` | Pending |
| P6 batch embedding | `rag_ingest.py` `EmbeddingEngine._embed_gemini()` | Pending |
