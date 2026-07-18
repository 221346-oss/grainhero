# Phase 20 — Analytics Warehouse, Metric Registry & Executive Dashboards

## Why
By Phase 19 the platform generates rich cross-domain data (orders, shipments, telemetry, finance, insurance). Live OLTP joins on `sensor_readings`, `buyer_orders`, `finance_ledger_entries`, and `insurance_*` are already slow, and every dashboard reinvents its own SQL. We need a lightweight warehouse layer, a **super-admin-editable metric registry** (zero hardcoded KPIs), and role-scoped dashboards for super-admin, admin, and buyer.

## Goals
- Precomputed **fact tables** in a separate `analytics` schema, refreshed by `pg_cron`.
- **Metric registry** — super-admin can add/edit KPIs (label, SQL template, unit, format, allowed roles) without code changes.
- **Dashboard builder** — save widget layouts per role; users can also pin custom variants.
- Executive, tenant, and buyer dashboards driven entirely by `runMetric({ key, filters })`.
- **CSV + PDF export** for any chart and scheduled **weekly digest emails** through the existing dispatcher.
- Strict role scoping: super_admin sees platform; admin sees only their tenant; buyer sees only their orders.

## Data Model (new `analytics` schema)
Facts (refreshed by cron):
- `analytics.fact_orders` — order_id, buyer_id, seller_admin_id, gross_cents, net_cents, cost_cents, status, placed_at, delivered_at, delay_hours
- `analytics.fact_shipments` — shipment_id, carrier_id, sla_target_hours, actual_hours, on_time, exception_type
- `analytics.fact_telemetry_daily` — silo_id, day, avg_temp, avg_humidity, alert_count, spoilage_risk_score
- `analytics.fact_finance_daily` — day, gross_cents, cost_cents, refunds_cents, payouts_cents, net_cents, currency
- `analytics.fact_insurance` — policy_id, claim_id, premium_cents, payout_cents, decision_hours, status

Dimensions:
- `analytics.dim_tenant`, `analytics.dim_carrier`, `analytics.dim_plan`, `analytics.dim_calendar`

Governance tables (in `public`, super-admin-managed):
- `public.metric_registry` — key, label, sql_template, unit, format, allowed_roles[], default_filters jsonb, active
- `public.dashboard_widgets` — dashboard_key, owner (null=default), position, metric_key, chart_type, filters jsonb, role_scope
- `public.analytics_refresh_log` — fact_name, started_at, finished_at, rows_upserted, error

Storage bucket: `analytics-exports` (private, signed URLs).

## Server Layer
- `src/lib/analytics-metrics.functions.ts`
  - `listMetrics()` — returns registry entries the caller can access
  - `runMetric({ key, filters })` — resolves entry from registry, calls a `SECURITY DEFINER` RPC `run_metric(key, params, role, tenant_id)` that whitelists SQL, binds params, and enforces role scope
  - `upsertMetric` / `deleteMetric` (super-admin)
- `src/lib/analytics-dashboards.functions.ts`
  - `getDashboard({ key })` — merges default widgets + user overrides
  - `saveDashboardLayout({ key, widgets })`
- `src/lib/analytics-export.functions.ts`
  - `exportMetricCsv({ key, filters })` — returns `{ csv, filename }`
  - `exportDashboardPdf({ key, filters })` — reuses `pdf-lib` helper, stores in `analytics-exports` bucket, returns signed URL
- `src/routes/api/public/cron/analytics-refresh.ts` — POST, called by `pg_cron` hourly (fast marts) and nightly (`fact_telemetry_daily`). Auth via `apikey` header, calls SECURITY DEFINER refresh functions.
- `src/routes/api/public/cron/analytics-weekly-digest.ts` — Monday 08:00 UTC, sends per-recipient digest via `dispatchNotification`.

## Safety & Grants
- `analytics` schema: `GRANT USAGE TO authenticated`. No direct table SELECT.
- `run_metric()` is `SECURITY DEFINER`, `SET search_path = analytics, public`, has `statement_timeout '5s'`, and:
  - Verifies caller's role via `get_my_role(auth.uid())`.
  - Rejects any metric whose `allowed_roles` doesn't include that role.
  - Injects `tenant_admin_id = get_tenant_admin_id(auth.uid())` for role `admin`, `buyer_id = auth.uid()` for buyer.
- All exports go through the same server fn — no raw SQL crosses the client boundary.

## UI
Shared components (all take `{ metricKey, filters }`):
- `MetricKpiCard`, `MetricLineChart`, `MetricBarChart`, `MetricDonut`, `MetricTable`

Routes:
- **Super-admin**
  - `/platform/analytics` — executive dashboard (KPI strip, revenue vs cost, SLA trend, insurance loss ratio, tenant leaderboard)
  - `/platform/analytics/metrics` — metric registry CRUD with SQL preview + dry-run
  - `/platform/analytics/dashboards` — drag-drop widget composer (defaults per role)
- **Admin (tenant)**
  - `/analytics` — sales funnel, spoilage %, plan utilisation, top listings, alerts trend
- **Buyer**
  - `/marketplace/insights` — spend, favourite sellers, on-time delivery rate

Skeletons: `AnalyticsCommandSkeleton`, `MetricRegistrySkeleton`, `DashboardComposerSkeleton`, `BuyerInsightsSkeleton` — wired into `PAGE_SKELETONS`.

## Cron & Digests
- Hourly: refresh `fact_orders`, `fact_shipments`, `fact_finance_daily`, `fact_insurance`
- Nightly (02:00 UTC): refresh `fact_telemetry_daily`
- Weekly (Mon 08:00 UTC): digest email — top KPIs per recipient's role/tenant, honours `notification_channel_prefs`, logs to `platform_email_digest_log`

## Acceptance
- Cron populates fact tables from real OLTP data; refresh log visible in super-admin UI.
- Super-admin adds "avg claim decision hours" through the registry UI and it renders on a dashboard with zero code changes.
- Admin only sees their tenant's rows; buyer only their own — verified with two accounts.
- Any chart exports to CSV and PDF; weekly digest arrives with the recipient's opted-in KPIs.
- `run_metric` rejects a metric the caller's role is not in `allowed_roles`, and every query respects the 5s statement timeout.

## Delivery Slices
1. Migration: `analytics` schema + fact/dim tables + registry + widgets + refresh log + grants + `run_metric` RPC.
2. Refresh cron route + SQL functions + `analytics-refresh` cron schedule.
3. `analytics-metrics.functions.ts` + shared metric components.
4. Super-admin routes (`/platform/analytics`, `/metrics`, `/dashboards`) with seeded default metrics (GMV, cost, profit, SLA, loss ratio, MRR, spoilage %).
5. Tenant + buyer dashboards using the same shared components.
6. Export server fns + `analytics-exports` bucket + PDF template.
7. Weekly digest cron + email template.
8. Sidebar wiring + skeletons + docs update.

Reply **go** to start with slice 1 (migration + `run_metric` RPC).
