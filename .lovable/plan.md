# Phase 31 — Mobile Checkout & Order History

Phase 30 (integration test harness) is done — 15/15 green covering field bundle, commerce cart, addresses, and sync-monitor concurrency primitives. Moving to Phase 31.

## Goals
Turn the mobile cart into placed, paid, and trackable orders that Flutter can list and open, entirely driven by super-admin settings (no hardcoded fees, currencies, or thresholds).

## Deliverables

### 1. Quote endpoint
`POST /api/public/v1/commerce/quote` — bearer required
- Validates cart items against `grain_listings` (price, availability).
- Applies `mobile_commerce_settings` (platform fee %, min order, currency).
- Applies `tax_rules` for the address's country/region if `address_id` given.
- Returns `{ subtotal_cents, tax_cents, platform_fee_cents, total_cents, currency, warnings[] }`. No DB writes.

### 2. Checkout endpoint
`POST /api/public/v1/commerce/checkout` — bearer required
- Body: `{ address_id, payment_method: "card" | "cod", idempotency_key }`.
- Re-runs quote server-side (never trusts client totals).
- Creates one `buyer_orders` row + line snapshot in `buyer_order_events`.
- If `card`: creates a Stripe PaymentIntent, stores it in `buyer_payment_intents`, returns `client_secret`.
- If `cod` (only when `mobile_commerce_settings.cod_enabled`): marks order `pending_confirmation`.
- Idempotent by `idempotency_key` via `mobile_idempotency_keys`.
- Clears `buyer_carts` on success.

### 3. Order history + detail
- `GET /api/public/v1/commerce/orders?cursor=&limit=` — paginated list for the caller.
- `GET /api/public/v1/commerce/orders/$orderId` — order + shipment events + latest invoice URL.
- Both scoped to `buyer_id = ctx.userId` by RLS.

### 4. Webhook wiring
Extend `src/routes/api/public/webhooks/stripe.ts` — the `payment_intent.succeeded` / `payment_failed` branch already exists for mobile intents; ensure it also:
- Writes a `buyer_order_events` row (`payment_succeeded` / `payment_failed`).
- Enqueues a notification via existing notification pipeline.

### 5. Super-admin controls (no hardcoding)
Extend `mobile_commerce_settings` with:
- `platform_fee_bps` (basis points), `min_order_cents`, `cod_enabled`, `cod_max_cents`, `default_currency`, `quote_ttl_seconds`.
Add fields to the existing Mobile Commerce settings page — same file, no new route.

### 6. Integration tests (Phase 30 harness)
`tests/integration/commerce-checkout.test.ts`:
- Quote returns totals matching settings.
- Checkout rejects when totals mismatch or address missing.
- Idempotency: same key returns the same order.
- COD blocked when `cod_enabled=false`.
- History lists only the caller's orders.

## Non-goals
- No shipping-rate provider yet (flat rate from settings only).
- No new mobile UI (Flutter side); we only expose the HTTP surface.
- No refund flow changes (Phase 14 already covers).

## Files
- **New:** `src/lib/mobile-checkout.functions.ts` (quote + helpers, server-only), `src/routes/api/public/v1/commerce/quote.ts`, `.../checkout.ts`, `.../orders.ts`, `.../orders.$orderId.ts`, `tests/integration/commerce-checkout.test.ts`.
- **Edit:** `src/routes/api/public/webhooks/stripe.ts` (event + notification), `src/lib/mobile-commerce-settings.functions.ts` + migration to add new columns, `src/routes/_authenticated/platform.mobile-commerce.tsx` (surface new fields).

## Migration
One migration: `ALTER TABLE public.mobile_commerce_settings ADD COLUMN` for the six settings above with sensible defaults. No new tables.
