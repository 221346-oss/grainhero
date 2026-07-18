# Phase 22 — Governance, Sharing & Notification Depth

Bundles the nine Phase 21 follow-ups you listed, the warehouse-creation fix, and the next-phase scope (governance / shareable read-only surfaces / notification depth). Zero-hardcode rule preserved: every threshold, template, rate limit, and default is editable in super-admin settings.

---

## 0. Hotfix — Warehouses cannot be created

**Root cause:** `upsertWarehouse` writes `admin_id: context.userId`. For manager/technician users that's their own profile id, but RLS `with_check` requires `admin_id = get_tenant_admin_id(auth.uid())`, which resolves to their tenant admin's id. Insert silently fails RLS.

**Fix:** resolve `admin_id` via `profiles.admin_id ?? profiles.id` (same rule as `get_tenant_admin_id`) and use that for `admin_id` + `created_by`/`updated_by`. Also gate creation to `admin` and `manager` roles (technicians shouldn't create warehouses).

---

## 1. Metric Registry & Dashboard Publish Audit

- New table `analytics_governance_audit` (actor, action, target_type: metric|widget|share|refresh, target_key, before/after jsonb, ip, ua, at).
- Wire audit writes into `upsertMetric`, `toggleMetric`, `deleteMetric`, `saveWidget`, `deleteWidget`, `reorderWidgets`, and share-link CRUD (below).
- New route `/platform/analytics-audit` — filters (actor, action, date), diff viewer, CSV export.

## 2. Analytics Refresh Monitor

- Route `/platform/analytics-refresh` reads `analytics_refresh_log`.
- Cards: last success per fact table, current freshness lag, failure count 24h.
- Table: run history with status, duration, error, retry button (calls `refreshWarehouse` for that fact).
- Uses existing `pg_cron` schedule; adds `retryOne(factKey)` server fn and per-fact backoff.

## 3. Widget CSV Export (date-range)

- Extend `metric_registry` with optional `csv_template` (SQL that accepts `date_from`/`date_to`) — falls back to `sql_template` if null.
- Server fn `exportMetricCsv({ key, from, to, filters })` → streams CSV via server route `/api/public/exports/metric/<token>` (short-lived signed token in `metric_export_tokens`).
- Widget card gains "Export CSV" button with date-range popover.

## 4. Shareable Read-Only Dashboards

- Table `dashboard_shares` (id, owner_user_id, role_snapshot, widget_ids[], date_defaults jsonb, token, expires_at, revoked_at, view_count).
- Public route `/share/dashboard/$token` — SSR-safe read-only band; no auth; queries via `run_metric` under service role scoped to snapshot widgets only.
- Manage sheet in Dashboard Builder: create/revoke/copy link, set expiry, default date range.
- All copy (title, footer, disclaimer) driven by super-admin `platform_settings.share_defaults`.

## 5. Insurance Notification Deep Links

- Extend `dispatchNotification` payload with `deep_link` (route + params).
- Existing insurance events (claim status, audit, webhook, policy doc) emit deep links to:
  - `/insurance/claims/$id/timeline`
  - `/platform/insurance/audit?event=<id>`
  - `/policies/$id/documents#v<version>`
- Notification center + email templates render the link.

## 6. Safer Webhook Replay Controls

- Extend `insurance_webhook_events` with `replay_count`, `last_replay_at`, `next_replay_allowed_at`, `replay_history jsonb[]`.
- Config in `marketplace-settings` (rename section → `platform_ops_settings`): max replays/hour per event, min backoff seconds, cooldown after N failures.
- Replay endpoint enforces backoff, records attempt, appends to history.
- Webhook monitor: history panel per event, disabled state during cooldown with countdown.

## 7. Bulk Notification Actions

- Notification center gains multi-select (checkbox + shift-range).
- Server fns `bulkMarkRead(ids[])`, `bulkMarkUnread(ids[])`, `bulkArchive(ids[])` scoped to caller.
- Toolbar: Mark read / Mark unread / Archive / Clear selection. Filters (category=insurance) preserved.

## 8. Claim Timeline Export (PDF + CSV)

- Server fn `exportClaimTimeline({ claimId, format })`.
- CSV: chronological events.
- PDF: reuse `invoicing-pdf.server.ts` `pdf-lib` layout — header (claim id, policy, carrier), event table, decision block, footer.
- Buttons on `/insurance/claims/$id/timeline` and super-admin alias.

## 9. Policy Documents Version History

- `insurance_policy_documents` already versioned. Add UI: version list (uploader, timestamp, size, notes), download per version, "current" pill, diff-of-metadata expandable row.
- Route: `/policies/$policyId/documents` — accessible to policy owner + super-admin.
- Super-admin can mark any version "current" (writes audit entry).

---

## Migration summary (single migration)

1. `analytics_governance_audit` + grants/RLS (super_admin read; system-writable via SECURITY DEFINER fn).
2. `dashboard_shares` + `metric_export_tokens` + grants/RLS.
3. Extend `insurance_webhook_events` with replay tracking columns.
4. Extend `metric_registry` with `csv_template text`.
5. Extend `platform_settings` with `share_defaults` + `platform_ops_settings` keys (seeded).
6. `pg_cron` schedule for `analytics_refresh_log` retention (30d).

## Server functions (new)

- `analytics-audit.functions.ts` — list/export.
- `dashboard-shares.functions.ts` — CRUD + resolve token.
- `metric-export.functions.ts` — CSV generation + token mint.
- `analytics-refresh.functions.ts` — add `retryOne`, `getRefreshHealth`.
- `webhook-replay.functions.ts` — backoff-guarded replay.
- `notifications-bulk.functions.ts` — bulk actions.
- `claim-timeline-export.functions.ts` — CSV/PDF.
- `policy-documents.functions.ts` — version list + mark-current.

## Routes (new / updated)

- `/platform/analytics-audit`, `/platform/analytics-refresh`
- `/share/dashboard/$token` (public), `/policies/$id/documents`
- Skeletons registered in `router.tsx` + `skeletons.tsx`
- Sidebar: "Analytics Ops" group (Metric Registry, Dashboard Builder, Refresh Monitor, Governance Audit, Share Links)

## Zero-hardcode confirmations

- Share expiry defaults, footer text, PDF branding → `platform_settings`
- Replay backoff/limits → `platform_settings.platform_ops_settings`
- CSV row cap, timezone → `platform_settings.exports`

## Out of scope (deferred)

- Multi-tenant sharing (invite-based collaborators) — Phase 23.
- Warehouse role/permission overhaul beyond the hotfix — Phase 24 (Ops Hardening).

Reply **go** to execute.
