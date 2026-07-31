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
