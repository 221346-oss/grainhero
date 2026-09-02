# P1: Automatic Device Registration Migration Report

**Date**: 2026-07-10  
**Status**: ✅ Complete  
**Diagnostics**: 0 errors, 0 warnings across all modified files

---

## Files Analyzed

| File                                                           | Purpose                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `GH1/services/firebaseRealtimeService.js` lines 38–82          | Source: auto-registration logic being migrated                |
| `GH2/src/integrations/supabase/types.ts`                       | Schema reference for all NOT NULL constraints and enum values |
| `GH2/supabase/migrations/20260710100000_ml_and_iot_schema.sql` | Migration pattern reference                                   |
| `GH2/src/routes/api/public/cron/sync-firebase.ts`              | Cron endpoint being integrated                                |
| `GH2/src/routes/api/public/hooks/sensor-offline-detector.ts`   | Offline hook (verified correct, no change needed)             |

---

## Files Modified / Created

| File                                                               | Change                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `GH2/supabase/migrations/20260710110000_auto_register_support.sql` | **NEW** — adds `last_ping_at` column + index to `sensor_devices` |
| `GH2/src/lib/auto-register.server.ts`                              | **NEW** — auto-registration service (mirrors GH1 lines 38–82)    |
| `GH2/src/routes/api/public/cron/sync-firebase.ts`                  | **MODIFIED** — 4 targeted changes (see below)                    |

---

## Changes to sync-firebase.ts

### Change 1: Device lookup map + auto-registration loop

Replaced the flat `devices` array query with a `Map<device_id, DeviceRow>` lookup. After building the map from known devices, iterates all Firebase device IDs and calls `autoRegisterDevice()` for any unknown ID. Newly registered devices are added to the map so their first reading is processed in the same cron run.

### Change 2: Heartbeat write fix (3 bugs fixed in one)

| Before                 | After                                  | Reason                                                                             |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `status: "online"`     | `status: "active"`                     | `"online"` is not a valid `device_status` enum value; would silently fail or throw |
| only `last_ping_at`    | both `last_ping_at` + `last_heartbeat` | `last_heartbeat` already exists and is used by the offline detector hook           |
| no `connection_status` | `connection_status: "online"`          | TEXT column with no enum constraint — mirrors GH1 `connection_status` field        |

### Change 3: Removed non-existent silo column writes

The `supabase.from("silos").update({ current_temperature, current_humidity, current_moisture })` block was removed. These columns do not exist on the `silos` table. Silo condition updates are already handled by the Supabase trigger `sync_sensor_to_silo_conditions` on `sensor_readings INSERT`.

### Change 4: Offline detection filter fix

Changed `.eq("status", "online")` → `.eq("status", "active")`. The heartbeat now writes `"active"` so the offline filter must match it. Also added `connection_status: "offline"` to the offline update.

---

## Parity Report: GH1 vs GH2 Auto-Registration

### Field-by-Field Comparison

| Field                        | GH1 Value                            | GH2 Value                                         | Match?                         |
| ---------------------------- | ------------------------------------ | ------------------------------------------------- | ------------------------------ |
| `device_id`                  | Firebase key e.g. `004B12387760`     | Same Firebase key                                 | ✅                             |
| `device_name`                | `GrainHero-${DEVICE_ID}`             | `GrainHero-${deviceId}`                           | ✅ Exact                       |
| `device_type`                | `"sensor"`                           | `"sensor"`                                        | ✅ Exact                       |
| `category`                   | `"environmental"`                    | `"environmental"`                                 | ✅ Exact                       |
| `status`                     | `"active"`                           | `"active"`                                        | ✅ Exact                       |
| `communication_protocol`     | `"firebase"`                         | `"firebase"`                                      | ✅ Exact                       |
| `sensor_types`               | `['temperature', 'humidity', 'voc']` | `["temperature", "humidity", "voc"]`              | ✅ Exact                       |
| `data_transmission_interval` | `10`                                 | `10`                                              | ✅ Exact                       |
| `silo.name`                  | `"Rice Storage Silo"`                | `"Rice Storage Silo"`                             | ✅ Exact                       |
| `silo.capacity`              | `1000`                               | `capacity_kg: 1000`                               | ✅ Equivalent                  |
| `silo.status`                | `"active"`                           | `"active"`                                        | ✅ Exact                       |
| `silo.grain_type`            | `"Rice"`                             | `current_conditions.grain_type: "Rice"`           | ✅ Equivalent (GH2 uses JSONB) |
| `silo.location.description`  | `"Primary GrainHero silo..."`        | Same in `location.description`                    | ✅ Exact                       |
| `admin_id`                   | `silo.admin_id \|\| new ObjectId()`  | `AUTO_REGISTER_ADMIN_ID` env or first super_admin | ✅ Better (real FK constraint) |

### Behavioral Differences

| Behavior                  | GH1                                                        | GH2                                                      | Assessment                            |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| Device lookup scope       | Hardcoded `DEVICE_ID = '004B12387760'`                     | Any device_id from Firebase                              | ✅ GH2 is strictly better             |
| Duplicate guard           | `SensorDevice.findOne({ device_id })`                      | `SELECT ... WHERE device_id = $1 AND deleted_at IS NULL` | ✅ Equivalent                         |
| Silo lookup               | `Silo.findOne({})` — first silo globally                   | Silo in admin's warehouse                                | ✅ GH2 is more correct (multi-tenant) |
| Admin identity            | `silo.admin_id \|\| new ObjectId()` — could be a throwaway | Real `profiles.id` UUID via env var                      | ✅ GH2 is more correct                |
| Warehouse requirement     | Not required (MongoDB has no FK)                           | Required (NOT NULL FK)                                   | Acceptable — create if missing        |
| First reading             | Drops GH1 because device lookup fails first                | Registered then processed in same cron run               | ✅ GH2 is strictly better             |
| validateBeforeSave: false | GH1 bypasses validation                                    | GH2 inserts only valid rows (FK constraints enforced)    | ✅ GH2 is more correct                |

---

## Open Questions Resolution

| Question                           | Decision                                                                              | Reason                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Q1: Admin identity                 | `AUTO_REGISTER_ADMIN_ID` env var, fallback to first super_admin, skip+warn if neither | Multi-tenant safe; does not crash on missing config                            |
| Q2: `last_ping_at` column          | Added via migration `20260710110000`                                                  | Cron used it in 4 places; cleaner than rewriting all references                |
| Q3: `current_temperature` on silos | Removed the lines                                                                     | DB trigger already handles it correctly; duplicate UPDATE was a no-op or error |

---

## Legacy Retirement Assessment

### GH1 `firebaseRealtimeService.js` auto-registration section (lines 38–82)

**Status: ✅ Safe to retire**

Every behavior is now covered in GH2:

| GH1 Capability                     | GH2 Replacement                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| First-connection detection         | `autoRegisterDevice()` called for every unknown Firebase device_id              |
| Silo creation                      | `findOrCreateSilo()` in `auto-register.server.ts`                               |
| Device creation                    | `sensor_devices` INSERT with all GH1 parity fields                              |
| Duplicate guard                    | `SELECT ... WHERE device_id` before any INSERT                                  |
| Heartbeat update                   | `last_ping_at` + `last_heartbeat` + `status: "active"` on every successful sync |
| Device recovery (offline → online) | Heartbeat write sets `status: "active"` regardless of previous state            |
| Offline detection                  | Cron + `sensor-offline-detector` hook                                           |

### GH1 `firebaseRealtimeService.js` as a whole

The broader Firebase service (subscription listener, WebSocket broadcast, ML trigger) was already migrated in the Firebase path fix task. Combined with this auto-registration work, the entire `firebaseRealtimeService.js` service is now fully superseded by GH2.

**`services/firebaseRealtimeService.js` can be deleted.**

---

## Verification Procedure

```bash
# 1. Apply migration
cd "/Users/macbookpro/Desktop/Big_GH/grainhero 2"
npx supabase db push

# 2. Confirm column exists
npx supabase db query \
  "SELECT column_name, data_type FROM information_schema.columns \
   WHERE table_name='sensor_devices' AND column_name='last_ping_at'"
# Expected: last_ping_at | timestamp with time zone

# 3. TypeScript build check
npm run build
# Expected: 0 errors
```

### Manual end-to-end test

1. Remove a known device from `sensor_devices` (or use a new device_id in Firebase).
2. Ensure Firebase RTDB has a payload at `/sensor_data/{device_id}/latest` or `/devices/{device_id}/live`.
3. POST to `/api/public/cron/sync-firebase` with correct `apikey` header.
4. **Assert**: Row appears in `sensor_devices` with correct fields.
5. **Assert**: Row appears in `warehouses` if it was created.
6. **Assert**: Row appears in `silos` with `capacity_kg=1000`, `name="Rice Storage Silo"`.
7. **Assert**: Row appears in `sensor_readings` for the device (first reading not dropped).
8. POST again. **Assert**: No duplicate in `sensor_devices`. `last_ping_at` updated.
9. Set `last_ping_at` to 20 minutes ago. POST again. **Assert**: `status` → `"offline"`.
10. Set Firebase payload back. POST again. **Assert**: `status` → `"active"` (device recovery).
