# Phases 23 → 32 — Finalization Roadmap

Locked to the original GrainHero_Finalized_Plan.md + Kimi phase file. Mobile stays external (Flutter) but consumes the **same Supabase DB** through a versioned, documented, RLS-safe surface — no separate backend, no divergent schema. Each phase below is a shippable unit; we execute them one-by-one, starting with Phase 23.

---

## Overview of the last 10 phases

| # | Phase | One-liner |
|---|---|---|
| 23 | Mobile API Contract & Sync Foundation | Versioned `/api/public/v1/*` read/sync endpoints, device-token auth, delta-sync cursors, docs for Flutter |
| 24 | Push Notifications & Deep Links (Mobile) | FCM/APNs registration, per-device prefs, action deep-links usable by Flutter router |
| 25 | Offline-First Contracts | Idempotency keys, conflict resolution, "since" cursors on telemetry / alerts / orders / tasks |
| 26 | Field Ops Workflows | Technician install/commissioning + Manager silo actions optimized for mobile (photo upload, signature, GPS) |
| 27 | Buyer Mobile Storefront Surface | Marketplace/checkout/tracking endpoints hardened for mobile SDK, Stripe PaymentSheet contract |
| 28 | ML Inference & Feedback Loop | Deployed inference gateway (HTTPS + token), request/response logging, human-in-loop correction pipeline |
| 29 | Observability, SLOs & Cost Guardrails | Structured logs, error budgets, per-tenant rate limits, cost dashboards |
| 30 | Security Hardening & Compliance | 2FA enforcement policies, audit export, data-retention jobs, GDPR/PDPA request flows |
| 31 | Disaster Recovery & Multi-Region Readiness | Backups, PITR runbook, read-replica path, failover drills (single-region now, multi-region-ready) |
| 32 | Launch Polish & Handoff | Status page, changelog, admin runbooks, Flutter integration guide, final QA sweep |

---

## Phase 23 — detailed plan (execute now)

### Goal
Give the external Flutter app a **stable, versioned, RLS-safe** way to talk to the existing Supabase DB. Zero schema forks, zero hardcoded config, everything tunable from super-admin.

### Deliverables

**1. Versioned public API namespace**
- `src/routes/api/public/v1/` (new). All mobile-facing HTTP endpoints live here.
- Every endpoint returns `{ data, meta: { server_time, cursor, version } }`.
- `GET /api/public/v1/meta` → server time, min supported client build, feature flags (reads `platform_settings.mobile`).

**2. Auth model for mobile**
- Flutter uses Supabase Auth SDK directly (same project) → gets the same JWT the web uses. No custom token server.
- Add `mobile_devices` table: `id, user_id, platform (ios|android), push_token, app_version, os_version, locale, last_seen_at, revoked_at`.
- Server fns: `registerDevice`, `heartbeatDevice`, `revokeDevice` (auth-required, RLS: owner-only).
- Middleware helper `requireMobileClient` = `requireSupabaseAuth` + optional `x-app-version` gate against `platform_settings.mobile.min_build`.

**3. Delta-sync endpoints (read side)**
Cursor-based (`updated_at, id`) so Flutter can pull incrementals:
- `GET /api/public/v1/sync/silos?since=<cursor>`
- `GET /api/public/v1/sync/sensors?since=`
- `GET /api/public/v1/sync/alerts?since=`
- `GET /api/public/v1/sync/hardware-orders?since=` (technician scope)
- `GET /api/public/v1/sync/buyer-orders?since=` (buyer scope)
- `GET /api/public/v1/sync/notifications?since=`
All enforce RLS via user's bearer; response includes `next_cursor` and `has_more`. Page size from `platform_settings.mobile.sync_page_size` (default 200, capped 1000).

**4. Write endpoints with idempotency**
- Header `Idempotency-Key` (UUID) required on POSTs.
- New table `mobile_idempotency_keys (key, user_id, endpoint, request_hash, response jsonb, created_at)` — 24h TTL cron cleanup.
- Endpoints: `POST /telemetry/ack`, `POST /alerts/:id/acknowledge`, `POST /installations/:id/step`, `POST /buyer-orders/:id/confirm-delivery`. Each wraps an existing server fn.

**5. File uploads**
- Reuse existing Supabase storage buckets. Add signed-URL mint endpoint: `POST /api/public/v1/uploads/sign` → returns short-lived upload URL + final public/signed read URL. Bucket + max size come from `platform_settings.mobile.uploads` (per-purpose: install_photo, dispute_evidence, quality_cert).

**6. Realtime channels (documented, not new)**
- Document which existing Postgres tables are on `supabase_realtime` publication so Flutter can subscribe directly (alerts, actuator_commands, buyer_order_events, hardware_order_visit_events).

**7. Super-admin controls (zero hardcode)**
- Extend `platform_settings.config.mobile`:
  - `min_build`, `latest_build`, `force_update_below`
  - `sync_page_size`, `heartbeat_interval_seconds`
  - `uploads` { bucket, max_mb, allowed_mime[] per purpose }
  - `feature_flags` { offline_mode, push_v2, ml_inline }
- New route `/platform/mobile-settings` with form + audit log entry via existing `record_governance_audit`.

**8. Docs for Flutter team**
- `docs/mobile/API_CONTRACT.md` — auth flow, endpoint list, cursor semantics, idempotency, error codes, realtime channel list, sample cURL + Dio snippets.
- `docs/mobile/DB_SHARED_MODEL.md` — which tables Flutter reads/writes, RLS assumptions, do-not-touch list (finance, insurance internals, analytics fact tables).

### Migration summary (single migration)
1. `mobile_devices` + grants (authenticated: full on own rows; service_role all) + RLS.
2. `mobile_idempotency_keys` + grants + RLS (owner-only).
3. Extend `platform_settings.config` seed with `mobile.*` defaults.
4. `pg_cron` cleanup job (24h) for idempotency keys.

### New server fns
- `src/lib/mobile-devices.functions.ts`
- `src/lib/mobile-sync.functions.ts` (reads)
- `src/lib/mobile-uploads.functions.ts`
- `src/lib/mobile-settings.functions.ts`

### New routes (server)
- `src/routes/api/public/v1/meta.ts`
- `src/routes/api/public/v1/sync/{silos,sensors,alerts,hardware-orders,buyer-orders,notifications}.ts`
- `src/routes/api/public/v1/uploads/sign.ts`
- `src/routes/api/public/v1/devices/{register,heartbeat,revoke}.ts`
- `src/routes/api/public/v1/actions/{ack-alert,ack-telemetry,install-step,confirm-delivery}.ts`

### New UI (super-admin)
- `src/routes/_authenticated/platform.mobile-settings.tsx` — versions, page sizes, upload limits, feature flags.

### Zero-hardcode confirmations
- All limits, buckets, min-build, feature flags → `platform_settings.mobile`.
- Deep-link scheme + universal-link host → `platform_settings.mobile.deep_link`.

### Out of scope for P23 (moves to P24+)
- Push token → FCM/APNs delivery pipeline (P24).
- Offline conflict-resolution UX (P25).
- Payment sheet contract (P27).

Reply **go** to execute Phase 23.
