# Phase 10 — Sensor, Actuator & Alerts UI (frontend for Phase 9 backend)

> Ties Phase 9 telemetry + command queue to end-user surfaces.
> Source plans: `GrainHero_Finalized_Plan.md` §"Operations UI" and Kimi Phase §"Real-time monitoring".

## Goals

1. Live sensor detail with realtime readings, quality badges, offline banner.
2. Threshold drawer per silo × metric (plan-gated by `max_active_alert_rules`).
3. Actuator command console with issue → status timeline, rate-limit surfaces.
4. Alerts inbox: filter by silo/severity/rule, acknowledge & assign.
5. Skeletons per page registered in `PAGE_SKELETONS` (matches Phase 5 pattern).

## Scope by role

| Surface                    | Admin | Manager | Technician | Super-admin |
| -------------------------- | :---: | :-----: | :--------: | :---------: |
| Sensor detail (live chart) |   ✓   |    ✓    |     ✓      |      ✓      |
| Threshold drawer           |   ✓   |    ✓    |     —      |      —      |
| Issue actuator command     |   ✓   |    ✓    |    ✓*      |      —      |
| Automation rules           |   ✓   |    —    |     —      |      —      |
| Alerts inbox               |   ✓   |    ✓    |     ✓      |    read-only|

\* Technician only for maintenance / commissioning commands.

## Files to create / edit

### New components
- `src/components/app/sensors/LiveReadingChart.tsx` — Recharts line, realtime subscribe to `sensor_readings` filtered by `device_id`, cleanup channel in `useEffect`.
- `src/components/app/sensors/QualityBadge.tsx` — maps `ok|stale|out_of_range|missing` to color chip.
- `src/components/app/sensors/ThresholdDrawer.tsx` — CRUD via `listThresholds/saveThreshold/deleteThreshold`; shows plan limit + `PlanLimitBanner` when `max_active_alert_rules` reached.
- `src/components/app/actuators/CommandConsole.tsx` — form (command + params), fires `issueCommand`, shows recent command list via `listCommands`, live-refreshes on realtime `actuator_commands` insert/update.
- `src/components/app/actuators/CommandStatusBadge.tsx` — `queued|sent|ack|failed|expired`.
- `src/components/app/alerts/AlertsFilterBar.tsx` — silo, severity, rule, date range.
- `src/components/app/alerts/AlertRow.tsx` — reusable row with acknowledge/assign actions.

### Route edits
- `src/routes/_authenticated/sensors.tsx` — list unchanged; each row → drawer with `LiveReadingChart` + `ThresholdDrawer` trigger.
- `src/routes/_authenticated/sensors.$sensorId.tsx` (new) — full sensor detail page for deep links from alerts.
- `src/routes/_authenticated/actuators.tsx` — attach `CommandConsole` per actuator card.
- `src/routes/_authenticated/grain-alerts.tsx` — replace static list with filter bar + `AlertRow` grid + realtime subscribe.

### Server-fn additions
- `src/lib/alerts.functions.ts`:
  - `listAlerts({ siloId?, severity?, status?, from?, to? })`
  - `acknowledgeAlert(id)`, `assignAlert(id, userId)` — writes `logActivity` + `emitNotification` to assignee.

### Skeletons
Add to `src/components/app/skeletons.tsx` and register in `src/router.tsx > PAGE_SKELETONS`:
- `SensorDetailSkeleton` (chart placeholder + threshold list)
- `ActuatorsSkeleton` (grid of command console cards)
- `AlertsSkeleton` (filter bar + rows)

## Data & realtime

- Realtime channel per page, always cleaned up (`supabase.removeChannel`).
- Sensor detail subscribes to `sensor_readings` filtered by `device_id=eq.<id>`; buffer 100 rows in state, drop oldest.
- Alerts page subscribes to `grain_alerts` filtered by tenant `admin_id`.
- Offline banner: derive from `device_heartbeats.status` polled every 30 s + realtime updates.

## Plan gating

- `assertPlanAllows(adminId, "max_active_alert_rules", currentCount)` inside `saveThreshold` — already handled server-side; UI surfaces `PLAN_LIMIT` errors via `PlanLimitBanner`.
- Automation rules card in `actuators.tsx` gated by feature flag `automation_enabled` (existing `plan-gate.ts` boolean features).

## Fallbacks / safety

- If realtime subscribe fails 3× → fall back to 15 s polling with visible "Live paused" badge.
- `CommandConsole` disables submit while a command for same actuator is `queued|sent` (client-side dedupe on top of server rate limit).
- Empty-state cards use standard `states.tsx` components.

## Verification checklist (must pass before ✓)

1. `bunx tsgo --noEmit` — 0 errors.
2. `bun scripts/audit-server-fns.ts` and `audit-routes.ts` — 0 violations.
3. Playwright script drives: open sensor → see chart → set threshold → assert plan-limit banner when over cap.
4. Issue actuator command as manager → row appears with `queued` → ack via `/api/public/actuator-ack` → row flips to `ack` without page reload.
5. Insert stale heartbeat → run cron endpoint → alert appears in alerts inbox in <2 s.

## Out of scope (deferred)

- Mobile push for alerts → Phase 12 (Expo).
- ML anomaly overlay on chart → Phase 14 (ML feedback loop).
- Bulk threshold import CSV → Phase 20 (Enterprise polish).

---
**Approval prompt:** Reply **go** to build Phase 10 UI, or **edit** with changes.