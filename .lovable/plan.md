# Phase 3 — Plan Gating Enforcement

Goal: make `plan_thresholds` the single source of truth for every "can this tenant add another X / use feature Y" decision. Today the checks live only in `usePlanLimits` (client-side, based on `pricing-data`) and are trivially bypassed by calling the server fn directly.

## Scope

Server-side enforcement on every create/insert of a gated resource, plus consistent client UX (disabled buttons + upgrade nudges) reading the same gate.

### Gated resources → server fns

| Feature key         | Table            | Server fn (insert path)           |
| ------------------- | ---------------- | --------------------------------- |
| `max_warehouses`*   | warehouses       | `upsertWarehouse` (insert branch) |
| `max_silos`         | silos            | `upsertSilo` (insert branch)      |
| `max_batches`       | grain_batches    | `upsertGrainBatch` (insert)       |
| `max_sensors`       | sensor_devices   | `upsertSensorDevice` (insert)     |
| `max_actuators`     | actuators        | `upsertActuator` (insert)         |
| `max_buyers`        | buyers           | `upsertBuyer` (insert)            |
| `max_users`         | user_roles       | `inviteTeamMember` (team-settings)|

*Add `max_warehouses` to `plan_gate.ts` `PlanNumericFeature` union — currently missing.

### Feature toggles (boolean)

- `exports` → gate `exportSensorCSV`, buyer/orders CSV exports
- `alerts_sms` → gate SMS send path (future Twilio integration; add gate now so Phase later just plugs provider)
- `api` → gate any `/api/public/*` tenant-scoped token issuance (placeholder assertion for now)
- `insurance` → gate `insurance_policies` insert in `team-settings-insurance.functions.ts`

## Work items

1. **`src/lib/plan-gate.ts`**
   - Add `max_warehouses` to `PlanNumericFeature` + `NUMERIC` list.
   - Add helper `getTenantUsage(sb, tenantAdminId, feature)` that computes the current count for the gate's table (single switch), so callers don't have to pass `currentUsage`.
   - Change `assertPlanAllows` signature to accept optional `context` + auto-compute usage when not supplied.
   - Treat missing `plan_thresholds` row as "unlimited for super_admin, denied for others" (fix current `{allowed:false}` false-negative that would brick starter tenants if the row is missing).

2. **`src/lib/operations.functions.ts`** — insert `await assertPlanAllows({ feature, context })` at the top of the insert branch of each upsert fn (Warehouse, Silo, Batch, Sensor, Actuator, Buyer). Skip when `id` present (update path).

3. **`src/lib/team-settings-insurance.functions.ts`**
   - `inviteTeamMember` → `assertPlanAllows({ feature: "max_users" })`.
   - `insurance_policies` insert → `assertPlanAllows({ feature: "insurance" })`.

4. **Error surface**: standardize response — catch `PlanLimitError` in a small `withPlanErrors()` wrapper (or inline) and rethrow as `throw new Error(\`PLAN_LIMIT:\${feature}:\${used}/\${limit}\`)` so the client toast can parse and show "Upgrade" CTA. Add `parsePlanLimitError(err)` helper in `plan-gate.ts` for the client.

5. **Client hooks/UI**
   - Deprecate `usePlanLimits` in favor of `usePlanGate` per feature. Keep a thin shim so existing Silo/Warehouse pages don't break; internally call `usePlanGate`.
   - Add `<PlanLimitBanner feature="..." used=... />` (in `src/components/app/states.tsx`) that renders "X of Y used — Upgrade" with a link to `/plan-management`.
   - Wire disabled state + banner into: silos, warehouses, sensors, actuators, buyers, batches, team pages. (Already-shipped disable logic on silos/warehouses gets migrated to the new hook.)

6. **Activity logging**: on every `PlanLimitError`, `logActivity({ action: "plan_limit_hit", metadata: { feature, used, limit } })` server-side before rethrowing — feeds SuperAdmin insights on which caps bite.

7. **Audit script**
   - Extend `scripts/audit-server-fns.ts` with a new rule: any `.insert(` into a gated table inside a `createServerFn` handler must be preceded (in the same handler body) by `assertPlanAllows(` referencing that feature. Emit a warning listing the file:line so future inserts can't skip the gate silently.

8. **No DB migration needed** — Phase 1 already added `max_buyers` and normalized `features`.

## Verification

- `bun run scripts/audit-routes.ts` and `bun run scripts/audit-server-fns.ts` both exit 0.
- Manual: as a starter-plan admin, attempt to create silo #4 (starter cap is 3) → server rejects with `PLAN_LIMIT:max_silos:3/3`, UI shows upgrade banner, activity log entry appears in `activity_logs`.
- Super-admin (no subscription row) is never blocked.

## Out of scope (deferred)

- Twilio wiring, Stripe upgrade CTA button navigation (Phase 6+).
- Retroactive enforcement for tenants already over-cap — for now, block new inserts only.

Reply **approve** to execute.
