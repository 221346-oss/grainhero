# Track A — Sync run concurrency lock & idempotency (Phase 26.5 patch)

**Problem:** `runSyncManually` currently probes the source view directly; two clicks in quick succession spawn overlapping runs, inflate error rates, and produce duplicate `mobile_sync_runs` rows for the same intent.

**Approach:** Add advisory-style locks in Postgres plus an idempotency key on the manual trigger.

1. **Migration**
   - Add `mobile_sync_locks(endpoint text primary key, locked_at timestamptz, locked_by uuid, idempotency_key text)`.
   - Add `idempotency_key text` + `manual boolean default false` columns on `mobile_sync_runs`; unique index `(endpoint, idempotency_key) where idempotency_key is not null`.
   - GRANT to `authenticated`/`service_role`; RLS: only super-admins can read.

2. **Server function `runSyncManually`**
   - Accept optional `idempotency_key` (auto-generated on client per click).
   - Short-circuit if a prior run with same `(endpoint, idempotency_key)` exists → return that result.
   - Acquire lock via `INSERT ... ON CONFLICT DO NOTHING`; if conflict AND `locked_at` newer than 60s → return `{ ok:false, error:"busy" }`.
   - Stale locks (>60s) auto-expire (delete then insert).
   - `try/finally` releases the lock; `logSyncRun` persists the `idempotency_key` + `manual:true`.

3. **UI**
   - `platform.mobile-sync-monitor.tsx`: generate `crypto.randomUUID()` per click, disable the button while `runNow.isPending`, surface `busy` toast distinctly from failures, show a "Locked" badge per endpoint when `mobile_sync_locks` has an active row (poll with overview).

---

# Track B — Phase 28: Mobile Field Ops Offline-First Shell (backend contract)

Goal: Give the external Flutter field-ops app a durable offline-first contract so technicians can complete tasks with no signal and reconcile cleanly. Web app stays untouched.

- **Migration `mobile_field_bundles`** — pre-computed per-user bundle (assigned tasks + recent incidents + reference lists) refreshed on demand; columns: `user_id`, `bundle jsonb`, `generated_at`, `expires_at`, `etag`.
- **`GET /api/public/v1/field/bundle`** (authenticated mobile bearer) — returns bundle + ETag; supports `If-None-Match` → 304.
- **`POST /api/public/v1/field/mutations`** — batch endpoint accepting an array of `{ client_id, kind, payload, occurred_at }`. Reuses `mobile_idempotency_keys` per `client_id`. Dispatches to existing `mobile-action-registry.server` handlers; returns per-item `{ client_id, status, server_id?, error? }`.
- **Super-admin page `platform.field-bundle-monitor`** — bundle size p50/p95, mutation success/failure per kind (24h), replay-latency histogram, per-user last-sync.
- **Field settings extension** — `bundle_ttl_minutes`, `bundle_max_incidents`, `bundle_max_tasks` (all customizable, no hardcode).
- **Sync-monitor integration** — wrap `/field/bundle` & `/field/mutations` with `withSyncLogging`.
- **Notifications** — mutation-batch failures for a user trigger a super-admin notification (rate-limited).

# Track C — Phase 29: Mobile Buyer Commerce Shell (backend contract)

Goal: Complete the Phase 27 PaymentIntent groundwork with the surface Flutter buyers need: cart, address book, saved payment methods, order history feed, and receipts.

- **Migrations**
  - `buyer_carts(id, buyer_id, items jsonb, currency, subtotal_cents, expires_at, updated_at)`; RLS: `auth.uid() = buyer_id`.
  - `buyer_addresses(id, buyer_id, label, recipient, phone, line1, line2, city, region, postal, country, is_default)`.
  - `buyer_saved_payment_methods(id, buyer_id, stripe_pm_id, brand, last4, exp_month, exp_year, is_default)` (never store PAN).
- **Server functions** (all `requireSupabaseAuth`)
  - `getCart` / `upsertCartItem` / `removeCartItem` / `clearCart` — merge validation against `grain_listings` availability and mobile commerce min/max.
  - `listAddresses` / `saveAddress` / `deleteAddress` / `setDefaultAddress`.
  - `listSavedPaymentMethods` / `detachPaymentMethod` / `createSetupIntent` (returns Stripe SetupIntent client_secret using existing `stripeFetch`).
  - `checkoutCart` — creates a `buyer_orders` row from the cart snapshot then reuses `createMobilePaymentIntent`.
- **Public read endpoint** `/api/public/v1/commerce/catalog` — publishable-key client, returns active listings via existing `mobile_marketplace_v` with paging + `since` cursor (delta sync).
- **Buyer summary view extension** — add `open_cart_items`, `saved_addresses_count`, `default_payment_last4` for the mobile home screen.
- **Super-admin page `platform.commerce-buyer-monitor`** — cart abandonment (carts with items & no order in N hours), PaymentIntent conversion funnel (created → succeeded), refunds volume, all filtered by date range from mobile commerce settings.
- **Sync-monitor** — wrap the two new public endpoints; add them to `SyncEndpoint` union and the sync monitor dashboard.

**Router + sidebar**: register `/platform/field-bundle-monitor` and `/platform/commerce-buyer-monitor` under super_admin; both get skeletons in `PAGE_SKELETONS`.

**No hardcoded values** — bundle TTLs, cart TTL, cart max items, order min/max cents, allowed payment methods all sourced from `mobile_field_settings` and `mobile_commerce_settings`.

**Order of execution**
1. Track A migration + code + UI wiring (fast; ~1 pass).
2. Phase 28 migration → server contracts → super-admin monitor.
3. Phase 29 migration → server contracts → super-admin monitor.
4. Sidebar + router registrations, typecheck, done.
