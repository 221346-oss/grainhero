# Phase 21 — Analytics Warehouse Activation

Phase 20 landed the `analytics` schema, fact tables, `metric_registry`, `dashboard_widgets`, and the `public.run_metric` RPC. Phase 21 turns that plumbing into a working product: super-admins can register KPIs, refresh the warehouse, and every role gets a drag-configurable dashboard driven by the registry. Zero hardcoded KPIs — everything editable from the platform.

## Goals

1. **Warehouse refresh automation** — the fact tables are populated on a schedule and on demand, with health surfaced to super-admins.
2. **Metric Registry management UI** — super-admins can create, edit, test, and role-scope KPIs without a migration.
3. **Dashboard Builder** — each role (super_admin, admin, manager, technician, buyer) gets a saved widget layout driven by the registry, with a builder for super-admins.
4. **Role dashboards consume the registry** — existing dashboards can render a "custom widgets" band pulled from `dashboard_widgets` alongside their curated content.
5. **Seed the registry** with a starter pack (revenue, active tenants, overdue shipments, claim loss ratio, silo fill %, technician SLA) so every role sees value on day one.

## Deliverables

### 1. Warehouse refresh service
- `src/lib/analytics-refresh.functions.ts` — server fns:
  - `refreshWarehouse({ scope: 'all' | 'orders' | 'shipments' | 'telemetry' | 'finance' | 'insurance' })` — super-admin only, wraps existing refresh helpers, writes to `analytics_refresh_log`.
  - `listRefreshLog({ limit })` — recent runs with status/duration/rows.
  - `getWarehouseHealth()` — last successful run per fact + staleness in minutes.
- `src/routes/api/public/hooks/analytics-refresh.ts` — POST endpoint verifying `apikey` header, calls the same helpers. Body `{}`.
- pg_cron job (insert tool): `analytics-warehouse-refresh` every 15 min → hits the hook.

### 2. Metric Registry UI (super-admin)
- `src/lib/metric-registry.functions.ts` — CRUD (`listMetrics`, `upsertMetric`, `toggleMetric`, `deleteMetric`, `runMetricPreview`).
  - `runMetricPreview` calls `public.run_metric` with sample filters and returns the JSON payload plus timing.
  - `upsertMetric` validates: key format (`snake_case`), non-empty `sql_template`, `allowed_roles` subset of app_role, `default_filters` JSON, `visualization` in an enum.
- `src/routes/_authenticated/platform.metrics.tsx` — table (`AdminDataCard`) of registered metrics with filters (category, active). Detail sheet for editing SQL, roles, defaults, visualization type (`tile | line | bar | pie | table`), refresh interval. "Run preview" panel shows JSON + rendered viz.
- Sidebar entry under Platform → "Metric Registry".

### 3. Dashboard Builder
- Extend `dashboard_widgets` usage: `owner_scope` (`role:<role>` or `user:<uuid>`), `metric_key`, `title`, `layout` (`{x,y,w,h}`), `filters`, `visualization_override`.
- `src/lib/dashboard-builder.functions.ts`:
  - `listWidgetsForRole(role)` / `listMyWidgets()` — returns widgets visible to caller.
  - `saveWidget(input)` / `deleteWidget(id)` / `reorderWidgets(items)`.
  - Super-admin can save role-scoped widgets; other roles can save personal widgets only.
- `src/routes/_authenticated/platform.dashboard-builder.tsx` — grid preview + add/remove widgets + role picker.
- Reusable renderer `src/components/app/analytics/MetricWidget.tsx`:
  - Fetches `run_metric(key, filters)`.
  - Renders based on `visualization` (`tile`, `line`, `bar`, `pie`, `table`) using existing Recharts wrappers.
  - Handles loading skeleton + error state consistent with theme (emerald/slate).

### 4. Role dashboard integration
- New shared component `src/components/app/analytics/CustomWidgetsBand.tsx` — loads `listWidgetsForRole(currentRole)` and renders responsive grid of `MetricWidget`s. Hidden if no widgets configured.
- Mount in: `SuperAdminDashboard`, `AdminDashboard`, `ManagerDashboard`, `TechnicianDashboard`, and buyer dashboard route. Placed under KPI band, above activity feed. No changes to existing curated content.

### 5. Registry starter pack (migration)
Seeds `metric_registry` with:
- `platform_mrr` (super_admin) — tile, `SELECT sum(monthly_price) FROM subscriptions WHERE status='active'`.
- `platform_active_tenants` (super_admin) — tile.
- `orders_overdue_shipments` (super_admin, admin) — tile from `analytics.fact_shipments`.
- `insurance_loss_ratio_12m` (super_admin) — line from `analytics.fact_insurance`.
- `silo_fill_pct` (admin, manager) — bar per silo from `analytics.fact_telemetry_daily`.
- `technician_sla_7d` (super_admin, admin) — tile from install SLA cohort.
- `buyer_orders_in_flight` (buyer) — tile from `buyer_orders` scoped by `caller_user_id`.

Also seeds one default widget per role pointing at its most relevant metric so every dashboard shows something the moment Phase 21 ships.

## Technical Notes

- All new server fns use `requireSupabaseAuth`; privileged ones re-check `has_role(_, 'super_admin')`.
- `run_metric` already enforces role + statement timeout — the UI just surfaces its errors.
- Widget `filters` merge into `run_metric`'s filter jsonb; `caller_role`, `caller_user_id`, `caller_tenant_id` are always injected server-side, so role-scoped metrics stay tenant-safe.
- Refresh helpers are idempotent (upserts keyed on natural business keys); the cron can run every 15 min without duplicates.
- Reuse `AdminPageShell`, `AdminDataCard`, `AdminFilterBar`, `PageHeader`, and existing Recharts wrappers — no new theme tokens.
- Skeletons: register `MetricRegistrySkeleton` and `DashboardBuilderSkeleton` in `src/router.tsx`.

## Out of scope (deferred to later phases)

- Export widgets to PDF/PNG — Phase 22 (Reporting Studio).
- Anomaly detection / alerting on metrics — Phase 22.
- Cross-tenant benchmarking — Phase 24 (Enterprise Polish).
