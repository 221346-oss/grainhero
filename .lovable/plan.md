# Admin & Super-Admin UI Redesign + Plan-Threshold Controls

## Scope correction
The `/platform/*` routes and other admin pages are **direct file-based routes** (e.g. `src/routes/_authenticated/platform.orders.tsx`, `activity-logs.tsx`, `orders.tsx`) — no dynamic router or wrapper layout. All work happens inside those individual route files plus a small shared `admin` component set.

Two role lenses drive every page (already resolved via `getEffectiveRole` / `has_role`):
- **admin** = tenant admin. Sees their own tenant's operational data + their own personnel (managers, technicians).
- **super_admin** = platform operator. Sees tenant admins and platform-wide monitoring — never end-operators, batches, silos, or per-tenant operational rows.

## Goal
1. Unify admin/super-admin pages to the landing brand look (emerald primary, slate neutrals, soft `from-slate-50 via-white to-emerald-50/30` bg) using Activity Logs as the visual template.
2. Compact density — most pages fit one 1440×900 viewport, scrolling stays inside cards.
3. Drop decorative icons; keep only functional ones (severity dot, close-chip, pagination, sort).
4. Split Activity Logs by role: admin sees their team; super_admin sees admins + own actions.
5. New Plan Thresholds page: super_admin edits plan limits/feature access; admin can request upgrade/downgrade from their own dashboard.

## Part A — Shared admin shell
New folder `src/components/app/admin/`:
- `AdminPageShell.tsx` — gradient bg wrapper, responsive header (title + subtitle + right actions), no title icons.
- `AdminSummaryTiles.tsx` — numeric tile row, click-to-filter ring, text-only labels.
- `AdminFilterBar.tsx` — single card: search + selects + date range + Filter button.
- `AdminDataCard.tsx` — bordered card with internal `max-h-[520px] overflow-auto` list/table + in-card pagination footer.
- `AdminDetailPanel.tsx` — sticky right-column detail (replaces navigating to a detail page for most lists).

All components use existing semantic tokens; no new colors, no new dependencies.

Layout rules for every refactored page:
- Header: `grid-cols-[minmax(0,1fr)_auto]` mobile → `sm:flex` (per responsive-layout-patterns).
- Body: `lg:grid-cols-3` — list spans 2, sticky detail spans 1.
- Spacing: `p-4 sm:p-6 space-y-5`, `text-sm` body, page title `text-2xl sm:text-3xl`.
- No icons in tile labels, card titles, filter labels, or nav items.

## Part B — Activity Logs split by role
File: `src/routes/_authenticated/activity-logs.tsx` (+ server function `listActivityLogs` in `src/lib/notifications-audit.functions.ts`).

Server-side scope resolution based on `getEffectiveRole`:
| Role | Rows returned |
|------|--------------|
| technician / manager | Only their own actions. |
| admin | All actions performed by users inside the caller's tenant (managers, technicians, admin themself). |
| super_admin | Own super-admin actions + all `admin`-role actions across every tenant, with a `tenant_name` column and a tenant-filter select. |

UI additions:
- Super-admin view: adds "Actor role" chip (admin/super_admin) and a Tenant filter select in the filter bar.
- Admin view: adds "Team member" filter (their managers/technicians).
- Same layout, no visual divergence beyond the extra filter select.

## Part C — Plan Thresholds & tenant subscription controls
Data (one migration):
- `public.plan_thresholds(plan_id text pk, name text, max_users int, max_silos int, max_batches int, max_sensors int, features jsonb, price_cents int, updated_at timestamptz)`.
- `public.tenant_plan_change_requests(id uuid pk, tenant_id uuid, requested_plan text, current_plan text, direction text check in ('upgrade','downgrade'), status text check in ('pending','approved','rejected','auto_applied'), requested_by uuid, decided_by uuid, decided_at timestamptz, created_at timestamptz default now())`.
- Grants + RLS: authenticated read on `plan_thresholds`; super_admin write. Admin can insert own tenant's change_request; super_admin full access; both can read own rows via `has_role`.
- Seed `plan_thresholds` from existing `src/lib/pricing-data.ts` in the same migration.

Server functions (`src/lib/plan-thresholds.functions.ts`, all `requireSupabaseAuth`):
- `listPlanThresholds` — any authenticated user.
- `updatePlanThreshold` — super_admin only (verify via `context.supabase` + `has_role`).
- `requestPlanChange({ requestedPlan })` — admin only; if `direction === 'upgrade'` and tenant's auto-upgrade flag is on, mark `auto_applied` and update tenant subscription immediately; else `pending`.
- `decidePlanChangeRequest({ id, approve })` — super_admin only; on approve updates the tenant's plan.
- `setTenantPlan({ tenantId, plan })` — super_admin manual override.

New pages (both use AdminPageShell):
1. `src/routes/_authenticated/platform.plans.tsx` — super_admin: editable table of plans (name, limits, feature toggles, price), plus a pending-requests panel in the right column.
2. `src/routes/_authenticated/subscription.tsx` (existing, refactor) — admin: current plan tile, plan comparison, "Request upgrade/downgrade" button, toggle "Auto-approve upgrades", history of own requests.

## Part D — Page-by-page refactor (presentation only, no data changes)

**Super-admin pages (show platform/admin oversight, never per-tenant operator data):**
| Page | Focus |
|------|-------|
| `platform.index.tsx` | Tiles: total tenants, active admins, MRR, incidents-this-week + two-column widgets (recent signups, system alerts) sized to one viewport. |
| `platform.tenants.tsx` | Tenants list + sticky tenant detail (plan, admin contact, usage vs threshold). Manual plan override lives here. |
| `platform.users.tsx` | **Only admin-role users** across tenants; role filter chips (admin / super_admin). No managers/technicians. |
| `platform.orders.tsx` | Hardware orders across tenants; tiles = statuses; list + detail. |
| `platform.leads.tsx` / `platform.pipeline.tsx` | Marketing leads/pipeline; kanban stays inside a fixed-height card, no page scroll. |
| `platform.audit-logs.tsx` / `platform.logs.tsx` | Align to Activity Logs shell; filters for actor role + tenant. |
| `platform.health.tsx` | Metrics tiles + one status card grid. |
| `platform.plans.tsx` *(new)* | Plan threshold editor + change-request queue. |

**Admin pages** (`activity-logs.tsx`, `subscription.tsx`, `team-management.tsx`, `settings.tsx`) get the same shell + brand palette, no scope changes beyond Activity Logs.

## Out of scope
- Tenant operational pages (dashboard, grain-batches, silos, sensors, actuators, buyers, insurance) — unchanged.
- No new AI, email, or webhook wiring.
- No copy changes beyond what the new components require.

## Acceptance
- Every page in Part D shares identical header/tile/filter/card visuals with Activity Logs.
- Desktop 1440×900: main content visible without page scroll (internal card scroll only).
- No icon in any page title, section title, tile label, or filter label.
- Activity Logs returns role-appropriate rows verified via one query per role.
- Super_admin can edit a plan threshold and approve a change request; admin can submit a change request and (if auto-upgrade is on) see the plan updated immediately.

Reply **approve** to build, or tell me what to adjust.
