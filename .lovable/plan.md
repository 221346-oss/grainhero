# Plan

## 1. AppSearch — consistent across all authenticated pages

- Expand `NAV_TARGETS` in `src/components/app/AppSearch.tsx` to include every authenticated route (all `/platform/*`, ops, insights, business, admin) with proper groups + short keywords so global-jump works everywhere.
- Broaden `scopeFor()`:
  - **Global scope** on `/dashboard` and every `/platform*` path.
  - **Page scope** on all other authenticated routes; label derived from the route (e.g. "Search silos on this page"). Add missing entries in `PAGE_LABELS` (activity-logs, orders, buyers, insurance, subscription, team, reports, plans, etc.).
- Keep the `useAppSearchQuery()` broadcast; wire it into the main list/table pages that don't yet consume it (silos, warehouses, sensors, actuators, batches, buyers, alerts, incidents, notifications, activity-logs, orders, team-management, platform.tenants, platform.users, platform.leads, platform.orders, platform.audit-logs, platform.logs) as a simple `.filter()` on their fetched arrays. No backend changes.
- Placeholder + `aria-label` become dynamic per page.

## 2. Keyboard shortcuts (app-wide)

In `AppSearch.tsx`:
- `/` and `⌘K` / `Ctrl+K` → focus search (already present; keep + ignore when typing in inputs/contentEditable).
- `Esc` → clear + blur + close (already present).
- `↑ / ↓` → move highlight through the global results list.
- `Enter` → navigate to highlighted result (or first result if none).
- Visible kbd hints in the dropdown footer ("↑↓ navigate · ↵ open · esc close").

## 3. Remove "pending" everywhere; default new users to admin

- `src/lib/roles.functions.ts`: drop `"pending"` from `AppRole` union + priority `order`; default fallback becomes `"admin"`.
- `src/routes/_authenticated/dashboard.tsx`: remove the "pending" comment/branch; unknown/no-role → `AdminDashboard`.
- `src/routes/auth.signup.tsx`: on signup, insert `user_roles` row with `role: 'admin'` (instead of pending). No new migration required — `admin` already exists in the enum.
- Grep and remove any remaining `PendingDashboard` references (component file already deleted per earlier turn — verify import list clean in `AdminDashboard` / `dashboard.tsx` / sidebar).
- Keep operational (grain-batches/silos/etc.) restrictions unchanged for `super_admin`.

## 4. `/platform` insights & quick actions

Note: standalone `/platform` route was removed; Super Admin lands on `/dashboard` which renders `SuperAdminDashboard`. Upgrades happen there.

- Ensure every `QUICK_ACTIONS` link in `SuperAdminDashboard.tsx` resolves to an existing route (`/platform/tenants`, `/platform/users`, `/platform/plans`, `/platform/revenue`, `/platform/pipeline`, `/platform/leads`, `/platform/health`, `/platform/audit-logs`, `/platform/orders`, `/platform/logs`). Confirmed present in `src/routes/_authenticated/`.
- Widget upgrades in `SuperAdminDashboard.tsx`:
  - **Recent signups**: each row becomes a `<Link to="/platform/users">` with an inline "View" chevron.
  - **System alerts**: link to `/platform/health` (or `/grain-alerts` for op alerts); show tenant name when available.
  - **Signups · 30d**: keep sparkline; add total + WoW delta beneath.
  - Add two new compact tiles:
    - **Revenue snapshot** (MRR + active subs + churned) → links to `/platform/revenue`.
    - **Pipeline snapshot** (leads by stage counts) → links to `/platform/pipeline`.
  - Both fed by extending `getPlatformOverviewWidgets` in `src/lib/platform.functions.ts` (aggregate from `subscriptions` + hubspot pipeline table already used by `/platform/pipeline`).
- Header now includes primary CTA buttons: "Invite user" (→ `/platform/users`), "New plan" (→ `/platform/plans`).

## 5. Consistent per-page skeletons

Establish one pattern per page-type using existing helpers in `src/components/app/skeletons.tsx`:

| Page type | Skeleton composition |
|---|---|
| Dashboards (admin/super/manager/technician) | header bar + `StatsSkeleton count=6` + `CardsSkeleton count=3` |
| List/table pages (silos, warehouses, sensors, actuators, batches, buyers, orders, alerts, incidents, maintenance, notifications, activity-logs, team, platform.tenants/users/leads/orders/audit-logs/logs) | filter-bar bar + `TableSkeleton rows=8 cols=5` |
| Insight/graph pages (analytics, ai-predictions, reports, data-visualization, revenue, platform.revenue, platform.pipeline, platform.health) | `StatsSkeleton count=4` + a new `ChartSkeleton` (add to skeletons.tsx: tall rounded card with animated bars) ×2 |
| Detail/form pages (settings, subscription, plans, platform.plans, insurance, security-center) | `FormSkeleton fields=6` + `CardsSkeleton count=2` |

Add a small `PageSkeleton({ variant })` wrapper exporting `"dashboard" \| "table" \| "insight" \| "form"` in `skeletons.tsx` so each route file's `pendingComponent` is a single line. Update every authenticated route's `pendingComponent` accordingly (batched edit).

## Technical notes

- No DB schema changes. Signup insert uses the existing `admin` enum value.
- `getPlatformOverviewWidgets` extension reads from tables already granted; no new grants.
- Keyboard handling uses a single window listener with a shared ref to the results list; no external libs.
- `useAppSearchQuery()` remains the sole contract for page-scoped filtering — pages that don't opt in still get the URL/search bar UX without changes.

## Files touched (approx.)

- `src/components/app/AppSearch.tsx` — full rewrite of NAV + keyboard nav.
- `src/components/app/skeletons.tsx` — add `ChartSkeleton`, `PageSkeleton`.
- `src/components/dashboards/SuperAdminDashboard.tsx` — widget links + new tiles + CTAs.
- `src/lib/platform.functions.ts` — extend `getPlatformOverviewWidgets` (revenue + pipeline snapshots).
- `src/lib/roles.functions.ts` — drop `pending`.
- `src/routes/_authenticated/dashboard.tsx` — default admin.
- `src/routes/auth.signup.tsx` — insert admin role on signup.
- ~15–20 list/table route files — wire `useAppSearchQuery()` into their filter step + swap `pendingComponent` to `PageSkeleton`.
- All other authenticated route files — swap `pendingComponent` to appropriate `PageSkeleton` variant.
