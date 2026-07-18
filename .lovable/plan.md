# Phase 30 — End-to-End Integration Tests

**Goal:** Lock the mobile API surface (field + commerce + sync-monitor) with automated tests that hit the real running server and real Supabase project, so regressions surface before publish.

**Test runner:** Vitest (already in project) driving `fetch()` against the local dev server at `http://localhost:8080`. Tests provision & clean their own fixtures via `supabaseAdmin`.

## What gets covered

1. **Test harness** — `tests/integration/_setup.ts`
   - Boot check: waits for `/` to respond before running.
   - `mintUser(role)`: creates an `auth.users` row + `user_roles` row via admin client, returns `{ userId, accessToken }` from `signInWithPassword`.
   - `cleanup(userIds)`: removes rows in reverse dependency order.
   - `authHeaders(token)`: returns `{ Authorization: Bearer <token>, "x-app-build": "999999" }`.

2. **Field bundle** — `tests/integration/field-bundle.test.ts`
   - GET returns `{ tasks, incidents }` + ETag; second GET with `If-None-Match` returns 304.
   - After POST `/field/mutations` with a new incident, cached bundle is invalidated (next GET has `cached: false` and includes the new row).
   - Unauthenticated request → 401.
   - Client below `min_build` → 426 with `min_build`/`latest_build`.

3. **Field mutations** — same file
   - Batch with mixed kinds returns per-item results (ok / error for unknown kind).
   - Replaying the same `client_id` returns `status: "deduped"` with the prior result.
   - Batch of size > 50 → 400.

4. **Commerce cart** — `tests/integration/commerce-cart.test.ts`
   - PUT computes `subtotal_cents = Σ round(qty * unit_price_cents)`; returns `warnings.below_min` / `above_max` from settings.
   - GET after PUT returns the same cart; DELETE clears it.
   - `checkout_disabled` in settings → PUT returns 403.

5. **Commerce addresses** — `tests/integration/commerce-addresses.test.ts`
   - POST creates; setting `is_default: true` clears the flag on siblings.
   - DELETE by id scoped to buyer_id; wrong owner cannot delete (RLS).

6. **Sync monitor concurrency** — `tests/integration/sync-monitor.test.ts`
   - Two parallel `runSyncManually({ endpoint })` calls: one succeeds, one returns `{ error: "busy" }`.
   - Same `idempotency_key` replayed returns `{ deduped: true }` with prior status.
   - `listActiveSyncLocks` reflects an in-flight run and clears after completion.
   - Non-super-admin caller → `Forbidden`.

## Wiring

- `package.json` scripts:
  - `"test:integration": "vitest run tests/integration --reporter=verbose"`
- `vitest.config.ts` gets an `integration` project include so unit runs stay fast.
- `.env.test.local` (git-ignored) documents required vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `APP_BASE_URL` (default `http://localhost:8080`). Real values already exist in the sandbox env.
- Tests skip themselves (`test.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)`) when secrets aren't loaded, so the standard build/typecheck runs stay green in preview.

## Files added

- `tests/integration/_setup.ts`
- `tests/integration/field-bundle.test.ts`
- `tests/integration/commerce-cart.test.ts`
- `tests/integration/commerce-addresses.test.ts`
- `tests/integration/sync-monitor.test.ts`
- `vitest.config.ts` — add `integration` test include (keep existing config).
- `package.json` — add `test:integration` script.

---

# Phase 31 — Mobile Buyer Checkout & Order History

**Goal:** Turn the cart/address/PM foundations from Phase 27/29 into a full mobile checkout flow with server-side order creation, Stripe confirmation, and read-only order history — all driven by super-admin settings (no hardcoded currency, tax, or shipping).

## Server surface (all `requireSupabaseAuth` for app / bearer-authed for mobile)

1. **Quote calculator** — `src/lib/mobile-checkout.functions.ts`
   - `quoteCheckout({ cart_id?, address_id })`
     - Loads cart, address, `mobile_commerce_settings`, and per-listing `tax_rules` / `logistics_cost_entries` defaults.
     - Returns `{ subtotal_cents, tax_cents, shipping_cents, total_cents, currency, breakdown[] }`.
     - All rates come from `platform_settings.commerce` — nothing hardcoded.

2. **Order placement** — server route `POST /api/public/v1/commerce/checkout`
   - Body: `{ cart_id, address_id, payment_method_id?, idempotency_key }`.
   - Re-quotes server-side, creates `buyer_orders` row (`payment_channel: "mobile"`, status `pending_payment`), then creates a Stripe PaymentIntent via `createMobilePaymentIntent` and returns `{ order_id, client_secret, total_cents }`.
   - Idempotency key stored in `mobile_idempotency_keys`.

3. **Order confirmation hook** — extends existing `payment_intent.succeeded` webhook to:
   - Clear the buyer's cart, insert `buyer_order_events` (`payment_succeeded`, `order_confirmed`), send confirmation email.

4. **Order history** — `GET /api/public/v1/commerce/orders?since=&limit=`
   - Returns paginated `buyer_orders` for the authenticated buyer with computed status + last event; supports delta sync via `since`.

5. **Order detail** — `GET /api/public/v1/commerce/orders/:id`
   - Returns order + timeline (`buyer_order_events`, `buyer_shipment_events`), invoice URL if present.

## Super-admin surface

- Extend `platform.commerce-mobile.tsx` with a **Checkout Rules** card exposing:
  - Default tax rate (fallback when no rule matches).
  - Default shipping cost tiers by weight.
  - Auto-confirm vs manual-review threshold.
  - Cancellation window in hours.
- Every change flows through `recordSettingsAudit`.

## Tests (extend Phase 30 harness)

- `commerce-checkout.test.ts`
  - Quote returns tax + shipping from settings; changing settings changes quote.
  - Checkout with idempotency key called twice returns the same `order_id`.
  - PaymentIntent-succeeded webhook clears cart and emits `order_confirmed` event.
  - Orders list respects `since` (delta sync).

## Files added / edited

- `src/lib/mobile-checkout.functions.ts` (new)
- `src/routes/api/public/v1/commerce/checkout.ts` (new)
- `src/routes/api/public/v1/commerce/orders.ts` (new)
- `src/routes/api/public/v1/commerce/orders.$id.ts` (new)
- `src/routes/api/public/webhooks/stripe.ts` (extend PI handler)
- `src/routes/_authenticated/platform.commerce-mobile.tsx` (extend UI)
- `src/lib/mobile-commerce-settings.functions.ts` (extend schema for checkout rules)
- Supabase migration: add `checkout_rules` JSONB to `mobile_commerce_settings` if not present; ensure `buyer_orders.payment_channel` accepts `"mobile"`.
- `tests/integration/commerce-checkout.test.ts` (new)

## Non-goals

- No native SDK code — the Flutter app consumes these HTTP endpoints.
- No new marketplace UI on the web app (buyer web checkout already exists via Stripe Checkout in earlier phases).
- No Apple Pay / Google Pay wiring here — deferred to the mobile-side release.

## Order of execution

1. Phase 30 harness + 4 test files, verify against running preview.
2. Migration for checkout_rules + payment_channel enum tweak.
3. Server functions & routes for quote/checkout/orders.
4. Webhook extension + settings UI.
5. Phase 31 test file.
