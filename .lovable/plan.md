# Plan — Phase 26.5 (Hardening) + Phase 27 (Mobile Commerce & Payments)

Runs both tracks in the same pass. Every setting stays super-admin configurable — no hardcoded thresholds, keys, or copy.

---

## Track A — Phase 26.5 Hardening

### A1. Sync monitoring & manual replay
New table `mobile_sync_runs`:
- `endpoint` (text: `field-tasks | field-incidents | marketplace | buyer-summary | …`)
- `actor_user_id` (nullable — null for anonymous marketplace)
- `status` (`ok | error`)
- `duration_ms`, `row_count`, `error_message`, `request_meta jsonb`
- `started_at`, `finished_at`

Wire every `/api/public/v1/sync/*` handler through a shared `withSyncLogging(endpoint, handler)` wrapper in `src/lib/mobile-sync.server.ts` that inserts one row per call via `supabaseAdmin` (fire-and-forget, never blocks the response).

New page `/platform/mobile-sync-monitor`:
- KPI tiles (last 24h): total runs, error rate, p95 duration.
- Table grouped by endpoint: last run, success count, failure count, last error.
- "Run now" button per endpoint → calls a new `runMobileSyncManually` server fn (super-admin gated) that invokes the sync endpoint server-to-server with an internal `x-internal-run: <CRON_SECRET>` header and records the result.
- Row-level drill-down drawer with recent 50 runs.

### A2. RBAC hardening + 401/403 UX
- Add `requireSuperAdmin` middleware (composes `requireSupabaseAuth` + `has_role(uid,'super_admin')`); apply to every `platform.*` server fn touched this phase (field-settings, field-incidents, marketplace-mobile-settings, sync monitor, audit reads).
- Sync endpoints (`/api/public/v1/sync/*`): authenticated ones already run through mobile bearer; add explicit 401 JSON `{ error: "unauthorized" }` shape and a role guard for endpoints that must be super-admin (manual re-run only).
- New shared `<UnauthorizedState>` component; new route `/403` and `/401` with retry + sign-in CTAs.
- Root error boundary maps `status===401|403` responses to those routes instead of the generic error component.

### A3. Settings audit trail
New table `platform_settings_audit`:
- `actor_user_id`, `settings_key` (`mobile_field | mobile_marketplace | …`), `action` (`update`), `before jsonb`, `after jsonb`, `created_at`.

Update `updateFieldSettings` / `updateMarketplaceMobileSettings` server fns to:
1. Read current row.
2. Compute diff.
3. Update.
4. Insert audit row.

Expose read-only "Change history" panel on both settings pages (last 20 entries with expandable diff).

---

## Track B — Phase 27 Mobile Commerce & Payments

Goal: mobile app can complete a buyer checkout end-to-end and sellers get paid, without duplicating any web logic. All commerce knobs (fees, currencies, allowed methods, min/max order value, copy) come from super-admin settings.

### B1. Schema
- `mobile_commerce_settings` (singleton): `checkout_enabled`, `allowed_payment_methods jsonb`, `min_order_cents`, `max_order_cents`, `platform_fee_bps`, `currency_default`, `terms_url`, `refund_policy_url`, `stripe_publishable_key_override` (nullable, else env).
- `buyer_payment_intents`: mirrors Stripe PaymentIntent lifecycle for mobile-initiated checkouts. `order_id`, `stripe_pi_id`, `client_secret_hash`, `amount_cents`, `currency`, `status`, `platform_fee_cents`, `raw jsonb`, `created_by`, timestamps.
- Add `payment_channel` (`web|mobile`) to `buyer_orders` if missing.

### B2. Server surface
- `createServerFn` `mobile.checkout.createIntent` (auth): validates listing + qty against `mobile_commerce_settings` and existing pricing, creates Stripe PaymentIntent with `automatic_payment_methods`, returns `client_secret` + `publishable_key`.
- `mobile.checkout.confirmOrder` (auth): idempotency-keyed; after Stripe confirms, promotes `buyer_orders` to `paid`, writes `buyer_order_events`, notifies seller.
- Extend Stripe webhook `/api/public/hooks/stripe` handler to update `buyer_payment_intents` and orders for mobile intents (event types: `payment_intent.succeeded|failed|canceled`).
- New sync endpoint `/api/public/v1/sync/commerce-config` returning safe subset of `mobile_commerce_settings` (public — no secrets).

### B3. Mobile action registry additions
- `commerce.start-checkout` → calls `createIntent`.
- `commerce.cancel-order` (buyer, pre-dispatch only).
- `commerce.request-refund` → creates `buyer_refunds` row via existing refund flow.
- `commerce.save-payment-method` (stores Stripe PM id under buyer_account for future one-tap; no raw PAN ever stored).

### B4. Super-admin pages
- `/platform/commerce-mobile` — toggle checkout, payment methods, fees, min/max, currency, copy, links; live preview of the resulting mobile config JSON.
- Every save flows through the Track A audit trail (`settings_key = 'mobile_commerce'`).

### B5. Docs & deep links
- Seed `mobile_deep_link_routes` with `commerce.checkout`, `commerce.order-status`, `commerce.refund-status` mapped to their web equivalents.
- Update `GrainHero_Finalized_Plan.md` phase log with Phase 26.5 + 27 outcomes.

---

## Non-Goals (deferred to Phase 28)
- Marketplace search personalization, saved carts, promo codes.
- Apple Pay / Google Pay domain verification (needs live domain).
- Multi-currency FX (Stripe handles single presentment currency for now).

## Rollout order
1. Migrations (A1 + A3 + B1) in a single migration file.
2. Server functions + endpoints + wrappers.
3. Super-admin pages + audit UI + sync monitor.
4. Register routes + sidebar entries + skeletons.
5. Typecheck.

Approve to proceed.