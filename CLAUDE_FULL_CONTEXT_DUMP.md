################################################################################
# MASTER PROJECT DOCUMENT v3
################################################################################

# TEQrock / GrainHero — Complete Master Project Document
**Version:** 3.0 | **Date:** August 2026 | **Author:** Founder + Antigravity AI
**For:** Internal use, investor presentations, and AI context continuity

---

## 📌 INSTRUCTIONS FOR AI READING THIS FILE
This is a living context document. When uploaded to any AI assistant:
1. Read this entire file before responding to any question.
2. Respect all PERMANENT directives marked with 🔴.
3. Do NOT suggest rebuilding what already exists — audit first.
4. The owner is under extreme time pressure. Be efficient, prioritized, and directive.

---

## 🏢 COMPANY STRUCTURE

### Holding Company: TEQrock
- **Status:** Active
- **Logo & Colors:** Finalized ✅
- **Website:** In development

### Subsidiary: [RENAME PENDING — formerly GrainHero]
- **Current Codebase Name:** GrainHero (legacy)
- **Color Scheme:** Finalized ✅
- **Name Change Reason:** Expanding beyond grains → cold storage, feed, fertilizers, wood pallets, fruits/vegetables, beans
- **Focus NOW:** Wheat storage (primary grain in Pakistan)

### Team Structure
| Team | Count | Role |
|---|---|---|
| Founder/CEO | 1 | Strategy, investor relations, oversight |
| AI/ML Intern | 1 | ML pipeline, model training, backend ML service |
| IoT Team | 6 interns | Sensor integration, firmware, hardware assembly |
| Mechanical Team | 3 interns | SolidWorks design (lab silo + large-scale proposal) |
| Design Team | 3 interns | Branding, UI/UX, pitch materials, icons |
| HR & Acquisition | 1 intern | Funding research, talent, competitor analysis |

---

## 🎯 CORE PRODUCT PHILOSOPHY (🔴 PERMANENT)

> **We do NOT react to spoilage. We PREVENT it from ever beginning.**

- **Goal:** Detect the build-up trend toward spoilage BEFORE it becomes spoilage
- **Strategy:** Monitor sensor trajectories over time. When metrics start trending toward historically dangerous territory, trigger intervention immediately while conditions are still safe
- **Outcome:** Grain kept at optimal conditions at all times. The spoilage curve never starts
- **Analogy:** Don't wait for a fever — treat the first rising temperature

### Wheat-Specific Sensor Thresholds (FAO/CGIAR)
| Parameter | Safe | Caution | Danger |
|---|---|---|---|
| Temperature | < 15°C | 15–20°C | > 20°C |
| Relative Humidity | < 60% | 60–70% | > 70% |
| Grain Moisture Content | < 12% | 12–13.5% | > 13.5% |
| CO₂ (headspace proxy) | < 600 ppm | 600–1500 ppm | > 1500 ppm |

### Future Expansion (same architecture, different thresholds)
Cold storage | Feed storage | Fertilizer | Wood pallets | Fruits & Vegetables | Beans

---

## 🏗️ CURRENT TECHNOLOGY STACK

### Frontend
- **Framework:** TanStack Start (React + TypeScript)
- **UI:** Shadcn/Radix components
- **Hosting:** Lovable-connected (synced with GitHub)

### Backend + Database
- **Runtime:** Node.js
- **Database:** MongoDB (operational) + Supabase (sensor readings, ML data, pgvector RAG)
- **Real-time:** EMQX Cloud MQTT broker
- **Auth:** Supabase Auth + RBAC (Super Admin, Admin, Manager, Technician)

### ML Service (Python)
- **Hosting:** Render.com (Free tier, Docker)
- **URL:** https://grainhero-ml-service.onrender.com
- **Runtime:** ONNX Runtime (inference only — no training on cloud)
- **Models:** XGBoost ensemble exported to .onnx
- **Grain Types:** wheat, rice, maize, sorghum, barley
- **Key Endpoints:** POST /predict, POST /trend, GET /health, GET /docs

### IoT Hardware (Lab Prototype)
- **MCU:** DOIT ESP32 DEVKIT V1
- **Sensors:** BME680 (temp, humidity, VOC, pressure), soil moisture, OLED display
- **Connectivity:** WiFi → EMQX Cloud (MQTT over TLS port 8883)
- **Firmware:** docs/firmware/grainhero_updated_ino/grainhero_updated_ino.ino
- **WiFi Config:** WiFiManager captive portal (no hardcoded credentials)

### 🔴 Two Environments Rule (PERMANENT)
- **Local PC (Training):** Heavy ML — XGBoost, scikit-learn, SHAP, Optuna
- **Render Cloud (Serving):** Only onnxruntime + fastapi — never trains

### 🔴 Hot-Swap Pipeline (PERMANENT)
Training output .onnx → Upload to Supabase Storage → Render auto-downloads on startup → zero redeployment

### 🔴 Data Flywheel (PERMANENT)
- Phase 1 (NOW): Synthetic data (FAO equations) → current ONNX models (~92% synthetic accuracy)
- Phase 2 (Pilot weeks 1–8): Collect real sensor data, no retraining yet (target: 2,000+ readings/silo)
- Phase 3 (After batch 1 labeled): Retrain locally with TimeSeriesSplit, validate on holdout silo, hot-swap
- Repeat every 6–8 weeks

---

## 🌾 WHY SYNTHETIC DATA EXISTS (AND WHY IT'S TEMPORARY)

Synthetic data is NOT fake. It is simulation-based data derived from peer-reviewed FAO/CGIAR equations. It was necessary because we had no physical silo when the ML pipeline was built. Current models are scientifically grounded but not commercially validated.

**The Real-Data Transition:**
1. Lab silo operational → every 2-minute reading logged to Supabase automatically
2. After first wheat batch (emptied/sold), owner labels outcome (Safe/Risky/Spoiled) via dashboard button
3. ML intern exports labeled data CSV, retrains locally, validates, uploads new .onnx
4. Synthetic model retired — real model takes over
5. Accuracy improves continuously with each batch

**For wheat specifically:** This is TOP priority. We are collecting the FIRST real wheat dataset using a controlled stress-test protocol (see below).

---

## 🌾 WHEAT DATASET — WORLD-CLASS COLLECTION STRATEGY

### Lab Controlled Stress-Test Protocol (8 weeks)
This is the methodology used in CGIAR and university post-harvest labs:

1. **Baseline Run (Week 1–2):** Store 5–10 kg wheat at ideal conditions. Record every 2 min. Label: SAFE
2. **Temperature Stress (Week 3):** Raise temp to 22–25°C gradually. Record until early mold signs. Label: RISKY at inflection point
3. **Humidity Stress (Week 4):** Raise RH to 75–80%. Record full spoilage curve. Label: SPOILED at visible mold
4. **Multi-stress (Week 5–6):** High temp + high humidity + no aeration. Full spoilage event. Label: SPOILED
5. **Intervention Run (Week 7–8):** Repeat stress, trigger fan at CAUTION threshold. Document recovery. Label: SAFE (saved)

Target: 5,000–10,000 labeled readings in 8 weeks (2-min sampling, 3 silos)

### State-of-the-Art Feature Engineering
1. **Rolling statistics:** 1h/6h/24h rolling mean, std, min, max per sensor
2. **Rate of change:** Δtemperature/hour, Δhumidity/hour, Δmoisture/hour
3. **Interaction features:** temp × humidity (VPD proxy), moisture × temp (mold growth rate)
4. **Time features:** hour_of_day, day_of_week, season
5. **Accumulated stress index:** Sum of danger-zone minutes over past 24 hours
6. **EMC (Equilibrium Moisture Content):** Calculated from temp + RH via Henderson-Thompson equation
7. **Grain variety tag:** Punjab-11, Ghazi, Millat-2011 (variety affects moisture equilibrium)

### Model Roadmap
- **H1 (Now):** XGBoost ensemble → ONNX (working, deployed)
- **H2 (1–3 months real data):** LightGBM + Prophet forecasting + Isolation Forest anomaly detection
- **H3 (3–6 months, 5,000+ readings):** Mamba sequence model (linear memory SSM, handles months of IoT time-series, Render-compatible)

### Validation Rules (Critical)
- Use TimeSeriesSplit ONLY (never random split — prevents data leakage)
- Train on batches 1–N, test on batch N+1
- Targets: F1 > 0.88, Precision(SPOILED) > 0.90, Recall(SPOILED) > 0.85

---

## 🔩 IOT SETUP — PILOT SILO

### MQTT Payload Contract (MUST remain stable)
```json
{
  "silo_id": "SILO_001",
  "grain_type": "wheat",
  "temperature": 22.4,
  "humidity": 65.2,
  "grain_moisture": 12.8,
  "pest_presence": 0.15,
  "pestRiskScore": 0.15,
  "airflow": 0.0,
  "dew_point": 14.2,
  "ambient_light": 0.0,
  "rainfall": 0.0,
  "storage_days": 14,
  "firmware_version": "2.1.0",
  "timestamp": "2026-08-06T02:00:00Z"
}
```

### Additional Hardware Needed for Wheat Pilot
1. Proper grain probe housing (sensor inside grain mass, not ambient air)
2. Aeration fan + MOSFET driver circuit
3. 12V power supply → 3.3V regulator for ESP32
4. Weatherproof electronics enclosure
5. CO₂ sensor (MH-Z19 or SCD40 — more accurate than BME680 VOC for grain CO₂)
6. Optional: ESP32-CAM for visual mold detection

---

## 🏗️ MECHANICAL TEAM — DESIGN STRATEGY

### Lab Silo (4–5 ft) — Investor Demo
- Purpose: Physical demonstration for investor visit
- Grain: 5–10 kg wheat
- Goal: Live sensor readings on dashboard + ML predictions running
- Status: Basic SolidWorks skeleton built
- IoT team: Responsible for full assembly and instrumentation

### Large-Scale Silo (100–1000 tonne) — Proposal Design
Design Requirements:
- Structural: ASME/ISO grain silo standards (steel cylindrical bin, conical bottom, corrugated walls)
- Aeration: Perforated floor, axial fans, tempering ducts
- Sensor placement: Temperature cable arrays (every 3m vertical), moisture probe rows
- Drying: Integration with grain dryer pre-storage
- Safety: Explosion-proof electronics (grain dust is explosive), pressure relief

Simulations to Run:
- Structural: Grain lateral pressure (Rankine/Janssen equations)
- Thermal: Temperature gradient through grain mass
- Aeration CFD: Airflow distribution through perforated floor
- Weight/foundation: Dead load + live load + wind loading

Global Standards to Reference:
- ISO 11783 (precision agriculture data networks)
- ASME MFC (flow measurement)
- EN 1612 (grain silo structural design)
- NFPA 61 (dust explosion prevention)
- FAO Post-Harvest Loss Prevention Guidelines

---

## 🎨 DESIGN TEAM — DELIVERABLES

### TEQrock (Holding Co)
- Brand guidelines document
- Company one-pager (A4, investor-grade)
- LinkedIn + social media assets
- Business card + email signature
- Pitch deck master template

### Subsidiary (Rename + Rebrand)
- New company name (suggestions: StoraSense, VaultGuard, SiloIQ, StorIQ, AgriVault)
- New logo (based on finalized color scheme)
- Brand guidelines
- Product one-pager
- Investor pitch deck (12–15 slides, investment-grade)
- Figma: mobile app (3+ screens) + web dashboard mockups
- Social media template pack
- Icons set (20+ icons)
- Demo video storyboard

### Website
- TEQrock: Corporate holding page (clean, professional)
- Subsidiary: Product landing page (bold, data-driven, demo teaser)
- Tech stack: Next.js + Tailwind or Framer

---

## 💰 FUNDING & EXPOSURE LIST

### Active Research Targets
Pakistan Startup Fund | Pakistan Innovation Fund | PM Youth Loan | UNICEF Venture Fund | UNIDO PAIDAR | GSMA Innovation Fund | World Food Forum SIA | P@SHA Awards | Global AgriInno Challenge | Techstars Anywhere | 100+ Accelerator | RootCamp | UAF | NIC Faisalabad | Energy Tech Challengers | PitchFest 2026 | AFRISE Challenge | Tenacious Ventures (NL) | BlueRed Partners (SG) | Chamber of Commerce | Engro agri arms | ZTBL | NAAI

### Additional to Research
Aga Khan Foundation | USAID food security (Pakistan) | World Bank Innovation Lab | Karandaaz Pakistan | Ignite National Technology Fund | SMEDA agritech grants | FAO Pakistan country office

---

## 📅 4-WEEK EXECUTION PLAN

### WEEK 1: Foundation & Setup

**FOUNDER (2–3 hours):**
- Complete Owner tasks: 0.3 (EMQX), 1.1 (Supabase bucket), 1.2 (GitHub Secrets), 1.4 (Render Hook), 2.1 (upload models)
- Decide subsidiary name — brief Design Team
- Brief each team on sprint goals

**IoT Team (6 interns):**
- Lead: Finalize BOM, assign assembly roles
- Firmware (2): Verify pest sensor (Task 0.2), flash EMQX credentials, test live MQTT in MQTTX
- Hardware (2): Begin 4–5 ft silo assembly, mount sensors with grain probe housings, wire fan+MOSFET
- Documentation (1): GPIO pin doc, Task 6.0 sensor documentation

**ML Intern:**
- Tasks 2.3A, 2.3B, 2.3C: pgvector, source_papers.py, rag-update.yml
- Start Task 2.4: silo_id + _fetch_sensor_history() in app.py

**Mechanical Team:**
- Finalize lab silo dimensions (coordinate with IoT on sensor holes)
- Start 100-tonne proposal detailed drawings
- Research ASME/EN silo standards

**Design Team:**
- TEQrock brand guidelines start
- 3–5 subsidiary logo concepts for founder review
- Figma: mobile farmer app wireframes (3 screens)

**HR Intern:**
- RAG scraping tool setup
- Research top 5 urgent funding opportunities (deadline-sorted)
- Deadline calendar for all competitions

---

### WEEK 2: Core Build & First Data

**FOUNDER:**
- Decide on subsidiary name from design options
- Source 5–10 kg wheat for lab silo
- 30-min team check-ins

**IoT Team:**
- Complete silo assembly + stable MQTT data stream
- Test OTA firmware update (Task 0.4)
- Begin Controlled Stress Test: Day 1 of wheat baseline run
- Document all calibration readings

**ML Intern:**
- Complete Tasks 2.4 + 2.5 (trend history + rate/projection upgrade)
- Run source_papers.py, verify 50+ rows in Supabase
- Start Task 3.1: ActivityLog enum expansion

**Mechanical Team:**
- Finalize lab silo detailed drawings (ready for IoT review)
- 100-tonne proposal: complete outer shell + foundation
- Begin SolidWorks Simulation setup

**Design Team:**
- Finalize subsidiary logo
- TEQrock one-pager first draft
- Web dashboard wireframes (analytics + alerts pages)
- First 10 icons

**HR Intern:**
- Submit top 3 funding applications
- Competitive analysis: 5 global competitors (features, pricing, weaknesses)
- LinkedIn company pages setup

---

### WEEK 3: Integration & Intelligence

**FOUNDER:**
- Review design materials
- Review competitive analysis
- Make any product decisions flagged by teams

**IoT Team:**
- Continue wheat stress-test: Week 2 of temperature stress run
- Test aeration actuator (fan on/off via MQTT command)
- Data collection log (date, conditions, observations per run)

**ML Intern:**
- Tasks 3.2 + 3.2.5: alertEngine.js with trend triggers
- Task 3.3: Missing insurance + alert API endpoints
- Task 4.1: Shadcn UI component installation
- Task 5.2: TimeSeriesSplit replacement in fast_retrain.py

**Mechanical Team:**
- SolidWorks Simulation: lateral grain pressure on walls
- 100-tonne: aeration floor + duct system
- 3D render of large-scale silo (for pitch deck)

**Design Team:**
- Finalize subsidiary name + logo
- Pitch deck: first 8 slides (Problem/Solution/Product/Market/Model/Traction/Team/Ask)
- Website wireframes: hero + product sections

**HR Intern:**
- Draft outreach emails for 3 incubators
- Investor long-list (20+ names, contact info, thesis)
- Intern NDA/contract templates (if not done)

---

### WEEK 4: Polish, Demo Prep & Investor Materials

**FOUNDER:**
- Full review of all deliverables
- Rehearse investor pitch
- Decide first investor/competition target

**IoT Team:**
- Final calibration + stability check of lab silo
- Demo dry run: simulate spoilage trend → verify alert on dashboard
- Write 5-minute demo script for investor visit
- Document everything

**ML Intern:**
- Tasks 4.2–4.5: Full Alert Management Center UI
- Task 5.1: Mark Outcome button
- Task 5.3: Sliding window dataset generator
- Begin wheat dataset labeling pipeline from stress-test data

**Mechanical Team:**
- Finalize lab silo design + export clean renders
- 100-tonne: all primary views complete (front, top, cross-section, 3D)
- Simulation results summary document

**Design Team:**
- Finalize ALL pitch materials
- Website first version live (even static)
- Social media launch content (LinkedIn + Instagram)
- Demo video storyboard

**HR Intern:**
- 5+ funding applications submitted
- Final competitive analysis report
- 10 investor meeting request emails sent

---

## 📋 ITEMS NEEDED FROM OWNER

- [ ] EMQX Cloud credentials (Task 0.3)
- [ ] GitHub Secrets added (Task 1.2)
- [ ] Render Deploy Hook URL (Task 1.4)
- [ ] Run upload_initial_models.py (Task 2.1)
- [ ] Subsidiary name decision
- [ ] 5–10 kg wheat grain for lab silo
- [ ] IoT component BOM (share with AI for analysis)
- [ ] SolidWorks skeleton file (share for review)
- [ ] TEQrock + GrainHero logo files (SVG)
- [ ] Existing investor contacts list

---

## 🔴 CODEBASE AUDIT SUMMARY (August 6, 2026)

**5 tasks confirmed DONE:**
- Task 0.1: WiFiManager in firmware ✅
- Task 0.2: computePestMoldRisk in firmware ✅
- Task 1.3: .gitignore updated for ONNX/PKL ✅
- Task 2.2: ML service deployed to Render ✅
- Task 1.3 partial: ONNX files removed from Git ✅

**29 tasks NOT YET STARTED** (all Phase 2–8 tasks)

Critical path: Owner must complete Tasks 0.3, 1.1, 1.2, 1.4, 2.1 before most intern work can proceed.

---

## 📡 RENDER DEPLOYMENT MAINTENANCE

- Free tier: spins down after 15 min inactivity (30–50 sec cold start)
- **Fix:** Uptime Robot (free) pings /health every 14 min → keeps warm
- **Code updates:** Push to Ai/Ml-Branch → GitHub Action → Render Deploy Hook → auto-rebuild
- **Model updates:** Upload new .onnx to Supabase Storage → Render hot-swaps on next restart

---

*Document version 3.0 — August 6, 2026*
*Read AI_CHAT_LOG.md for session-specific context*


################################################################################
# PROJECT MASTER DOCUMENT
################################################################################

# GrainHero: Complete Project Master Document
### Production Scale-Up, Deployment & Funding Edition
*Built last, after direct inspection of the repo. Every technical claim is verified against actual files.*

---

## Table of Contents
1. [Project Identity & Vision](#1-project-identity--vision)
2. [System Architecture: The Full Data Flow](#2-system-architecture-the-full-data-flow)
3. [Codebase Status: Post-Pull Audit](#3-codebase-status-post-pull-audit)
4. [The ML/AI Pipeline (Actual State)](#4-the-mlai-pipeline-actual-state)
5. [IoT Firmware: Actual `.ino` State & Issues](#5-iot-firmware-actual-ino-state--issues)
6. [Deployment Architecture Decision](#6-deployment-architecture-decision)
7. [MQTT Broker Decision](#7-mqtt-broker-decision)
8. [Legacy-Backend Go/No-Go Verdict](#8-legacy-backend-gonogo-verdict)
9. [OTA Firmware Strategy](#9-ota-firmware-strategy)
10. [RAG: Automated Paper Sourcing Design](#10-rag-automated-paper-sourcing-design)
11. [IoT Team Funding Deliverable Spec](#11-iot-team-funding-deliverable-spec)
12. [Mechanical Team Funding Deliverable Spec](#12-mechanical-team-funding-deliverable-spec)
13. [Curriculum-Generation Prompt (Standalone)](#13-curriculum-generation-prompt-standalone)
14. [Self-Audit Checklist](#14-self-audit-checklist)

---

## 1. Project Identity & Vision

**One-liner:** "An AI-driven, industrial IoT platform for predicting and preventing post-harvest grain spoilage."

**The Problem:** Pakistan loses over PKR 370 billion (~$1.3 billion USD) worth of grain annually due to improper post-harvest storage — specifically from fungal blooms (aflatoxin), insect infestations, and uncontrolled moisture buildup. This figure is verified by the Pakistan Business Council's 2026 "Grain without Shelter" report and ADB estimates.

**The Solution:** GrainHero is an autonomous, closed-loop system that places low-cost IoT sensors inside commercial grain silos, predicts spoilage conditions in real-time using per-grain-type ONNX ML models, and automatically actuates ventilation fans to save the crop — all managed from a cloud dashboard.

**Commercial Positioning:** Not a research project. A SaaS product, priced at ~$99/month per warehouse, with hardware COGS of ~$77/pod at scale. Break-even at 19 paying customers.

---

## 2. System Architecture: The Full Data Flow

```
[ESP32 + BME680 Sensor Node]
        │  WiFi + MQTT (local broker, Mosquitto)
        ▼
[Firebase Realtime Database (RTDB)]
   /devices/{id}/live         ← GH2 firmware path
   /sensor_data/{id}/latest   ← GH1 legacy firmware path (both supported)
        │
        │  Polled every N minutes by:
        ▼
[Supabase Cron: /api/public/cron/sync-firebase  (TanStack Start SSR)]
   ├─ Authenticates via SUPABASE_PUBLISHABLE_KEY header
   ├─ Reads BOTH Firebase paths (dual-path merge — no firmware update needed)
   ├─ Auto-registers new device IDs into sensor_devices table
   ├─ Runs ML inference via ai-inference.functions.ts
   │       ├─ Primary:  HTTP POST to GRAINHERO_ML_API_URL (Render/HF FastAPI)
   │       └─ Fallback: local subprocess → src/ml/smartbin_predict.py
   ├─ Writes sensor_readings row to Postgres
   ├─ Writes spoilage_predictions row to Postgres
   ├─ If risk > threshold AND NOT fumigation_active:
   │       └─ Writes fan command → Firebase /control/{deviceId}
   └─ ESP32 polls /control/{deviceId} every 2 seconds, actuates PWM fan
        │
        ▼
[Supabase PostgreSQL — Primary Database]
   Tables: silos, grain_batches, sensor_readings, sensor_devices,
           spoilage_predictions, grain_alerts, iot_devices,
           live_sensor_readings (ML training buffer), model_versions,
           marketplace, field_incidents, field_tasks, bug_reports,
           hardware_orders, notifications, (+ 30+ more from teammate push)
        │
        ▼
[React/TanStack Start Frontend]
   Dashboard, Silo management, Analytics, Marketplace,
   AI Insights (Gemini + pgvector RAG), Actuator controls
        │
        ▼
[ml-deploy/ FastAPI Service]  ←─── Deployed on Render (free tier)
   Serves 5 ONNX models (rice, wheat, maize, sorghum, barley)
   Hot-swap without restart (hot_swap.py + background thread)
   SHAP explainability (pkl cached, never on hot path)
   River online learning (background, non-blocking)
   Safety loop before any model promotion (safety_loop.py)
```

---

## 3. Codebase Status: Post-Pull Audit

The `git pull` from `Ai/Ml-Branch` on 2026-07-24 brought in a massive update (~1,040 files). Here is the verified state:

### What Changed in the Pull
- **New routes:** `src/routes/api/public/v1/sync/` — 11 new sync endpoints (alerts, buyer-orders, buyer-summary, field-incidents, field-tasks, hardware-orders, marketplace, notifications, sensors, silos-cockpit, silos)
- **New pages:** Blog, contact, docs, help, marketplace, privacy, terms, team, theme-test, OTP verification
- **New migrations:** 50+ additional Supabase migrations covering multi-warehouse support, silo-based dispatch, marketplace, insurance/carrier webhooks, bug reports, hardware order provisioning
- **Integration tests:** `tests/integration/` — 5 new test suites (cart, checkout, addresses, field-bundle, sync-monitor)
- **New firmware location:** `docs/firmware/grainhero_main_final.ino` (moved from root)
- **ml-deploy/ is now the canonical ML folder:** Contains `app.py`, all 5 `.onnx` files (rice, wheat, maize, sorghum, barley — each ~11–20MB), `model_registry.py`, `hot_swap.py`, `safety_loop.py`, `fast_retrain.py`, `nightly_retrain.py`, `retrain_watcher.py`, `supabase_client.py`, `render.yaml`, `Dockerfile`, `requirements.txt`

### What No Longer Exists
- **`legacy-backend/`**: **Does NOT exist in the repo.** It was already deleted before this pull.
- **`huggingface_deployment/`**: **Does NOT exist.** Was renamed/absorbed into `ml-deploy/`.

### Existing Schema Bug (Still Present)
- `current_stock_kg` referenced in `analytics.functions.ts` and `monitoring.functions.ts` — actual DB column is `current_occupancy_kg`. KPI cards return null. **Not fixed yet.**

---

## 4. The ML/AI Pipeline (Actual State)

### What is Actually Built (Verified from Files)

**`ml-deploy/` — The Production ML Service:**

| File | Purpose | Status |
|---|---|---|
| `app.py` | FastAPI ONNX inference server with hot-swap, SHAP, River online learning, Supabase background logging | ✅ Done |
| `model_registry.py` | Thread-safe in-memory ONNX session store, GIL-releasing inference, atomic hot-swap | ✅ Done |
| `hot_swap.py` | Background thread polling Supabase Storage for new `.onnx` files, swapping without restart | ✅ Done |
| `safety_loop.py` | Sanity-check guardrail (≥85% on fixed test suite, FAO/IRRI-derived) before promoting any retrained model | ✅ Done |
| `fast_retrain.py` | Reactive retrainer: spawned when live buffer hits threshold, uses saved Optuna params | ✅ Done |
| `nightly_retrain.py` | Nightly gold model: full Optuna sweep, exports fresh `.onnx` to Supabase Storage | ✅ Done |
| `retrain_watcher.py` | Row-count watcher: spawns fast_retrain subprocess when threshold crossed | ✅ Done |
| `supabase_client.py` | Async Supabase writes from the inference service | ✅ Done |
| `convert_to_onnx.py` | Converts existing `.pkl` ensembles to `.onnx` | ✅ Done |
| 5× `.onnx` files | rice, wheat, maize, sorghum, barley — each 11–20MB | ✅ Done |
| `render.yaml` | Render deployment config (free Docker tier, `autoDeploy: true`) | ✅ Done |
| `Dockerfile` | Production container | ✅ Done |

**Feature Vector (9 features, canonical order from `model_registry.py`):**
`Temperature, Humidity, Storage_Days, Airflow, Dew_Point, Ambient_Light, Pest_Presence, Grain_Moisture, Rainfall`

**Output:** `{ prediction: "Safe"|"Risky"|"Spoiled", confidence: float, risk_score: float, probabilities: {...}, model_version, file_hash }`

**Critical Gap: `Pest_Presence` is still hardcoded to `0.0`** throughout the data pipeline. The VOC proxy (BME680 gas resistance) is not yet wired to this feature. This is the highest-impact open ML bug.

### What Still Needs Building
1. **Wire `Pest_Presence`:** Map BME680 `gas_resistance` → normalized pest proxy and inject into the feature vector.
2. **`TimeSeriesSplit` cross-validation:** Training scripts currently use random splits.
3. **Sliding Window dataset:** The `live_sensor_readings` table exists; the windowing logic for Transformer prototyping does not.
4. **Transformer/Mamba prototype:** Not started. Timeline: Month 2–3.
5. **pgvector RAG:** `pgvector` extension not yet enabled in Supabase. Embedding script not yet written.

---

## 5. IoT Firmware: Actual `.ino` State & Issues

**File:** `docs/firmware/grainhero_main_final.ino` (1,591 lines)

### What It Does (Verified)
- **Sensors:** BME680 (primary: temp, humidity, gas resistance, pressure, altitude, TVOC proxy), DHT11 ×2 (backup temp/humidity), LDR (ambient light), Soil moisture probe (capacitive grain moisture proxy)
- **Actuators:** Servo motor (lid open/close with state machine), PWM fan via GPIO 26, LED indicators (GPIO 12, 14, 25)
- **Communication:** WiFi + PubSubClient MQTT + Firebase REST API (HTTPS via WiFiClientSecure) + SD card logging
- **Control modes:** AUTO (ML/cloud decision) and MANUAL (human override with 10-minute timeout)
- **Safety:** Fumigation lockdown flag, lid/fan state machine with minimum run times (3s), debounce (1s), human override timeout (10 min)

### Critical Issues Found in the `.ino`

> [!CAUTION]
> The following security credentials are **hardcoded in the firmware** and are now public via GitHub:

1. **`FIREBASE_AUTH = "9VmddGd8EjIYCfCwoI6Kl6RnSOEaCIDfC62gmDXg"`** — the revoked database secret. Still in the code. Must be removed and replaced with the service-account JWT flow.
2. **`WIFI_SSID = "Project1"` / `WIFI_PASSWORD = "student123"`** — hardcoded WiFi credentials. Unacceptable for any deployment.
3. **`MQTT_BROKER = "192.168.100.229"`** — hardcoded local IP. Breaks the moment the network changes.
4. **`BACKEND_BASE_URL = "http://192.168.100.229:5000/api/iot"`** — hardcoded local backend. Non-functional outside lab.
5. **`AUTH_TOKEN = "GrainHero_Secret_2026"`** — hardcoded local auth token in plaintext.

### Optimization Opportunities (No Logic Changes)
- Remove `DUAL_WRITE_TO_BACKEND` dead code path (always-true flag to a defunct local server)
- Move `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_BROKER` to compile-time `#define` blocks at the top for easy multi-silo config
- The DHT11 readings are used as backup but never averaged with BME680 — add a sensor-fusion averaging step
- SD card `dataFile` is declared globally but opened/closed per write — restructure to keep handle open
- Add `esp_task_wdt` (watchdog timer) for the auto-reconnect requirement

---

## 6. Deployment Architecture Decision

### Evaluation Matrix

| Criterion | Render (Free) | Hugging Face Spaces | Railway | Fly.io (Free) |
|---|---|---|---|---|
| **Free-tier viability** | ✅ Docker free, 750h/month | ✅ CPU free, sleeps | ⚠️ $5/month min | ✅ 3 shared VMs free |
| **Cold start** | ⚠️ ~30s after 15min idle | ⚠️ 30–60s after idle | ✅ Faster | ✅ Minimal |
| **Serves `.onnx` + FastAPI** | ✅ Native Docker | ✅ Works but fights arch | ✅ | ✅ |
| **Hot-swap model update** | ✅ Pull from Supabase Storage, no redeploy | ⚠️ Requires redeploy | ✅ | ✅ |
| **Cron polling impact** | ✅ Cron keeps it warm | ✅ Cron keeps it warm | ✅ | ✅ |
| **File asset workflow** | ✅ No redeploy — models stored in Supabase, hot-swapped in-process | ❌ Full redeploy for asset change | ✅ | ✅ |
| **Production path** | Upgrade to Render Starter ($7/month) | HF Inference Endpoints ($0.06/hr) | $5+/month | $3+/month |

### Recommendation

**Pilot:** **Render Free Tier.** The `render.yaml` and `Dockerfile` are already in `ml-deploy/`. The hot-swap architecture (models stored in Supabase Storage, pulled at runtime) means model updates never require a redeploy. The Supabase cron job pinging every 5 minutes keeps the service warm.

**Force-to-Paid trigger (explicit):** Render Free caps at 750 compute-hours/month (~1 instance running 24/7 for ~31 days). The moment you have a second paying customer requiring guaranteed uptime, upgrade to Render Starter ($7/month) for always-on. This is the specific migration trigger — not a vague "eventually."

**Production (10+ customers):** **Render Starter** ($7/month). Fly.io is the backup if Render has region issues in Pakistan.

**Hugging Face verdict:** Use ONLY as a public showcase / viva demo mirror. The `ml-deploy/` service is architecturally incompatible with HF Spaces (it's a multi-process FastAPI service with background threads and Supabase writes). HF is not the right host for this service.

---

## 7. MQTT Broker Decision

**Current state:** Hardcoded to `192.168.100.229:1883` (local Mosquitto). Breaks on any network change.

### Comparison

| Option | Connection Limit | Throughput | TLS | 3-Silo Scale | Cost |
|---|---|---|---|---|---|
| **EMQX Cloud Serverless** | 1,000 simultaneous | 1M msg/month free | ✅ | ✅ | Free to ~$0.15/M msgs |
| HiveMQ Cloud Free | 100 connections | Limited | ✅ | ⚠️ | Free |
| AWS IoT Core Free Tier | Unlimited devices | 500K msgs/month free | ✅ | ✅ | $0.08/M after |
| Adafruit IO | 30 feeds, 30 msg/min | Very low | ✅ | ❌ | Free |
| Self-hosted Mosquitto (VPS) | Unlimited | High | ✅ manual | ✅ | $3–5/month VPS |

### Recommendation

**Primary: EMQX Cloud Serverless.** Free tier covers 1,000 simultaneous connections and 1M messages/month — more than sufficient for 3 silos (each sending 1 reading/minute = ~130K messages/month). TLS is built-in. No server to maintain.

**Fallback: Self-hosted Mosquitto on a $3/month Hostinger VPS.** Shares the same VPS as ChirpStack for LoRaWAN. Full control, unlimited throughput, add TLS via Let's Encrypt.

**Action required for `.ino`:** Replace `#define MQTT_BROKER "192.168.100.229"` with the EMQX Cloud hostname and add TLS cert via `espClient.setCACert(...)`.

---

## 8. Legacy-Backend Go/No-Go Verdict

**Verdict: ✅ ALREADY DELETED. There is nothing to delete.**

Direct inspection confirms: `legacy-backend/` does **not exist** in the current repository after the pull from `Ai/Ml-Branch`. It was deleted in a prior commit. There are also no `server.js` files anywhere in the repository.

`ml-deploy/` is the canonical replacement for all legacy Python ML logic. `src/lib/` TypeScript functions replace all legacy Node.js API logic. The migration is complete on this front.

**One caveat:** `src/ml/` still contains old `.pkl` files (`ensemble_model.pkl`, `smartbin_model.pkl`, `rice_ensemble_model.pkl`) and `smartbin_predict.py`. These are referenced in `ai-inference.functions.ts` as the subprocess fallback. They are the **last remnant** of the old pipeline. Once the Render service is live and verified, these can be deleted. Do not delete them before the Render service is confirmed working.

---

## 9. OTA Firmware Strategy

**Problem:** 3 silos, 3 grain-specific firmware/config profiles, physical USB required today.

### Recommendation: ESP-IDF Native OTA + Supabase as Firmware CDN

**Architecture:**
1. **Supabase Storage bucket `firmware-updates/`** stores compiled `.bin` files keyed by: `{grain_type}/{version}/firmware.bin`
2. **ESP32 at boot and every 6 hours:** calls a new endpoint `GET /api/public/v1/firmware/latest?grain={grain_type}` which returns `{ version, url, sha256 }`.
3. **If version differs from current:** ESP32 downloads `.bin` from the signed Supabase URL, verifies SHA256, uses `esp_ota_begin / esp_ota_write / esp_ota_end` to flash the inactive OTA partition, reboots.
4. **Silo registry mapping:** `sensor_devices` table already has `silo_id`. Add a `grain_type` column. The firmware endpoint reads this to return the correct binary.

**Why not a managed fleet service:**
- Golioth ($0.10/device/month) and AWS IoT Device Management add cost and complexity unnecessary for 3 silos.
- ESP-IDF OTA is battle-tested, zero-cost, and already familiar to ESP32 developers.
- Supabase Storage signed URLs handle authentication.

**What the `.ino` needs:** Replace `#ifdef ENABLE_FIREBASE false` gate with OTA check code using `esp_ota_get_running_partition()` and `esp_https_ota()`. This is a 60-line addition.

---

## 10. RAG: Automated Paper Sourcing Design

**Current state:** 52 curated PDFs already chunked and in context. `pgvector` not yet enabled in Supabase.

### Architecture (API-first, incremental)

**Step 1: Enable pgvector**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE research_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id    text NOT NULL,
  source      text NOT NULL,  -- 'arxiv' | 'semantic_scholar' | 'manual'
  title       text,
  chunk_index int  NOT NULL,
  chunk_text  text NOT NULL,
  embedding   vector(768),    -- text-embedding-004 dimensions
  ingested_at timestamptz DEFAULT now()
);
CREATE INDEX ON research_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Step 2: Auto-sourcing script (`scripts/source_papers.py`)**

Priority API order (no scraping):
1. **arXiv API** (`export.arxiv.org/api/query?search_query=...&max_results=20`) — free, no key
2. **Semantic Scholar API** (`api.semanticscholar.org/graph/v1/paper/search`) — free, 100 req/5min
3. **CrossRef API** (`api.crossref.org/works?query=...`) — free, no key
4. **IEEE Xplore API** — requires free API key, use for IEEE papers only
5. **Web scraping** — fallback only, with `robots.txt` compliance check first

**Relevance filter (before ingestion):**
```python
DOMAIN_KEYWORDS = [
    "grain storage", "post-harvest", "spoilage prediction", "grain moisture",
    "aflatoxin", "silo monitoring", "sensor fusion", "TinyML", "edge AI",
    "RAG", "retrieval augmented", "food loss", "fungal detection",
    "insect detection stored grain", "grain temperature"
]
# Accept paper if title + abstract contains ≥2 domain keywords
```

**Incremental ingestion:**
- Track ingested papers by `paper_id` (arXiv ID or DOI) in `research_embeddings`.
- Before embedding: `SELECT COUNT(*) FROM research_embeddings WHERE paper_id = ?` — skip if already exists.
- New papers only: chunk → embed via Google `text-embedding-004` → insert rows.
- No full rebuild ever required.

**Trigger:** GitHub Actions cron — `0 0 * * 0` (weekly Sunday midnight). Also triggered on manual `workflow_dispatch`.

**Wire into AI Insights:** In `ai-insights.functions.ts`, before the Gemini prompt:
```typescript
const { data: chunks } = await supabase.rpc('match_research', {
  query_embedding: await embed(userQuery),
  match_threshold: 0.78,
  match_count: 3
});
// Inject chunks into Gemini system prompt as context
```

---

## 11. IoT Team Funding Deliverable Spec

**Goal:** A complete 3-silo system design that withstands questions from both traditional agricultural investors and technically sophisticated VCs.

### 3-Silo Architecture (One Per Grain Type)

| Silo | Grain | Sensor Pods | Gateway | Fan Relay | Solar Panel |
|---|---|---|---|---|---|
| Silo A | Rice | 4× Pod v2 | RAK7268 (indoor) | 1× Sonoff 4CH Pro R3 | 80W monocrystalline |
| Silo B | Wheat | 4× Pod v2 | (shared gateway) | 1× | 80W |
| Silo C | Maize | 4× Pod v2 | (shared gateway) | 1× | 80W |

### Bill of Materials (Per Pod — Target Production)

| Component | Source | Unit Cost (PKR) | Unit Cost (USD) |
|---|---|---|---|
| RAK3172-SiP (LoRaWAN Class A) | RAKwireless | 3,360 | $12 |
| Sensirion SHT45 (Temp/RH ±0.1°C) | Digi-Key | 2,240 | $8 |
| Sensirion SCD40 (CO2 NDIR) | Digi-Key | 4,200 | $15 |
| 2× Samsung 18650 Li-ion | Local Lahore | 1,400 | $5 |
| IP68 ABS sphere (60mm) | Local injection molder | 1,120 | $4 |
| PTFE gas membrane patch | Parker USA | 560 | $2 |
| 2-layer PCB (JLCPCB) | JLCPCB China | 700 | $2.50 |
| BMS + holder | Local | 560 | $2 |
| Misc (JST connectors, epoxy) | Local | 560 | $2 |
| **Pod Total** | | **~14,700** | **~$52.50** |

### Solar Off-Grid Power Savings (PKR)
- Current grid electricity cost for 3 continuous 50W fans: ~3.6 kWh/day × PKR 50/kWh = **PKR 180/day = PKR 5,400/month**
- 3× 80W solar panels (total 240W, charges 18650 bank, powers sensors + fans): PKR 0/month for IoT nodes
- **Annual IoT electricity savings: ~PKR 64,800 (~$230)** per 3-silo installation
- At 100 installations: **PKR 6.48M/year (~$23,000)** in farmer electricity savings — a compelling ROI story

### PCB Design Requirements
- 2-layer FR4, 60×60mm max
- I2C bus: SHT45 + SCD40 on same bus (different addresses: 0x44, 0x62)
- RAK3172 on UART2
- Battery: JST-PH 2-pin, BMS-protected
- Deep sleep current target: <50µA
- Wake interval: 15 minutes (configurable via LoRaWAN downlink)

---

## 12. Mechanical Team Funding Deliverable Spec

**Goal:** A complete 3-silo 3D design that bridges from lab demonstration to thousands-of-tonnes commercial scale.

### SolidWorks Deliverables (Per Silo)

1. **Whole-system 3D view:** Corrugated G550 galvanized steel silo, 100-tonne capacity, conical roof (30° pitch), external access ladder, bottom aeration duct network, roof hatch for pod installation
2. **Aeration system view:** Full perforated false floor OR Y-shaped aeration ducts, centrifugal fan mount (5HP, external), airflow path from bottom vents through grain mass to top exhaust vents
3. **Sensor pod detail view:** IP68 spherical enclosure, PTFE membrane location, internal PCB arrangement, hanging carabiner mount from roof hatch
4. **Foundation view:** Concrete ring beam, hopper bottom or flat floor with sweep auger cutout

### Required Simulation Runs

| Simulation | Tool | Goal |
|---|---|---|
| **CFD Aeration** | SolidWorks Flow Simulation | Prove air distributes evenly through grain mass; show hot-spot elimination |
| **Structural Load** | SolidWorks Simulation | Grain static load on silo walls and foundation (100T wheat ≈ 980 kN) |
| **Thermal gradient** | SolidWorks Flow | Show temperature differential between top and bottom of grain mass with/without fan |

### The Business Narrative (Scale Bridge)

**From the lab (3 silos, ~300T capacity):**
- 3 sensor pods per silo = 12 pods total
- Total system cost: IoT only = ~$1,828; with silo structure = ~$4,689

**To national scale (10,000 silos, 1M tonnes):**
- Pakistan stores ~25M tonnes of wheat annually; majority in traditional mud silos with >15% loss
- GrainHero at 10% loss reduction → saves **2.5M tonnes × PKR 10,000/tonne = PKR 25 billion**
- At $99/month SaaS × 10,000 customers × 12 months = **$11.88M ARR**

**Expansion Markets:**
- Fruits and vegetables (higher spoilage rate, higher value crop)
- Animal feed and fertilizer storage (same sensor stack, different ML model)
- International: Bangladesh, Egypt, Nigeria — same post-harvest loss pattern

---

## 13. Curriculum-Generation Prompt (Standalone)

Copy and paste this into a fresh Claude conversation:

---

```
You are a world-class technical curriculum designer. Build a comprehensive, pragmatic, video-first learning curriculum for the GrainHero FYP team — a multi-disciplinary engineering team building an AI-driven IoT grain silo monitoring system. The team includes software engineers, an IoT/firmware engineer, an ML specialist, and a mechanical engineer.

CRITICAL RULES FOR THE CURRICULUM:
1. VIDEO-FIRST: For every topic, the primary resource must be a specific YouTube video, playlist, or course — not documentation.
2. 80/20 RULE: Each topic should cover the 20% of knowledge that enables 80% of the work. No exhaustive coverage.
3. FREE CERTIFICATES: Where a free certificate is available (Coursera audit, Google free tier, etc.), list it explicitly.
4. PORTFOLIO ARTIFACT: Every topic must end with one concrete artifact the learner must build and add to their portfolio.
5. ASSESSMENT REQUIRED: Each topic ends with 3 specific exam-style questions to self-assess understanding.
6. RETAIN EVERYTHING: Do NOT drop any topic from previous versions of this curriculum.

TOPICS TO COVER (retain all existing + add new):

[EXISTING — DO NOT DROP]
- Supabase: PostgreSQL schema design, Row Level Security, Edge Functions, Supabase Storage, pgvector
- LoRaWAN: RAK3172 nodes, ChirpStack network server, gateway configuration, packet decoder
- Solar/off-grid power: sizing panels, battery banks, BMS for IoT deployments
- Agronomy: grain storage science, moisture equilibrium, aflatoxin formation, FAO guidelines
- RAG (Retrieval-Augmented Generation): chunking strategies, embedding models, vector similarity search
- ONNX: model export from scikit-learn/XGBoost, OrtInferenceSession, benchmarking
- Cron jobs and serverless edge functions: Supabase cron, TanStack Start SSR handlers

[NEW — ADD IN FULL WITH VIDEO-FIRST FORMAT]
- Render: deploying a Dockerized FastAPI service, render.yaml config, free vs paid tier, autoDeploy, environment variables, health check endpoints
- FastAPI: async endpoints, BackgroundTasks, Pydantic validators, CORS, lifespan hooks, uvicorn workers
- GitHub Actions / Workflows: CI/CD pipelines for Python and TypeScript projects, workflow_dispatch, secrets management
- Transformer architecture fundamentals: attention mechanism, positional encoding, why it beats RNNs for time-series (focused on applied understanding, not math-heavy)
- Mamba (State Space Models): how Mamba differs from Transformers for long sequences, why it matters for IoT time-series data, practical application
- Hugging Face: Spaces deployment (Gradio/FastAPI), Inference Endpoints, model hosting, the cold-start problem, when to use vs alternatives
- Arduino/ESP32 firmware: platform.io setup, deep sleep, WiFi reconnect watchdog, OTA updates via esp_https_ota, MQTT with PubSubClient
- Firebase: Realtime Database structure, REST API auth with service account JWT, Firebase Admin SDK, security rules

[NEW SECTION — UNDERSTANDING THE GRAINHERO CODEBASE ITSELF]
Add an explicit section: "Reading and Contributing to GrainHero"
Cover the following, reading directly from the actual repo to build study material:
- Database schema tour: key tables (silos, sensor_readings, sensor_devices, spoilage_predictions, live_sensor_readings, model_versions), their relationships, and why each exists
- API endpoints tour: /api/public/cron/sync-firebase, /api/public/v1/sync/*, /predict (FastAPI)
- ML pipeline tour: how a reading flows from Firebase RTDB → sync-firebase → ai-inference.functions.ts → ml-deploy/app.py → spoilage_predictions table
- Firmware tour: grainhero_main_final.ino — the SensorData struct, MQTT topics, Firebase polling, state machine for lid/fan
- Key architectural decisions to understand: Why ONNX over pkl, why hot-swap over redeploy, why Firebase for IoT telemetry + Supabase for analytics, why TanStack Start over Next.js
Portfolio artifact: Write a 500-word technical onboarding guide for a new team member, explaining one data path end-to-end.

For each topic, structure the output as:
## [Topic Name]
**Why it matters for GrainHero:** [1 sentence]
**Primary Resource:** [Specific YouTube video/playlist title + channel + URL]
**Supplementary:** [1 doc link max]
**Free Certificate:** [Link or "None available"]
**80/20 Focus:** [The 3 most important things to learn]
**Portfolio Artifact:** [What to build]
**Self-Assessment (3 questions):** [3 specific questions]
```

---

## 14. Self-Audit Checklist

- [x] **RAG paper-sourcing script** designed with API-first sourcing (arXiv → Semantic Scholar → CrossRef → IEEE → scrape fallback) and incremental ingestion via paper_id deduplication
- [x] **Render vs HF vs alternatives** evaluated against all 5 criteria; Render Free recommended for pilot with explicit migration trigger (750h cap → 2nd customer → Render Starter $7/month)
- [x] **MQTT broker** compared across 5 options; EMQX Cloud Serverless primary, self-hosted Mosquitto fallback
- [x] **Legacy-backend go/no-go**: GO (already deleted). `src/ml/` subprocess fallback is the only remnant — safe until Render service verified
- [x] **Deployment architecture** organized and validated end-to-end; gaps flagged (Pest_Presence unwired, pgvector not enabled, credentials in firmware)
- [x] **OTA firmware strategy** specified: ESP-IDF native OTA + Supabase Storage CDN + silo registry grain_type mapping
- [x] **`.ino` audit**: 5 critical security issues identified, optimization opportunities listed, logic changes explicitly avoided
- [x] **IoT funding deliverable** specified: 3-silo BOM, PCB requirements, solar savings quantified in PKR
- [x] **Mechanical funding deliverable** specified: SolidWorks views, 3 simulation types, $1.3B figure used with correct attribution
- [x] **Curriculum prompt** updated with all new tech, GrainHero codebase section added, nothing dropped
- [x] **Master document built last**, reflecting actual repo state post-pull

---

*This document reflects the verified state of the GrainHero codebase as of 2026-07-25T00:51+05:00, after the `git pull` from `Ai/Ml-Branch` (commit `f85acd7`). All technical claims are backed by direct file inspection.*


################################################################################
# BUSINESS PLAN v4
################################################################################

# GrainHero & TEQrock — Business Plan
## Version 5.0 | July 2026 | NICAT Cohort 7 | Pilot Phase Active

> **Document scope:** GrainHero (flagship product) under TEQrock holding company. Covers the problem, solution, market, revenue model, go-to-market strategy, and financial projections.

---

## EXECUTIVE SUMMARY

**The Problem:** Pakistan loses an estimated **4.5–7.5 million tonnes of grain annually** — 15–25% of total production — to post-harvest spoilage. At 2026 market rates (**PKR 90,000–120,000/tonne**), this is **PKR 250–350 billion (~$1.1 billion USD) lost every year** in facilities with no monitoring, no early warnings, and zero data. Modern silo storage covers only **3.2% of total Pakistani grain capacity** — leaving 96.8% completely unmonitored. The global post-harvest loss figure exceeds **$1.3 trillion annually** (FAO, 2023).

**The Solution:** GrainHero is an **AI-driven, industrial IoT platform** that predicts and prevents post-harvest grain spoilage. It deploys wireless sensor pods inside grain stores, runs a machine learning ensemble for real-time spoilage-risk prediction across 5 grain types (Rice, Wheat, Maize, Sorghum, Barley), triggers physical interventions (automated fan aeration), and delivers actionable advisories via a full-stack web dashboard — with integrated insurance claim management, audit logs, and an AI research advisor. Engineered for emerging market constraints: off-grid solar, loadshedding resilience, Urdu interface, and hardware under $80/pod at scale.

**NICAT Status:** Cohort 7 participant. Pitched at NICAT Mentor Gala, Career Fair, Open House EXPO, RAS Expo, AeroFusion. Registered for SEE Pakistan 2026.

**Current Stage:** Pilot-ready. Full-stack web platform operational. Five ML models trained and deployed. IoT firmware complete. Actively transitioning to real-world sensor data via a partner flour mill pilot.

**Founders:**
- **Co-Founder A:** AI/ML, IoT/Firmware, Cloud Infrastructure, Business Development
- **Co-Founder B:** Backend Architecture, Full-Stack Web, ML Pipeline

---

## SECTION 1 — THE PROBLEM

### 1.1 The Grain Storage Crisis in Pakistan

| Statistic | Value | Source |
|---|---|---|
| Annual wheat production | 27–30 million tonnes | USDA GAIN 2025 |
| Modern silo storage coverage | ~3.2% of total production | PBC Research, 2024 |
| Post-harvest loss rate | **15–25%** | FAO FLW Database |
| Annual grain loss (tonnes) | **4.5–7.5 million tonnes** | Calculated |
| Economic loss | **PKR 250–350 billion (~$1.1B USD)** | 2026 market prices |
| Storage gap (unmet formal capacity) | **22+ million tonnes** | PBC Research, 2024 |

### 1.2 Why Monitoring Doesn't Exist Today

| Barrier | Current Reality | GrainHero Fix |
|---|---|---|
| **Cost** | Global IoT platforms: $5,000–40,000/silo | GrainHero: $300 hardware + $99/month SaaS |
| **Power** | 8–14h loadshedding daily | Solar gateway + UPS backup + 21-month battery pods |
| **Connectivity** | Unreliable WiFi in rural areas | LoRaWAN (no WiFi needed) + offline SD-card buffer |
| **Expertise** | No technical staff at most facilities | Zero-configuration sensors, single-button app |
| **Language** | English-only global platforms | Urdu + Arabic UI |
| **Insurance** | No digital trail for claims | Integrated insurance module with automated evidence capture |

---

## SECTION 2 — THE SOLUTION

### 2.1 What GrainHero Does

| Feature | Status | Value to Customer |
|---|---|---|
| Real-time temperature, humidity, gas monitoring | ✅ Working | Know exactly what's happening inside the silo |
| AI spoilage risk prediction (3 risk classes) | ✅ Working | Early warning 7–14 days before visible damage |
| Automated fan/aeration control | ✅ Working | Physical intervention without human action |
| Multi-grain support (5 grain types) | ✅ Working | One platform for all crops |
| Insurance claim management | 🔄 In Progress | Digital evidence trail, automated claim lifecycle |
| AI Research Advisor (RAG) | 🔄 Planned | Gemini-powered advisor grounded in scientific literature |
| Over-the-air firmware updates | 🔄 In Progress | Update all silos remotely without physical access |

### 2.2 Key Competitive Advantages

GrainHero has **6 unique differentiators** that no competitor has combined:
1. ✅ **AI ensemble prediction** — grain-type specific, 5 crop types, explainable AI
2. ✅ **Frugal hardware** — under $80/pod vs. $500+/node (competitors)
3. ✅ **Hermetic bag IoT monitoring** — the only such product in the world; extends grain shelf life to 12–18 months without fumigation chemicals
4. ✅ **Offline-first architecture** — fully loadshedding-resilient (SD buffer + LoRaWAN)
5. ✅ **Urdu + Arabic language support** — built for the actual user, not the investor
6. ✅ **Integrated insurance module** — automated evidence capture and full claim lifecycle

---

## SECTION 3 — MARKET ANALYSIS

### 3.1 Total Addressable Market

| Market | Addressable Facilities | Price Point | TAM | Priority |
|---|---|---|---|---|
| Pakistan grain warehouses & mills | ~9,200 | $99–199/mo | ~$12M/yr | ⭐ Year 1 |
| Middle East grain reserves (KSA, UAE) | ~3,500 | $299/mo | $12.6M/yr | Year 2–3 |
| Sub-Saharan Africa (cooperatives) | ~50,000+ | $29/mo | $17.4M/yr | Year 3–5 |
| **Global Infrastructure Potential** | | | **$2.1B+/yr** | Long-term |

### 3.2 Pakistan Market Segments

| Segment | Size | Willingness to Pay | Strategy |
|---|---|---|---|
| **Flour mills** | ~2,000 in Punjab | HIGH | ⭐ Primary pilot target |
| Agri cooperatives | ~500 active | MEDIUM | Group purchase discounts |
| PASSCO / Government | 1.3M tonne capacity | LOW | Year 2, formal tender |
| Private traders | ~5,500 sites | LOW | Starter tier pricing |

### 3.3 Competitive Landscape

| Competitor | Geography | Price | AI? | GrainHero Advantage |
|---|---|---|---|---|
| Bin-Sense (Canada) | North America | $10K–40K/bin | ❌ | 15× cheaper, AI included |
| SiloBoss (Australia) | AU/NZ | $8K–25K/silo | ❌ | Frugal design, emerging market fit |
| StorMax (India) | India/SE Asia | $200–500/yr | ❌ | ML actuation, Pakistan-specific |
| Grain Guard (AU) | AU | $5K–15K | ❌ | 6–10× cheaper, solar native |
| **GrainHero** | **PK → Global** | **$49–299/mo** | **✅** | **All 6 unique advantages** |

---

## SECTION 4 — REVENUE MODEL & UNIT ECONOMICS

### 4.1 Subscription Tiers

| Tier | Price/Month | Included | Target |
|---|---|---|---|
| **Starter** | $49 | 2 silos, basic alerts, heuristic risk | Small farmer, trader |
| **Professional** | **$99** | 10 silos, AI predictions, PDF reports, insurance | Warehouse owner |
| **Enterprise** | $199 | Unlimited silos, SHAP explainability, multi-site | Flour mills, cooperatives |
| **Platform** | $299 | White-label, API access, reseller rights | Distributors |

### 4.2 Hardware Bundles (One-Time)

| Bundle | Contents | Price |
|---|---|---|
| Starter Kit | 4 sensor pods + LoRaWAN gateway | $300 |
| Professional Kit | 8 pods + gateway + fan relay | $600 |
| Enterprise Kit | 20 pods + 2 gateways + UPS | $1,200 |

### 4.3 Additional Revenue Streams

| Stream | Mechanism |
|---|---|
| **Insurance Commission** | 10–15% referral fee when insurers offer discounts to GrainHero customers |
| **Export Traceability** | QR-coded EU RASFF compliance certificates ($0.50–1.00/tonne) |
| **Solar Hardware Sales** | Off-grid solar kits (35% margin) |
| **Data Licensing** | Aggregated regional grain quality indices sold to commodity traders (Year 3) |

### 4.4 Unit Economics (Professional Tier)

| Metric | Value |
|---|---|
| MRR per customer | $99 |
| Year-1 total revenue per customer (SaaS + hardware) | **$1,488** |
| Total COGS per year | ~$270 |
| **Gross Margin** | **~82%** |
| Customer Acquisition Cost (Pakistan) | $150–400 |
| LTV (3-year, 85% renewal) | **$3,018** |
| **LTV/CAC Ratio** | **7–20×** |
| **Break-even Customers** | **19** |

### 4.5 Revenue Projections

| Year | Region | Customers | Total Revenue |
|---|---|---|---|
| **Year 1** | Pakistan | 15 | **$22,500** |
| **Year 2** | PK + UAE | 70 | **$196,000** |
| **Year 3** | PK + ME + Africa | 200 | **$750,000** |

---

## SECTION 5 — PARENT COMPANY: TEQrock

GrainHero is the flagship product of **TEQrock**, an emerging-market infrastructure holding company deploying AI and IoT solutions where traditional infrastructure fails.

```
TEQrock (Holding Company)
│
└── GrainHero   ←  FLAGSHIP — Multi-crop post-harvest storage intelligence
```

TEQrock's long-term vision is to build a portfolio of AI/IoT products across agriculture, energy, and industrial sectors in Pakistan and the broader emerging-market corridor — all sharing the same IoT hardware platform, cloud infrastructure, and billing layer built for GrainHero. **GrainHero is the sole active product.**

---

## SECTION 6 — GO-TO-MARKET STRATEGY

### 6.1 GTM Timeline

| Milestone | Timeline |
|---|---|
| Pilot silo live at partner flour mill | Month 1–2 |
| First 3 paying customers (flour mills) | Month 3–4 |
| 15 paying customers; trade show presence | Month 5–8 |
| Urdu/Arabic UI live; UAE first customer | Month 9 |
| IGNITE grant application submitted | Month 9–12 |
| 40 customers; Series A preparation | Year 2 Q1 |
| Africa pilot (Rwanda entry point) | Year 2 Q3 |
| Series A close at $750K ARR | Year 3 |

### 6.2 Sales Approach

1. **Direct to flour mills:** Live demo at the pilot silo. A single 5-tonne grain loss = PKR 500,000 — equivalent to **5 months of our subscription**. ROI pays back in under 30 days of loss prevention.
2. **Distributor network:** 15–20% channel commission for agri-equipment distributors already selling silos and fumigation gear.
3. **Government/PASSCO:** Formal tender process in Year 2, using pilot data as proof-of-concept.

### 6.3 Non-Dilutive Funding Pipeline

| Grant | Amount |
|---|---|
| **IGNITE Pakistan** (ICT R&D Fund) | $10K–$100K |
| **USAID AgriTech Challenge** | $25K–$250K |
| **Gates Foundation AgDev** | $50K–$500K |
| **FAO Innovation Lab** | $10K–$50K |
| **World Bank IFC Agrifin** | $25K–$200K |

---

## SECTION 7 — RISK ANALYSIS

### 7.1 Key Business Risks

| Risk | Mitigation |
|---|---|
| ML accuracy on real-world data lower than synthetic | All marketing uses "AI-assisted" framing; pilot data will retrain models |
| Supabase pricing change | PostgreSQL-compatible — can self-host on EC2 if needed |
| Bus factor (small founding team) | Architecture documented in `PROJECT_MASTER_DOCUMENT.md` |
| Hardware supply chain disruption | 90-day component buffer; dual-sourced MCU options |

---

## SECTION 8 — FINANCIAL SUMMARY & FUNDING ASK

### 8.1 Funding Status

| Round | Status | Amount |
|---|---|---|
| Bootstrapped | Active | ~$2,000 (hardware + cloud) |
| NICAT Cohort 7 | Active | Non-cash mentorship |
| IGNITE Grant | Planned Q4 2026 | $10K–$100K target |
| Pre-Seed / Angel | Open | $50K–$150K target |
| Series A | Year 3 | $500K–$1M target |

### 8.2 Year 3 Return Scenario (200 Customers)

| Metric | Value |
|---|---|
| Total ARR | $750,000 |
| Gross Margin | ~82% |
| Annual Operating Costs | ~$136,800 |
| **Net Operating Income** | **~$478,200** |
| Equity Valuation (10× ARR) | **~$7.5M** |

---

*Document version 5.0. July 2026. Sources: FAOSTAT, USDA GAIN 2025, PBC Research 2024, FAO FLW Database.*
*Prepared by TEQrock / GrainHero founding team.*


################################################################################
# AI CHAT LOG (ALL SESSIONS)
################################################################################

# AI Chat Log for GrainHero

This file automatically tracks our conversation context. 
*(Future AI: Please read this to understand where we left off).*

---

## Session: 2026-08-09 — ML Deep-Dive & Full System Explanation

### What Was Discussed
User requested a comprehensive explanation of:
1. All pending ML tasks from `ML-INTERNEE_TASKS.md` — what they are, how they help, what they do
2. How the RAG pipeline works and its benefit to the project
3. The complete ML workflow end-to-end (ESP32 → MQTT → Supabase → ONNX inference → prediction)
4. Rolling windows and TimeSeriesSplit — explained in detail with diagrams
5. External tools (MLflow, Evidently, Prophet, Isolation Forest, River, LangSmith, etc.)
6. Recent git commit history analysis (last 5–10 commits)
7. Ran frontend + ML servers (frontend needed `npm install` first)

### Key Findings
- **`ml-deploy/rag/` directory does NOT exist in current branch.** The `CHANGES_AND_IMPLEMENTATION_SUMMARY.md` describes RAG files (rag_ingest.py, rag_retrieval.py, rag_agent.py, rag_harvester.py) as built, but they are not committed to `Ai/Ml-Branch`. These may be in another workspace/branch.
- **Current `fast_retrain.py` still uses `train_test_split`** (wrong for time-series). Task 5.2 (TimeSeriesSplit) not yet implemented.
- **`_spoilage_trend()` in app.py** is still the old EMA-only version (Tasks 2.4 & 2.5 not done yet).
- **Render ML service is live** after the OOM fixes in commits `39e07d4`, `65622e7`, `e947e7b`.
- **Frontend fails to start** if `node_modules` not present — `npm install` required.
- Firmware `.bin`/`.elf` compiled binary files were committed in `0a5ca41` — these are large files (18MB+) that shouldn't be in git.

### Artifact Created
- `grainhero_ml_explained.md` in brain artifacts — comprehensive guide covering all ML tasks, RAG pipeline, time-series split, sliding windows, external tools, and git history.

### Next Recommended Actions (Priority Order)
1. Find and merge RAG pipeline files (`ml-deploy/rag/`) into this branch
2. Implement Task 2.4 (history injection) in `ml-deploy/app.py`
3. Implement Task 2.5 (rate + projection trend upgrade)
4. Build AlertEngine (Task 3.2)
5. Fix `fast_retrain.py` to use `TimeSeriesSplit` (Task 5.2)
6. Add Mark Outcome buttons (Task 5.1) — starts building real training data

---

## Session: 2026-08-10 — Clarifications on ML Architecture & Errors

### What Was Discussed
- **Transformers vs. Current Models:** Clarified that we are *not* using Transformers. The dashboard shows Gradient Boosted Trees (XGBoost/LightGBM), Isolation Forest, and LSTM. Our future H3 plan uses Mamba (State Space Models), which are actually an alternative to Transformers.
- **TimeSeriesSplit vs. Rolling Windows:** Explained the difference: Rolling Windows format the data so the model can see trends (input structure); TimeSeriesSplit ensures we don't "cheat" by looking at future data when testing the model's accuracy (evaluation strategy).
- **Terminal Error (`uvicorn` not found):** Diagnosed the `start_ml_server.ps1` failure as a missing Python package or inactive virtual environment.
- **RAG Harvester Fallback:** Confirmed we can modify the harvester to generate a weekly list of URLs for papers that block bots, allowing the user to download them manually and drop them into the ingestion folder.

---

## Session: 2026-08-06 — Mega Strategy Session + Codebase Audit + 4-Week Plan

### Codebase Audit Results
**5 tasks DONE, 29 tasks NOT STARTED** (of 34 total roadmap tasks):
- ✅ Task 0.1: WiFiManager in firmware
- ✅ Task 0.2: computePestMoldRisk in firmware
- ✅ Task 1.3: .gitignore updated (ONNX/PKL excluded)
- ✅ Task 2.2: ML service deployed to Render (Docker, live at grainhero-ml-service.onrender.com)
- ⚠️ Task 2.1: ONNX files exist locally but upload to Supabase Storage not confirmed
- ❌ Everything else: Tasks 2.3–8.2 not yet started

### Critical Blocker
Owner must complete Tasks 0.3, 1.1, 1.2, 1.4, 2.1 (EMQX, Supabase bucket, GitHub Secrets, Render Hook, model upload) before intern work can unblock.

### Major Context Updates — Permanent Directives Added

**Company Structure:**
- TEQrock (holding co) → Subsidiary [GrainHero — NAME BEING CHANGED]
- Expanding beyond grains: cold storage, feed, fertilizers, wood pallets, fruits/veggies, beans
- Color scheme of subsidiary finalized; logo to be redesigned with new name

**Team Structure:**
- 1 AI/ML intern, 6 IoT interns, 3 Mechanical interns, 3 Design interns, 1 HR intern
- Founder has very limited time (side job + startup). All tasks must be fully delegatable.

**Wheat as Primary Focus:**
- ONLY working on wheat grain for the pilot (it is Pakistan's primary grain)
- Rice model exists but is not effective (synthetic + limited validation)
- All other grain models (maize, sorghum, barley) are synthetic FAO-data based
- NEW: Controlled stress-test protocol for collecting REAL wheat dataset (8-week plan)

**IoT Pilot Silo:**
- 4–5 ft physical lab silo being assembled by IoT team
- Owner has sourced all components
- Wheat grain (5–10 kg) needed for testing
- Additional needed: proper grain probe housing, aeration fan+MOSFET, CO₂ sensor (MH-Z19/SCD40)

**Mechanical Team Tasks:**
- Lab silo SolidWorks: basic skeleton done. Finalize for assembly-ready drawings.
- Large-scale (100–1000 tonne) silo design for investor proposal
- SolidWorks Simulations: structural (Janssen equation), thermal, aeration CFD, wind loading
- Standards: ISO 11783, ASME MFC, EN 1612, NFPA 61, FAO post-harvest guidelines

**Design Team Tasks:**
- TEQrock: brand guidelines, one-pager, LinkedIn assets, biz card, pitch deck template
- Subsidiary: NEW NAME (brainstorm: StoraSense, SiloIQ, StorIQ, AgriVault), logo, brand guidelines, pitch deck (12–15 slides), Figma mockups (mobile app + web dashboard), icons (20+), website
- Website: TEQrock corporate + Subsidiary product landing page (Next.js or Framer)

**HR Intern Task:**
- RAG system to scrape funding opportunities from Google, LinkedIn, Instagram
- Research & apply for: PSF, PIF, UNICEF, UNIDO, GSMA, P@SHA, NIC Faisalabad, Tenacious Ventures, NAAI, etc.
- Build investor long-list (20+), competitive analysis (5 global competitors), deadline calendar

**Wheat Dataset Collection (World-Class Methodology):**
- Controlled Stress-Test Protocol (8 weeks): Baseline → Temp stress → Humidity stress → Multi-stress → Aeration intervention
- Target: 5,000–10,000 labeled readings in 8 weeks (2-min sampling, 3 silos)
- Feature engineering: rolling stats, rate-of-change, interaction features, EMC (Henderson-Thompson), accumulated stress index
- Model path: H1 XGBoost ONNX (now) → H2 LightGBM+Prophet+IsolForest → H3 Mamba SSM

**4-Week Plan Created:**
- Week 1: Foundation (Owner tasks + silo assembly start + pgvector + design kickoff + HR setup)
- Week 2: Core build + first data (MQTT live + stress test Day 1 + Tasks 2.4/2.5 complete)
- Week 3: Integration (AlertEngine + RAG + aeration test + pitch deck draft)
- Week 4: Demo prep + investor materials + all UI tasks complete

### Files Created This Session
- `MASTER_PROJECT_DOCUMENT_v3.md` — in project root AND artifacts dir — share with Claude for context
- `codebase_audit.md` — in artifacts dir — full task-by-task audit

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



################################################################################
# CHANGES AND IMPLEMENTATION SUMMARY
################################################################################

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


################################################################################
# RESEARCH PAPER SUMMARIES
################################################################################

--- File: Smartsilo.pdf ---
Ajisegiri, E.S.A.et al. / Int.Artif.Intell.&Mach.Learn. 2(2) (2022) 35-55 Page 35 of 55
Volume 2, Issue 2, July 2022
Received : 22 March 2022
Accepted : 19 June 2022
Published : 05 July 2022
doi: 10.51483/IJAIML.2.2.2022.35-55
Article Info
Abstract
Food security is the aspiration of every nation. To achieve this, particularly in
Developing Countries, there is a need to reduce wastage by storing staple foods
grains beyond their production seasons. Longer storage requires human presence,
monitoring and control of the storage environment which may be laborious,
demanding and sometimes outrightly unsafe. Therefore, the needs to employ
automation and artificial intelligence become necessary to control this storage
environment. This study developed an automated, intelligent silo bin that controls
the storage environment of the system for the small-scale rural farmers, of which
over 70% of their population still depend on agriculture, using Internet of Things
(IoT). The developed system consists of three units interfaced together. These
units are the pro-type 2-ton (2,000 kg) silo structure, the embedded system (made
up of the microcontroller, sensors and relays). The system is integrated to an IoT
system (made up of mobile application (BLYNK), Wi-Fi module and ultrasonic
atomizer) and the air blowing system (consisting of blower fan and heater). The
developed smart system was tested and the test run results showed that it
successfully monitors and controls storage air temperature, humidity, air
pressure, grain moisture, insect infestation and CO 2 levels, the key parameters
for long term storability of grains. The coding process could be set to suit different
grains and storage conditions required for their effective storage. Although the
silo bin structure used for testing was for a particular proto-type, it can be
geometrically scaled for many silo structures.
Keywords: Smart silo, IoT, Artificial intelligence, Embedded system, Ultrasonic atomizer,
Controlled environmen

==================================================

--- File: A53-1823-1989-eng.pdf ---
1^1AgricultureCanada
Spoilage
Prevention,
ontrolS'7CJ
f

DigitizedbytheInternetArchivein2012withfundingfromAgricultureandAgri-FoodCanada-AgricultureetAgroalimentaireCanada
http://www.archive.org/details/spoilageheatingoOOmill



==================================================

--- File: AI-driven_technologies_for_pest_monitoring_unsound.pdf ---
 
 
AI-driven technologies for pest monitoring, unsound kernel detection,
and intelligent aeration in grain storage
Yuanyi Luo1, Dandan Li1*, Jinying Chen1, Yanguang Zhu1, Yiming Ma1, Jie Lin2, Kun Hu1,
Shengbin Lan1, Yue Li1, Weihao Hu3, Hongwei Xiao2*
(1. Sinograin Chengdu Storage Research Institute Co., Ltd., Chengdu 610091, China;
2. College of Engineering, China Agricultural University, Beijing 100083, China;
3. School of Mechanical and Electrical Engineering, University of Electronic Science and Technology of China, Chengdu 611731, China)
Abstract: Grain storage plays a crucial role in safeguarding food security and maintaining market stability, and it has therefore
attracted growing attention from both academia and industry. The primary objective of storage technologies is to minimize post-
harvest  losses  caused  by  pests,  mold,  and  mechanical  damage.  However,  conventional  storage  management  methods,  which
rely heavily on manual labor, are often inefficient and costly. With the rapid advancement of artificial intelligence (AI), various
approaches, such as convolutional neural network (CNN)-based models, Transformer-based frameworks, and emerging Mamba
architectures,  have  been  introduced  into  the  field  of  grain  storage.  This  paper  presents  a  comprehensive  review  of  artificial
intelligence methodologies applied across multiple stages of the grain storage process. From four complementary perspectives,
including  application  significance,  existing  AI  techniques,  comparative  analysis,  and  future  development  trends,  the  review
systematically summarizes current progress in pest monitoring, unsound kernel detection, and intelligent aeration. It critically
examines their respective advantages and limitations, while outlining key challenges and future research directions. The review
aims  to  offer  a  global  perspective  on  the  integration  of  AI  technologies  in  grain  storage  and  to  foster  interdisciplinary
collabo

==================================================

--- File: SensorsforGrainStorageNeethirajanASABE.pdf ---
The authors are solely responsible for the content of this te chnical presentation. The technical presentation does not necessarily reflect the 
official position of the American Society of Agricultural  and Biological Engineers (ASABE), and its printing and distribution d oes not 
constitute an endorsement of views which may be expressed. Techni cal presentations are not subject to the formal peer review process by 
ASABE editorial committees; therefore, they ar e not to be presented as refereed publicat ions. Citation of this work should stat e that it is 
from an ASABE meeting paper. EXAMPLE: Author's Last Name, In itials. 2007. Title of Presentation. ASABE Paper No. 076179. St. 
Joseph, Mich.: ASABE. For information about securing permission to  reprint or reproduce a techni cal presentation, please contac t ASABE 
at rutter@asabe.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA). 
 
 
 
 
 
 
An ASABE Meeting Presentation 
 
Paper Number: 076179
Sensors for Grain Storage  
S. Neethirajan 
Department of Biosystems Engineering, University of Manitoba, Winnipeg, Canada R3T 5V6 
D.S. Jayas 
Distinguished Professor, Canada Research Chair in Stored-Grain Ecosystems, Associate 
Vice-president (Research), University of Manitoba, Winnipeg, MB, Canada R3T 2N2  
Written for presentation at the 
2007 ASABE Annual International Meeting 
Sponsored by ASABE 
Minneapolis Convention Center 
Minneapolis, Minnesota 
17 - 20 June 2007 
Abstract. Post harvest stored grain losses remain a problem . Vigilant post-harvest grain management is the 
most cost-effective means of increa sing the world’s food supply. Spoil age of bulk-stored grain leads to 
decreased nutritional value and poses health hazards due to the formation of irritating volatile metabolites 
inside grain bins. Quality changes in the stored gr ain bulk can be identified by various odors as well as 
increase in carbon dioxide. This paper provides info rmation and analysis about the potential of senso

==================================================

--- File: Design_and_Development_of_a_Model_Smart_Storage_Sy.pdf ---
 
 
© Publisher: Ebubekir Altuntas. This is an Open Access article and 
is licensed (CC-BY-NC-4.0) under a Creative Commons Attribution 4.0 International License. 
 
 
 
 
Turkish Journal of Agricultural  
Engineering Research 
 
https://dergipark.org.tr/en/pub/turkager 
  https://doi.org/10.46592/turkager.1297511 
 
Research Article 
 
 
Turk J Agr Eng Res 
(TURKAGER) 
 
ISSN: 2717-8420 
2023, 4(1), 125-132 
 
Design and Development of a Model Smart Storage System 
 
Omokaro IDAMAaID, Ovuakporaye Godwin EKRUYOTAa*ID 
 
aDepartment of Computer Engineering, Delta State University of Science and Technology, Ozoro, NIGERIA 
 
(*): Corresponding Author: g.o.softsystem@gmail.com 
 
ABSTRACT  
  
Food security has become a global major problem, due to the rapid increase in population growth. This has 
necessity the development of an effective agricultural products’ storage system, to alleviate the problem of 
food wastage. This study was embarked upon to develop a prototype of universal smart storage system for 
farm products, by using the internet of thing (IoT). The storage structure consists of four princi pal 
constituents which were; the power source, storage chamber, central processing system, and peripheral 
component interconnect (PCI) heater and PCI fan. The developed model was tested at a pre-set temperature 
and relative humidity of 32C and 62% RH respectively. The results revealed that the developed system had 
an efficiency of 85%. Though, the smart model had a failure rate of 15%, this smart prototype is a major 
breakthrough in the production of automated storage system for agricultural products.   
 
Keywords: Automation, Environmental conditions, Food security, Smart system, Storage structure 
 
 
INTRODUCTION  
 
Food insecurity is rising daily mostly due to decrease in food production and increase 
in human population. Apart from increase in food production, appropriate storage 
and processing conditions, may help to alleviate the problem of food wasta

==================================================

--- File: neethirajan2008.pdf ---
REVIEW PAPER
Carbon Dioxide (CO 2) Sensors for the Agri-food
Industry—A Review
S. Neethirajan & D. S. Jayas & S. Sadistap
Received: 30 March 2008 / Accepted: 2 October 2008 / Published online: 5 November 2008
# Springer Science + Business Media, LLC 2008
Abstract In the food and agricultural industry, sensors are
being used for process control, monitoring quality, and
assessing safety. There is a growing demand for carbon
dioxide (CO 2) sensors in the bulk food storage sector,
because CO 2 sensors can be used to detect incipient
spoilage and to assess CO 2 levels in modified-atmosphere
packages and storage structures. The market potential for
reliable and inexpensive CO
2 sensors is huge because of a
wide range of applications in the agri-food industry. This
review synthesizes information about the types of CO 2
sensors, analyzes their detection processes, provides a
broad overview of the innovative research on the develop-
ment of sensors, sensing mechanisms, and their character-
istics, and outlines future possibilities for use of CO
2
sensors.
Keywords CO2 sensors . Optical sensors .
Electrochemical sensors . Metal oxide sensors .
Polymer sensors
Introduction
The evolving agriculture and food system has entered in to
a consumer driven era with consumers demanding food
safety, quality, and convenience. To analyze, design,
develop, manage, control, and characterize the biological
and environmental processes in agricultural industry, there
is a need to collect data. This has necessitated the food and
agricultural industry to increasingly rely on sensor technol-
o g y .F o re x a m p l e ,s e n s o r sa r eu s e di nt h ef i e l df o r
monitoring of environmental parameters to help producers
to conduct more efficient irrigation or pest control
programs, on harvesting machinery for measuring yield
per unit area, during storage for measurement of product
temperature, for post harvest grading and sorting of fruits
and vegetables, and for online monitoring of process
par

==================================================

--- File: AgricResCommentaryFoodSecurity12124.pdf ---
COMMENTARY
Storing Grains for Food Security and Sustainability
Digvir S. Jayas
Received: 2 October 2011 / Accepted: 28 November 2011 / Published online: 19 January 2012
/C211NAAS (National Academy of Agricultural Sciences) 2012
Abstract Globally over two billion tonnes of grains are produced annually. The grains are stored at different stages of the
grain distribution chain, in deﬁned units such as bags, silos, warehouses, containers and even in piles on the ground. An
individual unit or a group of units can be managed as man-made ecosystems, where deterioration of the stored grain is a
result of interactions among physical, chemical, and biological factors. Accurate estimates of post-harvest losses of grains
are not available, but it can vary from 1–2% in the developed countries, where grain is stored in well managed facilities, to
20–50% in less developed countries, with poorly managed storage systems. Considerable knowledge has been generated to
understand the critical parameters for developing efﬁcient grain storage systems. Through proper monitoring and man-
agement of interactions, both biotic and abiotic in nature, stored-grains can be protected for over a long period. There is an
urgent need to synthesize the status of knowledge to provide directions for future research and development, to minimize
the post-harvest losses of grains in different regions of the world.
Globally over two billion tonnes (Gt) of cereals, oilseeds,
and pulses (collectively referred to as grains) are produced
annually for consumption by humans and domesticated
animals to meet the nutritional requirement of humans. The
produced grains are stored at different stages of the grain
distribution chain between the producer and the consumer.
Obvious reasons for storing grain are: place of consump-
tion is different than the place of production, production is
seasonal and consumption is year round, place of pro-
cessing is different than the place of production, grains are
kept to deal with 

==================================================

--- File: WirelessDataPA.pdf ---
The authors are solely responsible for the content of this technical presentation. The technical presentation does not
necessarily reflect the official position of the American Society of Agricultural Engineers (ASAE), and its printing
and distribution does not constitute an endorsement of views which may be expressed. Technical presentations are
not subject to the formal peer review process by ASAE editorial committees; therefore, they are not to be presented
as refereed publications. Citation of this work should state that it is from an ASAE meeting paper EXAMPLE:
Author's Last Name, Initials. 2003. Title of Presentation. ASAE Paper No. 03xxxx. St. Joseph, Mich.: ASAE. For
information about securing permission to reprint or reproduce a technical presentation, please contact ASAE at
hq@asae.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA).
                                 Paper Number: 036157
An ASAE Meeting Presentation
Not a peer reviewed paper
Wireless Data Transmission of Networked Sensors
in Grain Storage
Paul Armstrong
USDA-ARS,  Grain Marketing & Production Research Center
1515 College Ave. Manhattan, KS, 66502, parm@gmprc.ksu.edu
Written for presentation at the
2003 ASAE Annual International Meeting
Sponsored by ASAE
Riviera Hotel and Convention Center
Las Vegas, Nevada, USA
27- 30 July 2003
Abstract.  Current grain-temperature monitoring systems employ sensors that are hard-wired
into a  structure.  Thermocouples are typically  used and are integrated into a supporting cable
which is  suspended between the ceiling and floor of a structure.  Multiplexed signal
conditioning is performed outside the structure with the data transm itted to a display and
storage device.  Wireless sensors were studied as an alternative to these systems.  The main issue
addressed in this study was the data transmission distance through grain that can be achieved by
a low-power radio frequency (RF) device design ed to operate in the unlicensed FCC spectrum.
Res

==================================================

--- File: pdfviewer.pdf ---
Transactions of the ASAE
V ol. 48(1): 263−271 /C0069 2005 American Society of Agricultural Engineers ISSN 0001−2351 263
A THREE−DIMENSIONAL, ASYMMETRIC, AND TRANSIENT
MODEL TO PREDICT GRAIN TEMPERATURES
IN GRAIN STORAGE BINS
F. Jian,  D. S. Jayas,  N. D. G. White,  K. Alagusundaram
ABSTRACT. A three−dimensional, transient, combined model (headspace model + soil model + conduction model in bulk
grain) was developed to predict grain temperatures in a granary. Different meshes (mesh refinement in the whole domain or
at the boundary) including linear and hybrid (linear and quadratic) elements were used to simulate grain temperatures. Pre-
diction accuracies of temperatures produced by the different meshes were compared, and the model was validated using mea-
sured temperatures in two flat bottom bins (3.76 m diameter and 5.5 m high filled with wheat up to 3 m) located side by side
in the north−south orientation near Winnipeg, Manitoba. Grain temperatures predicted by the model were in close agreement
with the measured temperatures throughout a 21−month test in the two bins. By using a hybrid element mesh (mesh refinement
at the boundary), the mean, standard error, and maximum of the absolute difference between the measured and predicted tem-
peratures in the south bin were 2.2°C, 0.4°C, and 7.0°C, respectively. The mean, standard error, and maximum of the absolute
difference predicted by a linear element model (88 linear elements each layer) in the south bin were 2.1°C, 0.3°C, and 6.3°C,
respectively. Including a headspace model improved the prediction accuracy of the conduction model at the top of the grain
bulk. Mesh refinement only at the boundary produced a homogeneous distribution of errors in the whole domain; however ,
mesh refinement in the whole domain gave higher errors at the walls than at the center of the bins. Considering the increased
computer time and slightly improved accuracy by mesh refinement at the boundary, a uniform mesh with mesh refinement in
th

==================================================

--- File: SIMULTANEOUSMONITORINGOFSTOREDGRAIN.pdf ---
Applied Engineering in Agriculture
V ol. 25(4): 595‐604 2009 American Society of Agricultural and Biological Engineers ISSN 0883-8542 595
SIMULTANEOUS MONITORING OF STORED GRAIN 
WITH RELATIVE HUMIDITY, TEMPERATURE, 
AND CARBON DIOXIDE SENSORS
H. B. Gonzales,  P. R. Armstrong,  R. G. Maghirang
ABSTRACT. Grain moisture content (MC) and temperature (T) are the primary factors affecting grain deterioration in storage.
If these factors are not properly monitored and controlled, grain quality can deteriorate quickly due to mold growth and insect
infestation. This research examined use of relative humidity (RH), T, and carbon dioxide (CO2) sensors for their suitability
to determine adverse storage conditions of wheat. A mock‐up storage system was constructed and used to simulate a wheat
storage bin 6.86 m high. Sensors for T, RH, and CO
2 measurement were placed at various depths in the storage. High‐moisture
grain, comprising about 11% of the grain volume, was placed in the top section of the bin. Wheat was aerated with the
high‐moisture grain conditioned to nominal MCs of 14%, 16%, and 18% wet basis (MC wb) and the remaining grain at
approximately 11% MCwb. Sensors monitored air conditions during the entire storage period. Aeration was provided over
3‐h periods at rates of 0.083 m3/min/tonne (eight experiments) and 0.166 m3/min/tonne (one experiment). Airflow was from
top to bottom of the bin. CO2 sensors were effective in indirectly detecting moist grain conditions due to the large amount
of CO2 generated from the wet grain. CO2 measurement was less effective as grain temperature was reduced as a result of
aeration. CO2 levels monitored at the exhaust of the aeration duct were generally adequate in determining adverse storage
conditions. The equilibrium moisture content (EMC) of wheat, determined from RH and T, gave reasonably accurate
measurements of grain MC. EMC measurements were also effective in determining moisture changes in the grain due to the
moisture front m

==================================================



################################################################################
# RESEARCH KNOWLEDGE BASE
################################################################################

# GrainHero Research Knowledge Base
> **Auto-generated Catalog of All Research Papers**

## Smartsilo.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\Smartsilo.pdf`

**Abstract / First Page Extract:**

```text
Ajisegiri, E.S.A.et al. / Int.Artif.Intell.&Mach.Learn. 2(2) (2022) 35-55 Page 35 of 55
Volume 2, Issue 2, July 2022
Received : 22 March 2022
Accepted : 19 June 2022
Published : 05 July 2022
doi: 10.51483/IJAIML.2.2.2022.35-55
Article Info
Abstract
Food security is the aspiration of every nation. To achieve this, particularly in
Developing Countries, there is a need to reduce wastage by storing staple foods
grains beyond their production seasons. Longer storage requires human presence,
monitoring and control of the storage environment which may be laborious,
demanding and sometimes outrightly unsafe. Therefore, the needs to employ
automation and artificial intelligence become necessary to control this storage
environment. This study developed an automated, intelligent silo bin that controls
the storage environment of the system for the small-scale rural farmers, of which
over 70% of their population still depend on agriculture, using Internet of Things
(IoT). The developed system consists of three units interfaced together. These
units are the pro-type 2-ton (2,000 kg) silo structure, the embedded system (made
up of the microcontroller, sensors and relays). The system is integrated to an IoT
system (made up of mobile application (BLYNK), Wi-Fi module and ultrasonic
atomizer) and the air blowing system (consisting of blower fan and heater). The
developed smart system was tested and the test run results showed that it
successfully monitors and controls storage air temperature,
...
```

---

## A53-1823-1989-eng.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\A53-1823-1989-eng.pdf`

**Abstract / First Page Extract:**

```text
1^1AgricultureCanada
Spoilage
Prevention,
ontrolS'7CJ
f

DigitizedbytheInternetArchivein2012withfundingfromAgricultureandAgri-FoodCanada-AgricultureetAgroalimentaireCanada
http://www.archive.org/details/spoilageheatingoOOmill
...
```

---

## AI-driven_technologies_for_pest_monitoring_unsound.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\AI-driven_technologies_for_pest_monitoring_unsound.pdf`

**Abstract / First Page Extract:**

```text
AI-driven technologies for pest monitoring, unsound kernel detection,
and intelligent aeration in grain storage
Yuanyi Luo1, Dandan Li1*, Jinying Chen1, Yanguang Zhu1, Yiming Ma1, Jie Lin2, Kun Hu1,
Shengbin Lan1, Yue Li1, Weihao Hu3, Hongwei Xiao2*
(1. Sinograin Chengdu Storage Research Institute Co., Ltd., Chengdu 610091, China;
2. College of Engineering, China Agricultural University, Beijing 100083, China;
3. School of Mechanical and Electrical Engineering, University of Electronic Science and Technology of China, Chengdu 611731, China)
Abstract: Grain storage plays a crucial role in safeguarding food security and maintaining market stability, and it has therefore
attracted growing attention from both academia and industry. The primary objective of storage technologies is to minimize post-
harvest  losses  caused  by  pests,  mold,  and  mechanical  damage.  However,  conventional  storage  management  methods,  which
rely heavily on manual labor, are often inefficient and costly. With the rapid advancement of artificial intelligence (AI), various
approaches, such as convolutional neural network (CNN)-based models, Transformer-based frameworks, and emerging Mamba
architectures,  have  been  introduced  into  the  field  of  grain  storage.  This  paper  presents  a  comprehensive  review  of  artificial
intelligence methodologies applied across multiple stages of the grain storage process. From four complementary perspectives,
including  application  significance,  ex
...
```

---

## SensorsforGrainStorageNeethirajanASABE.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\SensorsforGrainStorageNeethirajanASABE.pdf`

**Abstract / First Page Extract:**

```text
The authors are solely responsible for the content of this te chnical presentation. The technical presentation does not necessarily reflect the 
official position of the American Society of Agricultural  and Biological Engineers (ASABE), and its printing and distribution d oes not 
constitute an endorsement of views which may be expressed. Techni cal presentations are not subject to the formal peer review process by 
ASABE editorial committees; therefore, they ar e not to be presented as refereed publicat ions. Citation of this work should stat e that it is 
from an ASABE meeting paper. EXAMPLE: Author's Last Name, In itials. 2007. Title of Presentation. ASABE Paper No. 076179. St. 
Joseph, Mich.: ASABE. For information about securing permission to  reprint or reproduce a techni cal presentation, please contac t ASABE 
at rutter@asabe.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA). 
 
 
 
 
 
 
An ASABE Meeting Presentation 
 
Paper Number: 076179
Sensors for Grain Storage  
S. Neethirajan 
Department of Biosystems Engineering, University of Manitoba, Winnipeg, Canada R3T 5V6 
D.S. Jayas 
Distinguished Professor, Canada Research Chair in Stored-Grain Ecosystems, Associate 
Vice-president (Research), University of Manitoba, Winnipeg, MB, Canada R3T 2N2  
Written for presentation at the 
2007 ASABE Annual International Meeting 
Sponsored by ASABE 
Minneapolis Convention Center 
Minneapolis, Minnesota 
17 - 20 June 2007 
Abstract. Post harvest stored grain
...
```

---

## Design_and_Development_of_a_Model_Smart_Storage_Sy.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\Design_and_Development_of_a_Model_Smart_Storage_Sy.pdf`

**Abstract / First Page Extract:**

```text
© Publisher: Ebubekir Altuntas. This is an Open Access article and 
is licensed (CC-BY-NC-4.0) under a Creative Commons Attribution 4.0 International License. 
 
 
 
 
Turkish Journal of Agricultural  
Engineering Research 
 
https://dergipark.org.tr/en/pub/turkager 
  https://doi.org/10.46592/turkager.1297511 
 
Research Article 
 
 
Turk J Agr Eng Res 
(TURKAGER) 
 
ISSN: 2717-8420 
2023, 4(1), 125-132 
 
Design and Development of a Model Smart Storage System 
 
Omokaro IDAMAaID, Ovuakporaye Godwin EKRUYOTAa*ID 
 
aDepartment of Computer Engineering, Delta State University of Science and Technology, Ozoro, NIGERIA 
 
(*): Corresponding Author: g.o.softsystem@gmail.com 
 
ABSTRACT  
  
Food security has become a global major problem, due to the rapid increase in population growth. This has 
necessity the development of an effective agricultural products’ storage system, to alleviate the problem of 
food wastage. This study was embarked upon to develop a prototype of universal smart storage system for 
farm products, by using the internet of thing (IoT). The storage structure consists of four princi pal 
constituents which were; the power source, storage chamber, central processing system, and peripheral 
component interconnect (PCI) heater and PCI fan. The developed model was tested at a pre-set temperature 
and relative humidity of 32C and 62% RH respectively. The results revealed that the developed system had 
an efficiency of 85%. Though, the smart model had a failur
...
```

---

## neethirajan2008.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\neethirajan2008.pdf`

**Abstract / First Page Extract:**

```text
REVIEW PAPER
Carbon Dioxide (CO 2) Sensors for the Agri-food
Industry—A Review
S. Neethirajan & D. S. Jayas & S. Sadistap
Received: 30 March 2008 / Accepted: 2 October 2008 / Published online: 5 November 2008
# Springer Science + Business Media, LLC 2008
Abstract In the food and agricultural industry, sensors are
being used for process control, monitoring quality, and
assessing safety. There is a growing demand for carbon
dioxide (CO 2) sensors in the bulk food storage sector,
because CO 2 sensors can be used to detect incipient
spoilage and to assess CO 2 levels in modified-atmosphere
packages and storage structures. The market potential for
reliable and inexpensive CO
2 sensors is huge because of a
wide range of applications in the agri-food industry. This
review synthesizes information about the types of CO 2
sensors, analyzes their detection processes, provides a
broad overview of the innovative research on the develop-
ment of sensors, sensing mechanisms, and their character-
istics, and outlines future possibilities for use of CO
2
sensors.
Keywords CO2 sensors . Optical sensors .
Electrochemical sensors . Metal oxide sensors .
Polymer sensors
Introduction
The evolving agriculture and food system has entered in to
a consumer driven era with consumers demanding food
safety, quality, and convenience. To analyze, design,
develop, manage, control, and characterize the biological
and environmental processes in agricultural industry, there
is a need to collect data. This has
...
```

---

## AgricResCommentaryFoodSecurity12124.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\AgricResCommentaryFoodSecurity12124.pdf`

**Abstract / First Page Extract:**

```text
COMMENTARY
Storing Grains for Food Security and Sustainability
Digvir S. Jayas
Received: 2 October 2011 / Accepted: 28 November 2011 / Published online: 19 January 2012
/C211NAAS (National Academy of Agricultural Sciences) 2012
Abstract Globally over two billion tonnes of grains are produced annually. The grains are stored at different stages of the
grain distribution chain, in deﬁned units such as bags, silos, warehouses, containers and even in piles on the ground. An
individual unit or a group of units can be managed as man-made ecosystems, where deterioration of the stored grain is a
result of interactions among physical, chemical, and biological factors. Accurate estimates of post-harvest losses of grains
are not available, but it can vary from 1–2% in the developed countries, where grain is stored in well managed facilities, to
20–50% in less developed countries, with poorly managed storage systems. Considerable knowledge has been generated to
understand the critical parameters for developing efﬁcient grain storage systems. Through proper monitoring and man-
agement of interactions, both biotic and abiotic in nature, stored-grains can be protected for over a long period. There is an
urgent need to synthesize the status of knowledge to provide directions for future research and development, to minimize
the post-harvest losses of grains in different regions of the world.
Globally over two billion tonnes (Gt) of cereals, oilseeds,
and pulses (collectively referred to as gra
...
```

---

## WirelessDataPA.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\WirelessDataPA.pdf`

**Abstract / First Page Extract:**

```text
The authors are solely responsible for the content of this technical presentation. The technical presentation does not
necessarily reflect the official position of the American Society of Agricultural Engineers (ASAE), and its printing
and distribution does not constitute an endorsement of views which may be expressed. Technical presentations are
not subject to the formal peer review process by ASAE editorial committees; therefore, they are not to be presented
as refereed publications. Citation of this work should state that it is from an ASAE meeting paper EXAMPLE:
Author's Last Name, Initials. 2003. Title of Presentation. ASAE Paper No. 03xxxx. St. Joseph, Mich.: ASAE. For
information about securing permission to reprint or reproduce a technical presentation, please contact ASAE at
hq@asae.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA).
                                 Paper Number: 036157
An ASAE Meeting Presentation
Not a peer reviewed paper
Wireless Data Transmission of Networked Sensors
in Grain Storage
Paul Armstrong
USDA-ARS,  Grain Marketing & Production Research Center
1515 College Ave. Manhattan, KS, 66502, parm@gmprc.ksu.edu
Written for presentation at the
2003 ASAE Annual International Meeting
Sponsored by ASAE
Riviera Hotel and Convention Center
Las Vegas, Nevada, USA
27- 30 July 2003
Abstract.  Current grain-temperature monitoring systems employ sensors that are hard-wired
into a  structure.  Thermocouples are typically  used and are integ
...
```

---

## pdfviewer.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\pdfviewer.pdf`

**Abstract / First Page Extract:**

```text
Transactions of the ASAE
V ol. 48(1): 263−271 /C0069 2005 American Society of Agricultural Engineers ISSN 0001−2351 263
A THREE−DIMENSIONAL, ASYMMETRIC, AND TRANSIENT
MODEL TO PREDICT GRAIN TEMPERATURES
IN GRAIN STORAGE BINS
F. Jian,  D. S. Jayas,  N. D. G. White,  K. Alagusundaram
ABSTRACT. A three−dimensional, transient, combined model (headspace model + soil model + conduction model in bulk
grain) was developed to predict grain temperatures in a granary. Different meshes (mesh refinement in the whole domain or
at the boundary) including linear and hybrid (linear and quadratic) elements were used to simulate grain temperatures. Pre-
diction accuracies of temperatures produced by the different meshes were compared, and the model was validated using mea-
sured temperatures in two flat bottom bins (3.76 m diameter and 5.5 m high filled with wheat up to 3 m) located side by side
in the north−south orientation near Winnipeg, Manitoba. Grain temperatures predicted by the model were in close agreement
with the measured temperatures throughout a 21−month test in the two bins. By using a hybrid element mesh (mesh refinement
at the boundary), the mean, standard error, and maximum of the absolute difference between the measured and predicted tem-
peratures in the south bin were 2.2°C, 0.4°C, and 7.0°C, respectively. The mean, standard error, and maximum of the absolute
difference predicted by a linear element model (88 linear elements each layer) in the south bin were 2.1°C, 0.3°C, an
...
```

---

## SIMULTANEOUSMONITORINGOFSTOREDGRAIN.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\SIMULTANEOUSMONITORINGOFSTOREDGRAIN.pdf`

**Abstract / First Page Extract:**

```text
Applied Engineering in Agriculture
V ol. 25(4): 595‐604 2009 American Society of Agricultural and Biological Engineers ISSN 0883-8542 595
SIMULTANEOUS MONITORING OF STORED GRAIN 
WITH RELATIVE HUMIDITY, TEMPERATURE, 
AND CARBON DIOXIDE SENSORS
H. B. Gonzales,  P. R. Armstrong,  R. G. Maghirang
ABSTRACT. Grain moisture content (MC) and temperature (T) are the primary factors affecting grain deterioration in storage.
If these factors are not properly monitored and controlled, grain quality can deteriorate quickly due to mold growth and insect
infestation. This research examined use of relative humidity (RH), T, and carbon dioxide (CO2) sensors for their suitability
to determine adverse storage conditions of wheat. A mock‐up storage system was constructed and used to simulate a wheat
storage bin 6.86 m high. Sensors for T, RH, and CO
2 measurement were placed at various depths in the storage. High‐moisture
grain, comprising about 11% of the grain volume, was placed in the top section of the bin. Wheat was aerated with the
high‐moisture grain conditioned to nominal MCs of 14%, 16%, and 18% wet basis (MC wb) and the remaining grain at
approximately 11% MCwb. Sensors monitored air conditions during the entire storage period. Aeration was provided over
3‐h periods at rates of 0.083 m3/min/tonne (eight experiments) and 0.166 m3/min/tonne (one experiment). Airflow was from
top to bottom of the bin. CO2 sensors were effective in indirectly detecting moist grain conditions due to the la
...
```

---

## GrainHero_Component_Assessment.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\GrainHero_Component_Assessment.pdf`

**Abstract / First Page Extract:**

```text
GrainHero engineering reference - readability conversion
Page 1
 GrainHero Silo Monitoring - Component Assessment
Report-ready comparison of the components named in the IoT, silo engineering, and frugal-engineering notes. Prices are planning estimates using Rs 280 per USD, excluding landed cost. Confirm
supplier quotations before purchase.
Critical design position
Do not install hobby electronics directly inside combustible grain-dust zones. IP ratings do not equal explosion protection. Put normal electronics outside the classified area or use suitably certified
industrial equipment. For real silo health, prioritize multi-depth temperature sensing, calibrated grain moisture, level measurement, and protected communications. CO2/VOC/PM measurements are
supporting trends, not personnel-entry safety instruments.
Component
Use and essential specification
Indicative cost
(USD / PKR)
Durability / life
Best alternative or decision
ESP32-WROOM-32
Controller; 240 MHz dual-core, Wi-Fi/BLE, 3.3 V.
$4-9 / Rs
1,120-2,520
5-10+ years protected; not hazardous-area certified.
Keep only in external enclosure. Industrial PLC/RTU for safety-critical
control.
BME680
T/RH/pressure and gas resistance; not a direct CO2 or pathogen
sensor.
$10-20 / Rs
2,800-5,600
Multi-year indoor; gas baseline drifts in dust/chemicals.
Use SHT45 for T/RH. Do not use for CO2 or life-safety gas alarms.
DHT11
Basic T/RH: 0-50 C, +/-2 C, +/-5% RH.
$2-4 / Rs
560-1,120
1-3 years indoor; poor accuracy and dust resilience.
...
```

---

## INDUSTRIAL SILO ARCHITECTURE INFO- LAIBA DILDAR.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\INDUSTRIAL SILO ARCHITECTURE INFO- LAIBA DILDAR.pdf`

**Abstract / First Page Extract:**

```text
Industrial Wheat Storage System (China-Based Reference) 
 Introduction 
China operates one of the world's largest grain storage networks through organizations such as 
Sinograin (China Grain Reserves Group) and COFCO. Modern grain warehouses in China 
increasingly use Industrial Internet of Things (IIoT) technologies, wireless sensor networks, 
PLC-based automation, and centralized monitoring platforms to minimize post-harvest losses, 
improve food safety, and optimize energy consumption. 
The proposed GrainHero Smart Wheat Storage System adopts these industrial principles and 
adapts them for deployment in Pakistan. Rather than replacing existing infrastructure, GrainHero 
is designed as a modular retrofit platform that can be integrated into conventional grain 
warehouses and silos. 
The system continuously monitors grain conditions, automatically controls ventilation, records 
historical data, predicts spoilage risks, and provides operators with real-time alerts through a 
cloud dashboard. 
 
 Industrial Wheat Storage Workflow 
The complete industrial workflow consists of the following stages: 
Farmer 
   │ 
Harvesting 
   │ 
Transportation 
   │ 
Warehouse Receiving Station 
   │ 
Truck Weighbridge 
   │ 
Automatic Grain Sampling 
   │ 
Laboratory Quality Inspection 
   │ 
Cleaning & Separation 
   │ 
Grain Drying 
   │ 
Bucket Elevator 
   │ 
Belt Conveyor 
   │ 
Smart Wheat Silo 
   │ 
24/7 Wireless Monitoring 
   │ 
Automatic Aeration 
   │ 
Periodic Inspection 
   │
...
```

---

## foods-14-01024-v2.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\foods-14-01024-v2.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Marta
Ferreiro-González
Received: 27 January 2025
Revised: 26 February 2025
Accepted: 4 March 2025
Published: 18 March 2025
Citation: Li, X.; Wu, W.; Guo, H.; Wu,
Y.; Li, S.; Wang, W.; Lu, Y. Smart Grain
Storage Solution: Integrated Deep
Learning Framework for Grain Storage
Monitoring and Risk Alert.Foods 2025,
14, 1024. https://doi.org/10.3390/
foods14061024
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Smart Grain Storage Solution: Integrated Deep Learning
Framework for Grain Storage Monitoring and Risk Alert
Xinze Li 1, Wenfu Wu 1, Hongpeng Guo 1
 , Yunshandan Wu 1, Shuyao Li 1, Wenyue Wang 2,* and Yanhui Lu 3,*
1 College of Biological and Agricultural Engineering, Jilin University, Changchun 130022, China;
xzli23@mails.jlu.edu.cn (X.L.)
2 Institute of XinJiang Grain and Oil Science, Urumqi 830000, China
3 College of Automotive Engineering, Jilin University, Changchun 130022, China
* Correspondence: xjgaos@outlook.com (W.W.); luyh@jlu.edu.cn (Y.L.); Tel.: +86-043185692518 (Y.L.)
Abstract: In order to overcome the notable limitations of current methods for monitoring
grain storage states, particularly in the early warning of potential risks and the analysis
of the spatial distribution of grain temperatures within the granary, this study proposes
a
...
```

---

## agriculture-15-01870.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\agriculture-15-01870.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Wenfu Wu
Received: 1 August 2025
Revised: 29 August 2025
Accepted: 31 August 2025
Published: 2 September 2025
Citation: Wei, C.; Liu, J.; Zhu, B.
Design and Testing of a Multi-Channel
Temperature and Relative Humidity
Acquisition System for Grain Storage.
Agriculture 2025, 15, 1870.
https://doi.org/10.3390/
agriculture15171870
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Design and Testing of a Multi-Channel Temperature and
Relative Humidity Acquisition System for Grain Storage
Chenyi Wei
 , Jingyun Liu * and Bingke Zhu
College of Urban Rail Transit and Logistics, Beijing Union University, Beijing 100101, China;
weichenyi118@163.com (C.W.); zhubingke1023@163.com (B.Z.)
* Correspondence: ljy@buu.edu.cn
Abstract
To ensure the safety and quality of grain during storage requires distributed monitoring of
temperature and relative humidity within the bulk material, where hundreds of sensors
may be needed. Conventional multi-channel systems are often constrained by the limited
number of sensors connectable to a single acquisition unit, high hardware cost, and poor
scalability. To address these challenges, this study proposes a novel design method for
a multi-channel temperature and relative humidity acquisition system (MTRHAS). The
system integrates seque
...
```

---

## grain_silo_benchmarking.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\grain_silo_benchmarking.pdf`

**Abstract / First Page Extract:**

```text
Smart Grain Storage Monitoring System
Literature Review & Competitive Benchmarking Matrix (10 Verified Academic Papers vs. Advanced LoRaWAN Multi-Gas
Pod Architecture)
1. Executive Summary & Design Paradigm Shift
This document contains a verified technical comparison of 10 established academic and research papers on grain
silo/storage monitoring against your proposed industrial-grade  LoRaWAN Pod Architecture. While traditional
academic literature relies heavily on basic point-based temperature sensing, short-range topologies (WiFi/ZigBee),
and low-end components (DHT11/MQ series), your design represents a commercial paradigm shift. By integrating
multi-depth gas sensing matrices (Sensirion SHT45, SCD40, SEN55), ultra-low-power long-range transceivers
(RAK3172), an ESP32 prototyping testbed, and an adaptive seasonal Machine Learning threshold model, your
system moves beyond simple telemetry into commercial predictive grain preservation, perfectly adapted for the
structural and cost challenges of the Pakistani agricultural sector. 
2. Academic Benchmarking & Paper Evaluation Matrix
Below is the master compliance and structural matrix detailing exactly what each paper accomplished, their specific
research URLs, and how your current system fundamentally advances beyond their technical limitations. 
# Paper Title & Sourced LinkWhat Was Done In the Paper (Technical
Scope)
Your Architecture vs. Paper (Technical
Advancements & Changes)
1 IoT Monitoring System for
Grain Storage
Devel
...
```

---

## 2505.01301v1.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\2505.01301v1.pdf`

**Abstract / First Page Extract:**

```text
_____________________________________________________________________________________________________________________________ ________ 
*Corresponding author (chetanmb@utk.edu) 
_____________________________________________________________________________________ 
Electronic Nose for Agricultural Grain Pest Detection, Identification, and 
Monitoring: A Review 
Chetan M Badgujar1*, Sai Swaminathan2, and Alison Gerken3 
1Department of Biosystems Engineering & Soil Science, University of Tennessee, Knoxville, TN, USA. 
2Department of Electrical Engineering & Computer Science, University of Tennessee, Knoxville, TN, USA. 
3USDA-ARS, Center of Grain & Animal Health Research, Manhattan, KS, USA. 
_____________________________________________________________________________________ 
Highlights: 
• A systematic literature review was conducted on 21 research studies. 
• E-nose technology is low-cost, rapid, non-invasive, and accurate for odor-based pest detection. 
• E-nose can detect and identify microscopic (Fungi) and hidden insects with good accuracy. 
• E-nose performance is influenced by storage duration, storage parameters, pest species type, and 
pest density. 
Abstract: Biotic pest attacks and infestations are major causes of stored grain losses, leading to 
significant food and economic losses. Conventional, manual, sampling-based pest recognition methods 
are labor-intensive, time-consuming, costly, require expertise, and may not even detect hidden 
infestations. In recent
...
```

---

## Aby_iastate_0097M_19060.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\Aby_iastate_0097M_19060.pdf`

**Abstract / First Page Extract:**

```text
Wireless sensors for quality monitoring and management of stored grain inventories
by
Guy Roger Aby
A thesis submitted to the graduate faculty
in partial fulfillment of the requirements for the degree of 
MASTER OF SCIENCE
Major: Industrial and Agricultural Technology 
Program of Study Committee:
Dirk E. Maier, Major Professor
Carl J. Bern
Thomas Brumm
The student author, whose presentation of the scholarship herein was approved by the program 
of study committee, is solely responsible for the content of this thesis. The Graduate College will 
ensure this thesis is globally accessible and will not permit alterations after a degree is conferred. 
Iowa State University
Ames, Iowa
2020
Copyright © Guy Roger Aby, 2020. All rights reserved.
ii
DEDICATION
This thesis is dedicated to my father Eugene Aby, my mother Claudine Aby, and my wife 
Safi Aby for their love and support.
...
```

---

## AgricResCommentaryFoodSecurity12124.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\AgricResCommentaryFoodSecurity12124.pdf`

**Abstract / First Page Extract:**

```text
COMMENTARY
Storing Grains for Food Security and Sustainability
Digvir S. Jayas
Received: 2 October 2011 / Accepted: 28 November 2011 / Published online: 19 January 2012
/C211NAAS (National Academy of Agricultural Sciences) 2012
Abstract Globally over two billion tonnes of grains are produced annually. The grains are stored at different stages of the
grain distribution chain, in deﬁned units such as bags, silos, warehouses, containers and even in piles on the ground. An
individual unit or a group of units can be managed as man-made ecosystems, where deterioration of the stored grain is a
result of interactions among physical, chemical, and biological factors. Accurate estimates of post-harvest losses of grains
are not available, but it can vary from 1–2% in the developed countries, where grain is stored in well managed facilities, to
20–50% in less developed countries, with poorly managed storage systems. Considerable knowledge has been generated to
understand the critical parameters for developing efﬁcient grain storage systems. Through proper monitoring and man-
agement of interactions, both biotic and abiotic in nature, stored-grains can be protected for over a long period. There is an
urgent need to synthesize the status of knowledge to provide directions for future research and development, to minimize
the post-harvest losses of grains in different regions of the world.
Globally over two billion tonnes (Gt) of cereals, oilseeds,
and pulses (collectively referred to as gra
...
```

---

## neethirajan2008.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\neethirajan2008.pdf`

**Abstract / First Page Extract:**

```text
REVIEW PAPER
Carbon Dioxide (CO 2) Sensors for the Agri-food
Industry—A Review
S. Neethirajan & D. S. Jayas & S. Sadistap
Received: 30 March 2008 / Accepted: 2 October 2008 / Published online: 5 November 2008
# Springer Science + Business Media, LLC 2008
Abstract In the food and agricultural industry, sensors are
being used for process control, monitoring quality, and
assessing safety. There is a growing demand for carbon
dioxide (CO 2) sensors in the bulk food storage sector,
because CO 2 sensors can be used to detect incipient
spoilage and to assess CO 2 levels in modified-atmosphere
packages and storage structures. The market potential for
reliable and inexpensive CO
2 sensors is huge because of a
wide range of applications in the agri-food industry. This
review synthesizes information about the types of CO 2
sensors, analyzes their detection processes, provides a
broad overview of the innovative research on the develop-
ment of sensors, sensing mechanisms, and their character-
istics, and outlines future possibilities for use of CO
2
sensors.
Keywords CO2 sensors . Optical sensors .
Electrochemical sensors . Metal oxide sensors .
Polymer sensors
Introduction
The evolving agriculture and food system has entered in to
a consumer driven era with consumers demanding food
safety, quality, and convenience. To analyze, design,
develop, manage, control, and characterize the biological
and environmental processes in agricultural industry, there
is a need to collect data. This has
...
```

---

## AI-driven_technologies_for_pest_monitoring_unsound.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\AI-driven_technologies_for_pest_monitoring_unsound.pdf`

**Abstract / First Page Extract:**

```text
AI-driven technologies for pest monitoring, unsound kernel detection,
and intelligent aeration in grain storage
Yuanyi Luo1, Dandan Li1*, Jinying Chen1, Yanguang Zhu1, Yiming Ma1, Jie Lin2, Kun Hu1,
Shengbin Lan1, Yue Li1, Weihao Hu3, Hongwei Xiao2*
(1. Sinograin Chengdu Storage Research Institute Co., Ltd., Chengdu 610091, China;
2. College of Engineering, China Agricultural University, Beijing 100083, China;
3. School of Mechanical and Electrical Engineering, University of Electronic Science and Technology of China, Chengdu 611731, China)
Abstract: Grain storage plays a crucial role in safeguarding food security and maintaining market stability, and it has therefore
attracted growing attention from both academia and industry. The primary objective of storage technologies is to minimize post-
harvest  losses  caused  by  pests,  mold,  and  mechanical  damage.  However,  conventional  storage  management  methods,  which
rely heavily on manual labor, are often inefficient and costly. With the rapid advancement of artificial intelligence (AI), various
approaches, such as convolutional neural network (CNN)-based models, Transformer-based frameworks, and emerging Mamba
architectures,  have  been  introduced  into  the  field  of  grain  storage.  This  paper  presents  a  comprehensive  review  of  artificial
intelligence methodologies applied across multiple stages of the grain storage process. From four complementary perspectives,
including  application  significance,  ex
...
```

---

## Design_and_Development_of_a_Model_Smart_Storage_Sy.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\Design_and_Development_of_a_Model_Smart_Storage_Sy.pdf`

**Abstract / First Page Extract:**

```text
© Publisher: Ebubekir Altuntas. This is an Open Access article and 
is licensed (CC-BY-NC-4.0) under a Creative Commons Attribution 4.0 International License. 
 
 
 
 
Turkish Journal of Agricultural  
Engineering Research 
 
https://dergipark.org.tr/en/pub/turkager 
  https://doi.org/10.46592/turkager.1297511 
 
Research Article 
 
 
Turk J Agr Eng Res 
(TURKAGER) 
 
ISSN: 2717-8420 
2023, 4(1), 125-132 
 
Design and Development of a Model Smart Storage System 
 
Omokaro IDAMAaID, Ovuakporaye Godwin EKRUYOTAa*ID 
 
aDepartment of Computer Engineering, Delta State University of Science and Technology, Ozoro, NIGERIA 
 
(*): Corresponding Author: g.o.softsystem@gmail.com 
 
ABSTRACT  
  
Food security has become a global major problem, due to the rapid increase in population growth. This has 
necessity the development of an effective agricultural products’ storage system, to alleviate the problem of 
food wastage. This study was embarked upon to develop a prototype of universal smart storage system for 
farm products, by using the internet of thing (IoT). The storage structure consists of four princi pal 
constituents which were; the power source, storage chamber, central processing system, and peripheral 
component interconnect (PCI) heater and PCI fan. The developed model was tested at a pre-set temperature 
and relative humidity of 32C and 62% RH respectively. The results revealed that the developed system had 
an efficiency of 85%. Though, the smart model had a failur
...
```

---

## Smartsilo.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\Smartsilo.pdf`

**Abstract / First Page Extract:**

```text
Ajisegiri, E.S.A.et al. / Int.Artif.Intell.&Mach.Learn. 2(2) (2022) 35-55 Page 35 of 55
Volume 2, Issue 2, July 2022
Received : 22 March 2022
Accepted : 19 June 2022
Published : 05 July 2022
doi: 10.51483/IJAIML.2.2.2022.35-55
Article Info
Abstract
Food security is the aspiration of every nation. To achieve this, particularly in
Developing Countries, there is a need to reduce wastage by storing staple foods
grains beyond their production seasons. Longer storage requires human presence,
monitoring and control of the storage environment which may be laborious,
demanding and sometimes outrightly unsafe. Therefore, the needs to employ
automation and artificial intelligence become necessary to control this storage
environment. This study developed an automated, intelligent silo bin that controls
the storage environment of the system for the small-scale rural farmers, of which
over 70% of their population still depend on agriculture, using Internet of Things
(IoT). The developed system consists of three units interfaced together. These
units are the pro-type 2-ton (2,000 kg) silo structure, the embedded system (made
up of the microcontroller, sensors and relays). The system is integrated to an IoT
system (made up of mobile application (BLYNK), Wi-Fi module and ultrasonic
atomizer) and the air blowing system (consisting of blower fan and heater). The
developed smart system was tested and the test run results showed that it
successfully monitors and controls storage air temperature,
...
```

---

## SensorsforGrainStorageNeethirajanASABE.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\SensorsforGrainStorageNeethirajanASABE.pdf`

**Abstract / First Page Extract:**

```text
The authors are solely responsible for the content of this te chnical presentation. The technical presentation does not necessarily reflect the 
official position of the American Society of Agricultural  and Biological Engineers (ASABE), and its printing and distribution d oes not 
constitute an endorsement of views which may be expressed. Techni cal presentations are not subject to the formal peer review process by 
ASABE editorial committees; therefore, they ar e not to be presented as refereed publicat ions. Citation of this work should stat e that it is 
from an ASABE meeting paper. EXAMPLE: Author's Last Name, In itials. 2007. Title of Presentation. ASABE Paper No. 076179. St. 
Joseph, Mich.: ASABE. For information about securing permission to  reprint or reproduce a techni cal presentation, please contac t ASABE 
at rutter@asabe.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA). 
 
 
 
 
 
 
An ASABE Meeting Presentation 
 
Paper Number: 076179
Sensors for Grain Storage  
S. Neethirajan 
Department of Biosystems Engineering, University of Manitoba, Winnipeg, Canada R3T 5V6 
D.S. Jayas 
Distinguished Professor, Canada Research Chair in Stored-Grain Ecosystems, Associate 
Vice-president (Research), University of Manitoba, Winnipeg, MB, Canada R3T 2N2  
Written for presentation at the 
2007 ASABE Annual International Meeting 
Sponsored by ASABE 
Minneapolis Convention Center 
Minneapolis, Minnesota 
17 - 20 June 2007 
Abstract. Post harvest stored grain
...
```

---

## pdfviewer.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\pdfviewer.pdf`

**Abstract / First Page Extract:**

```text
Transactions of the ASAE
V ol. 48(1): 263−271 /C0069 2005 American Society of Agricultural Engineers ISSN 0001−2351 263
A THREE−DIMENSIONAL, ASYMMETRIC, AND TRANSIENT
MODEL TO PREDICT GRAIN TEMPERATURES
IN GRAIN STORAGE BINS
F. Jian,  D. S. Jayas,  N. D. G. White,  K. Alagusundaram
ABSTRACT. A three−dimensional, transient, combined model (headspace model + soil model + conduction model in bulk
grain) was developed to predict grain temperatures in a granary. Different meshes (mesh refinement in the whole domain or
at the boundary) including linear and hybrid (linear and quadratic) elements were used to simulate grain temperatures. Pre-
diction accuracies of temperatures produced by the different meshes were compared, and the model was validated using mea-
sured temperatures in two flat bottom bins (3.76 m diameter and 5.5 m high filled with wheat up to 3 m) located side by side
in the north−south orientation near Winnipeg, Manitoba. Grain temperatures predicted by the model were in close agreement
with the measured temperatures throughout a 21−month test in the two bins. By using a hybrid element mesh (mesh refinement
at the boundary), the mean, standard error, and maximum of the absolute difference between the measured and predicted tem-
peratures in the south bin were 2.2°C, 0.4°C, and 7.0°C, respectively. The mean, standard error, and maximum of the absolute
difference predicted by a linear element model (88 linear elements each layer) in the south bin were 2.1°C, 0.3°C, an
...
```

---

## A53-1823-1989-eng.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\A53-1823-1989-eng.pdf`

**Abstract / First Page Extract:**

```text
1^1AgricultureCanada
Spoilage
Prevention,
ontrolS'7CJ
f

DigitizedbytheInternetArchivein2012withfundingfromAgricultureandAgri-FoodCanada-AgricultureetAgroalimentaireCanada
http://www.archive.org/details/spoilageheatingoOOmill
...
```

---

## WirelessDataPA.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\WirelessDataPA.pdf`

**Abstract / First Page Extract:**

```text
The authors are solely responsible for the content of this technical presentation. The technical presentation does not
necessarily reflect the official position of the American Society of Agricultural Engineers (ASAE), and its printing
and distribution does not constitute an endorsement of views which may be expressed. Technical presentations are
not subject to the formal peer review process by ASAE editorial committees; therefore, they are not to be presented
as refereed publications. Citation of this work should state that it is from an ASAE meeting paper EXAMPLE:
Author's Last Name, Initials. 2003. Title of Presentation. ASAE Paper No. 03xxxx. St. Joseph, Mich.: ASAE. For
information about securing permission to reprint or reproduce a technical presentation, please contact ASAE at
hq@asae.org or 269-429-0300 (2950 Niles Road, St. Joseph, MI 49085-9659 USA).
                                 Paper Number: 036157
An ASAE Meeting Presentation
Not a peer reviewed paper
Wireless Data Transmission of Networked Sensors
in Grain Storage
Paul Armstrong
USDA-ARS,  Grain Marketing & Production Research Center
1515 College Ave. Manhattan, KS, 66502, parm@gmprc.ksu.edu
Written for presentation at the
2003 ASAE Annual International Meeting
Sponsored by ASAE
Riviera Hotel and Convention Center
Las Vegas, Nevada, USA
27- 30 July 2003
Abstract.  Current grain-temperature monitoring systems employ sensors that are hard-wired
into a  structure.  Thermocouples are typically  used and are integ
...
```

---

## 2505.01301v1.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\2505.01301v1.pdf`

**Abstract / First Page Extract:**

```text
_____________________________________________________________________________________________________________________________ ________ 
*Corresponding author (chetanmb@utk.edu) 
_____________________________________________________________________________________ 
Electronic Nose for Agricultural Grain Pest Detection, Identification, and 
Monitoring: A Review 
Chetan M Badgujar1*, Sai Swaminathan2, and Alison Gerken3 
1Department of Biosystems Engineering & Soil Science, University of Tennessee, Knoxville, TN, USA. 
2Department of Electrical Engineering & Computer Science, University of Tennessee, Knoxville, TN, USA. 
3USDA-ARS, Center of Grain & Animal Health Research, Manhattan, KS, USA. 
_____________________________________________________________________________________ 
Highlights: 
• A systematic literature review was conducted on 21 research studies. 
• E-nose technology is low-cost, rapid, non-invasive, and accurate for odor-based pest detection. 
• E-nose can detect and identify microscopic (Fungi) and hidden insects with good accuracy. 
• E-nose performance is influenced by storage duration, storage parameters, pest species type, and 
pest density. 
Abstract: Biotic pest attacks and infestations are major causes of stored grain losses, leading to 
significant food and economic losses. Conventional, manual, sampling-based pest recognition methods 
are labor-intensive, time-consuming, costly, require expertise, and may not even detect hidden 
infestations. In recent
...
```

---

## Aby_iastate_0097M_19060.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\PrimaryOption\Aby_iastate_0097M_19060.pdf`

**Abstract / First Page Extract:**

```text
Wireless sensors for quality monitoring and management of stored grain inventories
by
Guy Roger Aby
A thesis submitted to the graduate faculty
in partial fulfillment of the requirements for the degree of 
MASTER OF SCIENCE
Major: Industrial and Agricultural Technology 
Program of Study Committee:
Dirk E. Maier, Major Professor
Carl J. Bern
Thomas Brumm
The student author, whose presentation of the scholarship herein was approved by the program 
of study committee, is solely responsible for the content of this thesis. The Graduate College will 
ensure this thesis is globally accessible and will not permit alterations after a degree is conferred. 
Iowa State University
Ames, Iowa
2020
Copyright © Guy Roger Aby, 2020. All rights reserved.
ii
DEDICATION
This thesis is dedicated to my father Eugene Aby, my mother Claudine Aby, and my wife 
Safi Aby for their love and support.
...
```

---

## 1-s2.0-S2665917422001064-main.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\1-s2.0-S2665917422001064-main.pdf`

**Abstract / First Page Extract:**

```text
Measurement: Sensors 24 (2022) 100472
Available online 17 September 2022
2665-9174/© 2022 The Authors. Published by Elsevier Ltd. This is an open access article under the CC BY-NC-ND license ( http://creativecommons.org/licenses/by-
nc-nd/4.0/).
Automated food grain monitoring system for warehouse using IOT 
Lydia J
a
, Leones Sherwin Vimalraj S
b , *
, Monisha R
b
, Murugan R
c 
a
Department of Electrical and Electronics Engineering, Easwari Engineering College, Chennai, 600089, India 
b
Department of Electronics and Communication Engineering, Panimalar Engineering College, Chennai, 600123, India 
c
Department of Electrical and Electronics Engineering, St.Peter ’ s College of Engineering and Technology, Chennai, 600054, India   
ARTICLE INFO  
Keywords: 
Food grain 
Temperature 
Humidity 
CO 
Motion 
Vibration 
Grain level 
And smoke 
ABSTRACT  
One of the most significant sources of income in a developing nation like India is agriculture. Good food storage 
is essential for ensuring food security, which is impacted by both food loss and wastage. Therefore, if losses can 
be decreased, there will be more food available. To maintain good storage facilities and stop food losses in this 
project, an IoT-enabled monitoring system will be deployed in remote locations with restricted access. This 
proposed system tracks and controls warehouse variables like grain level, temperature, humidity, vibration, CO, 
motion and smoke, all of which have a big impact on grains and their weig
...
```

---

## foods-14-03426.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\foods-14-03426.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Yamine
Bouzembrak
Received: 22 August 2025
Revised: 1 October 2025
Accepted: 2 October 2025
Published: 5 October 2025
Citation: Wu, Y.; Zhang, J.; Li, X.;
Zhang, Y.; Wu, W.; Xu, Y. Mechanism
and Data-Driven Grain Condition
Information Perception Method for
Comprehensive Grain Storage
Monitoring. Foods 2025, 14, 3426.
https://doi.org/10.3390/
foods14193426
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Mechanism and Data-Driven Grain Condition Information
Perception Method for Comprehensive Grain
Storage Monitoring
Yunshandan Wu 1,2 , Ji Zhang 1,2
 , Xinze Li 1,2 , Yaqiu Zhang 1,2 , Wenfu Wu 1,2,3 and Yan Xu 1,2, *
1 College of Biological and Agricultural Engineering, Jilin University, Changchun 130022, China
2 Changchun Longjia Grain Storage Science and Technology Backyard, Changchun 130504, China
3 School of Food and Strategic Reserves, Henan University of Technology, Zhengzhou 450001, China
* Correspondence: xuyan@jlu.edu.cn; Tel.: +86-136-898-28121
Abstract
Conventional grain monitoring systems often rely on isolated data points (e.g., point-
based temperature measurements), limiting holistic condition assessment. This study
proposes a novel Mechanism and Data Driven (MDD) framework that integrates physical
mechanisms with real-time sensor data. T
...
```

---

## 1-s2.0-S277237552500098X-main.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\1-s2.0-S277237552500098X-main.pdf`

**Abstract / First Page Extract:**

```text
Enhancing wheat storage efficiency: A microcontroller-based environment 
control system for silo
Muhammad Mateen
a
, Zaheer Ahmed Khan
c
, Yang Minli
a , b , *
, Ma Wenqiu
a
,  
Abreham Arebe Tola
a
a
College of Engineering, China Agricultural University, Beijing 100083, China
b
China Research Center for Agricultural Mechanization Development, China Agricultural University, Beijing 100083, China
c
Department of Farm Structures, Faculty of Agricultural Engineering, Sindh Agriculture University, Tandojam, Pakistan
ARTICLE INFO
Keywords:
Wheat
Microcontroller
Metal silo
Temperature
Relative humidity
Fan control system
ABSTRACT
Agricultural activities are incomplete without the proper wheat storage, and maintaining optimal storage con -
ditions requires an effective management system. This study presents a control system designed to improve the 
storage conditions of wheat using an Arduino UNO, a DHT22 sensor, and a fan cooling system to manage the 
environment. The device continually monitors temperature and relative humidity, as well as giving a non- 
destructive evaluation of the moisture content of wheat kept in silos. During the study, the system confirmed 
its efficacy by effectively maintaining appropriate storage conditions, such as average temperature and humidity 
levels, which encourage safe wheat storage. The automatic fan system effectively regulates temperature fluc -
tuations, providing ideal conditions. The study examined the system ’ s capacity to control essenti
...
```

---

## sensors-25-03583-v2.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\sensors-25-03583-v2.pdf`

**Abstract / First Page Extract:**

```text
Academic Editors: Ruben Linares and
Lorena Parra
Received: 29 April 2025
Revised: 31 May 2025
Accepted: 5 June 2025
Published: 6 June 2025
Citation: Miller, T.; Mikiciuk, G.;
Durlik, I.; Mikiciuk, M.; Łobodzi ´ nska,
A.; ´Snieg, M. The IoT and AI in
Agriculture: The Time Is Now—A
Systematic Review of Smart Sensing
Technologies. Sensors 2025, 25, 3583.
https://doi.org/10.3390/s25123583
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Review
The IoT and AI in Agriculture: The Time Is Now—A Systematic
Review of Smart Sensing Technologies
Tymoteusz Miller 1,2, *
 , Grzegorz Mikiciuk 3
 , Irmina Durlik 4
 , Małgorzata Mikiciuk 5
 ,
Adrianna Łobodzi ´ nska6,7
 and Marek ´Snieg 8
1 Institute of Marine and Environmental Sciences, University of Szczecin, W ˛ aska 13, 71-415 Szczecin, Poland
2 Faculty of Data Science and Information, INTI International University, Nilai 71800, Malaysia
3 Department of Horticulture, Faculty of Environmental Management and Agriculture, West Pomeranian
University of Technology in Szczecin, Słowackiego 17, 71-434 Szczecin, Poland; grzegorz.mikiciuk@zut.edu.pl
4 Faculty of Navigation, Maritime University of Szczecin, Waly Chrobrego 1-2, 70-500 Szczecin, Poland;
i.durlik@pm.szczecin.pl
5 Department of Bioengineering, Faculty of Environmental Management and Ag
...
```

---

## s41598-025-89710-w.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\s41598-025-89710-w.pdf`

**Abstract / First Page Extract:**

```text
Research on rechargeable 
agricultural wireless sensor 
network based on ZigBee immune 
routing repair algorithm
Ruipeng Tang1, Yinhe Wu2, Jun Tan3, Binghong Guan4, Narendra Kumar Aridas1 & 
Mohamad Sofian Abu Talip1
WSN (wireless sensor network) plays a very important role in the agricultural environment monitoring. 
Although solar energy and other power supply methods are used to solve the node energy problem, 
the monitoring equipment works outdoors for a long time, which is easily affected by the environment. 
The supply is unstable to cause abnormalities in some nodes. So this study proposes a ZIRRA algorithm 
(ZigBee immune routing repair algorithm) for the rechargeable agricultural WSN. It simulates the 
working mechanism of the immune system and designs modules such as identification, processing, 
cloning and storage, which can provide a better repair strategy for abnormal nodes. Then it compares 
the quality of the backup nodes and replaces the backup nodes with poor quality, so that the optimal 
paths are maintained between source nodes and middle relay nodes, which increases the optimization 
ability of the algorithm. The experimental results show that the ZIRRA algorithm shows significant 
advantages in routing node repair mechanism. Compared with the LFRA, AR-TORA and ICCO 
algorithms, the average routing energy consumption of the ZIRRA algorithm reduced  35.33%, 58.37% 
and 45.15% , the data transmission delay reduced by 23.72%, 36.74% and 16.28%, and the avera
...
```

---

## ijatcse1231022021.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\ijatcse1231022021.pdf`

**Abstract / First Page Extract:**

```text
Mir Sajjad Hussain Talpur  et al.,  International Journal of Advanced Trends in Computer Science and Engineering, 10(2), March - April 2021, 1356 – 1361 
1356 
 
 
 
ABSTRACT 
 
The agriculture sector plays a pivotal role in Pakistan because 
agriculture is the source of food production that provides 
direct cultivation to the state and, as we are all familiar with 
that, the most challengi ng task is to provide grains during 
droughts and pandemic situations. Grains are essential 
among food products because of their large contribution to 
food for the country’s population. Thus, au tomatically 
making grain storage equally important, but the grain storing 
system in Pakistan is very poor currently. And because of that 
poor system, we lose a considerable amount every year in the 
storing process. We are in such a period that, along with the 
population, the need for food is steadily rising, so we do not 
have the luxury of wasting anything that we produce to feed. 
To effectively maintain and overcome grain damage, it is 
critical to design or develop a grain storage monitoring 
system based on current research and proposed technologies.  
The design and development of grain storage monitoring 
system is achievable with the deployment of IoT sensor IoT 
technology. Furthermore, this research deals with 
deployments of sensors in the grain storage mo nitoring area 
which ensures the accumulation of real -time data and then 
analyze and come up with a decision to overcome ab
...
```

---

## insects-15-00557.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\insects-15-00557.pdf`

**Abstract / First Page Extract:**

```text
Citation: Yu, J.; Chen, S.; Liu, N.; Zhai,
F.; Pan, Q. Cascaded Aggregation
Convolution Network for Salient
Grain Pests Detection. Insects 2024, 15,
557. https://doi.org/10.3390/
insects15070557
Academic Editor: Brian T. Forschler
Received: 25 March 2024
Revised: 14 July 2024
Accepted: 18 July 2024
Published: 22 July 2024
Copyright: © 2024 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license (https://
creativecommons.org/licenses/by/
4.0/).
insects
Article
Cascaded Aggregation Convolution Network for Salient Grain
Pests Detection
Junwei Yu 1,2, *
 , Shihao Chen 1,2 , Nan Liu 3, Fupin Zhai 1,2 and Quan Pan 2,4
1 Key Laboratory of Grain Information Processing and Control (Henan University of Technology),
Ministry of Education, Zhengzhou 450001, China; chenshihao13@163.com (S.C.); zhaifupin618@126.com (F.Z.)
2 Henan Key Laboratory of Grain Photoelectric Detection and Control, Henan University of Technology,
Zhengzhou 450001, China; quanpan@nwpu.edu.cn
3 Basis Department, PLA Information Engineering University, Zhengzhou 450001, China; liunan526@126.com
4 School of Automation, Northwestern Polytechnical University, Xi’an 710129, China
* Correspondence: yujunwei@126.com
Simple Summary: Infestations of pests in grain storage can have a significant impact on both the
quantity and quality of stored grains. Drawing inspiration from the detection abilities
...
```

---

## 1-s2.0-S2666351122000535-main.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\1-s2.0-S2666351122000535-main.pdf`

**Abstract / First Page Extract:**

```text
Solar energy harvesting and wireless charging based temperature
monitoring system for food storage
Xinqing Xiao *, Meng Wang, Guoqing Cao
College of Engineering, China Agricultural University, Beijing, 100083, PR China
ARTICLE INFO
Keywords:
Solar energy harvesting
Wireless charging
Wireless sensing
Temperature monitoring
Food storage
ABSTRACT
Applying the renewable energy, such as the solar energy, would be a promising way to realize the self-powered
and sustainable wireless sensing for temperature monitoring in food storage. This paper developed and proposed a
solar energy harvesting and wireless charging based temperature monitoring system for food storage. The system
includes the solar energy harvesting, wireless charging and wireless temperature sensing. The wireless charging
performance between the wireless charging transmitter and wireless sensor node, the energy consumption per-
formance of wireless sensor node, the wireless temperature monitoring performance and the deployment and
improvement performance of the solar energy harvesting and wireless charging based temperature monitoring
system were analyzed and evaluated. The proposed and developed system could effectively wirelessly monitor the
temperature in real time by solar energy harvesting and wireless charging to ensure the food quality and safety in
storage. The proposed system also has a potential application example for many kinds of food monitoring by
renewable energy harvesting or wireless charging to impr
...
```

---

## electronics-15-00752-v2.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\electronics-15-00752-v2.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Massimiliano
Pieraccini
Received: 24 November 2025
Revised: 31 January 2026
Accepted: 2 February 2026
Published: 10 February 2026
Copyright: © 2026 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license.
Article
Design of a Passive Distributed RFID-Based Temperature
Monitoring System for Grain Storage
Qiuju Liang 1, Yuanwei Zhou 2, Guilin Yu 3, Zhiguo Wang 1,*, Wen Du 1, Hua Fan 1, Can Zhu 1, Zhenbing Li 4,
Tong Yang1 and Gang Li 3,*
1 Technology Center, China Tobacco Hunan Industrial Co., Ltd., Changsha 410007, China;
liangqj900808@hngytobacco.com (Q.L.); duw0621@hngytobacco.com (W.D.);
fanh0924@hngytobacco.com (H.F.); zhuc0215@hngytobacco.com (C.Z.); p_yangt@hngytobacco.com (T.Y.)
2 State Grid Chengdu Electric Power Supply Company, Chengdu 610041, China; zhouyuanwei2012@126.com
3 School of Information and Software Engineering, University of Electronic Science and Technology of China,
Chengdu 610056, China; 202422090734@std.uestc.edu.cn
4 School of Integrated Circuit Science and Engineering, University of Electronic Science and Technology of
China, Chengdu 610056, China; lizhenbing@uestc.edu.cn
* Correspondence: wangzhg0928@hngytobacco.com (Z.W.); ligangpm@uestc.edu.cn (G.L.)
Abstract
In grain storage and transportation, biological activity, including respiration and metabolism,
generates heat, creating temperature gradients that
...
```

---

## logistics-10-00064.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\logistics-10-00064.pdf`

**Abstract / First Page Extract:**

```text
Academic Editors: Mladen Krsti´ c,
Željko Stevi´ c and Snežana Tadi´ c
Received: 3 February 2026
Revised: 4 March 2026
Accepted: 10 March 2026
Published: 13 March 2026
Copyright: © 2026 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license.
Article
Optimizing Inventory in Convenience Stores to Maximize ROI
Using Random Forest and Genetic Algorithms
Kelly Zavaleta-Zarate 1
 , Jesus Escobal-Vera 1 and Eliseo Zarate-Perez 2,*
1 Department of Engineering, Faculty of Sciences and Engineering, Pontificia Universidad Católica del Perú,
PUCP , Av. Universitaria 1801, San Miguel, Lima 15088, Peru; kelly.zavaleta@pucp.edu.pe (K.Z.-Z.);
a20191352@pucp.edu.pe (J.E.-V .)
2 Department of Research, Innovation and Sustainability, Universidad Privada del Norte (UPN), Av. Alfredo
Mendiola 6062, Los Olivos 15314, Peru
* Correspondence: eliseo.zarate@upn.edu.pe
Abstract
Background: Convenience stores face volatile demand and a direct trade-off between stock-
outs and overstocking, both of which affect service levels and profitability. This study aims
to optimize inventory management through a reproducible forecasting-and-optimization
workflow, assessing its impact on return on investment (ROI) and operational metrics, such
as fill rate and stockouts. Methods: The workflow integrates daily, store-level transactions
with external covariates, constructs temporal and lag
...
```

---

## journal.pone.0286433.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\journal.pone.0286433.pdf`

**Abstract / First Page Extract:**

```text
RESEA RCH ARTICL E
Optimization and inventory management
under stochastic demand using metaheuristic
algorithm
Nguyen Duy Tan
1
, Hwan-Seong Kim
1
*, Le Ngoc Bao Long
1
, Duy Anh Nguyen
2
, Sam-
Sang You
ID
3
1 Department of Logistics, Korea Maritime and Ocean University , Busan, Republic of Korea, 2 Departm ent of
Mechatron ics, Ho Chi Minh City University of Technolo gy (HCMUT)- Vietnam National University Ho Chi Minh
City, Ho Chi Minh City, Vietnam, 3 Division of Mechanic al Engine ering, Northeast-A sia Shipping and Port
Logistics Resea rch Center, Korea Maritime and Ocean University, Busan, Republic of Korea
* kimhsysk mou@gmail.c om
Abstract
This study considers multi-period inventory systems for optimizing profit and storage space
under stochastic demand. A nonlinear programming model based on random demand is
proposed to simulate the inventory operation. The effective inventory management system
is realized using a multi-objective grey wolf optimization (MOGWO) method, reducing stor-
age space while maximizing profit. Numerical outcomes are used to confirm the efficacy of
the optimal solutions. The numerical analysis and tests for multi-objective inventory optimi-
zation are performed in the four practical scenarios. The inventory model’s sensitivity analy-
sis is performed to verify the optimal solutions further. Especially the proposed approach
allows businesses to optimize profits while regulating the storage space required to operate
in inventory management . The
...
```

---

## engproc-118-00090.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\engproc-118-00090.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Stefano Mariani
Published: 7 November 2025
Citation: Alyammahi, S.; Alhmoudi,
A.; Alawadhi, M.; Alqaydi, F. Low-
Cost IoT-Based Smart Grain
Monitoring System for Sustainable
Storage Management. Eng. Proc. 2025,
118, 90. https://doi.org/
10.3390/ECSA-12-26545
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Proceeding Paper
Low-Cost IoT-Based Smart Grain Monitoring System for
Sustainable Storage Management †
Saleimah Alyammahi *
 , Aisha Alhmoudi, Maryam Alawadhi and Fatima Alqaydi
Department of Mechanical Engineering, Fujairah Campus, Higher Colleges of Technology, Abu Dhabi 25026,
United Arab Emirates; h00512781@hct.ac.ae (A.A.); h00513517@hct.ac.ae (M.A.); h00494124@hct.ac.ae (F.A.)
* Correspondence: salyammahi1@hct.ac.ae
† Presented at the 12th International Electronic Conference on Sensors and Applications, 12–14 November 2025;
Available online: https://sciforum.net/event/ECSA-12.
Abstract
Efficient grain storage is critical for ensuring food security, particularly in regions with
hot and humid climates where environmental fluctuations can accelerate spoilage. This
study presents the development of a low-cost, Arduino-based microcontroller platform
Smart Grain Monitoring System designed to continuously monitor key storage parameters.
The system integrates
...
```

---

## s41598-021-83086-3.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\s41598-021-83086-3.pdf`

**Abstract / First Page Extract:**

```text
1
Vol.:(0123456789)Scientific Reports |         (2021) 11:3692  | https://doi.org/10.1038/s41598-021-83086-3
www.nature.com/scientificreports
Field evaluation of hermetic 
and synthetic pesticide‑based 
technologies in smallholder 
sorghum grain storage in hot 
and arid climates
Macdonald Mubayiwa1, Brighton M. Mvumi 1*, Tanya Stathers2, Shaw Mlambo1 & 
Tinashe Nyabako1
Field evaluation of six grain storage technologies under hot and arid conditions (32–42 °C; 
rainfall < 450 mm/year) in two locations in Zimbabwe were conducted over two storage seasons. The 
treatments included three hermetic technologies (Purdue Improved Crop Storage bags, GrainPro 
Super Grainbags, metal silos); three synthetic pesticide‑based treatments; and an untreated 
control, all using threshed sorghum grain. Sampling was at eight ‑week intervals for 32 weeks. Highly 
significant differences (p < 0.01) occurred between hermetic and non‑hermetic treatments regarding 
grain damage, weight loss, insect pest populations, and grain moisture content; with the hermetic 
containers exhibiting superior grain protection. Weight losses were low (< 3%) in hermetic treatments 
compared to pesticide‑based treatments (3.7 to 14.2%). Tribolium castaneum developed in metal silos, 
deltamethrin‑incorporated polypropylene bags and a pesticide treatment containing deltamethrin 
0.13% and fenitrothion 1% while Sitotroga cerealella developed in a pesticide treatment containing 
pirimiphos‑methyl 0.16% + thiamethoxam 0.036%
...
```

---

## fsufs-06-767089.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\fsufs-06-767089.pdf`

**Abstract / First Page Extract:**

```text
ORIGINAL RESEARCH
published: 28 January 2022
doi: 10.3389/fsufs.2022.767089
Frontiers in Sustainable Food Systems | www.frontiersin.o rg 1 January 2022 | Volume 6 | Article 767089
Edited by:
Cristobal N. Aguilar,
Universidad Autónoma de
Coahuila, Mexico
Reviewed by:
R. Pandiselvam,
Central Plantation Crops Research
Institute (ICAR), India
Cristian Torres-León,
Universidad Autónoma de
Coahuila, Mexico
*Correspondence:
Bert Dijkink
bert.dijkink@wur.nl
Specialty section:
This article was submitted to
Sustainable Food Processing,
a section of the journal
Frontiers in Sustainable Food Systems
Received: 30 August 2021
Accepted: 05 January 2022
Published: 28 January 2022
Citation:
Dijkink B, Broeze J and Vollebregt M
(2022) Hermetic Bags for the Storage
of Maize: Perspectives on Economics,
Food Security and Greenhouse Gas
Emissions in Different Sub-Saharan
African Countries.
Front. Sustain. Food Syst. 6:767089.
doi: 10.3389/fsufs.2022.767089
Hermetic Bags for the Storage of
Maize: Perspectives on Economics,
Food Security and Greenhouse Gas
Emissions in Different Sub-Saharan
African Countries
Bert Dijkink *, Jan Broeze and Martijntje Vollebregt
Wageningen Food & Biobased Research, Wageningen, Netherla nds
During storage, cereals and legumes are vulnerable to insec ts, rodents, and fungi, which
can cause loss of weight, damage or discoloration of product s, and/or toxin formation.
Hermetic bags can prevent excessive insect infestation, an d toxin formation. This paper
presents an anal
...
```

---

## 16+IJBSM+Volume+17+issue+2+February+2026+Oyewole+and+Raji.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\16+IJBSM+Volume+17+issue+2+February+2026+Oyewole+and+Raji.pdf`

**Abstract / First Page Extract:**

```text
© 2024 PP House
Beyond Metal Silos: Low-cost Hermetic Bags for Smallholder Grain 
Protection
Article AR6667
DOI: HTTPS://DOI.ORG/10.23910/1.2026.6667
Review Article
RECEIVED on 03rd September 2025        RECEIVED in revised form on 15th January 2026        ACCEPTED in final form on 04th February 2026        PUBLISHED on 20th February 2026
IJBSM February 2026, 17(2): 01-13
https://ojs.pphouse.org/index.php/IJBSM
Citation (VANCOUVER): Oyewole and Raji, Beyond Metal Silos: Low-cost Hermetic Bags for Smallholder Grain Protection. International 
Journal of Bio-resource and Stress Management, 2026; 17(2), 01-13. HTTPS://DOI.ORG/10.23910/1.2026.6667. 
Copyright: © 2026 Oyewole and Raji. This is an open access article distributed under the terms of the Creative Commons Attribution-
NonCommercial-ShareAlike 4.0 International License, that permits unrestricted use, distribution and reproduction in any medium after 
the author(s) and source are credited.
Data Availability Statement: Legal restrictions are imposed on the public sharing of raw data. However, authors have full right to transfer 
or share the data in raw form upon request subject to either meeting the conditions of the original consents and the original research 
study. Further, access of data needs to meet whether the user complies with the ethical and legal obligations as data controllers to allow 
for secondary use of the data outside of the original study.
Conflict of interests: The authors have declared that no conflic
...
```

---

## Purdue+Improved+Crop+Storage+(PICS)+Bags+-+AJASFR.Vol20.No1.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\Purdue+Improved+Crop+Storage+(PICS)+Bags+-+AJASFR.Vol20.No1.pdf`

**Abstract / First Page Extract:**

```text
ISSN: 3027-2637     www.afropolitanjournals.com 
 
 
Afropolitan Journals 
83      Vol. 20, No. 1 2025   African Journal of Agricultural Science and Food Research 
This open-access article is distributed under 
Creative Commons Attribution 4.0 license 
Purdue Improved Crop Storage (PICS) Bags : An Innovative 
Hermetic Storage Technology for Postharvest Crop 
Management in Developing Countries 
 
Oyewole O. S.  1; Abdulbaki, M. K.  2; Adisa, A. A.  2; Adebiyi, A. O.  3; Raji, 
M. A.  2; Balogun, B.  2, Ajao, T. O.  1; Ibitoye O.  2; and Aremu, M. B.   2 
1Postharvest Engineering Research Department, Nigerian Stored Products Research Institute, P.M.B 5044, 
Ibadan, Nigeria. 2Durable Crops Research Department, Nigerian Stored Products Research Institute, P.M.B 
5044 Ibadan, Nigeria. 3Postharvest Engineering Research Department, Nigerian Stored Products Research 
Institute, P.M.B 1489 Ilorin, Nigeria. 
Corresponding author: oyewoleos@nspri.gov.ng 
DOI: https://doi.org/10.62154/ajasfr.2025.020.01016 
 
 
Abstract 
Postharvest losses remain a major barrier to food security and economic growth in developing 
countries, where smallholder farmers often lack access to effective crop storage solutions. The 
Purdue Improved Crop Storage (PICS) bag, develop ed by Purdue University, is a triple -layer 
hermetic storage technology designed to reduce such losses without the use of chem ical 
pesticides. This review examines the design, functionality and impact of PICS bags,
...
```

---

## agriculture-15-00151-v2 (1).pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\agriculture-15-00151-v2 (1).pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Steliana Rodino
Received: 19 November 2024
Revised: 4 January 2025
Accepted: 9 January 2025
Published: 12 January 2025
Citation: Nepali, D.K.; Maharjan, K.L.
Assessing the Impact of Hermetic
Storage Technology on Storage
Quantity and Post-Harvest Storage
Losses Among Smallholding Maize
Farmers in Nepal. Agriculture 2025, 15,
151. https://doi.org/10.3390/
agriculture15020151
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Assessing the Impact of Hermetic Storage Technology on Storage
Quantity and Post-Harvest Storage Losses Among Smallholding
Maize Farmers in Nepal
Deepak Kumar Nepali
 and Keshav Lall Maharjan *
International Economic Development Program (IEDP), Graduate School of Humanities and Social
Sciences (GSHSS), Hiroshima University, 1-5-1 Kagamiyama, Higashihiroshima 739-8529, Hiroshima, Japan;
nepalid10@gmail.com
* Correspondence: mkeshav@hiroshima-u.ac.jp
Abstract: Promoting smallholding farmers to use improved storage technology is pivotal to
enhance the sustainable agri-food system. Studies suggest that hermetic storage technology
reduces post-harvest storage losses, improves grain quality, and enhances food security.
However, weak causal evidence is prevalent due to confounding and endogeneity issues in
such studies. Hence, this study exa
...
```

---

## as_2022091415195310.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\as_2022091415195310.pdf`

**Abstract / First Page Extract:**

```text
Agricultural Sciences, 2022, 13, 989-1011 
https://www.scirp.org/journal/as 
ISSN Online: 2156-8561 
ISSN Print: 2156-8553 
 
DOI: 10.4236/as.2022.139061  Sep.  15, 2022 989 Agricultural Sciences 
 
 
 
 
Grain Hermetic Storage Adoption in Northern 
Uganda: Awareness, Use, and the Constraints 
to Technology Adoption 
Francis Okori1*, Sam Cherotich1, Alex Abaca2,3, Emmanuel Baidhe1, Francis Adibaku4,  
James Denis Onyinge5  
1Department of Agricultural and Biosystems Engineering, Makerere University, Kampala, Uganda 
2National Agricultural Research Organization (NARO), Abi Zonal Agricultural Research and Development Institute, Arua, 
Uganda 
3Department of Crop Science, Faculty of Agriculture and Environmental Sciences, Muni University, Arua, Uganda 
4Department of Food Science and Postharvest Technology, Gulu University, Gulu, Uganda 
5Agriculture and Market Support Programme, United Nations World Food Programme, Kampala, Uganda 
 
 
 
Abstract 
Post-harvest storage losses (PHLs) remain significant in Sub -Saharan Africa 
(SSA) due to several factors mainly insect pests and molds. Hermetic storage 
technologies (HSTs) are being promoted to address these storage losses. In 
Uganda, HSTs were first introduced in 2012. However, its use among farming 
households remains low today. Data were collected from 306 smallholder 
farmers from four districts of Northern Uganda using a pre -tested semi - 
structured questionnaire to understand their knowledge, use, and constraints 
to the
...
```

---

## agriculture-15-00151-v2.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\agriculture-15-00151-v2.pdf`

**Abstract / First Page Extract:**

```text
Academic Editor: Steliana Rodino
Received: 19 November 2024
Revised: 4 January 2025
Accepted: 9 January 2025
Published: 12 January 2025
Citation: Nepali, D.K.; Maharjan, K.L.
Assessing the Impact of Hermetic
Storage Technology on Storage
Quantity and Post-Harvest Storage
Losses Among Smallholding Maize
Farmers in Nepal. Agriculture 2025, 15,
151. https://doi.org/10.3390/
agriculture15020151
Copyright: © 2025 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license
(https://creativecommons.org/
licenses/by/4.0/).
Article
Assessing the Impact of Hermetic Storage Technology on Storage
Quantity and Post-Harvest Storage Losses Among Smallholding
Maize Farmers in Nepal
Deepak Kumar Nepali
 and Keshav Lall Maharjan *
International Economic Development Program (IEDP), Graduate School of Humanities and Social
Sciences (GSHSS), Hiroshima University, 1-5-1 Kagamiyama, Higashihiroshima 739-8529, Hiroshima, Japan;
nepalid10@gmail.com
* Correspondence: mkeshav@hiroshima-u.ac.jp
Abstract: Promoting smallholding farmers to use improved storage technology is pivotal to
enhance the sustainable agri-food system. Studies suggest that hermetic storage technology
reduces post-harvest storage losses, improves grain quality, and enhances food security.
However, weak causal evidence is prevalent due to confounding and endogeneity issues in
such studies. Hence, this study exa
...
```

---

## J Sci Food Agric - 2023 - Ngoma - Comparative utility of hermetic and conventional grain storage bags for smallholder.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\J Sci Food Agric - 2023 - Ngoma - Comparative utility of hermetic and conventional grain storage bags for smallholder.pdf`

**Abstract / First Page Extract:**

```text
Review
Received: 27 February 2023 Revised: 26 July 2023 Accepted article published: 22 August 2023 Published online in Wiley Online Library: 14 September 20 23
(wileyonlinelibrary.com) DOI 10.1002/jsfa.12934
Comparative utility of hermetic and
conventional grain storage bags for
smallholder farmers: a meta-analysis
Theresa N Ngoma, a,b Maurice Monjerezi,c,d John F Leslie, e
Brighton M Mvumi, b Jagger JW Harvey e,f and Limbikani Matumba a*
Abstract
Postharvest management is critical to attaining household food, nutrition, and income security. Hermetic grain storage bags
offer an effective pesticide-free way to protect stored grain against fungal and insect infestation. We evaluated articles indexed
in the Web of Science that included experiments comparing the storage ef ﬁcacy of conventional and hermetic storage bags
based on grain germination rate, insect infestation, physical damage, mycotoxin contamination, and changes in weight and
moisture content. Compared with grain stored in hermetic bags, grain stored in conventional bags lost 3.6-fold more seed via-
bility, contained 42-fold more insects, had 11-fold more physical damage, and lost 23-fold more grain weight, while grain mois-
ture levels were similar for both hermetic and conventional storage bags. Mycotoxin contamination levels were not as
frequently assessed. Levels could be low in grain stored in both types of bags, or levels could be low in hermetic bags and sig-
niﬁcantly higher in conventional bags. The improved
...
```

---

## International Journal of Food Science - 2021 - El-Kholy - Performance Analysis and Quality Evaluation of Wheat Storage in.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\International Journal of Food Science - 2021 - El-Kholy - Performance Analysis and Quality Evaluation of Wheat Storage in.pdf`

**Abstract / First Page Extract:**

```text
Research Article
Performance Analysis and Quality Evaluation of Wheat Storage in
Horizontal Silo Bags
Mohamed M. El-Kholy and Reham M. Kamel
Agricultural Engineering Research Institute, Agricultural Research Center, Giza, Egypt
Correspondence should be addressed to Reham M. Kamel; rehamkamel8541@gmail.com
Received 21 June 2021; Revised 22 August 2021; Accepted 23 August 2021; Published 6 September 2021
Academic
Editor: Giorgia Spigno
Copyright © 2021 Mohamed M. El-Kholy and Reham M. Kamel. This is an open access article distributed under the Creative
Commons Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, provided the
original work is properly cited.
Wheat still su ﬀers from the problem of traditional storage methods, limited storage capacity, and a high percentage of losses in
terms of quantity and quality. Hermetic silo bags are economical and alternative technique to the traditional storage methods.
Ten horizontal plastic silos with the capacity of 200 tons/silo were tested and evaluated for eight months of wheat storage. The
evaluations included grain bulk temperature, CO
2 concentration, fungal and microbial count, insect count, grain moisture
content, 1000-grain weight, falling number, and protein content. The results showed that the stored wheat quality was
maintained without any signi ﬁcant di ﬀerence during the storage period in terms of 1000-grain weight, grain moisture content,
and falling number, while there were
...
```

---

## IJB-V18-No1-p199-212.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\IJB-V18-No1-p199-212.pdf`

**Abstract / First Page Extract:**

```text
199  Sadiq et al.   
 
Int. J. Biosci.  202 1 
     
REVIEW PAPER REVIEW PAPER REVIEW PAPER REVIEW PAPER                                                                                                                                                                                                                                                                                                                                                                                        OPEN ACCESS OPEN ACCESS OPEN ACCESS OPEN ACCESS     
 
Prospects of post-harvest processing of cereal grains in 
Pakistan: A review 
 
Luqman Sadiq *1 , Zia -Ul -Haq 1, Zulfiqar Ali 2, Hamza Muneer Asam 1, Talha Mehmood 1, 
Muhammad Kazim Nawaz 1 
 
1Faculty of Agricultural Engineering & Technology, PMAS Arid Agriculture University, 
Rawalpindi, Pakistan 
2Agricultural Engineering Institute, National Agricultural Research Centre, Islamabad, Pakistan 
 
Key  words:  Cereal grains, Pakistan, Post-harvest processing  
http://dx.doi.org/10.12692/ijb/18.1.199-212   Article published on January 30 , 2021 
Abstract  
Wheat, rice, and maize are the three most important cereal grains used as staple food in all over the world and 
especially, in Pakistan, wheat is the principal source of the daily calorie and protein intake of the population with 
balance coming from animal source. In the pre-historic period of agriculture, farmer observed that dry grains stored 
longer than wet grains. Moreover, insects as well
...
```

---

## fsufs-9-1640274.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\fsufs-9-1640274.pdf`

**Abstract / First Page Extract:**

```text
Frontiers in Sustainable Food Systems 01 frontiersin.org
Increasing adoption of grain 
postharvest technology by 
smallholder farmers: a 
five-pronged strategy
Theresa Nakoma-Ngoma 1,2, John F. Leslie 3, Maurice Monjerezi 4, 
Brighton M. Mvumi 2, Tafireyi Chamboko 5, Elija Kamundi 1, 
Andrew Thadzi 1, Bertha Kachala 1, Aggrey Pemba Gama 6, 
Beston Maonga 7, Jagger Harvey 3† and Limbikani Matumba 1*
1 FoodPlus Research Group, Faculty of Life Sciences Natural Resources, Lilongwe University of 
Agriculture and Natural Resources (LUANAR), Lilongwe, Malawi, 2 Department of Agricultural and 
Biosystems Engineering, Faculty of Agriculture Environment and Food Systems (FAEFS), University of 
Zimbabwe (UZ), Harare, Zimbabwe, 3 Department of Plant Pathology, Throckmorton Plant Sciences 
Center, Kansas State University, Manhattan, KS, United States, 4 Centre for Resilient Agri-Food Systems 
(CRAFS), University of Malawi, Zomba, Malawi, 5 Department of Agricultural Business Development 
and Economics, Faculty of Agriculture Environment and Food Systems (FAEFS), University of 
Zimbabwe (UZ), Harare, Zimbabwe, 6 Department of Food Science and Technology, Bunda College, 
Lilongwe University of Agriculture and Natural Resources (LUANAR), Lilongwe, Malawi, 7 Department 
of Agricultural and Applied Economics, Bunda College, Lilongwe University of Agriculture and Natural 
Resources (LUANAR), Lilongwe, Malawi
Grain postharvest losses (PHLs) reduce food security, income stability, and climate 
re
...
```

---

## 5(2),245-263.pdf
**Path:** `c:\Users\Nexgen\Downloads\FYP\Research Papers\5(2),245-263.pdf`

**Abstract / First Page Extract:**

```text
THE ASIAN BULLETIN OF GREEN MANAGEMENT AND CIRCULAR ECONOMY  
 Vol 5, Issue 2(2025) 
245 
 
Assessing post-harvest losses in value chain of wheat farmers in 
district Shikarpur, Sindh  
Tahir Hussain*, Mehar ul Nissa Rais, Musawir Ali*, Hira Bibi, Aijaz Ali, Hasnain Ali  
Chronicle Abstract  
Article history 
Received: Aug 23, 2025 
Received in the revised format: Sept13, 
2025 
Accepted: Oct 21, 2025 
Available online: Nov 29, 2025 
Wheat plays a vital role in ensuring food security and economic 
livelihood in Pakistan, yet significant post -harvest and value chain 
losses hinder its productivity, particularly in District Shikarpur, Sindh. 
This study was conducted to investigate the exte nt, causes, and 
consequences of these losses along the wheat value chain and to 
propose practical interventions for mitigation. The research was 
carried out in two selected talukas of Shikarpur District, covering 
four Union Councils with a sample of 120 wh eat farmers (30 from 
each UC). Data were collected through structured personal 
interviews using the KoboCollect tool for real-time data recording. 
Findings revealed a series of interconnected challenges across the 
value chain. In the pre-harvest phase, 77.5% of farmers reported a 
lack of modern machinery for land preparation, while 75.83% 
faced high costs of certified seed, and 80.83% were burdened by 
the high cost of fertilizer. Water shortages (55.83%) and poor 
access to pesticide application equipment (6 5.83%) further 
con
...
```

---



