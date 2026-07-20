
## Goal

Fix two skeleton problems in one pass:

1. On **first load** of the app, users see a bare page body skeleton while the sidebar and topbar are still empty — the whole shell should skeleton together, then the real chrome and page snap in.
2. On **route changes**, the pending skeleton for many pages doesn't match what actually loads (wrong grid, wrong column count, wrong sections). Every admin/manager/technician/super-admin page needs a skeleton that mirrors its real layout.

## Answers locked in

- Chrome skeleton shows on **first load only**; after that, real sidebar/topbar stay mounted and only the page body swaps per-route.
- **High fidelity**: each route gets a skeleton whose section shapes (KPI strip counts, bento tile positions, table columns, drawer widths) match the real page.
- Roll across **all four roles**: Admin, Manager, Technician, SuperAdmin.

## Approach

### 1. Full-shell first-load skeleton (`AppShellSkeleton`)

- New `src/components/app/AppShellSkeleton.tsx` renders sidebar rail (56px), topbar bar (search pill, quick tabs pills, bell, avatar), and a generic page body placeholder — all in one composed layout so nothing is empty.
- Mount in `src/routes/__root.tsx` as the app's `pendingComponent` / initial fallback (before the auth layout resolves). Once `_authenticated/route.tsx` mounts, real chrome takes over and per-route skeletons handle subsequent navigation.
- Use `sessionStorage` flag `gh_shell_ready` to guarantee it only shows once per browser tab.

### 2. High-fidelity per-page skeletons

- Audit every route file under `src/routes/_authenticated/` (93 files) and group by real layout signature:
  - **Dashboard bento** (Admin/Manager/Technician/SuperAdmin dashboards): KPI strip + welcome banner + bento grid
  - **Table + toolbar** (orders, grain-batches, silos, sensors, actuators, buyers, suppliers, listings, sales, returns, incidents, disputes, platform.orders, platform.users, platform.tenants, platform.sellers, platform.plans, platform.reviews, platform.sla-alerts, platform.pipeline, platform.leads, activity-logs, notifications, technician.installs, etc.)
  - **KPI + chart hub** (financials, revenue, earnings, analytics, ai-predictions, ml-models, environmental, monitoring, business, intelligence, platform.finance, platform.finance.ledger, platform.finance.payouts, platform.marketplace-health, platform.dispatch-analytics)
  - **Rail + list + drawer** (silos hub, warehouses, insurance)
  - **Detail hub** (`silos.$siloId`, `admins.$adminId`, `platform.orders.$orderId`, `suppliers.$supplierId`, `buyer.orders.$orderId`, `insurance-claims.$claimId`, `technician.installs.$installId`)
  - **Settings/form** (settings, settings.notifications, plan-management, subscription, security-center, platform.field-settings, platform.mobile-settings, platform.marketplace-settings)
  - **Command console** (platform.logistics.command-center, platform.insurance, platform.health, platform.metrics, platform.dashboard-builder, platform.launch-readiness)
  - **Log stream** (platform.audit-logs, platform.logs, platform.messages, platform.invoice-failures, platform.mobile-push-diagnostics, platform.mobile-sync-monitor)
- Add each shape as a distinct component in `src/components/app/skeletons.tsx`. Reuse existing shapes where they already match; extend/replace where they don't.

### 3. Route→skeleton map

- Rewrite the `PAGE_SKELETONS` map in `src/router.tsx` so every one of the 93 routes maps to the correct shape (including `$param` routes handled via prefix fallbacks, technician + super-admin + manager pages, not just admin).
- Fallback chain: exact match → prefix match (`/platform/orders/`, `/admins/`, `/silos/`, `/suppliers/`, `/buyer/orders/`, `/insurance-claims/`, `/insurance-policies/`, `/technician/installs/`, `/platform/insurance/claims/`) → role-inferred dashboard skeleton → generic.

### 4. Verification

- After changes, `bun run build` (auto-run) and spot-check 6 pages with the browser preview (dashboard, orders, silos, financials, platform.orders, technician.installs) to confirm the skeleton shape matches on hard refresh + route change.

## Files

- New: `src/components/app/AppShellSkeleton.tsx`
- Extend: `src/components/app/skeletons.tsx` (add ~10 new shape components; consolidate near-duplicates)
- Edit: `src/router.tsx` (rewrite `PAGE_SKELETONS`, add prefix resolver)
- Edit: `src/routes/__root.tsx` (register `AppShellSkeleton` for the very first paint)

## Non-goals

- No changes to page content, business logic, or sidebar behavior.
- No new dark/light rules (existing tokens already work).
- Marketing / public routes stay untouched.
