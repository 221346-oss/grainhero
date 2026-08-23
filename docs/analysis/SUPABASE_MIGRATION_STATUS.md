# Supabase Migration Audit & Status

> **Date:** July 11, 2026
> **Target:** GrainHero Platform (Supabase Stack)

## 1. Overall Completion Status

**ESTIMATED COMPLETION: ~40%**
The frontend (TanStack) and database schemas have been migrated, but the critical backend ingestion, ML routing, and actuation pipelines are entirely disconnected. The system is currently "read-only" and non-functional for IoT telemetry.

---

## 2. Component-by-Component Audit

### Database (PostgreSQL) 🟢 [100% Complete]

- **Status:** Complete. The `supabase/migrations` folder contains the 16 core tables.
- **RLS Policies:** Configured correctly.
- **Blockers:** A known schema bug exists in `src/lib/analytics.functions.ts L209` (`current_stock_kg` should be `current_occupancy_kg`).

### Auth (Supabase GoTrue) 🟢 [100% Complete]

- **Status:** Complete. User roles (Admin, Manager, Operator) are supported by the frontend.

### Storage 🟡 [Incomplete]

- **Status:** Cloudinary is currently used. Supabase Storage buckets for PDF exports and silo image evidence have not been configured or migrated over.

### Edge Functions (Deno Runtime) 🔴 [0% Complete]

- **Status:** Missing. The `supabase/functions` directory is completely absent.
- **Blockers:**
  1. No `/ingest` HTTP Edge Function to accept telemetry from the MQTT broker.
  2. No `/notify` Edge Function to handle push notifications (FCM) on alert creation.
  3. No Edge Function for dynamic PDF generation.

### IoT Ingest & ML Actuation Pipeline 🔴 [0% Complete]

- **Status:** Broken. The original stack used `iotDeviceService.js` and `aiSpoilageService.js` to bridge Mosquitto MQTT, run Python ML, and send fan commands.
- **Blockers:**
  1. The Arduino currently has no bridge to send data to Supabase (data goes to Firebase and MQTT only).
  2. The Python ML microservice (ensemble models) is not deployed in a way Supabase can call it.
  3. `sensor_readings` table is never written to, meaning alerts are never triggered.

---

## 3. Recommended Next Steps (The "P0" Blockers)

To make the Supabase stack functional, the following must be implemented immediately:

1. **MQTT Bridge:** A lightweight script (e.g., Node.js) on the local network that subscribes to Mosquitto and POSTs to a Supabase Edge Function.
2. **Ingest Edge Function:** `supabase/functions/ingest` to receive data, compute dew point/VOC baselines, and save to the Database.
3. **ML Microservice:** Wrap the 5 Python ensemble models in a FastAPI service and deploy to Fly.io/Render so the Edge Function can request predictions.
