# GrainHero — Full Architecture Overview
## Both Stacks: Data Flow · Service Map · Schema · Middleware · Environment Vars

> **Status**: Discovery only — no code modified  
> **Reference**: [00_MASTER_ANALYSIS.md](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/docs/00_MASTER_ANALYSIS.md)

---

## 1. Full System Data Flow (Original Stack — Working)

```mermaid
sequenceDiagram
    participant HW as ESP32 Firmware
    participant MQ as Mosquitto MQTT
    participant BE as Node.js Express
    participant PY as Python ML
    participant DB as MongoDB Atlas
    participant FB as Firebase RTDB
    participant FE as Next.js Frontend
    participant SOCK as Socket.IO

    HW->>MQ: PUBLISH grainhero/devices/{id}/telemetry (every 5s)
    MQ->>BE: on('message') callback in iotDeviceService.js
    BE->>DB: SensorReading.save() → pre-save hook computes dew_point, VOC baseline
    BE->>FB: admin.database().ref('/devices/{id}/latest').set(reading)
    BE->>PY: spawn('python smartbin_predict.py') with 9-feature JSON
    PY-->>BE: {prediction, risk_score, confidence, probabilities}
    BE->>DB: SpoilagePrediction.save()
    BE->>DB: GrainBatch.updateOne({risk_score})
    BE->>MQ: PUBLISH grainhero/actuators/{id}/control {fan_speed, led}
    MQ->>HW: fan PWM + LED state updated
    BE->>SOCK: emit('predictionCompleted', {silo_id, prediction})
    SOCK->>FE: WebSocket push → React state update
    FE->>BE: GET /api/sensors/:id/latest → response from MongoDB cache
```

---

## 2. Full System Data Flow (Supabase Stack — Target, Partially Broken)

```mermaid
sequenceDiagram
    participant HW as ESP32 Firmware
    participant MQ as Mosquitto MQTT
    participant BRIDGE as mqtt_bridge.js ❌MISSING
    participant EDGE as Edge Fn /ingest ❌MISSING
    participant ML as FastAPI ml_service ❌MISSING
    participant DB as Supabase PostgreSQL
    participant TRIG as SQL Trigger ❌MISSING
    participant RT as Supabase Realtime
    participant FE as TanStack Frontend

    HW->>MQ: PUBLISH telemetry (every 5s)
    Note over MQ,BRIDGE: ❌ NOTHING LISTENS HERE YET
    MQ--xBRIDGE: Bridge does not exist
    BRIDGE->>EDGE: POST /functions/v1/ingest
    EDGE->>EDGE: Validate + compute dew_point, airflow, VOC baseline
    EDGE->>DB: INSERT INTO sensor_readings
    EDGE->>ML: POST /predict {grain_type, 9 features}
    ML-->>EDGE: {prediction, risk_score, actuator_command}
    EDGE->>DB: UPDATE sensor_readings SET ml_risk_class, ml_risk_score
    EDGE->>DB: UPDATE grain_batches SET risk_score
    DB->>TRIG: AFTER INSERT trigger fires
    TRIG->>DB: INSERT INTO grain_alerts if threshold exceeded
    RT->>FE: WebSocket push via CDC
    FE->>FE: React Query invalidation → UI updates
    EDGE-->>BRIDGE: Response body {actuator_command}
    BRIDGE->>MQ: PUBLISH grainhero/actuators/{id}/control
    MQ->>HW: Fan + LED updated
```

---

## 3. Folder Structure — Both Stacks

```
Grainhero/                          ← Workspace root
│
├── grainhero_main_final.ino        ← ESP32 firmware (1,871 lines, 57 KB)
│
├── farmHomeBackend-main/           ← Original Node.js API ✅ WORKING
│   ├── server.js                   ← Express app + MQTT + background services
│   ├── routes/                     ← 18 route files
│   │   ├── aiSpoilage.js           ← 1,990 lines — ML prediction + fan control + SHAP
│   │   ├── iot.js                  ← MQTT bridge + Firebase sync (805 lines)
│   │   ├── grainBatches.js         ← Grain batch CRUD + dispatch + spoilage events
│   │   ├── silos.js                ← Silo CRUD + thresholds
│   │   ├── alerts.js               ← Alert acknowledge/resolve
│   │   ├── insurance.js            ← Policies + claims + payments
│   │   └── ...
│   ├── models/                     ← 18 Mongoose schemas
│   │   ├── SensorReading.js        ← Pre-save hook: dew_point, VOC baseline, airflow
│   │   ├── SpoilagePrediction.js   ← ML result with validation_status
│   │   ├── GrainBatch.js           ← Batch lifecycle + spoilage events
│   │   └── ...
│   ├── services/                   ← Background services (all always-on)
│   │   ├── iotDeviceService.js     ← MQTT subscriber loop
│   │   ├── aiSpoilageService.js    ← Python subprocess orchestration
│   │   ├── alertService.js         ← Threshold monitoring + auto-create
│   │   ├── deviceHealthService.js  ← Heartbeat watchdog (cron every 2 min)
│   │   ├── notificationService.js  ← Email/SMS/FCM dispatch
│   │   ├── pdfService.js           ← PDF generation (puppeteer/jsPDF)
│   │   ├── weatherService.js       ← OpenWeather API cron (every 5 min)
│   │   └── mlDataCollectionService.js ← Training sample accumulation
│   ├── ml/                         ← All Python ML code
│   │   ├── smartbin_predict.py     ← Inference runner (9-feature, 5 grains)
│   │   ├── ensemble_train.py       ← XGB+RF+LGBM training with Optuna
│   │   ├── generate_per_grain.py   ← Synthetic dataset generator
│   │   ├── shap_explain.py         ← SHAP explainability (never called in prod)
│   │   ├── *.pkl                   ← 15 trained model files (5 grains × 3 algos)
│   │   ├── *_10k.csv               ← 5 synthetic training datasets
│   │   └── *_metadata.json         ← Hyperparameters + feature importances
│   └── configs/
│       └── risk-thresholds.js      ← Per-grain threshold config
│
├── farmHomeFrontend-main/          ← Original Next.js frontend ✅ WORKING
│
├── grainhero-main (Supabase)/
│   └── grainhero-main/             ← Supabase target stack ⚠️ INCOMPLETE
│       ├── src/
│       │   ├── lib/
│       │   │   ├── analytics.functions.ts    ← BUG L209: current_stock_kg
│       │   │   ├── operations.functions.ts   ← CRUD for all entities
│       │   │   ├── monitoring.functions.ts   ← Alerts, incidents
│       │   │   ├── ai-insights.functions.ts  ← Gemini LLM advisory
│       │   │   ├── firebase-admin.server.ts  ← FCM skeleton (never sends)
│       │   │   └── stripe.server.ts          ← Stripe webhook handler ✅
│       │   ├── hooks/
│       │   │   ├── useFirebaseSensor.ts      ← Firebase RTDB browser read (read-only)
│       │   │   └── useRealtimeInvalidate.ts  ← React Query cache invalidation
│       │   └── routes/                       ← TanStack Start page routes
│       ├── supabase/
│       │   ├── migrations/                   ← 16-table schema + RLS ✅
│       │   └── functions/                    ← Edge Functions (none for IoT yet)
│       └── package.json
│
├── SmartBin-RiceSpoilage-main/     ← Legacy FastAPI ⚠️ DEPRECATED
│   └── app.py                      ← 4-feature, rice-only — do not use
│
├── awen files/                     ← Analysis docs (moved from root)
│   ├── GRAINHERO_COMPLETE_CONTEXT.md
│   ├── implementation_plan.md
│   └── ...
│
└── docs/                           ← This documentation folder
    ├── 00_EXECUTIVE_OVERVIEW.md
    ├── 00_MASTER_ANALYSIS.md       ← START HERE
    └── ...
```

---

## 4. Supabase Database Schema (16 Tables)

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1"
    profiles ||--o{ silos : "owns"
    profiles ||--o{ grain_batches : "manages"
    profiles ||--o{ iot_devices : "registers"
    profiles ||--o{ notification_tokens : "has"
    organizations ||--o{ profiles : "has members"
    organizations ||--o{ subscriptions : "subscribes"

    silos ||--o{ sensor_readings : "collects"
    silos ||--o{ grain_batches : "stores"
    silos ||--o{ grain_alerts : "triggers"
    silos ||--o{ iot_devices : "has"

    grain_batches ||--o{ sensor_readings : "associated with"
    grain_batches ||--o{ insurance_policies : "covered by"

    insurance_policies ||--o{ insurance_claims : "generates"

    iot_devices ||--o{ sensor_readings : "produces"

    profiles {
        uuid id PK
        text full_name
        text email
        text role "admin|manager|operator|viewer"
        uuid organization_id FK
        jsonb metadata
        timestamptz created_at
    }

    silos {
        uuid id PK
        uuid organization_id FK
        text name
        text location
        float capacity_kg
        float current_occupancy_kg
        text status "active|inactive|maintenance"
        jsonb thresholds "per-grain safety ranges"
        jsonb location_coords
    }

    sensor_readings {
        uuid id PK
        uuid silo_id FK
        uuid batch_id FK
        uuid device_id FK
        timestamptz timestamp
        float temperature
        float humidity
        float pressure
        float co2
        float voc_raw
        float voc_index
        float grain_moisture
        float ambient_light
        float dew_point
        float airflow
        float pest_presence
        text ml_risk_class "Safe|Risky|Spoiled|NULL"
        float ml_risk_score "0-100, NULL if no ML"
        float ml_confidence
        bool condensation_risk
        jsonb actuator_state
    }

    grain_batches {
        uuid id PK
        uuid silo_id FK
        uuid organization_id FK
        text batch_number
        text grain_type "Rice|Wheat|Maize|Sorghum|Barley"
        float quantity_kg
        float risk_score
        text status "active|dispatched|spoiled"
        text qr_code
        date intake_date
        date dispatch_date
        float moisture_at_intake
        jsonb metadata
    }

    grain_alerts {
        uuid id PK
        uuid silo_id FK
        uuid batch_id FK
        text alert_type
        text severity "info|warning|critical"
        text status "active|acknowledged|resolved"
        jsonb metadata
        timestamptz triggered_at
        timestamptz acknowledged_at
        uuid acknowledged_by FK
    }

    iot_devices {
        uuid id PK
        uuid silo_id FK
        uuid organization_id FK
        text device_id "GH-ESP32-01"
        text device_type "esp32|lora_pod|gateway"
        text status "online|offline|maintenance"
        text firmware_version
        float battery_level
        timestamptz last_seen
        jsonb config
    }
```

---

## 5. Environment Variables Reference

### Original Backend ([farmHomeBackend-main/.env](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/.env))

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | 64-char random string |
| `MQTT_BROKER_URL` | Mosquitto broker address | `mqtt://192.168.100.229:1883` |
| `FIREBASE_PROJECT_ID` | Firebase project | `smart-silo-8ce12` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK key | Base64 PEM |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account | `firebase-adminsdk@...` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `OPENWEATHER_API_KEY` | Weather data API | `abc123...` |
| `RESEND_API_KEY` | Email service | `re_...` |
| `TWILIO_ACCOUNT_SID` | SMS service | `ACxxxx...` |
| `PYTHON_PATH` | Path to Python binary | `/usr/bin/python3` |

### Supabase Stack ([.env.local](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/.env.local))

| Variable | Purpose | Where Used |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | All client-side Supabase calls |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Client Supabase init |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations | Edge Functions (server-only) |
| `VITE_GEMINI_API_KEY` | Gemini LLM advisory | [ai-insights.functions.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/lib/ai-insights.functions.ts) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe client-side | Checkout components |
| `STRIPE_SECRET_KEY` | Stripe webhooks | [stripe.server.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/lib/) |
| `VITE_FIREBASE_API_KEY` | Firebase config | [useFirebaseSensor.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/hooks/useFirebaseSensor.ts) |
| `ML_SERVICE_URL` | FastAPI endpoint | Edge Function /ingest (to add) |
| `ML_SERVICE_API_KEY` | ML service auth | Edge Function /ingest (to add) |
| `OPEN_METEO_BASE_URL` | Weather (no key needed) | Edge Function fetch-weather (to add) |

---

## 6. Middleware Stack — Original Backend

```mermaid
graph TD
    REQ["HTTP Request"]
    HELMET["helmet()\nSecurity headers"]
    CORS["cors()\nOrigin whitelist"]
    RATELIMIT["express-rate-limit\n100 req/15min per IP"]
    MORGAN["morgan('combined')\nRequest logging"]
    BODYPARSE["express.json()\nbody-parser"]
    JWT_MW["authenticateToken()\nJWT verify middleware"]
    RBAC_MW["authorizeRole()\nRole-based access control"]
    ROUTE["Route Handler\nroutes/*.js"]
    ERR["globalErrorHandler()\n500 JSON response"]

    REQ --> HELMET --> CORS --> RATELIMIT --> MORGAN --> BODYPARSE --> JWT_MW --> RBAC_MW --> ROUTE
    ROUTE --> ERR
```

---

## 7. Real-Time Architecture Comparison

| Mechanism | Original Stack | Supabase Stack |
|---|---|---|
| Protocol | Socket.IO (WebSocket + polling fallback) | Supabase Realtime (PostgreSQL CDC) |
| Trigger | `emit()` from Node.js service after DB write | Postgres `AFTER INSERT` via logical replication |
| Client hook | `useSocket()` in Next.js | [useRealtimeInvalidate.ts](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero-main%20(Supabase)/grainhero-main/src/hooks/useRealtimeInvalidate.ts) + React Query |
| Latency | ~100ms | ~200–500ms |
| Offline support | Socket.IO reconnect | Supabase client auto-reconnect |
| Channel auth | JWT verification | Supabase RLS on channel subscription |
| **Current status** | ✅ Working | ⚠️ Connected but no DB inserts from IoT |

---

## 8. Deployment Architecture (Target Production)

```mermaid
graph TB
    subgraph FIELD["Field Hardware"]
        PODS["4× LoRaWAN Pods\n(per silo)"]
        GW["LoRaWAN Gateway\n(silo roof, 4G)"]
    end

    subgraph VPS["VPS $5-10/month\n(Hostinger Pakistan or Hetzner)"]
        CS["ChirpStack v4\nLoRaWAN network server"]
        BRIDGE["mqtt_bridge.js\nPM2 process"]
        MOSQ["Mosquitto\n(for ESP32 WiFi devices)"]
    end

    subgraph RENDER["Fly.io $5-7/month"]
        MLSVC["ml_service/\nFastAPI Python\n5 grain models always warm"]
    end

    subgraph SUPABASE["Supabase Cloud $25/month (Pro)"]
        SUPA["PostgreSQL 15\n+ Edge Functions\n+ Auth + Realtime\n+ Storage"]
    end

    subgraph CDN["Cloudflare Pages (free)"]
        FE["TanStack Start\nStatically deployed"]
    end

    subgraph FCMSERVICE["Firebase (free Spark)"]
        FCM["FCM Push\nAndroid + iOS"]
    end

    PODS -->|"LoRaWAN 433MHz"| GW
    GW -->|"4G HTTPS"| CS
    CS -->|"MQTT"| BRIDGE
    BRIDGE -->|"HTTPS POST"| SUPA
    MOSQ -->|"ESP32 WiFi MQTT"| BRIDGE
    BRIDGE -->|"HTTPS POST"| SUPA
    SUPA -->|"HTTPS"| MLSVC
    MLSVC -->|"JSON response"| SUPA
    SUPA -->|"Realtime WS"| FE
    SUPA -->|"Edge Fn triggers"| FCM
    FE -->|"Supabase JS client"| SUPA
```

**Total infrastructure cost: ~$37–47/month** (2 VPS + Fly.io + Supabase Pro + Cloudflare)

---

## 9. API Authentication Flow

```mermaid
sequenceDiagram
    participant UI as TanStack Frontend
    participant SUPA as Supabase Auth (GoTrue)
    participant DB as PostgreSQL (RLS)
    participant EDGE as Edge Function

    UI->>SUPA: POST /auth/v1/token {email, password}
    SUPA-->>UI: {access_token (JWT), refresh_token}
    UI->>DB: SELECT * FROM silos (with Authorization: Bearer JWT)
    DB->>DB: RLS policy: auth.uid() = organization_id check
    DB-->>UI: Only rows belonging to user's organization

    UI->>EDGE: POST /functions/v1/ingest {device_id, readings}
    EDGE->>EDGE: Verify device API key in Supabase Vault
    EDGE->>DB: INSERT INTO sensor_readings (bypasses RLS via service_role)
    DB-->>EDGE: New row id
    EDGE-->>UI: 200 OK + actuator_command
```

---

## 10. Open Architecture Decisions

| Decision | Current State | Recommendation |
|---|---|---|
| MQTT bridge hosting | Runs on local PC | Move to VPS with PM2 for production |
| ML service hosting | Not deployed | Fly.io Hobby ($5–7/mo) — fastest cold start |
| LoRaWAN network server | Not deployed | ChirpStack on same VPS as MQTT bridge |
| Supabase project | Dev project | Create Production project (Pro tier, $25/mo) |
| Firebase dependency | Both stacks depend on Firebase | Supabase stack should eventually drop Firebase RTDB and use Supabase Storage/Realtime only |
| Edge Function cold start | ~200ms warm / ~2s cold | Keep Edge Functions warm with dummy cron call |
| Multi-tenant isolation | RLS policies exist | Verify with penetration test in Sprint 5 |

---

*Generated 2026-07-10. Architecture based on complete reading of both codebases, firmware, and Supabase migrations.*
