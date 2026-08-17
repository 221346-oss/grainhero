# GrainHero — ML Internee Complete Guide & Tasks
**Prepared by:** Atif Nazir (Owner) | **Last Updated:** 2026-08-17
**Your Branch:** `Ai/Ml-Branch` | **Your Scope:** `ml-deploy/rag/`, `scripts/`, `ml-deploy/fast_retrain.py`

---

## 📌 SECTION 1: PROJECT STATE — WHERE WE ARE RIGHT NOW

This document tells you exactly what has been built, what has been merged, what the current structure looks like, and what you need to do next.

### What's Live in the Codebase Now

```
GrainHero_latest/
├── ml-deploy/
│   ├── app.py                  ← Owner-managed. Core FastAPI inference server.
│   │                             DO NOT touch lines 1–100 (startup logic).
│   │                             Add new endpoints ONLY at the bottom of the file.
│   ├── hot_swap.py             ← Owner-managed. Polls Supabase for new models every 30s.
│   ├── model_registry.py       ← Owner-managed. Manages 5 ONNX model slots.
│   ├── safety_loop.py          ← Owner-managed. Sanity-checks new models before deploying.
│   ├── fast_retrain.py         ← YOUR TERRITORY. Retraining pipeline (needs TimeSeriesSplit fix).
│   ├── nightly_retrain.py      ← YOUR TERRITORY. Nightly retrain cron.
│   ├── requirements.txt        ← Updated. joblib, shap, scikit-learn now enabled.
│   ├── supabase_client.py      ← Shared. Do not refactor.
│   ├── upload_initial_models.py← Owner-managed. Credentials fixed. Do NOT revert.
│   ├── rag/
│   │   ├── rag_agent.py        ← YOUR TERRITORY (built by you). Credentials fixed by owner.
│   │   ├── rag_harvester.py    ← YOUR TERRITORY (upgraded by owner with Gemini filter).
│   │   ├── rag_ingest.py       ← YOUR TERRITORY (upgraded by owner with batch embedding).
│   │   ├── rag_schema.sql      ← DATABASE SCHEMA. Must be run in Supabase.
│   │   └── rag_retrieval.py    ← YOUR TERRITORY.
│   └── Dockerfile              ← Owner-managed. Do not touch.
├── research papers/doc/        ← 26 valid grain-science papers (16 irrelevant ones deleted).
├── src/
│   ├── components/AIAssistant.tsx ← YOUR TERRITORY (you built this). NOT YET wired to backend.
│   └── lib/                    ← Owner/fullstack territory. Do not refactor.
└── docs/analysis/              ← Documentation. Keep updated.
```

---

## 📌 SECTION 2: CHANGES MERGED — WHAT CAME FROM YOU vs. WHAT CAME FROM OWNER

### ✅ YOUR Changes That Were KEPT (from your branch)

| File | What You Did | Status |
|---|---|---|
| `ml-deploy/rag/rag_agent.py` | Built full agentic RAG with intent classification, Gemini, Supabase retrieval | ✅ KEPT |
| `ml-deploy/rag/rag_harvester.py` | Built web harvesting from Semantic Scholar | ✅ KEPT (upgraded) |
| `ml-deploy/rag/rag_ingest.py` | Built PDF ingestion pipeline | ✅ KEPT (upgraded) |
| `ml-deploy/rag/rag_schema.sql` | Designed the Supabase schema for RAG | ✅ KEPT |
| `ml-deploy/rag/rag_retrieval.py` | Built hybrid search (vector + keyword) | ✅ KEPT |
| `ml-deploy/rag/test_rag_query.py` | Test script for RAG queries | ✅ KEPT |
| `src/components/AIAssistant.tsx` | Built the frontend AI chat component | ✅ KEPT |
| `ml-deploy/window_utils.py` | Sliding window utilities | ✅ KEPT |
| `ml-deploy/test_windowing.py` | Tests for windowing | ✅ KEPT |
| `ml-deploy/fast_retrain.py` | Retraining pipeline | ✅ KEPT |
| `supabase/migrations/20260804_add_best_window_size.sql` | DB migration | ✅ KEPT |
| `src/lib/alert-engine.functions.ts` | Alert engine frontend functions | ✅ KEPT |
| Multiple `src/lib/*.functions.ts` | Various frontend lib updates | ✅ KEPT |

### ⚠️ YOUR Changes That Were MODIFIED by Owner (Fixes Applied)

| File | What Changed | Why |
|---|---|---|
| `ml-deploy/rag/rag_agent.py` | Hardcoded Supabase service key removed | **SECURITY** — keys must never be hardcoded |
| `ml-deploy/rag/rag_harvester.py` | Added Gemini-based relevance filter | Prevents irrelevant papers from downloading |
| `ml-deploy/rag/rag_ingest.py` | Added 500-word Gemini chunking + batch embedding | Better RAG quality, less token waste |
| `ml-deploy/requirements.txt` | `sentence-transformers` disabled, `shap`+`joblib`+`scikit-learn` added | OOM prevention on Render; SHAP re-enabled |

### ❌ YOUR Files That Were DISCARDED

| File | Why |
|---|---|
| `again/` (entire Python venv) | Accidentally committed — virtual environments NEVER go in git |
| `curl_models.json`, `curl_output.json`, `curl_test_dim.json` | Scratch test files — not part of production |
| `gemini_test.txt` | Scratch test file |
| `ml-deploy/rag/doc/*.pdf` (11 files) | Intern's RAG doc folder duplicated papers already in `research papers/doc/`. Owner's folder is the canonical location. |

### ✅ OWNER Changes That Are Preserved (Do Not Revert)

| What | Where | Note |
|---|---|---|
| Upgraded `_spoilage_trend()` with rate + projection | `app.py` L178–267 | Core proactive intelligence |
| Added `DANGER_THRESHOLDS` dict (5 grains) | `app.py` L180–186 | FAO-sourced thresholds |
| Added `_analyze_sensor_trend()` per sensor | `app.py` L188–216 | Rate-of-change engine |
| SHAP re-enabled (joblib + shap imports) | `app.py` L55–57 | Fixed crash from commented-out imports |
| Security fix: no hardcoded credentials | `rag_agent.py`, `upload_initial_models.py` | Critical security fix |
| Removed `again/` venv from git | `.gitignore` + `git rm --cached` | Removed ~100MB of junk from repo |
| Deleted 16 irrelevant PDFs | `research papers/doc/` | RAG quality fix |

---

## 📌 SECTION 3: HOW WE COLLABORATE (READ THIS CAREFULLY)

### The Golden Rule: Role Separation

| Zone | Owner (Atif) | You (ML Intern) |
|---|---|---|
| `ml-deploy/app.py` lines 1–100 | ✅ Owner only | ❌ Never touch |
| `ml-deploy/app.py` new endpoints | ✅ Owner reviews | ✅ You can add at the BOTTOM only |
| `ml-deploy/rag/` | Owner reviews | ✅ Your primary territory |
| `ml-deploy/fast_retrain.py` | Owner reviews | ✅ Your primary territory |
| `ml-deploy/scripts/` | Owner reviews | ✅ Your primary territory |
| `src/lib/*.functions.ts` | ✅ Owner | ❌ Ask before changing |
| `.gitignore`, `Dockerfile`, `render.yaml` | ✅ Owner only | ❌ Never touch |

### Daily Git Workflow (Follow This Every Time)

**BEFORE you start coding each day:**
```powershell
cd C:\Users\YourName\Projects\GrainHero_latest
git pull origin Ai/Ml-Branch --rebase
```
This gets the owner's latest changes and stacks YOUR commits cleanly on top. Never skip this.

**When you commit your work:**
```powershell
git add ml-deploy/rag/rag_agent.py     # Only stage YOUR files
git add ml-deploy/fast_retrain.py      # Stage what you changed
git commit -m "feat(rag): add /chat endpoint to app.py"
git push origin Ai/Ml-Branch
```

**NEVER DO:**
```powershell
git push -f              # NEVER force push — you will destroy Lovable history
git add .                # NEVER do this — you will stage AI_CHAT_LOG.md and other local files
git checkout -b new-branch  # Don't create new branches without asking owner
```

### Why AI_CHAT_LOG.md Stays Local

Each team member has their own `AI_CHAT_LOG.md` on their local machine. This is intentional:
- **Owner** has context about business strategy, Render, and IoT.
- **You** have context about your ML experiments.
- **If we merged them** into one file, every pull would cause conflicts.

The `.gitignore` already blocks it from being pushed. **Do not remove it from `.gitignore`.**

### Why We Are NOT Merging to `main` Yet

The `main` branch is connected to Lovable (production). We will only merge when:
1. The pilot phase checklist is 100% complete.
2. ONNX models are uploaded to Supabase Storage.
3. ML service is deployed and confirmed live on Render.
4. At least one ESP32 is sending live sensor data.

Until then, **all work stays on `Ai/Ml-Branch`.**

---

## 📌 SECTION 4: TASKS (Priority Order)

---

### 🔴 TASK 1 — Apply RAG Schema to Supabase (DO THIS FIRST)

Nothing in the RAG pipeline works until the database tables exist.

**Steps:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → GrainHero project.
2. **SQL Editor** → **New Query**.
3. Open `ml-deploy/rag/rag_schema.sql`, copy ALL contents, paste and click **Run**.
4. Verify in **Table Editor** that you see:
   - `rag_knowledge_base`
   - `rag_ingestion_log`
   - `rag_chat_sessions`

**✅ Done when:** All 3 tables appear in the Supabase Table Editor.

---

### 🔴 TASK 2 — Ingest Research Papers Into RAG, Then Delete Raw PDFs

The 26 grain-science PDFs in `research papers/doc/` need to be chunked and embedded into Supabase. After that, the raw PDF files should be deleted from the repo (we keep the knowledge, not the files).

**Step 1 — Create a `.env` file if you don't have one:**
```
# ml-deploy/.env
SUPABASE_URL=https://frfgmbgzildtfchtmchr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<get from owner>
GEMINI_API_KEY=<get from owner>
DEFAULT_TENANT_ID=8f58c2d3-e610-4540-bc99-c946b3659b51
```

**Step 2 — Run the ingestor:**
```powershell
cd C:\Users\YourName\Projects\GrainHero_latest
pip install pymupdf supabase httpx python-dotenv  # if not already installed
python ml-deploy/rag/rag_ingest.py --dir "research papers/doc" --category "research_paper" --tenant-id 8f58c2d3-e610-4540-bc99-c946b3659b51
```

**Step 3 — Verify in Supabase:**
- Table Editor → `rag_knowledge_base` → should have 200+ rows (each PDF = many 500-word chunks).

**Step 4 — Delete the raw PDF files:**
```powershell
Remove-Item "research papers\doc\*.pdf" -Force
git add "research papers/"
git commit -m "chore: ingest PDFs into RAG, delete raw files to save repo space"
git push origin Ai/Ml-Branch
```

**✅ Done when:** 200+ rows in `rag_knowledge_base` AND no `.pdf` files left in `research papers/doc/`.

---

### 🔴 TASK 3 — Add `/chat` HTTP Endpoint to `app.py`

The frontend `AIAssistant.tsx` calls an API endpoint that doesn't exist yet. You need to wire it to the RAG agent.

**Add these at the BOTTOM of `ml-deploy/app.py` (after line 860, before the last few lines):**

```python
# ─────────────────────────────────────────────────────────────────────────────
# /chat — RAG AI Assistant endpoint
# Add your imports at the TOP of the file if not already present:
#   import uuid as _uuid
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query:      str   = Field(..., description="User's question in plain English")
    session_id: Optional[str] = Field(None, description="UUID for conversation memory — omit for new session")
    tenant_id:  Optional[str] = Field(None, description="Tenant UUID for data isolation")

class ChatResponse(BaseModel):
    answer:     str
    session_id: str


@app.post("/chat", response_model=ChatResponse,
          summary="GrainHero AI Assistant — RAG-powered grain science Q&A")
async def chat_endpoint(req: ChatRequest):
    """
    Routes user questions to the GrainHero RAG agent.
    Answers are grounded in research papers and live sensor data.
    Pass session_id on follow-up questions to maintain conversation memory.
    """
    import uuid as _uuid
    session_id = req.session_id or str(_uuid.uuid4())
    tenant_id  = req.tenant_id  or os.environ.get("DEFAULT_TENANT_ID", "")
    try:
        agent  = GrainHeroAgent(tenant_id=tenant_id, session_id=session_id)
        answer = agent.run(req.query)
        return ChatResponse(answer=answer, session_id=session_id)
    except Exception as exc:
        logger.error("RAG chat failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI assistant error: {str(exc)}")
```

**Test in Swagger UI (`http://localhost:8001/docs`):**
```json
POST /chat
{
  "query": "What humidity level is dangerous for wheat?",
  "session_id": "test-001"
}
```
Expected: A detailed answer citing FAO wheat humidity thresholds (≤65% RH).

**✅ Done when:** `/chat` appears in Swagger and returns a factual grain-science answer.

---

### 🟠 TASK 4 — Add `silo_id` + History Auto-Injection to `/predict`

Without this, `spoilage_trend` always returns "insufficient_data" because there's no history.

**Step 1 — Add `silo_id` to `PredictionRequest` (find the class around line 320):**
```python
silo_id: Optional[str] = Field(
    None,
    description="Silo UUID — if provided, auto-fetches last 24 readings from Supabase"
)
```

**Step 2 — Add this helper function (add it just before `_bootstrap_local_models`):**
```python
async def _fetch_sensor_history(silo_id: str, limit: int = 24) -> dict:
    """Fetch last N sensor readings from Supabase for a given silo."""
    from supabase_client import get_supabase_client
    try:
        client = get_supabase_client()
        resp = (
            client.table("sensor_readings")
            .select("temperature, humidity, grain_moisture, recorded_at")
            .eq("silo_id", silo_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = sorted(resp.data, key=lambda x: x["recorded_at"])  # oldest → newest
        return {
            "temperature_history": [r["temperature"]             for r in rows],
            "humidity_history":    [r["humidity"]                for r in rows],
            "moisture_history":    [r.get("grain_moisture", 0.0) for r in rows],
        }
    except Exception as exc:
        logger.warning("History fetch failed for silo '%s': %s", silo_id, exc)
        return {"temperature_history": [], "humidity_history": [], "moisture_history": []}
```

**Step 3 — In the `/predict` endpoint, add before inference:**
```python
# Auto-inject history from Supabase if silo_id provided and arrays not manually passed
if req.silo_id and not req.temperature_history:
    history = await _fetch_sensor_history(req.silo_id)
    req.temperature_history = history["temperature_history"]
    req.humidity_history    = history["humidity_history"]
    req.moisture_history    = history["moisture_history"]
```

**✅ Done when:** Calling `/predict` with only a `silo_id` returns `spoilage_trend` with actual `rate_per_hour` values (not `"insufficient_data"`).

---

### 🟠 TASK 5 — Add Lightweight `/trend` Endpoint

This is a cheap polling endpoint the frontend calls every 5 minutes to check sensor trajectories.

**Add at the BOTTOM of `app.py` (same area as `/chat`):**

```python
class TrendRequest(BaseModel):
    grain_type:          str         = Field("wheat")
    silo_id:             Optional[str] = None
    temperature_history: List[float] = Field(default_factory=list)
    humidity_history:    List[float] = Field(default_factory=list)
    moisture_history:    List[float] = Field(default_factory=list)


@app.post("/trend", summary="Trend-only analysis — no ONNX inference (<5ms)")
async def trend_only(req: TrendRequest):
    """
    Lightweight proactive monitoring endpoint.
    Skips ONNX entirely. Use for frequent dashboard polling (every 5 minutes).
    Returns: rate_per_hour, urgency, projected_hours_to_danger per sensor.
    """
    temp_h, hum_h, mc_h = req.temperature_history, req.humidity_history, req.moisture_history
    if req.silo_id and not temp_h:
        history = await _fetch_sensor_history(req.silo_id)
        temp_h  = history["temperature_history"]
        hum_h   = history["humidity_history"]
        mc_h    = history["moisture_history"]
    return _spoilage_trend(temp_h, hum_h, mc_h, grain_type=req.grain_type)
```

**Test in Swagger:**
```json
POST /trend
{
  "grain_type": "wheat",
  "temperature_history": [17.0, 17.5, 18.0, 18.8, 19.5, 20.2],
  "humidity_history":    [60.0, 61.0, 62.0, 63.0, 64.0, 65.0],
  "moisture_history":    [12.0, 12.2, 12.4, 12.6, 12.8, 13.0]
}
```
Expected: `"urgency": "WORSENING"`, `"earliest_danger_in_hours": <1.0`

**✅ Done when:** `/trend` returns `rate_per_hour` and `projected_hours_to_danger` for each sensor.

---

### 🟠 TASK 6 — Create GitHub Actions for RAG Auto-Refresh

The RAG knowledge base should update itself every Sunday automatically.

**Create this file:** `.github/workflows/rag-update.yml`

```yaml
name: Weekly RAG Knowledge Base Refresh
on:
  schedule:
    - cron: '0 3 * * 0'   # Every Sunday at 3 AM UTC = 8 AM Pakistan time
  workflow_dispatch:        # Also allows manual trigger from GitHub Actions tab

jobs:
  refresh-rag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install httpx supabase pymupdf python-dotenv

      - name: Run RAG Harvester
        run: python ml-deploy/rag/rag_harvester.py --ingest --limit 3
        env:
          GEMINI_API_KEY:            ${{ secrets.GOOGLE_API_KEY }}
          SUPABASE_URL:              ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DEFAULT_TENANT_ID:         ${{ secrets.DEFAULT_TENANT_ID }}
```

**Verify:**
1. GitHub repo → **Actions** tab → find "Weekly RAG Knowledge Base Refresh".
2. Click **Run workflow** → watch the logs.
3. Check Supabase `rag_knowledge_base` for new rows.

**✅ Done when:** The GitHub Action runs without errors and adds rows to `rag_knowledge_base`.

---

### 🟠 TASK 7 — Fix `TimeSeriesSplit` in `fast_retrain.py`

Using random train/test split on time-series data causes data leakage (future data bleeds into training).

**Find in `ml-deploy/fast_retrain.py`:**
```python
# REPLACE THIS:
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# WITH THIS:
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)
for train_idx, test_idx in tscv.split(X):
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
# After the loop, X_train/X_test hold the last (most recent) fold — use these for eval
```

**✅ Done when:** No `train_test_split` call remains in `fast_retrain.py`.

---

### 🟡 TASK 8 — Wire `AIAssistant.tsx` to the `/chat` Backend

After Task 3 adds `/chat` to `app.py`, wire the frontend component to call it.

**In `src/components/AIAssistant.tsx`, find the `sendMessage` or `handleSubmit` function and ensure it calls:**

```typescript
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL ?? 'https://grainhero-ml-service.onrender.com';

const response = await fetch(`${ML_SERVICE_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: userMessage,
    session_id: sessionId,              // maintain session across messages
    tenant_id: currentUser?.tenant_id,  // pass tenant for data isolation
  }),
});
const data = await response.json();
setSessionId(data.session_id);  // persist session_id in state for follow-up messages
setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
```

**✅ Done when:** Typing a question in the AI Assistant chat box returns a grain-science answer from the backend.

---

## 📌 SECTION 5: DEFINITION OF DONE (FOR ALL TASKS)

Before pushing ANY code:

1. **Test locally:** `uvicorn app:app --port 8001` — must reach `Application startup complete.` with NO errors.
2. **Check Swagger:** Open `http://localhost:8001/docs` — verify your endpoint appears and returns correct data.
3. **No secrets in code:** Run `git diff` before committing. If you see any `eyJ...` or `sk-...` strings, stop and remove them.
4. **Pull before push:** `git pull origin Ai/Ml-Branch --rebase` — do this immediately before `git push`.
5. **Commit message format:** `feat(rag): add /chat endpoint` or `fix(retrain): replace train_test_split with TimeSeriesSplit`.
6. **Never use `git push -f`** — this will break Lovable and the entire project history.

---

## 📌 SECTION 6: WHO TO CONTACT FOR WHAT

| Question | Ask |
|---|---|
| Supabase credentials / env vars | Owner (Atif) |
| Render deployment URL | Owner (Atif) |
| Frontend changes outside `AIAssistant.tsx` | Ask owner first |
| Changes to `app.py` core logic (lines 1–300) | Ask owner first |
| RAG pipeline behavior, rag_agent.py | Your territory — proceed |
| fast_retrain.py, scripts/ | Your territory — proceed |
