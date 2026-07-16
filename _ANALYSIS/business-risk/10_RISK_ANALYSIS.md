# GrainHero — Risk Analysis & Failure Mode Register
## Technical · Business · Operational · Hardware Risks with Exact Code References

> **Status**: Discovery only — no code modified  
> **Reference**: [00_MASTER_ANALYSIS.md](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/docs/00_MASTER_ANALYSIS.md)

---

## 1. Risk Dashboard

```mermaid
quadrantChart
    title Risk Matrix (Probability vs. Impact)
    x-axis Low Probability --> High Probability
    y-axis Low Impact --> Critical Impact
    quadrant-1 Critical Threats (Fix Immediately)
    quadrant-2 High Probability Low Impact (Monitor)
    quadrant-3 Low Risk (Accept)
    quadrant-4 Low Probability High Impact (Contingency)
    No IoT ingest path: [0.98, 0.98]
    Schema bug crashes analytics: [0.95, 0.85]
    Model on synthetic data only: [0.95, 0.75]
    Pest always zero: [0.99, 0.65]
    False negative Spoiled=Safe: [0.45, 0.95]
    Supabase pricing change: [0.3, 0.55]
    Wet grain intake not enforced: [0.55, 0.88]
    Fumigation fan interlock missing: [0.35, 0.99]
    Key engineer leaves: [0.3, 0.85]
    ML cold start latency: [0.8, 0.5]
```

---

## 2. Severity Classification

| Code | Severity | Definition |
|---|---|---|
| C | **Critical** | System failure or potential grain loss/human harm — cannot ship |
| H | **High** | Major feature broken — not acceptable for production |
| M | **Medium** | Feature degraded — acceptable for demo, fix before commercial |
| L | **Low** | Minor UX issue — acceptable for v1 |

---

## 3. Technical Risk Register

### T-01 — IoT Data: Zero Rows in Supabase

| Field | Value |
|---|---|
| **Risk** | Arduino sensor data never reaches Supabase PostgreSQL |
| **Probability** | Certain (confirmed by database inspection) |
| **Impact** | Critical — entire IoT monitoring value proposition broken |
| **Root Cause** | No MQTT bridge, no `/ingest` Edge Function exists |
| **Files affected** | `supabase/functions/ingest/` (does not exist), [services/iotDeviceService.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/services/iotDeviceService.js) (original, not ported) |
| **Symptom** | `sensor_readings` table: 0 rows. Dashboard shows "No data" |
| **Fix** | Sprint 1: Create `/ingest` Edge Function + `mqtt_bridge.js` |
| **Effort** | 36 person-hours |
| **Due** | Before any investor demo |

### T-02 — Schema Bug: `current_stock_kg` Column Does Not Exist

| Field | Value |
|---|---|
| **Risk** | Runtime query error crashes the analytics dashboard |
| **Probability** | Certain |
| **Impact** | High — main dashboard non-functional |
| **Root Cause** | Column renamed from `current_stock_kg` to `current_occupancy_kg` in DB migration, but code not updated |
| **File** | [analytics.functions.ts **Line 209**](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/lib/analytics.functions.ts) |
| **Exact fix** | `current_stock_kg` → `current_occupancy_kg` (1 word change) |
| **Effort** | **0.5 hours** |
| **Due** | **Fix today — Sprint 0** |

### T-03 — ML Predictions: `ml_risk_class` Always NULL

| Field | Value |
|---|---|
| **Risk** | Spoilage risk classification never computed for Supabase stack |
| **Probability** | Certain |
| **Impact** | Critical — entire AI/ML value proposition broken |
| **Root Cause** | No Python ML service deployed; no call from Edge Function to ML; `analytics.functions.ts` uses JS heuristic as placeholder |
| **Files affected** | [analytics.functions.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/lib/analytics.functions.ts), [ai-insights.functions.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/lib/ai-insights.functions.ts), [ml/smartbin_predict.py](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/ml/smartbin_predict.py) |
| **Fix** | Sprint 2: `ml_service/main.py` FastAPI + Fly.io deploy |
| **Effort** | 31.5 person-hours |
| **Due** | Sprint 2 |

### T-04 — Grain Alerts: Auto-Create Trigger Missing

| Field | Value |
|---|---|
| **Risk** | Threshold breaches (temp > 30°C, humidity > 75%, etc.) never generate alerts |
| **Probability** | Certain |
| **Impact** | Critical — alert system is the primary safety mechanism |
| **Root Cause** | No `AFTER INSERT ON sensor_readings` trigger exists in Supabase |
| **Original code** | [services/alertService.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/services/alertService.js) |
| **Supabase target** | `supabase/migrations/XXXX_check_sensor_thresholds.sql` (needs creation) |
| **Fix** | Sprint 3: PostgreSQL trigger function |
| **Effort** | 8 person-hours (trigger) + 4 hours (testing) |

### T-05 — Fan Control: MQTT Actuator Command Never Published from Supabase

| Field | Value |
|---|---|
| **Risk** | Even if ML detects spoilage, fan cannot be commanded |
| **Probability** | Certain |
| **Impact** | High — automation value proposition broken |
| **Root Cause** | `/ingest` Edge Function doesn't exist; no path from Supabase to MQTT broker |
| **Original code** | [routes/aiSpoilage.js `sendMLActuatorCommand()`](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/routes/aiSpoilage.js) |
| **Fix** | Edge Function response body contains actuator command → bridge publishes |
| **Effort** | 5 person-hours |

### T-06 — Feature Engineering: Dew Point Never Computed in Supabase

| Field | Value |
|---|---|
| **Risk** | `dew_point` field always NULL; ML model gets wrong input |
| **Probability** | Certain |
| **Impact** | High — 5th most important ML feature missing |
| **Root Cause** | `SensorReading.js` Mongoose pre-save hook computed this in original stack |
| **Original code** | [models/SensorReading.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/models/SensorReading.js) pre-save hook |
| **Formula** | `dew_point = T - ((100 - RH) / 5)` (Magnus approximation, ±1°C) |
| **Fix** | Add to `/ingest` Edge Function (Sprint 1, 2 hours) |

### T-07 — Pest_Presence Always 0.0

| Field | Value |
|---|---|
| **Risk** | Pest detection feature hardcoded to 0 — model cannot detect insects |
| **Probability** | Certain |
| **Impact** | Medium — model loses 7.7% SHAP weight; false Safe predictions possible |
| **Original code** | [ml/smartbin_predict.py](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/ml/smartbin_predict.py) line with `pest_presence = 0` |
| **Firmware** | [grainhero_main_final.ino](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero_main_final.ino) — no MEMS microphone |
| **Short-term fix** | VOC proxy: `pest_presence = min(1.0, voc_relative * 0.5)` |
| **Long-term fix** | SPH0645 MEMS microphone + 1D CNN TFLite on ESP32 (hardware v2) |

### T-08 — Human Override State Lost on Reboot

| Field | Value |
|---|---|
| **Risk** | If ESP32 reboots (power glitch), `humanOverrideActive` RAM variable resets to false |
| **Impact** | Medium — operator-locked configuration may auto-revert |
| **File** | [grainhero_main_final.ino L60–70](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero_main_final.ino) |
| **Fix** | Write `humanOverrideActive` + `overrideStartTime` to ESP32 NVS (Preferences library) |
| **Effort** | 2 hours |

### T-09 — Feature/Model Mismatch: SmartBin (4-feature) vs. Ensemble (9-feature)

| Field | Value |
|---|---|
| **Risk** | Two incompatible ML prediction APIs exist; confusion causes wrong model to be called |
| **Files** | [SmartBin-RiceSpoilage-main/app.py](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/SmartBin-RiceSpoilage-main/) (4-feature, rice only) vs. [farmHomeBackend-main/ml/smartbin_predict.py](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/ml/smartbin_predict.py) (9-feature, 5 grains) |
| **Impact** | High — calling wrong endpoint returns meaningless predictions |
| **Decision** | Use `farmHomeBackend-main/ml/` exclusively. Mark `SmartBin-RiceSpoilage-main/` as deprecated. |

### T-10 — Validation Pipeline: Predictions Stay `pending` Forever

| Field | Value |
|---|---|
| **Risk** | No closed-loop ML accuracy tracking; synthetic 97% accuracy never validated against real outcomes |
| **File** | [models/SpoilagePrediction.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/models/SpoilagePrediction.js) `validation_status` field |
| **Impact** | Medium — model quality unmeasured; business claims unverifiable |
| **Fix** | Wire `spoilage_event` reports to update `validation_status` + accumulate `training_samples` table |

---

## 4. Safety Risks (Physical / Operator)

### S-01 — Fan Running During Phosphine Fumigation

| Field | Value |
|---|---|
| **Risk** | Fan disperses fumigant before it reaches lethal concentration; insects survive; or fumigant exits silo endangering workers |
| **Severity** | **CRITICAL — potential human harm** |
| **Current state** | No `fumigation_active` flag exists anywhere in the codebase |
| **Fix** | Add `fumigation_active BOOLEAN DEFAULT false` to `silos` table; check this flag before ANY fan command in [routes/aiSpoilage.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/routes/aiSpoilage.js) and future Edge Functions |

### S-02 — False Negative: Spoiled Grain Classified as Safe

| Field | Value |
|---|---|
| **Risk** | ML model outputs `Safe`, operator stores grain longer, aflatoxin builds to dangerous levels |
| **Severity** | **CRITICAL — food safety hazard** |
| **Probability** | Medium — synthetic data model overfits; real-world distribution shift |
| **Fix** | Rule-based fallback: if (Temp > 30°C AND RH > 70%) → force `Risky` regardless of ML; human weekly visual inspection required |

### S-03 — Wet Grain Intake Not Gated

| Field | Value |
|---|---|
| **Risk** | Grain with moisture > 14% admitted; rapid spoilage in 7–14 days |
| **Severity** | High — major economic loss |
| **Current state** | No moisture gate exists in any route or Edge Function |
| **Fix** | UI intake form: validate `grain_moisture_at_intake ≤ 14%` for wheat (13.5% for rice). Block `grain_batches` INSERT if over threshold with clear error message |

---

## 5. Business Risks

### B-01 — ML Accuracy Misrepresented in Marketing

| Field | Value |
|---|---|
| **Risk** | Marketing materials say "97–99% accuracy" — but this is on synthetic data |
| **Real-world accuracy** | 70–85% (estimated, based on distribution shift literature) |
| **Fix** | All marketing materials: "up to 85% accuracy on field data"; include "AI-assisted" framing |

### B-02 — Vendor Lock-in: Supabase Pricing Change

| Field | Value |
|---|---|
| **Risk** | Supabase raises prices significantly or changes free tier limits |
| **Probability** | Medium (all SaaS vendors have done this) |
| **Impact** | Medium ($25/mo Pro is already budgeted) |
| **Mitigation** | PostgreSQL-compatible — self-host on EC2/VPS if Supabase Pro exceeds $100/mo |

### B-03 — Key Engineer Bus Factor (1-person knowledge risk)

| Field | Value |
|---|---|
| **Risk** | Architecture known by 1 engineer; project fails if unavailable |
| **Mitigation** | This document set is the primary mitigation. `00_MASTER_ANALYSIS.md` must be kept updated. |

### B-04 — Render/Fly.io ML Service Cold Start Latency

| Field | Value |
|---|---|
| **Risk** | Render free tier sleeps after 15 min; 30-second cold start on first prediction of the day |
| **Impact** | Medium — poor UX for morning first-check |
| **Fix** | Fly.io Hobby ($5–7/mo) with always-warm machine; or `pg_cron` warming ping every 10 minutes |

---

## 6. Infrastructure Failure Modes

### Failure Mode Table

| Failure | Cause | Detection | Recovery |
|---|---|---|---|
| ESP32 WiFi disconnects | Power glitch, router restart | Heartbeat timeout > 5 min → device `status='offline'` alert | ESP32 reconnect loop (every 30s) |
| MQTT broker goes offline | Server crash, loadshedding | Node.js `mqtt.on('error')` → email alert | Mosquitto auto-restart + ESP32 SD buffer |
| Supabase Edge Function timeout (>2s) | ML service cold start | Edge Function try/catch → rule-based fallback | Fly.io always-warm removes this risk |
| Python ML service crash | OOM, crash | HTTP 500 from Edge Fn → fallback prediction | Fly.io auto-restart; retry with backoff |
| MongoDB Atlas outage (original stack) | Atlas issue | Express error handler → 500 responses | Atlas is 99.95% SLA; auto-failover |
| Supabase PostgreSQL outage | Supabase infra | RLS queries timeout | Supabase Pro SLA 99.9%; CDN caching for reads |
| Firebase RTDB sync fails | Firebase quota exceeded | `useFirebaseSensor.ts` silent error | Add error state display in dashboard |
| SD card full (offline buffer) | > 1M readings without sync | Arduino `SD.begin()` returns false | Overwrite oldest CSV rows (circular buffer) |

---

## 7. Failure Mode & Effects Analysis (FMEA)

| ID | Failure Mode | Effect | Severity | Probability | RPN | Mitigation |
|---|---|---|---|---|---|---|
| F01 | Temp sensor drift >2°C | False alert or missed spoilage | 8 | 4 | **32** | Quarterly calibration; dual BME680+DHT11 |
| F02 | Fan blade seized | No aeration; grain heats up | 9 | 3 | 27 | Monthly fan check; vibration alert via SEN55 |
| F03 | Hopper outlet blocked | Cannot dispatch grain | 7 | 4 | 28 | Weekly outlet inspection |
| F04 | Silo roof seal leak | Moisture ingress in monsoon | 8 | 5 | **40** | Annual sealing; humidity spike alert |
| F05 | Pod battery depletes | No sensor data from that depth | 6 | 5 | 30 | Low battery FCM alert; pod swap |
| F06 | ML misclassifies Risky as Safe | Grain held past spoilage point | 10 | 3 | **30** | Rule-based override fallback |
| F07 | Phosphine fumigation + fan ON | Fumigant dispersed; worker exposure | 10 | 3 | **30** | `fumigation_active` interlock (CRITICAL) |
| F08 | Wet grain intake accepted | Rapid spoilage in 7–14 days | 9 | 5 | **45** | UI moisture gate on intake form |
| F09 | Internet outage | Cloud alerts stop; no remote monitoring | 5 | 6 | 30 | SMS fallback; local display option |
| F10 | SD card file corruption | Offline buffer lost | 3 | 3 | 9 | Redundant SD write verification |

*RPN = Risk Priority Number = Severity × Probability × Detection (normalized scale)*

---

## 8. Security Risk Register

| Risk | Severity | Current State | Fix |
|---|---|---|---|
| MQTT broker open (no auth) | HIGH | Port 1883 open, no password | Add `password_file` to Mosquitto config |
| MQTT plaintext (no TLS) | HIGH | Plaintext over LAN | Enable TLS on port 8883; ESP32 WiFiClientSecure |
| Hardcoded WiFi credentials in firmware | MEDIUM | `ssid`, `password` in `.ino` | Move to SPIFFS `config.json` (not checked into git) |
| Supabase RLS disabled on dev project | HIGH | Unknown — needs audit | Run penetration test (Sprint 5) |
| Firebase RTDB rules permissive | HIGH | Dev-mode rules | Lock to `/devices/{deviceId}` per authenticated device |
| Device impersonation (no device certificate) | MEDIUM | Any device can publish if it knows topic | Device UUID + shared secret header in MQTT payload |

---

*Risk levels reviewed 2026-07-10. Re-review required after Sprint 1 and before commercial launch.*
