# AI Chat Log for GrainHero

This file automatically tracks our conversation context. 
*(Future AI: Please read this to understand where we left off).*

---

## Session: 2026-08-01 to 2026-08-03 — Roadmap Overhaul & Research Intelligence Pipeline

### What Was Done
Completely overhauled `00_ACTIONABLE_PILOT_PHASE_ROADMAP.md` to be the master blueprint for the entire pilot phase, adding clear structure for ML, IoT, and Fullstack teams.

**Major Permanent Directives Established:**
1. **The Two Environments Rule:** Training (heavy dependencies) happens locally. Serving (lightweight inference) happens on Render using `onnxruntime`. Do not mix them. This prevents 512MB RAM OOM crashes on the free tier.
2. **The Hot-Swap Pipeline:** Training output `.onnx` files are uploaded to Supabase Storage. Render auto-downloads them without redeploying.
3. **Data Flywheel:** Current models use synthetic data. Real sensor data will be collected, outcomes labeled by the owner, and models retrained locally every 6-8 weeks.
4. **IoT Migration Rule:** The MQTT payload format is the interface contract. The new hardware prototype can be swapped in seamlessly as long as it sends the same JSON structure.

**Major Features Added to Roadmap:**
- **Research Intelligence Pipeline (Super-Admin):** Automated scripts to scrape Arxiv, Semantic Scholar, HuggingFace for new ML models/datasets. Feeds directly into the pgvector RAG database, and raises alerts on the Super-Admin dashboard.
- **Mamba Migration Path (H3):** 3-6 months post-launch, replace XGBoost ensemble with Mamba sequence models trained on real silo data. Exported to `.onnx` for zero-friction serving on the current architecture.

**Deployment Fixes Applied:**
- Fixed Render Dockerfile crashing on `ls -lh *.onnx`
- Removed unused `requests` import causing `ModuleNotFoundError`
- Commented out heavy training dependencies in `ml-deploy/requirements.txt` to fix OOM crash. Render service is now fully stable on free tier.
- Identified broken GitHub webhook for Render auto-deploy (requires Owner manual fix in GitHub settings).

## Session: 2026-07-31 — Roadmap Integration (Trend Prediction Strategy)

### What Was Done
Integrated the full time-series trend prediction strategy directly into `docs/analysis/implementation-roadmap/00_ACTIONABLE_PILOT_PHASE_ROADMAP.md`.

**New content added:**
- **Architecture Decision section**: Three-Horizon mandate added at the top (H1/H2/H3 plan, labeled permanent)
- **Task 2.4** (after Task 2.2 Render deploy): `_fetch_sensor_history()` middleware — queries last 24 Supabase readings and injects into every `/predict` call. Zero firmware changes.
- **Task 2.5** (after Task 2.4): Full `_spoilage_trend()` replacement — adds `DANGER_THRESHOLDS`, `_analyze_sensor_trend()` per sensor, rate_per_hour, projected_hours_to_danger, urgency levels (CRITICAL/WORSENING/CAUTION/STABLE). Adds lightweight `/trend` endpoint.
- **Task 3.2.5** (after Task 3.2): `evaluateTrend()` and `findRecentTrendAlert()` in AlertEngine. Fires GrainAlert BEFORE spoilage, based on trajectory. Auto-triggers aeration on CRITICAL. Deduplicates CAUTION alerts (max 1/4hr/silo).
- **Task 4.4 updated**: Trend Alert Card design spec added — animated gradient border, urgency badge, ⏱ danger countdown chip, per-sensor sparkline row, ⚡ aeration action button.
- **INTERNEE checklist**: All new tasks (2.4, 2.5, 3.2.5) added in correct execution order.

**Execution order for internee:**
2.2 (owner) → 2.4 → 2.5 → 2.3 (RAG, parallel) → 3.1 → 3.2 → 3.2.5 → 3.3 → 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 5.1 → 5.2 → 5.3

---

## Session: 2026-07-31 — Trend Prediction Architecture Analysis


### Topics Discussed
1. **Time-series trend analysis** explained and mapped to GrainHero's dev stack.
2. **What we already have** in `ml-deploy/app.py`:
   - `_spoilage_trend()` uses EMA to detect rising/falling/stable per sensor
   - `PredictionRequest` already accepts `temperature_history`, `humidity_history`, `moisture_history` arrays
   - Roadmap already has TimeSeriesSplit (Task 5.2) and sliding window prep (Task 5.3)
3. **What is missing** (the three critical gaps):
   - No Supabase history lookup — the firmware sends a single reading, not a history array
   - `_spoilage_trend()` only detects direction, not rate-of-change or hours-to-danger projection
   - No trend-based alert triggers in the AlertEngine
4. **Three-Horizon Plan** decided:
   - H1 (next 2-4 weeks): Add Task 2.4 (history injection) + Task 2.5 (rate + projection) + upgrade AlertEngine to fire on trend
   - H2 (1-3 months post-pilot): Prophet/ARIMA forecasting, Isolation Forest anomaly detection
   - H3 (3-6 months): Mamba/LSTM sequence model (already pre-planned in roadmap)

### New Tasks to Add to Roadmap
- **Task 2.4** — Backend middleware: query Supabase for last 24 sensor readings, inject into every `/predict` call
- **Task 2.5** — Upgrade `_spoilage_trend()` to output rate/hour + projected hours-to-danger
- **Task 3.2.5** — Add WORSENING/hours-to-danger trigger conditions to AlertEngine
- **Modify Task 4.4** — Add "Trend Alerts" category to Alert Management Center UI

### Key Insight
The high-impact, zero-model-change wins (Tasks 2.4 + 2.5) can be built RIGHT AFTER the ML service goes live on Render. No new ML training needed. The existing `_spoilage_trend()` framework is already there — it just needs real history data fed into it.

---

## Session: 2026-07-31 — CORE PRODUCT PHILOSOPHY (PERMANENT)


### 🔴 PERMANENT DIRECTIVE — PREDICTIVE SPOILAGE PREVENTION

> **THIS IS THE FOUNDING PHILOSOPHY OF GRAINHERO. EVERY AI SESSION MUST HONOR IT.**

**We do NOT react to spoilage. We PREVENT it from ever beginning.**

- **Goal**: Detect and cut off the *build-up trend* toward spoilage *before* it becomes spoilage.
- **Strategy**: Monitor the trajectory of sensor readings (temperature, humidity, CO₂, moisture, pest activity, etc.) over time. When any metric starts trending in a direction that historically precedes spoilage, **trigger intervention immediately** — while conditions are still safe.
- **Outcome**: Grain is kept at optimal levels at all times. The spoilage curve never even starts.
- **Analogy**: Don't wait for a fever — treat the first sign of rising temperature.

**Phase 1 (Grain)**: Temperature, humidity, moisture content, CO₂, pest presence → predictive ML triggers early aeration/alerts.

**Future Expansion** (same architecture, different sensors/thresholds):
- ❄️ Cold storage
- 🌾 Feed storage
- 🧪 Fertilizer storage
- ...and everything in between

**ML Design Implication**: Our models must output not just a "spoilage risk score" but a **trend vector** — is the risk accelerating? If yes, intervene NOW even if absolute risk is still low.

---

## Session: 2026-07-26

### Topics Discussed
1. **Session Context Continuity**: User reminded AI to read this file at the start of every session.
2. **Recent Implementation Plan**: Discussed the Insurance + Logs + Alerts end-to-end plan at `docs/analysis/implementation-roadmap/implementation_plan.md`. Generated a Claude-ready learning resources prompt covering RBAC, audit logging, alert engines, real-time dashboards, and complex multi-step forms.
3. **Infrastructure Questions:**
   - GitHub collaborator access does NOT grant Supabase or Render access.
   - Supabase access: owner must invite via Organization Settings.
   - Render access: owner must add to Team (paid plan), but auto-deploy via GitHub still works without dashboard access.
   - ONNX models use all 9 features (not just temperature). FAO natural storage life calc is temperature-heavy, which may appear temperature-only, but ML inference uses the full feature array.
4. **Comprehensive Project Audit Generated**: User requested a full project audit for sharing with Claude. Created `claude_project_audit.md` in the session brain artifacts directory, combining:
   - All technical (code architecture, ML pipeline, firmware state)
   - All business (revenue model, pricing tiers, market sizing TAM/SAM/SOM)
   - All feasibility (unit economics, break-even at 19 customers, revenue projections)
   - All silo design & manufacturing (100-tonne BOM, structural calcs, aeration sizing, hermetic sealing option)
   - All risk analysis (technical, safety/FMEA, business risks)
   - Current implementation plans (Insurance + Logs + Alerts — 5 phases)
   - TechNova Group parent company architecture

### Current Status / Next Steps
- Implementation Plan (Insurance → Logs → Alerts) approved but not yet executed.
- Critical open items:
  1. `Pest_Presence` feature still hardcoded to 0.0 — highest-impact ML bug.
  2. `fumigation_active` safety interlock missing from silo model.
  3. Firebase credentials hardcoded in firmware.
  4. Insurance backend endpoints (7 new routes) not yet built.
  5. pgvector RAG not yet enabled in Supabase.

### Key Files
- `docs/analysis/implementation-roadmap/implementation_plan.md` — active implementation plan
- `docs/analysis/business-risk/09_BUSINESS_FEASIBILITY.md` — business feasibility
- `docs/analysis/iot-hardware/07_SILO_ENGINEERING.md` — silo design & BOM
- `docs/analysis/business-risk/10_RISK_ANALYSIS.md` — risk register
- `docs/analysis/business-risk/GRAINHERO_BUSINESS_PLAN_v2.md` — business plan v2 (TechNova Group)
- `PROJECT_MASTER_DOCUMENT.md` — full system architecture and ML pipeline
- `ml-deploy/app.py` — ML inference service
- `docs/firmware/grainhero_main_final.ino` — IoT firmware

