## Phase 9 — Finish UI on top of the telemetry / actuator / alerts backend

The Phase 9 backend (telemetry ingest, threshold evaluation with hysteresis, actuator command queue, bridge endpoints, heartbeat sweep) is already shipped. This plan closes Phase 9 by wiring the four user-facing surfaces to that backend, plus one small server-fn addition and the pg_cron hookup.

### 1. Small server-fn addition
- Add `src/lib/alerts.functions.ts` with `listAlerts({ siloId?, severity?, status?, from?, to? })`, `acknowledgeAlert(id)`, `assignAlert(id, userId)`. Each writes `logActivity` + `emitNotification` where relevant. RLS via `requireSupabaseAuth`.

### 2. Shared UI primitives (under `src/components/app/`)
- `sensors/QualityBadge.tsx` — chip for `ok | stale | out_of_range | missing`.
- `sensors/LiveReadingChart.tsx` — Recharts line, `useEffect` realtime subscription to `sensor_readings` filtered by `device_id`, cleanup on unmount, rolling 100-point buffer, "Live paused" badge after 3 subscribe failures (falls back to 15 s poll of `getSiloReadings`).
- `sensors/ThresholdDrawer.tsx` — CRUD via `listThresholds` / `saveThreshold` / `deleteThreshold`; surfaces `PLAN_LIMIT` errors from `assertPlanAllows("max_active_alert_rules")` via existing `PlanLimitBanner`.
- `actuators/CommandStatusBadge.tsx` — `queued | sent | ack | failed | expired`.
- `actuators/CommandConsole.tsx` — form (command + params), calls `issueCommand`, lists recent via `listCommands`, realtime subscribe to `actuator_commands`, disables submit while an in-flight command exists for the same actuator (client-side dedupe on top of server rate-limit).
- `alerts/AlertsFilterBar.tsx` and `alerts/AlertRow.tsx` — filters (silo, severity, status, date) + row with acknowledge/assign actions.

### 3. Route edits
- `src/routes/_authenticated/sensors.tsx` — keep grid; each card gets a "Live" button that opens a drawer with `LiveReadingChart` + `ThresholdDrawer` trigger.
- `src/routes/_authenticated/actuators.tsx` — attach `CommandConsole` inline per actuator card.
- `src/routes/_authenticated/grain-alerts.tsx` — replace static list with `AlertsFilterBar` + `AlertRow` grid + realtime subscription on `grain_alerts` (filtered by tenant `admin_id`).
- Device offline banner on `sensors.tsx` derived from `device_heartbeats.status`.

### 4. Skeletons (in `src/components/app/skeletons.tsx`, registered in `src/router.tsx > PAGE_SKELETONS`)
- `SensorsSkeleton` (already exists — extend if needed for drawer trigger)
- `ActuatorsSkeleton` (grid of console cards)
- `AlertsSkeleton` (filter bar + rows)

### 5. Cron wiring (uses `supabase--insert`, not migration)
- Schedule `heartbeat-sweep` every 2 minutes calling `POST https://project--08a93ae3-e513-4d21-8fb9-bf6979e71541.lovable.app/api/public/cron/heartbeat-sweep` with `apikey` header set to the anon key.

### 6. Verification (must pass before Phase 10)
1. `bunx tsgo --noEmit` — 0 errors.
2. `bun scripts/audit-server-fns.ts` + `audit-routes.ts` — 0 violations.
3. Playwright: open a sensor → live chart renders → set a threshold → over-cap attempt shows `PlanLimitBanner`.
4. Issue actuator command → `queued` row appears → simulate ack via `/api/public/actuator-ack` (HMAC-signed) → row flips to `ack` without reload.
5. Backdate a heartbeat + hit cron endpoint → offline alert appears in `grain-alerts` within 2 s.

### Out of scope (deferred to later phases)
- Mobile push for alerts → Phase 12 (Expo).
- ML anomaly overlay on chart → Phase 14 (ML feedback loop).
- Bulk threshold CSV import → Phase 20 (Enterprise polish).

Reply **approve** to build, or send edits.