# GrainHero Migration Handover Context
**Generated:** 2026-07-15 | **By:** Antigravity AI Agent (Workspace 1)
**Super Folder Root:** ``

---

## 1. Project Overview

**GrainHero** is an AI-powered grain storage management SaaS platform for African and South-Asian agricultural markets. It uses IoT sensors (ESP32 hardware) to monitor grain silos in real-time, runs ML ensemble models to predict spoilage risk, and exposes a multi-role dashboard to warehouse managers, technicians, admins, and super-admins.

---

## 2. Super Folder Structure

```

├── Grainhero-sharjeel_working/        <- ORIGINAL (Sharjeel's working codebase — READ ONLY)
│   ├── farmHomeBackend-main/          <- Old Express + MongoDB backend
│   ├── farmHomeFrontend-main/         <- Old Next.js frontend (v14 App Router)
│   ├── DATASETS/                      <- ML training data (6 grain types × 10K rows each)
│   ├── FIRMWARE/                      <- ESP32 Arduino firmware
│   ├── _ANALYSIS/                     <- Architecture analysis documents
│   └── huggingface_deployment/        <- Legacy Dockerfile
│
└── grainhero/                 <- NEW TARGET CODEBASE (use this for all future work)
    ├── frontend_code/                 <- Next.js 15 frontend (main app)
    ├── src/                           <- Tanstack Router + Supabase full-stack app
    ├── supabase/                      <- Supabase config + migrations
    ├── legacy_backend/                <- OLD Express backend (migrated here for reference)
    ├── DATASETS/                      <- ML training data (migrated from old)
    ├── FIRMWARE/                      <- ESP32 firmware (migrated from old)
    ├── _ANALYSIS/                     <- Architecture docs (migrated from old)
    └── huggingface_deployment/        <- Docker + Python ML server
```

---

## 3. Critical Architectural Context

### Old Architecture (Grainhero-sharjeel_working)
| Layer | Technology | Notes |
|---|---|---|
| Backend | Node.js / Express.js | `server.js` runs on port 5000 |
| Database | MongoDB + Mongoose | All models in `farmHomeBackend-main/models/` |
| Auth | JWT (custom middleware) | `middleware/auth.js` |
| Real-time | Socket.IO + WebSocket | For live alert streaming |
| ML Pipeline | Python (`smartbin_predict.py`) | Called via HTTP from backend |
| IoT | MQTT bridge (`mqtt_bridge.js`) | Listens to ESP32 via MQTT |
| Frontend | Next.js 15 App Router | i18n via `next-intl`, 7 languages |

### New Architecture (grainhero)
| Layer | Technology | Notes |
|---|---|---|
| Backend | Supabase (PostgreSQL) | All data lives in Supabase |
| Auth | Supabase Auth | Session management via `auth-middleware.ts` |
| Real-time | Supabase Realtime | See `use-realtime-invalidate.ts` |
| Frontend | Next.js 15 + Tanstack Router | Two coexisting routing systems |
| Billing | Stripe | via `stripe-api.server.ts` |
| Functions | Supabase Edge Functions | In `supabase/` directory |

### Key Paradigm Shifts
1. **MongoDB → PostgreSQL (Supabase):** All Mongoose models must be re-expressed as Supabase table schemas and SQL migrations.
2. **Custom JWT → Supabase Auth:** Remove all `middleware/auth.js` JWT logic; replace with Supabase session checking.
3. **Express Routes → Supabase Functions / Next.js API Routes:** Each Express route file has a V2 equivalent.
4. **Socket.IO → Supabase Realtime:** Real-time alert streaming must use Supabase channels.

---

## 4. File-by-File Migration Map

### 4A. Backend: Express Route → V2 Equivalent

| Old Express Route (farmHomeBackend-main/routes/) | V2 Equivalent (grainhero/src/lib/*.functions.ts) | Status |
|---|---|---|
| `auth.js` (JWT login/signup) | `supabase/auth-attacher.ts` + `auth-middleware.ts` | ⚠️ Needs integration |
| `silos.js` | `operations.functions.ts` | ⚠️ Logic to merge |
| `sensors.js` | `monitoring.functions.ts` | ⚠️ Logic to merge |
| `grainBatches.js` | `operations.functions.ts` | ⚠️ Logic to merge |
| `ai.js` + `aiSpoilage.js` | `ai-insights.functions.ts` | ⚠️ Logic to merge |
| `actuators.js` | `actuator-bridge.server.ts` | ⚠️ Logic to merge |
| `environmental.js` | `openweather.functions.ts` | ⚠️ Logic to merge |
| `payments.js` + `create-checkout-session.js` | `billing.functions.ts` + `stripe-checkout.functions.ts` | ⚠️ Logic to merge |
| `reports.js` | `analytics.functions.ts` | ⚠️ Logic to merge |
| `notifications.js` | `notifications-audit.functions.ts` | ⚠️ Logic to merge |
| `superAdmin.js` | `platform.functions.ts` | ⚠️ Logic to merge |
| `userManagement.js` | `roles.functions.ts` | ⚠️ Logic to merge |
| `insurance.js` | `team-settings-insurance.functions.ts` | ⚠️ Logic to merge |
| `warehouses.js` | `operations2.functions.ts` | ⚠️ Logic to merge |
| `webhooks.js` | `supabase/api/public/webhooks/stripe.ts` | ⚠️ Logic to merge |
| `alerts.js` | `security-events.functions.ts` | ⚠️ Logic to merge |
| `maintenance.js` | `operations.functions.ts` | ⚠️ Logic to merge |
| `incidents.js` | `operations2.functions.ts` | ⚠️ Logic to merge |
| `dualProbeMonitoring.js` | No V2 equivalent yet | ❌ Must create |
| `deviceHealth.js` | `monitoring.functions.ts` | ⚠️ Logic to merge |
| `mqtt_bridge.js` (root) | No V2 equivalent yet | ❌ Must create as Supabase Edge Function |
| `activityLogs.js` | No V2 equivalent yet | ❌ Must create |
| `dataVisualization.js` | `analytics.functions.ts` | ⚠️ Logic to merge |
| `subscriptionAnalytics.js` | `revenue-analytics.functions.ts` | ⚠️ Logic to merge |
| `planManagement.js` | `subscription-management.functions.ts` | ⚠️ Logic to merge |
| `adminManagement.js` | `roles.functions.ts` | ⚠️ Logic to merge |
| `buyers.js` | No V2 equivalent yet | ❌ Must create |
| `quotes.js` | No V2 equivalent yet | ❌ Must create |
| `products.js` | No V2 equivalent yet | ❌ Must create (for marketplace) |
| `logging.js` | No V2 equivalent yet | ❌ Must create |

### 4B. MongoDB Models → Supabase SQL Tables

| Old Mongoose Model (models/) | Supabase Table Needed | Notes |
|---|---|---|
| `Silo.js` | `silos` | Core table — likely exists in migrations |
| `GrainBatch.js` | `grain_batches` | Intake, quality, dispatch tracking |
| `SensorReading.js` | `sensor_readings` | Time-series data |
| `SensorDevice.js` | `sensor_devices` | Device registry with `device_id` |
| `Actuator.js` | `actuators` | Fan/LED control state |
| `GrainAlert.js` | `grain_alerts` | Spoilage/environmental alerts |
| `SpoilagePrediction.js` | `spoilage_predictions` | ML output records |
| `Advisory.js` | `advisories` | AI-generated action items |
| `ActivityLog.js` | `activity_logs` | Audit trail |
| `Maintenance.js` | `maintenance_records` | Scheduled maintenance |
| `Incident.js` | `incidents` | Incident reports |
| `Notification.js` | `notifications` | Push notification records |
| `UserPushSubscription.js` | `user_push_subscriptions` | Web push tokens |
| `Buyer.js` | `buyers` | Buyer marketplace |
| `BuyerInvoice.js` | `buyer_invoices` | Buyer billing |
| `BuyerPayment.js` | `buyer_payments` | Buyer payment records |
| `DispatchTransaction.js` | `dispatch_transactions` | Grain dispatch tracking |
| `InsuranceClaim.js` | `insurance_claims` | Insurance module |
| `InsurancePolicy.js` | `insurance_policies` | Policy records |
| `Invoice.js` | `invoices` | Platform billing |
| `Order.js` | `orders` | Marketplace orders |
| `Product.js` | `products` | Product catalog |
| `Quote.js` | `quotes` | Price quotes |
| `SiloFinancials.js` | `silo_financials` | Financial rollup per silo |
| `WarehouseFinancials.js` | `warehouse_financials` | Financial rollup per warehouse |
| `Warehouse.js` | `warehouses` | Warehouse registry |
| `User.js` | `users` (via Supabase Auth) | Auth + profile |
| `Subscription.js` | `subscriptions` | Plan subscription state |

### 4C. Backend Services → V2 Equivalents

| Old Service (services/) | What It Does | V2 Action Required |
|---|---|---|
| `aiSpoilageService.js` | Core ML engine: calls HuggingFace API, sends MQTT actuator commands, generates advisories | Port logic into `ai-insights.functions.ts` + Supabase Edge Function for MQTT bridge |
| `alertEngine.js` | Monitors sensor data, fires alerts | Port to `supabase/api/public/hooks/alerts-escalation.ts` (already exists in V2!) |
| `dataAggregationService.js` | Rolls up sensor readings into daily/weekly summaries | Port into `analytics.functions.ts` |
| `environmentalDataService.js` | Polls OpenWeather API for external weather data | Logic already in V2 `openweather.functions.ts` — MERGE |
| `fanControlService.js` | Direct fan/actuator control logic | Port into `actuator-bridge.server.ts` |
| `firebaseRealtimeService.js` | Syncs sensor data to Firebase RTDB | V2 has `firebase-sync.functions.ts` — MERGE |
| `iotDeviceService.js` | Device registration and management | Port into `monitoring.functions.ts` |
| `limitWarningService.js` | Warns when subscription limits are near | Port into `subscription-management.functions.ts` |
| `loggingService.js` | Activity audit log writes | Port into a new `activity-log.functions.ts` |
| `mlDataCollectionService.js` | Collects training data from live sensor readings | Create a Supabase Edge Function scheduled cron |
| `notificationService.js` | Push notification dispatch | V2 has `notifications-audit.functions.ts` — MERGE |
| `offlineDataService.js` | Queues data when sensors go offline | Port into Supabase Edge Function |
| `pdfService.js` | Generates PDF reports | Port into V2 reports route |
| `pushNotificationAdapter.js` | Web Push API wrapper | V2 has `push-notifications.ts` in frontend — already migrated |
| `realTimeDataService.js` | Aggregates live IoT data | Replace with Supabase Realtime subscriptions |
| `realTimePredictionService.js` | Runs spoilage predictions on live sensor data | Port into scheduled Supabase Edge Function |
| `riceDataService.js` | Rice-specific ML data pipeline | Merge into `aiSpoilageService` equivalent |
| `trainingDataService.js` | ML training data pipeline management | Keep as standalone Python script |
| `usageTracking.js` | Tracks API usage per plan | Port into `platform.functions.ts` |
| `weatherService.js` | Weather data fetching | Already in V2 `openweather.functions.ts` — MERGE |

### 4D. Frontend Components: Old → V2

| Old Component (farmHomeFrontend-main/components/) | Migrated To (grainhero/frontend_code/components/) | Notes |
|---|---|---|
| `animations/AnimatedCharts.tsx` | `components/animations/AnimatedCharts.tsx` | ✅ Migrated |
| `animations/AnimatedLanding.tsx` | `components/animations/AnimatedLanding.tsx` | ✅ Migrated |
| `animations/AnimatedSilo.tsx` | `components/animations/AnimatedSilo.tsx` | ✅ Migrated |
| `animations/MotionGraphics.tsx` | `components/animations/MotionGraphics.tsx` | ✅ Migrated |
| `chatbot-popup.tsx` | `components/chatbot-popup.tsx` | ✅ Migrated |
| `chatbot-provider.tsx` | `components/chatbot-provider.tsx` | ✅ Migrated |
| `silo-visualization.tsx` | `components/silo-visualization.tsx` | ✅ Migrated |
| `push-notification-permission.tsx` | `components/push-notification-permission.tsx` | ✅ Migrated |
| `QRCodeDisplay.tsx` | `components/QRCodeDisplay.tsx` | ✅ Migrated |
| `dashboard/AlertCard.tsx` | `components/dashboard_old/AlertCard.tsx` | ✅ Migrated (use as reference) |
| `dashboard/DataTable.tsx` | `components/dashboard_old/DataTable.tsx` | ✅ Migrated (use as reference) |
| `dashboard/PlanStatusCard.tsx` | `components/dashboard_old/PlanStatusCard.tsx` | ✅ Migrated (use as reference) |
| `dashboard/QuickActions.tsx` | `components/dashboard_old/QuickActions.tsx` | ✅ Migrated (use as reference) |
| `dashboard/StatCard.tsx` | `components/dashboard_old/StatCard.tsx` | ✅ Migrated (use as reference) |
| `lib/percentageUtils.ts` | `lib/percentageUtils.ts` | ✅ Migrated |
| `lib/push-notifications.ts` | `lib/push-notifications.ts` | ✅ Migrated |
| `lib/useEnvironmentalData.ts` | `lib/useEnvironmentalData.ts` | ✅ Migrated |
| `messages/` (7 language files) | `messages_legacy/` | ✅ Migrated as reference |
| `i18n/` (routing, navigation) | `i18n_legacy/` | ✅ Migrated as reference |
| `public/golden-wheat.mp4` | `public/golden-wheat.mp4` | ✅ Migrated (hero video) |
| `public/sw.js` | `public/sw.js` | ✅ Migrated (service worker) |

### 4E. Supabase Files: Old → V2

| Old File | Migrated To | Notes |
|---|---|---|
| `supabase/migrations/9999_sensor_alert_trigger.sql` | `supabase/migrations/9999_sensor_alert_trigger.sql` | ✅ Migrated |
| `supabase/functions/ingest/index.ts` | `supabase/functions/ingest/index.ts` | ✅ Migrated |

### 4F. ML Pipeline: Old → V2

| Old ML Asset (farmHomeBackend-main/ml/) | Migrated To | Notes |
|---|---|---|
| All `.pkl` model files (6 grain types) | `legacy_backend/ml/` | ✅ In legacy_backend (kept for reference) |
| `smartbin_predict.py` | `huggingface_deployment/predict.py` | V2 has this already |
| `smartbin_model.pkl` | Used by HuggingFace service | |
| Training CSVs (6 grain types) | `DATASETS/training-synthetic/` | ✅ Migrated |
| `ml_service/main.py` | `huggingface_deployment/app.py` | V2 has this already |

### 4G. IoT / Firmware

| Asset | Status |
|---|---|
| `FIRMWARE/grainhero_main_final.ino` | ✅ Migrated to `grainhero/FIRMWARE/` |
| `mqtt_bridge.js` | ❌ Still in legacy_backend — must be rewritten as Supabase Edge Function |
| MQTT topic: `grainhero/actuators/{deviceId}/control` | Must be preserved in new MQTT bridge |

---

## 5. Subscription Plan Configuration

The old backend has a complete subscription plan system in `legacy_backend/configs/plan-features.js`.

### Plans (PKR pricing for local market):
| Plan | Price | Silos | Sensors | AI Predictions |
|---|---|---|---|---|
| Basic | PKR 1,499/mo | 3 | 10 | ❌ |
| Standard | PKR 3,899/mo | 6 | 25 | ❌ |
| Professional | PKR 5,999/mo | 15 | 100 | ✅ |
| Enterprise | USD 799/mo | 100 | 500 | ✅ |

**Action Required:** These plan limits must be replicated in `src/lib/pricing-data.ts` and synchronized with Stripe product/price IDs.

---

## 6. RBAC (Role-Based Access Control)

The old system has these roles defined in `legacy_backend/middleware/`:
- `superadmin` → Platform owner (all permissions)
- `admin` → Warehouse/company admin
- `manager` → Manages a specific warehouse
- `technician` → Maintains devices, reads data
- `assistant` → Limited read-only

V2 uses Supabase RLS policies. The full permission matrix from `legacy_backend/configs/role-permissions.js` must be ported to Supabase Row Level Security policies.

---

## 7. Env Variables Required

All of these must be populated in the new workspace's `.env` / Supabase secrets:

```env
# Supabase (V2 - NEW)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# MongoDB (OLD - only needed if running legacy_backend)
MONGO_URI=mongodb+srv://...
MONGO_USER=
MONGO_PASS=
DATABASE_NAME=

# Firebase (both old and new use this)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ML Service (HuggingFace)
GRAINHERO_ML_API_URL=https://[your-space].hf.space

# OpenWeather
OPENWEATHER_API_KEY=

# MQTT (for IoT bridge)
MQTT_BROKER_URL=
MQTT_USERNAME=
MQTT_PASSWORD=
```

---

## 8. Immediate Actions for Workspace 2 Agent

Follow this priority order:

### Priority 1 — CRITICAL (blocks everything)
1. **Verify Supabase migrations** — run all 12 migrations in `supabase/migrations/` to create the database schema.
2. **Port `9999_sensor_alert_trigger.sql`** — this trigger fires alerts automatically when sensors exceed thresholds. Must be applied after other migrations.
3. **Port `supabase/functions/ingest/index.ts`** — this Edge Function ingests MQTT sensor payloads into Supabase.

### Priority 2 — HIGH (core functionality)
4. **Create MQTT Bridge Edge Function** — rewrite `legacy_backend/mqtt_bridge.js` as a Supabase Edge Function that subscribes to the MQTT broker and calls the ingest function.
5. **Port aiSpoilageService logic** — key file: `legacy_backend/services/aiSpoilageService.js`. The ML call chain (`callSmartBinModel` → `_executePythonModel` → HuggingFace API) must be preserved exactly. The MQTT actuator command logic (`sendMLActuatorCommand`) must be preserved with the fumigation interlock.
6. **Port plan-features config** — file: `legacy_backend/configs/plan-features.js`. Sync PKR plan prices and limits into `src/lib/pricing-data.ts`.

### Priority 3 — MEDIUM (feature completeness)
7. **Port role-based middleware** → Supabase RLS policies.
8. **Port alertEngine** → `supabase/api/public/hooks/alerts-escalation.ts`.
9. **Port fanControlService** → `actuator-bridge.server.ts`.
10. **Integrate chatbot-popup** into the V2 app layout.
11. **Integrate silo-visualization** component into silos page.
12. **Integrate push-notification-permission** into app layout.
13. **Port i18n messages** — 7 language JSON files from `messages_legacy/` into V2's i18n system.

### Priority 4 — LOWER (enhancement)
14. **Port buyers/quotes/products routes** — create new Supabase functions for marketplace features.
15. **Port dualProbeMonitoring route** — dual-probe temperature monitoring for deep silos.
16. **Port activity logging** — create `activity-log.functions.ts`.
17. **Run `trainingDataService.js` pipeline** against new DATASETS to retrain ML models.

---

## 9. IoT Hardware Notes

- **Device:** ESP32 microcontroller
- **Firmware file:** `FIRMWARE/grainhero_main_final.ino`
- **MQTT Topics:**
  - Sensor data: `grainhero/sensors/{device_id}/data`
  - Actuator control: `grainhero/actuators/{device_id}/control`
- **Sensors per device:** DHT22 (temp/humidity), MQ-135 (CO2/VOC), capacitive moisture probe, BH1750 (light), BME680 (pressure)
- **Fan PWM control:** 0-255 mapped from 0-100% speed. ML-driven LED states: Green=safe, Yellow=warning, Red=critical.
- **Fumigation Interlock:** When `silo.fumigation_active = true`, ALL fan-on MQTT commands must be blocked.

---

## 10. What Was NOT Migrated (Technical Debt)

| Item | Reason | Resolution |
|---|---|---|
| MongoDB data/collections | Cannot copy a live DB — only schema/models migrated | Run seed scripts from `legacy_backend/scripts/` against new Supabase |
| `.env` secrets | Security — never store secrets in files | Manually provision in new workspace |
| `node_modules/` | Auto-generated — always excluded | Run `npm install` |
| Python `__pycache__` | Compiled bytecode — excluded | Auto-generated |
| `build_output.txt` | Build artifact — not needed | Excluded |
| MQTT live connection | Runtime service | Deploy MQTT bridge as separate service |
| `ml/*.pkl` model files | In `legacy_backend/ml/` for reference | Use HuggingFace deployed version |

---

*This document was auto-generated by Antigravity (Workspace 1) to provide 100% context for Workspace 2.*
