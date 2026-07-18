## Goal
1) Fresh, realistic demo data for `atifnazir005@gmail.com` so every dashboard renders with meaningful numbers.
2) Sidebar simplification per role (industry-standard agritech shell — max 6–8 pinned items) with the long tail surfaced from each dashboard.
3) Sweep the top 4 recurring UI flaws.

## 1. Data population (idempotent SQL)
Only insert what's missing so re-running is safe. For the tenant admin resolved from `atifnazir005@gmail.com`:
- Ensure `subscription` = Pro active, `plan_thresholds` row exists.
- Backfill 2 warehouses, 4 silos, 3 grain batches, 3 sensor devices with 72h hourly readings, 3 actuators, 8 alerts (mix open/resolved).
- Marketplace: 3 listings, 4 buyer orders (paid/dispatched/delivered/disputed), shipment events, 2 reviews, 1 dispute, 1 return.
- Hardware: 1 completed install order + devices, 1 in-progress install.
- Finance: 6 months of invoices + payments; ledger entries.
- Insurance: 1 active policy + 1 open claim.
- Notifications, activity logs, mobile devices.
- Super-admin visibility: seed 4 additional demo admins (existing profiles) with sample subscriptions so `/platform/financials` and `/platform/users` are populated.

## 2. Sidebar redesign (per-role, industry standard)
Replace the current 20+ pinned items with a compact role-scoped rail. Everything else lives in a `More` popover, but each dash surfaces its own deep-links via clickable tiles (already partly in place).

**Admin / Manager (6 items):**
Home · Batches · Silos · Sensors · Alerts · Marketplace · More

**Technician (5):**
Home · My Installs · Sensors · Actuators · Alerts · More

**Super Admin (6):**
Home · Tenants (via /platform/users) · Financials · Marketplace Ops · Insurance · Launch Readiness · More

Bottom rail (all roles): Team · Settings.
Everything removed from the rail (Warehouses, Buyers, Listings, Sales, Revenue, Earnings, Activity Logs, Analytics, AI Predictions, Insurance, Subscription, all `/platform/*` deep pages) is:
- Grouped in `More` popover (already exists, just repopulated), AND
- Surfaced as a clickable KPI tile / quick-action button on the relevant dashboard.

## 3. UI flaw sweep
- Duplicate `revenue` nav entry (present twice in pinned + more).
- `financials.tsx` "Revenue by plan" pie hover text overflow (tooltip formatter).
- Empty-state cards on dashboards that still hardcode `text-gray-500` (dark-mode invisible).
- Skeleton container width mismatch on 2 remaining platform pages (`launch-readiness`, `finance`).

## Deliverables
- 1 SQL insert script (via `supabase--insert`, idempotent `ON CONFLICT`).
- `AppSidebar.tsx` rewrite: shrink `pinnedNav` to role-scoped small sets, move rest into `moreGroups`.
- Small patches to `financials.tsx` tooltip + 3–4 empty-state cards.
- No new pages, no route changes — only sidebar surface + dashboard tile links.

After apply I run typecheck and confirm the dev preview loads.
