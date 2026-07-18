# Phase 19 — Insurance, Risk Coverage & Claims Automation

## Why
Grain in silos and in transit represents high-value inventory. Sellers, buyers, and platform ops need a controlled way to attach insurance policies to batches / shipments / hardware, file claims against loss events (spoilage, theft, transit damage, sensor-detected quality drop), and let the super-admin operate a claims desk without hardcoding carriers, coverage tiers, or payout rules.

## Goals
- First-class **policies** entity linkable to `grain_batches`, `buyer_shipments`, and `hardware_orders`.
- **Claims** lifecycle: draft → submitted → under_review → approved / rejected → paid, with evidence uploads and audit trail.
- Auto-suggest claims from existing signals: SLA overdue shipments, quality certificate failures, weight reconciliation variance beyond configurable %, spoilage alerts from telemetry.
- Super-admin **Insurance Command Center**: carriers, coverage products, premium rates, deductibles, approval SLAs — all configurable, zero hardcoding.
- Seller / admin views: "My Policies", "My Claims" with premium ledger entries auto-posted into the finance ledger (Phase 18).
- Notifications: policy expiring, claim state changes, payout received — through existing multi-channel dispatcher.

## Data Model (new tables)
- `insurance_carriers` — name, contact, api_mode (manual/webhook), active flag, logo_url.
- `insurance_products` — carrier_id, code, name, coverage_type (batch/shipment/hardware), base_premium_bps, deductible_bps, max_payout_cents, currency, terms_url.
- `insurance_policies` — product_id, holder_admin_id, subject_type/subject_id (polymorphic to batch/shipment/order), coverage_start/end, premium_cents, status (active/expired/cancelled), external_ref.
- `insurance_claims` — policy_id, opened_by, claim_type (spoilage/transit_damage/theft/quality_failure/hardware_loss), incident_at, loss_amount_cents, requested_payout_cents, approved_payout_cents, status, decision_reason, external_ref.
- `insurance_claim_events` — claim_id, actor_id, event_type, payload jsonb, created_at (append-only audit).
- `insurance_claim_attachments` — claim_id, file_path (bucket), mime, size, uploaded_by.
- Storage bucket: `insurance-attachments` (private).
- Settings additions (`marketplace-settings.functions.ts`): `insurance` block — auto-suggest thresholds (SLA overdue hours, weight variance %, quality fail triggers), default approval SLA hours, allow_seller_self_file bool.

## Server Layer
- `insurance-carriers.functions.ts` — CRUD for super-admin.
- `insurance-products.functions.ts` — CRUD + pricing preview.
- `insurance-policies.functions.ts` — `bindPolicy`, `renewPolicy`, `cancelPolicy`, `listMyPolicies`, `listAllPolicies`.
- `insurance-claims.functions.ts` — `openClaim`, `submitClaim`, `addEvidence`, `moderateClaim` (approve/reject with payout), `markPaid`, `listMyClaims`, `listQueue`.
- `insurance-suggestions.functions.ts` — scans SLA/weight/quality signals, produces suggested_claims rows (materialised view or on-demand query) for the admin/seller inbox.
- Cron: hourly policy expiry sweeper (→ notifications) and daily suggestion refresh.
- Finance hooks: on `bindPolicy` post debit ledger entry `premium_paid`; on `markPaid` post credit entry `insurance_payout`.

## UI
- **Seller/Admin**
  - `/insurance` — policies list, bind policy drawer (choose product, subject, coverage period, see premium).
  - `/insurance/claims` — my claims list, new claim wizard (subject → type → evidence upload → loss amount), timeline detail sheet.
  - Suggested-claim banners on `/silos/$id`, `/orders/$id`, `/hardware-orders/$id` when signals cross thresholds.
- **Super-admin**
  - `/platform/insurance` — command center: KPIs (active policies, open claims, payout ratio, avg decision time), sub-tabs Carriers / Products / Policies / Claims Queue.
  - Claim moderation sheet: evidence gallery, decision form (approve amount / reject reason), auto-generates ledger entries.
  - Settings tab wired into marketplace settings.
- Skeletons for every new route (`InsuranceListSkeleton`, `ClaimsQueueSkeleton`, `InsuranceCommandSkeleton`).

## Notifications
- Templates (super-admin editable): policy_bound, policy_expiring_7d, policy_expired, claim_submitted, claim_decisioned, claim_paid.
- Buyer + seller + super-admin routing via existing channel prefs.

## Acceptance
- Super-admin can add a carrier + product, seller can bind a policy to a batch, file a claim with photos, super-admin approves with partial payout, ledger records both premium and payout, all statuses visible in timelines, everything reads from configurable settings.

---

# Phase 20 — Analytics Warehouse, Executive Dashboards & Data Exports

## Why
By Phase 19 the platform generates rich operational data (orders, shipments, telemetry, finance, claims). Live OLTP queries on `sensor_readings` and cross-joins across finance/dispatch already start hurting. We need a lightweight warehouse layer, canonical KPI definitions, and executive/tenant dashboards that read from precomputed marts — no hardcoded metrics.

## Goals
- **Warehouse schema** (`analytics` schema in same Supabase project) with fact + dimension tables refreshed by cron.
- **Metric registry** — super-admin editable list of KPIs (name, sql template, unit, format) so new metrics don't require code changes.
- **Executive dashboard** for super-admin: platform-wide KPIs, cohort retention (tenants), GMV vs cost vs profit, insurance loss ratio, SLA trends.
- **Tenant analytics** for admins: their own batches, sales, spoilage %, revenue vs cost, subscription utilisation vs plan thresholds (Phase 2).
- **Buyer analytics** (light): spend, favourite sellers, on-time delivery rate.
- **Data exports**: any dashboard chart → CSV, PDF; scheduled email digests (weekly/monthly) using existing digest infra.
- **Query safety**: warehouse queries use a dedicated read-only role, capped statement timeout, and row-level filters based on `tenant_admin_id` / `super_admin`.

## Data Model
- `analytics.fact_orders` (buyer_order grain: order_id, buyer_id, seller_admin_id, gross_cents, net_cents, cost_cents, status, placed_at, delivered_at, delay_hours).
- `analytics.fact_shipments` (shipment_id, carrier_id, sla_target_hours, actual_hours, on_time bool, exception_type).
- `analytics.fact_telemetry_daily` (silo_id, day, avg_temp, avg_humidity, alert_count, spoilage_risk_score).
- `analytics.fact_finance_daily` (day, gross_cents, cost_cents, refunds_cents, payouts_cents, net_cents, currency).
- `analytics.fact_insurance` (policy_id, claim_id, premium_cents, payout_cents, decision_hours, status).
- `analytics.dim_tenant`, `analytics.dim_carrier`, `analytics.dim_plan`, `analytics.dim_calendar`.
- `analytics.metric_registry` — key, label, sql_template, unit, format, allowed_roles[], default_filters jsonb.
- `analytics.dashboard_widgets` — dashboard_key, position, metric_key, chart_type (kpi/line/bar/donut/table), filters jsonb, role_scope.
- Refresh log table `analytics.refresh_log` for observability.

## Server Layer
- `analytics-refresh.server.ts` — SQL functions that upsert into fact tables from OLTP tables; run via `pg_cron` (hourly for fast marts, nightly for heavier ones like telemetry_daily).
- `analytics-metrics.functions.ts` — `listMetrics`, `runMetric({ key, filters })` executing whitelisted SQL from registry with parameter binding + role scoping.
- `analytics-dashboards.functions.ts` — load/save widget layouts per role (super_admin default, admin default, buyer default, plus user-saved variants).
- `analytics-export.functions.ts` — CSV + PDF export (reuse `pdf-lib` helper), stored in `analytics-exports` bucket.
- `analytics-digests.server.ts` — weekly email digest to super-admin + per-tenant admins using their opted-in metrics.

## UI
- **Super-admin**
  - `/platform/analytics` — executive dashboard (KPIs strip, revenue vs cost, SLA trend, insurance loss ratio, tenant leaderboard, cohort retention).
  - `/platform/analytics/metrics` — metric registry CRUD (with SQL preview + dry-run against sample tenant).
  - `/platform/analytics/dashboards` — drag-drop widget composer (uses `dashboard_widgets`).
- **Admin**
  - `/analytics` — tenant dashboard: sales funnel, spoilage %, plan utilisation, top listings, alerts trend.
- **Buyer**
  - `/marketplace/insights` — personal spend & delivery stats.
- Shared components: `MetricKpiCard`, `MetricLineChart`, `MetricBarChart`, `MetricDonut`, `MetricTable` — all driven by `{ metricKey, filters }` props hitting `runMetric`.
- Skeletons for each dashboard, wired into `PAGE_SKELETONS`.

## Governance & Safety
- All warehouse SQL runs as a `SECURITY DEFINER` function that enforces `role_scope` and injects `tenant_admin_id = auth.uid()`'s tenant when role is admin.
- Statement timeout 5s for analytics functions.
- No raw SQL from client — clients call `runMetric({ key, filters })` only.
- Grants: `analytics` schema — usage to authenticated, select on facts only via wrapper functions.

## Acceptance
- Cron populates fact tables from real OLTP data.
- Super-admin edits a KPI (e.g. adds "avg claim decision hours") and it appears on the dashboard without code changes.
- Admin sees only their tenant's data; buyer sees only their own.
- Any chart can be exported to CSV/PDF, and a weekly digest email lists the top-line KPIs per recipient.

---

Reply **go** to start Phase 19 (schema + super-admin insurance center first, then seller/admin flows and suggestions engine). Phase 20 will follow with its own detailed slice-by-slice execution.