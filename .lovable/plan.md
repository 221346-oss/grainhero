# Phase 10 — Silo Operations Cockpit & Grain Batch Lifecycle

Phase 9 delivered the telemetry/alert/actuator plumbing and the drawer/console primitives.
Phase 10 turns that into a **per-silo operations cockpit** that Managers and Technicians actually work from all day, and closes the loop on the grain batch lifecycle (intake → storage → treatment → dispatch) that the earlier plans call out but is only half-wired today.

This is the "make the operator's day feel calm" phase — one page per silo where every live number, alert, actuator, batch and rule is reachable in two clicks.

---

## Goals

1. A dedicated `/silos/$siloId` cockpit route with multi-metric live charts, threshold state, active alerts, actuator quick-controls, batch, and heartbeat health — all realtime.
2. Grain batch lifecycle state machine wired end-to-end (intake → active → treatment → ready → dispatched) with audit trail.
3. Actuator "auto mode" — when a silo threshold trips, an automation rule can queue an actuator command (ventilate on high humidity, cool on high temp). Manual override always wins.
4. Technician "attention queue" — one screen showing every silo currently in warn/critical or with a stale device, ranked, so field staff know what to touch first.
5. Fill in the last data gaps blocking Phase 11 (ML feedback, Phase 12 buyer flow, Phase 13 mobile parity): batch weights, quality snapshots on state transitions, and silo occupancy %.

---

## Scope (what's in / out)

**In**
- New route `/_authenticated/silos/$siloId` (cockpit).
- New route `/_authenticated/attention` (technician/manager triage queue).
- Grain batch state machine + drawer on both `/grain-batches` and cockpit.
- Automation rules table + evaluator hook inside `evaluateReadingThresholds`.
- Silo occupancy computed field + tile.
- Realtime everywhere it matters (readings, alerts, commands, batch state).

**Out (deferred)**
- ML model calls (Phase 11).
- Buyer-facing marketplace/order flow (Phase 12).
- Mobile app parity (Phase 13).
- Multi-tenant plan gating for automation rules — reuses existing `max_active_alert_rules` for now.

---

## Data model changes

Single migration:

```text
grain_batches
  + state              text        -- intake|active|treatment|ready|dispatched|rejected
  + state_changed_at   timestamptz
  + net_weight_kg      numeric
  + quality_snapshot   jsonb       -- {temp, humidity, moisture, co2} at last transition

grain_batch_events                 -- new audit table
  id, batch_id, from_state, to_state, actor_user_id,
  note, snapshot jsonb, created_at

automation_rules                   -- new
  id, admin_id, silo_id, actuator_id,
  trigger_metric text,             -- temperature|humidity|moisture|co2
  trigger_op text,                 -- gt|lt
  trigger_value numeric,
  command text,                    -- on|off|pulse|set_level
  command_params jsonb,
  cooldown_seconds int default 900,
  last_fired_at timestamptz,
  enabled bool default true

silos
  + capacity_kg        numeric     -- for occupancy % (nullable, backfill later)
```

Grants + RLS follow existing tenant pattern (`admin_id = get_tenant_admin_id(auth.uid())`).
Enable realtime on `grain_batches`, `grain_batch_events`, `automation_rules`.

---

## Server functions (new files)

- `src/lib/silo-cockpit.functions.ts`
  - `getSiloCockpit({ siloId })` — one call returning silo, current readings for all 4 metrics, active alerts, actuators, current batch, heartbeat age, occupancy %.
- `src/lib/grain-batch-lifecycle.functions.ts`
  - `transitionBatch({ batchId, toState, note })` — validates transition, captures quality snapshot from latest reading, writes `grain_batch_events`, unified activity log.
  - `listBatchEvents({ batchId })`.
- `src/lib/automation-rules.functions.ts`
  - `listAutomationRules({ siloId? })`, `saveAutomationRule(...)`, `deleteAutomationRule({ id })`, `toggleAutomationRule({ id, enabled })`.
- `src/lib/attention-queue.functions.ts`
  - `getAttentionQueue()` — silos ranked by (critical alerts desc, warn alerts desc, stale heartbeat, oldest unacknowledged).

Extend `evaluateReadingThresholds` (Phase 9) to also load matching enabled `automation_rules` for the silo/metric and, when triggered and outside cooldown, call `issueCommand` internally + stamp `last_fired_at`. Manual commands within the last 5 min block auto-fire (operator override).

---

## UI

### `/_authenticated/silos/$siloId` cockpit
Reuses shell/tokens from Phase 9. Layout:

```text
┌ Header: silo name · warehouse · occupancy % · [Rules] [Thresholds] [Edit] ┐
│ Summary tiles: Temp · Humidity · Moisture · CO₂ (each = value + trend arrow, live badge)
│ 2-col: LiveReadingChart(temperature) | LiveReadingChart(humidity)
│ 2-col: LiveReadingChart(moisture)    | LiveReadingChart(co2)
│ Active alerts (compact list, ack/resolve inline)
│ Actuators (mini CommandConsole per actuator, auto-mode badge)
│ Current batch card (state pill, transition button → BatchStateDrawer)
│ Device health strip (heartbeat age, battery, signal, quality)
└─────────────────────────────────────────────────────────────────────────┘
```

Every chart, alert, command and batch event subscribes to Postgres changes and invalidates its own query key — no page reload.

### New components
- `SiloCockpitHeader.tsx`
- `MetricTile.tsx` (value + delta + QualityBadge)
- `BatchStateDrawer.tsx` (state machine UI: allowed transitions, note field, snapshot preview, event timeline)
- `AutomationRuleDrawer.tsx` (list + form: metric/op/value → actuator/command, cooldown, enabled toggle)
- `AttentionRow.tsx` (silo, top issue, time in state, jump button)

### Route additions
- `/_authenticated/silos.$siloId.tsx` — cockpit
- `/_authenticated/attention.tsx` — triage queue for technicians (also linked from Manager dashboard)
- Add "Attention" nav item to sidebar for `manager` + `technician` roles only.

### Existing pages touched (minimal)
- `silos.tsx` — each silo card gets an "Open cockpit" button linking to the new route.
- `grain-batches.tsx` — replace the ad-hoc status dropdown with `BatchStateDrawer` trigger.
- `PAGE_SKELETONS` in `src/router.tsx` — register `SiloCockpitSkeleton` and `AttentionSkeleton`.

---

## Realtime channels used

| Channel | Table | Filter |
|--------|-------|--------|
| cockpit-readings-<siloId> | sensor_readings | silo_id=eq.<siloId> |
| cockpit-alerts-<siloId> | grain_alerts | silo_id=eq.<siloId> |
| cockpit-cmds-<siloId> | actuator_commands | silo_id=eq.<siloId> |
| cockpit-batch-<siloId> | grain_batches | silo_id=eq.<siloId> |

All wrapped in `useEffect` with `removeChannel` cleanup (per project rule).

---

## Skeletons

Add `SiloCockpitSkeleton` and `AttentionSkeleton` sized to their real layouts (`max-w-7xl`, matching tile/chart grid) so the loading state doesn't jump. Wire into `PAGE_SKELETONS` map — no global `AutoPending`.

---

## Acceptance checks

- Opening `/silos/$siloId` shows live values within 2s and updates without refresh when a new reading lands.
- Transitioning a batch state creates a `grain_batch_events` row and a unified activity log entry; snapshot is populated from the latest reading.
- Creating an automation rule "humidity > 70 → fan on" and inserting a reading of 75 causes an `actuator_commands` row with source=`automation` and honors the 15-min cooldown.
- A manual `issueCommand` on the same actuator in the last 5 min prevents auto-fire.
- `/attention` lists silos ordered by severity and updates realtime when an alert is acknowledged elsewhere.
- Existing `/sensors`, `/actuators`, `/grain-alerts` pages continue to work unchanged.
- `tsgo` clean; no Node-only deps introduced.

---

## Rollout order (single phase, small commits)

1. Migration (schema + grants + RLS + realtime publication).
2. Server functions (cockpit, lifecycle, rules, attention).
3. Extend threshold evaluator with automation rule dispatch + cooldown.
4. Cockpit route + components + skeleton.
5. Attention route + sidebar entry + skeleton.
6. Batch drawer wired into `/grain-batches`.
7. Verify with `tsgo` and a Playwright smoke on `/silos/$firstId` (chart renders, ack works).

Reply **go** to execute Phase 10.
