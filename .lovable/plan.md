# GrainHero — Role-Aware Pages Plan

Goal: every shared route renders one of two lenses based on role.
- Tenant lens (admin/manager/technician): existing behavior, filtered by `admin_id`, full CRUD.
- Platform lens (super_admin): aggregated across all tenants, read-only, no operational write-actions.

No new pages. We modify existing routes/server functions and add one shared helper.

---

## 1. Foundation — shared RBAC + scope helper

**New SQL migration**
- `public.get_my_role(_user_id uuid) returns app_role` — SECURITY DEFINER, returns highest-priority role from `user_roles` (super_admin > admin > manager > technician > pending).

**New files**
- `src/lib/rbac.server.ts`
  - `getEffectiveRole(supabase, userId)` — single RPC call.
  - `requireRole(supabase, userId, allowed[])` — throws Forbidden.
- `src/lib/page-scope.server.ts`
  - `resolvePageScope(supabase, userId) → { scope: "tenant"|"platform", adminId, role }`.

**Refactor (replace ad-hoc `has_role` loops)**
`roles.functions.ts`, `platform.functions.ts`, `monitoring.functions.ts`, `operations2.functions.ts`, `billing.functions.ts`, `revenue-analytics.functions.ts`, `team-settings-insurance.functions.ts`.

---

## 2. Route guard + redirects

**Wire `not-allowed.tsx`.** Add `beforeLoad` role guard on operational and `/platform/*` routes that redirects unauthorized users there instead of hanging.

**Redirect super_admin (no dual view) on:**
- `plans.tsx` → `/platform/plans`
- `team-management.tsx` → `/platform/users`
- `activity-logs.tsx` → `/platform/audit-logs`
- `revenue.tsx` → `/platform/revenue`
- `data-visualization.tsx` → hide from nav + redirect to `/analytics`
- `traceability.tsx` → only reachable via impersonation (else redirect)

---

## 3. Add tenant/platform branch to shared pages

For each: one server fn branches on `scope`; component renders `<TenantView />` or `<PlatformView />`.

| Page | Platform view spec |
|---|---|
| AI Predictions | Risk distribution + worst-offender tenants. No "run" button. |
| Analytics | Spoilage-by-tenant, engagement ranking, benchmarks. |
| Environmental | Tenants currently out-of-threshold. Read-only. |
| Incidents | Cross-tenant feed, filterable, read-only. |
| Maintenance | Overdue devices across tenants. No log entry. |
| Server Monitoring (Device Health) | Fleet online/offline %, stale-hardware-by-tenant. |
| Buyers | Buyer/dispatch activity ranking. No CRUD. |
| Reports | Different catalog: MRR/churn, tenant activity, hardware fulfillment. |
| Insurance | Total insured value + claim rate. Read-only. |
| ML Models | Inference volume, error rate, latency by tenant. No trigger. |
| Subscription | All tenants: plan, MRR, churn, failed payments. Read-only. |
| Security Center | Anomalous logins, blocked users across tenants. |
| Settings | Append platform-config section (default thresholds, feature flags, maintenance mode) beneath personal settings. |

**Every `<PlatformView />` implements:**
- Explicit empty state ("nothing to show" vs loading vs error).
- Its own skeleton (heavier queries, different layout).
- Partial-failure resilience: render tenants that loaded, flag ones that didn't.

**File shape per page:**
```
routes/_authenticated/<page>.tsx           → reads scope, picks view
components/pages/<page>/TenantView.tsx     → existing UI, extracted
components/pages/<page>/PlatformView.tsx   → new aggregate UI
lib/<page>.functions.ts                     → single fn, branches on scope
```

---

## 4. Tenant impersonation (super_admin)

- "View as tenant" button on `platform.tenants.tsx` and `platform.users.tsx`.
- Sets impersonation context (cookie or context table) with impersonated `admin_id`.
- While active:
  - Super admin sees tenant's Dashboard/Batches/Silos/Traceability as their Admin would.
  - All writes disabled server-side + UI-disabled (create/edit/delete/threshold/resolve).
  - Persistent banner shows tenant name + "Exit impersonation".

---

## 5. `notifyPlatformEvent()` webhook connector

- New fn in `src/lib/platform-notify.functions.ts` posting to Slack/Discord webhook (secret: `PLATFORM_EVENT_WEBHOOK_URL`).
- Fires on: new signup, blocked user, critical tenant alert, failed Stripe payment, churn.
- Called from same points as existing `syncSignupToHubspot` + Stripe webhook + user-block action.

---

## 6. Out of scope (do not touch)

Grain Batches, Silos, Sensors, Actuators, Grain Alerts, Warehouses, Notifications — already correct.

---

## Execution order

1. ✅ Migration `get_my_role` + `rbac.server.ts` + `page-scope.server.ts`.
2. ✅ Super_admin redirects (plans, team-management, activity-logs, revenue, data-visualization, traceability) + operational routes now redirect to `/not-allowed` instead of `/dashboard`.
3. ✅ `notifyPlatformEvent()` scaffold + wired into `toggleUserBlocked` and Stripe `invoice.payment_failed` + `customer.subscription.deleted`. Set secret `PLATFORM_EVENT_WEBHOOK_URL` to activate.
4. ✅ Refactor 10 files off direct `has_role` onto `getEffectiveRole()` (roles, platform, revenue-analytics, monitoring, operations2, billing, analytics, team-settings-insurance, hardware-orders, firebase-sync, admin-test-email).
5. ⏳ Per-page tenant/platform branching (13 pages — one component split per page).
   - ✅ AI Predictions: added `getPlatformSpoilageOverview` + `PlatformView` (worst-offender tenants, risk distribution, read-only).
   - ✅ Subscription / Reports / Orders: redirected super_admin to `/platform/revenue` / `/platform/orders` (existing platform equivalents — no dual view needed).
   - ✅ Shared `PlatformScopeBanner` + `useIsSuperAdmin` hook: pages already returning cross-tenant data via super_admin RLS now announce platform scope and hide tenant-write actions.
   - ✅ Incidents: banner + acknowledge/resolve buttons hidden for super_admin.
   - ✅ Maintenance: banner + "Mark serviced" hidden for super_admin.
   - ✅ Server Monitoring: banner (read-only page — no writes to hide).
   - ✅ Security Center: banner (page is already read-only).
   - ✅ Insurance: banner (server RLS still enforces per-tenant writes).
   - ✅ Analytics, ML Models, Buyers: platform scope banner added.
   - Skipped: Environmental (weather-only, not tenant-scoped) and Settings (personal settings page — platform-config section deferred until impersonation lands).
6. ✅ Tenant impersonation: cookie-based (`gh_impersonate`) via `src/lib/impersonation.functions.ts` + `impersonation.server.ts`. `resolvePageScope` returns tenant scope while impersonating. Amber `ImpersonationBanner` in authenticated layout with Exit button. "View as" buttons on `platform/tenants` and admins in `platform/users`. `_authenticated/route.tsx` skips SUPER_ADMIN_REDIRECTS while the cookie is present so tenant pages are reachable.
   - ✅ Write-lock: `blockIfImpersonating` server-fn middleware in `src/lib/impersonation-guard.ts` refuses mutations while a super_admin is impersonating. Attached to 34 tenant mutation fns across `operations`, `operations2`, `monitoring`, `hardware-orders`, `team-settings-insurance`, and `notifications-audit`.
