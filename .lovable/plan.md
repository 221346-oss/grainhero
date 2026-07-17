# Phase 1 — Baseline Audit & Guardrails

First phase of the Foundation block (Phases 1–5). Goal: lock down the current app so later phases can build on it without regressions. **Nothing user-visible changes** — this phase is instrumentation, safety rails, and a written contract for what "correct" means in every later phase.

## What we build

### 1. Canonical role & route matrix (`docs/route-matrix.md`)
A single source of truth mapping every route in `src/routes/` to:
- allowed roles (`super_admin` / `admin` / `manager` / `technician` / public)
- data scope (platform-wide / tenant / self)
- plan gate (if any)
- required server fns

Any later phase that adds a route must add a row here in the same PR.

### 2. Route audit script (`scripts/audit-routes.ts`)
Node script (run via `bun scripts/audit-routes.ts`) that:
- walks `src/routes/`, reads each file's `createFileRoute` + head/loader
- verifies routes under `_authenticated/` don't call unauthenticated server fns in their loader
- verifies public routes don't import `client.server` transitively
- verifies every route with a `loader` defines `errorComponent` and `notFoundComponent`
- prints a table and exits non-zero on violations

### 3. Server-fn safety lint (`scripts/audit-server-fns.ts`)
Scans `src/**/*.functions.ts` and asserts:
- no top-level `import ... client.server` (must be dynamic inside handler)
- every fn either has `.middleware([requireSupabaseAuth])` OR is documented in `docs/public-server-fns.md` as intentionally public
- `process.env.*` reads only inside `.handler()` bodies

### 4. Plan-gate helper (`src/lib/plan-gate.ts`)
Thin wrapper around the existing `plan_thresholds` table:
- `assertPlanAllows(adminId, feature)` — server-side, throws typed `PlanLimitError`
- `usePlanGate(feature)` — client hook returning `{ allowed, limit, used, upgradeUrl }`
- centralizes the check used by later Admin phases (silos cap, sensors cap, buyers cap, exports, etc.)

Migration: add missing feature keys to `plan_thresholds` seed if any (`max_silos`, `max_sensors`, `max_buyers`, `max_users`, `exports_enabled`, `api_access`, `alerts_sms`).

### 5. Activity-log helper unification (`src/lib/activity.ts`)
One `logActivity({ actorId, tenantId, action, target, meta })` used by every mutating server fn from Phase 2 onward. Existing scattered `activity_logs` inserts get wrapped (non-breaking).

### 6. Error surface baseline
- Add `defaultErrorComponent` to `src/router.tsx` if not already present.
- Add `notFoundComponent` to `__root.tsx`.
- Standard `<EmptyState>` and `<ErrorState>` primitives in `src/components/app/states.tsx` for later phases to reuse.

## DB migration
Single additive migration:
- Ensure `plan_thresholds` has rows for every feature key listed above (INSERT ... ON CONFLICT DO NOTHING).
- Add `profiles.suspended boolean default false` and `profiles.notes text` if missing (needed by Phase 6 admin profile).

No table drops, no column type changes.

## Deliverables checklist
- [ ] `docs/route-matrix.md`
- [ ] `docs/public-server-fns.md`
- [ ] `scripts/audit-routes.ts` + `scripts/audit-server-fns.ts` (both green)
- [ ] `src/lib/plan-gate.ts` + `src/lib/activity.ts`
- [ ] `src/components/app/states.tsx`
- [ ] Migration applied
- [ ] `bun scripts/audit-routes.ts` and `bun scripts/audit-server-fns.ts` pass with 0 violations (or documented exceptions)

## Out of scope for Phase 1
- Any new user-facing page
- Any UI restyle
- Any Twilio / Expo / ML work (those are Phases 21+, 24+, and their own dedicated phases)

## Why this order
Every later phase (plan gating on Admin pages, SuperAdmin financial exports, mobile API surface) assumes the audit scripts + plan-gate helper exist. Building them now means later phases become small, safe diffs instead of sprawling refactors.

---

Reply **approve** to build Phase 1, or tell me what to change. After Phase 1 lands I'll open Phase 2 (Auth hardening & session hygiene) as its own plan.