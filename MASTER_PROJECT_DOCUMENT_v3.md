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
