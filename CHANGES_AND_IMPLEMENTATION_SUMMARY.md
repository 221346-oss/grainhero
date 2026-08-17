# GrainHero — System Implementation & Code Changes Summary

**Branch:** `Ai/Ml-Branch`  
**Scope:** Complete implementation of the **Industrial-Grade Custom RAG Pipeline**, **Academic Research Harvester**, and **Dynamic Windowing ML Enhancements** since the last git commit.

---

## 1. Executive Overview

This development cycle introduced two major capabilities to GrainHero:
1. **End-to-End Industrial RAG Pipeline & Academic Harvester:** Built a custom RAG architecture from scratch (bypassing heavy black-box frameworks) to ingest, vectorize, retrieve, and synthesize domain knowledge from research PDFs and real-time IoT sensor telemetry using Gemini embeddings + Supabase `pgvector`.
2. **Dynamic Window Size ML Ingestion & Migration:** Added dynamic windowing capabilities to the ML inference and retrain pipeline (`app.py`, `fast_retrain.py`, `hot_swap.py`, `model_registry.py`, `safety_loop.py`, `supabase_schema.sql`).

---

## 2. File-by-File Implementation Breakdown

### 🤖 Component A: Industrial RAG & Academic Harvester Pipeline (`ml-deploy/rag/`)

| File / Script | Type | Key Technical Approach & Implementation Details |
|---|---|---|
| [`ml-deploy/rag/rag_schema.sql`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/rag_schema.sql) | `[NEW]` | **Vector DB & RPC Schema:** Enables `pgvector`, creates `rag_knowledge_base` with `VECTOR(768)` embedding column, HNSW vector index (`vector_cosine_ops`), RLS policies for multi-tenancy, and RPC functions: `match_documents` (dense cosine search) and `keyword_search` (sparse lexical tsvector search). |
| [`ml-deploy/rag/rag_ingest.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/rag_ingest.py) | `[NEW]` | **Custom Ingestion Engine:** Extracts raw text from PDFs (`PyMuPDF`), applies semantic text cleaning and word-based overlapping chunking (512 tokens / 64 overlap), embeds via Gemini `gemini-embedding-001` (768 dimensions), and stores vectors in Supabase with retry backoff for rate limits. |
| [`ml-deploy/rag/rag_retrieval.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/rag_retrieval.py) | `[NEW]` | **Hybrid Search & Re-Ranking:** Executes parallel Dense Vector Search (`match_documents`) and Sparse Lexical Search (`keyword_search`), merges candidate lists using **Reciprocal Rank Fusion (RRF)** ($k=60$), and applies a feature-boosted term density re-ranker. |
| [`ml-deploy/rag/rag_agent.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/rag_agent.py) | `[NEW]` | **Agentic AI & IoT Telemetry Fusion:** Implements an Intent Router to classify user queries, calls 3 tools (`query_knowledge_base`, `get_live_telemetry`, `get_actuator_status`), fuses PDF manuals + live sensor telemetry into a zero-hallucination prompt, and executes Gemini inference with multi-model failover circuit breaking. |
| [`ml-deploy/rag/rag_harvester.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/rag_harvester.py) | `[NEW]` | **Multi-Source Academic Paper Harvester:** Automatically queries **Semantic Scholar**, **CORE**, and **arXiv** APIs for open-access grain storage papers, deduplicates by URL, downloads PDFs into `ml-deploy/rag/doc/`, and optionally triggers auto-ingestion. |
| [`ml-deploy/rag/test_rag_query.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/rag/test_rag_query.py) | `[NEW]` | **RAG Direct Query Test Script:** Quick Python verification script to test vector embeddings and RPC calls against Supabase `rag_knowledge_base`. |

---

### ⚙️ Component B: PowerShell Automation Runners

| Runner Script | Approach & Functionality |
|---|---|
| [`activate_rag.ps1`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/activate_rag.ps1) | Creates Python virtual environment (`ml-deploy/rag/.venv`), installs dependencies (`httpx`, `supabase`, `pymupdf`, `python-dotenv`, `requests`), and activates the venv. |
| [`run_rag_ingest.ps1`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/run_rag_ingest.ps1) | Pre-loads environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) and executes batch document ingestion on `ml-deploy/rag/doc/`. |
| [`run_rag_query.ps1`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/run_rag_query.ps1) | CLI test runner to execute hybrid retrieval and re-ranking searches against Supabase from PowerShell. |
| [`run_rag_agent.ps1`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/run_rag_agent.ps1) | Interactive CLI runner for testing the end-to-end Agentic RAG assistant (fusing IoT telemetry + RAG manuals). |
| [`run_rag_harvest.ps1`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/run_rag_harvest.ps1) | CLI runner for harvesting papers from Semantic Scholar, CORE, and arXiv APIs with automated parameters. |

---

### 📊 Component C: ML Server & Dynamic Windowing Enhancements (`ml-deploy/`)

| File | Type | Key Technical Approach & Implementation Details |
|---|---|---|
| [`ml-deploy/app.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/app.py) | `[MODIFY]` | Updated FastAPI server endpoints to handle `window_size` parameter in prediction requests, SHAP explanations, and ensemble breakdowns. |
| [`ml-deploy/window_utils.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/window_utils.py) | `[NEW]` | Created utility module for dynamic sliding-window feature aggregation across multi-step sensor reading arrays. |
| [`ml-deploy/test_windowing.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/test_windowing.py) | `[NEW]` | Unit test suite verifying windowing calculations across different time series window sizes (1..30 steps). |
| [`ml-deploy/fast_retrain.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/fast_retrain.py) | `[MODIFY]` | Updated automated fast-retraining loop to evaluate best performing window size per grain type. |
| [`ml-deploy/hot_swap.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/hot_swap.py) | `[MODIFY]` | Enhanced zero-downtime model hot-swapping to reload window size configurations without restarting FastAPI. |
| [`ml-deploy/model_registry.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/model_registry.py) | `[MODIFY]` | Added metadata tracking for optimal window sizes per model artifact in the local registry. |
| [`ml-deploy/nightly_retrain.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/nightly_retrain.py) | `[MODIFY]` | Updated scheduled batch retraining job to recalculate feature importance and window metrics. |
| [`ml-deploy/safety_loop.py`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/safety_loop.py) | `[MODIFY]` | Added safety boundaries and fallback thresholds for window size evaluation under missing data. |
| [`ml-deploy/supabase_schema.sql`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/ml-deploy/supabase_schema.sql) | `[MODIFY]` | Added table updates for live sensor telemetry and retrain metrics tracking. |
| [`supabase/migrations/20260804_add_best_window_size.sql`](file:///f:/New%20Grainhero%20,%20again%20implementation/grainhero/supabase/migrations/20260804_add_best_window_size.sql) | `[NEW]` | Database migration SQL adding `best_window_size` column to model metrics tables in Supabase. |

---

## 3. Summary of Verification Status

1. **RAG Ingestion:** 9/9 operational manuals successfully vectorized into Supabase `rag_knowledge_base` table with `VECTOR(768)` schema.
2. **Hybrid Search:** RRF retrieval verified working with cosine vector search (`match_documents`) and keyword search (`keyword_search`).
3. **Agentic System:** Agent verified executing intent classification, tool invocation (`live_sensor_readings`), zero-hallucination prompt assembly, and Gemini Flash inference with automatic failover.
4. **Harvester:** Tested harvesting papers from arXiv and Semantic Scholar directly into `ml-deploy/rag/doc/`.
