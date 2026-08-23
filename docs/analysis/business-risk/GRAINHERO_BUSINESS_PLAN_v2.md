# GrainHero & TechNova Group — Business Plan

## Version 3.0 | July 2026 | NICAT Cohort 7

> **Document scope:** GrainHero (flagship product) + strategic parent company architecture (TechNova Group). This is a living document — update after every major sprint.

---

## EXECUTIVE SUMMARY

**The Problem:** Pakistan loses an estimated **3.6–6.0 million tonnes of wheat annually** — 10–15% of production — to post-harvest spoilage in storage. At current 2026 market rates (**PKR 90,000–120,000/tonne**), this represents **PKR 324–720 billion (~$1.1–2.5 billion USD) lost every year**, overwhelmingly in facilities with no environmental monitoring, no early-warning systems, and no data. Operators detect spoilage only when it is already catastrophic. The global post-harvest loss figure exceeds **$1.3 trillion annually** (FAO, 2023).

**The Solution:** GrainHero is an **Energy-Aware AIoT multi-crop storage intelligence platform** that deploys wireless sensor pods inside grain stores. It runs a 3-algorithm machine learning ensemble (XGBoost + Random Forest + LightGBM) for spoilage-risk prediction in real time across multiple crops (Rice, Wheat, Maize, Sorghum, Barley, + expansion crops), triggers physical interventions (fan aeration, alerts), and delivers actionable advisories to operators via a web dashboard and mobile push notifications. The system is designed to be priced, powered, and maintained within the constraints of emerging markets, operating fully **off-grid** via solar and UPS-backed gateways.

**NICAT Status:** Cohort 7 participant. Previously pitched at NICAT Mentor Gala, Career Fair, Open House EXPO, RAS Expo, AeroFusion. Registered for SEE Pakistan 2026.

**Founders:**

- Co-Founder A: AI/ML Engineering + IoT/Embedded Firmware
- Co-Founder B: Backend, Full-Stack Web, Mobile App

**Traction:**

- Working ESP32 prototype (BME680, DHT11, LDR, soil-moisture probe, servo lid, MOSFET fan control, MicroSD offline buffer)
- 5-grain ensemble ML pipeline trained on 50,320 rows
- Full-stack web platform (Node.js + MongoDB Atlas + Next.js) operational
- _(Note: Initial Supabase migration codebase was lost/removed during cleanup; a fresh migration is scheduled to bring the platform to modern serverless infrastructure.)_

---

## SECTION 1 — THE PROBLEM

### 1.1 The Grain Storage Crisis in Pakistan

| Statistic                                            | Value                                      | Source                              |
| ---------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| Annual wheat production                              | 27–29 million tonnes                       | Pakistan Bureau of Statistics, 2024 |
| Modern silo storage capacity                         | ~3.4 million tonnes (≈ 3.2% of production) | PBC Research, 2024                  |
| Annual wheat post-harvest loss (% of production)     | 10–15%                                     | FAO / PBC                           |
| Annual wheat post-harvest loss (tonnes)              | 3.6–6.0 million tonnes                     | Estimate                            |
| **Economic loss (wheat alone, @ PKR 100,000/t avg)** | **PKR 360–600 billion/year**               | **Estimate (Updated 2026 Prices)**  |
| Storage gap (unmet formal storage capacity)          | **22+ million tonnes**                     | PBC Research, 2024                  |

### 1.2 Why Monitoring Doesn't Exist Today

| Barrier      | Current Reality                             | GrainHero Fix                                                         |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------- |
| Cost         | Global IoT platforms: $2,000–15,000/silo    | GrainHero target: $640/silo (IoT hardware)                            |
| Connectivity | Unreliable internet in rural Punjab/Sindh   | SD-card offline buffer + LoRaWAN (sub-GHz, no WiFi needed)            |
| Power        | 8–14h loadshedding per day                  | Solar integration + UPS-backed gateway + battery pods (21-month life) |
| Expertise    | No technical staff at most grain facilities | Single-button app; no installation skill required                     |
| Language     | English-only platforms                      | Urdu/regional localization                                            |

### 1.3 Root Cause of Grain Losses

```
Insects & pests:     40% of losses
Moisture migration:  35% of losses
Rodents:            15% of losses
Handling damage:    10% of losses
```

**GrainHero directly addresses the top two causes** (moisture is Feature #1 in the ML model at 20.3% SHAP importance; insects detectable via acoustic sensing in future hardware iterations).

---

## SECTION 2 — THE SOLUTION

### 2.1 Multi-Crop Expansion & Energy Architecture

GrainHero operates as an intelligent edge-to-cloud system built to survive emerging market conditions:

- **Energy-Aware Hardware**: With 8-14 hours of daily loadshedding, standard IoT hardware fails. GrainHero utilizes solar-powered LoRaWAN gateways and ultra-low-power RAK3172 sensor pods that run for 21 months on standard 18650 batteries.
- **Multi-Crop Extensibility**: While initially focused on Wheat and Rice, the AI platform natively supports Maize, Sorghum, and Barley, with immediate architecture to support regional cash crops (cottonseed, pulses) without re-engineering the hardware.

### 2.2 What GrainHero Does

| Feature                                | Status     | Value                                         |
| -------------------------------------- | ---------- | --------------------------------------------- |
| Real-time T/RH/VOC/Pressure monitoring | ✅ Working | Know exactly what's happening inside the silo |
| AI spoilage risk prediction (3-class)  | ✅ Working | Early warning 7–14 days before visible damage |
| Automated fan/aeration control         | ✅ Working | Physical intervention without human action    |
| Multi-grain support (5+ grains)        | ✅ Working | One platform for all crops                    |
| Off-Grid Solar Power System            | ⚠️ Planned | Uninterrupted monitoring during loadshedding  |

---

## SECTION 3 — MARKET ANALYSIS & SCALE

### 3.1 Total Addressable Market (Regional → Inter-continental)

| Market                                | Addressable Facilities | Price Point | TAM           | Priority            |
| ------------------------------------- | ---------------------- | ----------- | ------------- | ------------------- |
| Pakistan grain warehouses & mills     | ~9,200                 | $99–199/mo  | ~$12M/yr      | ⭐ Primary (Year 1) |
| Middle East grain reserves (KSA, UAE) | ~3,500                 | $299/mo     | $12.6M/yr     | Year 2–3            |
| Sub-Saharan Africa (cooperatives)     | ~50,000+               | $29/mo      | $17.4M/yr     | Year 3–5            |
| **Global Infrastructure Potential**   |                        |             | **$2.1B+/yr** | Long-term           |

### 3.2 Competitive Landscape

| Competitor    | Origin | Price                | Weakness                       | GrainHero Advantage             |
| ------------- | ------ | -------------------- | ------------------------------ | ------------------------------- |
| Grain Guard   | AU     | $5,000–15,000        | Too expensive for PK/Africa    | 6–10× cheaper                   |
| Bin-Sense     | CA     | $3,000–8,000         | Requires stable power/internet | Solar/Off-grid native, LoRaWAN  |
| **GrainHero** | PK     | $640 hardware + SaaS |                                | Local, Multi-crop, Energy-aware |

---

## SECTION 4 — REVENUE MODEL

### 4.1 Subscription Tiers (SaaS)

| Tier         | Price/Month    | Included                                       | Target Customer           |
| ------------ | -------------- | ---------------------------------------------- | ------------------------- |
| Starter      | $49/month      | 1 silo, 1 pod, email alerts                    | Small farmer/trader       |
| Professional | **$99/month**  | 5 silos, push alerts, PDF reports              | Warehouse owner           |
| Enterprise   | **$299/month** | Unlimited silos, API access, Solar integration | Flour mills, Cooperatives |

### 4.2 Additional Revenue Streams

- **Hardware & Solar Sales**: One-time sales of the LoRaWAN+Solar gateway kits (est. 35% margin).
- **Insurance Commission**: Insurers offer 5-10% premium discounts to GrainHero customers; we take a 10-15% referral commission.
- **Export Traceability**: QR-coded EU RASFF compliance data ($0.50–1.00/tonne).

---

## SECTION 5 — PARENT COMPANY ARCHITECTURE: TECHNOVA GROUP

GrainHero is the flagship product of the **TechNova Group**, an infrastructure holding company that deploys AI, IoT, and automation solutions across emerging markets.

```
TechNova Group (Holding Company)
│
├── GrainHero                    ← Flagship: Multi-crop storage intelligence
├── BrightGrid                   ← Key Focus: Industrial solar & loadshedding management
├── ColdWatch                    ← Cold chain / refrigeration monitoring
├── AquaSense                    ← Water quality + irrigation optimization
├── BuildSense                   ← Construction site safety monitoring
├── TechNova Academy             ← Industrial AI/IoT training
└── TechNova Labs                ← Applied R&D
```

**BrightGrid Synergy**: The solar and off-grid power solutions engineered for GrainHero directly cross-pollinate into `BrightGrid`, addressing the massive industrial loadshedding crisis in Pakistan.

---

## SECTION 6 — TECHNOLOGY ROADMAP & NEXT STEPS

### Phase 1: Re-establishing the Core

- **Supabase Audit & Restart**: Since the initial Supabase codebase was lost, we will initiate a clean, modern Next.js/Supabase architecture migration.
- **Hardware**: Finalize the ESP32 to LoRaWAN gateway transition and solar power module design.

### Phase 2: Pilot & Deployment

- Deploy solar-powered LoRaWAN pods in pilot flour mills in Punjab.
- Calibrate the ML ensemble models with real-world sensor data.

### Phase 3: Regional Expansion

- Launch BrightGrid using the energy-management backend built for GrainHero.
- Expand to Middle Eastern grain reserves.

---

_Document version 3.0. Prepared by TechNova Group / GrainHero team, July 2026._
