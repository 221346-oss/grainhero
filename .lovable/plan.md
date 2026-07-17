# Phase 12 — Buyer Marketplace Portal & Stripe Checkout

Ship the buyer-facing side of the sales loop introduced in Phase 11: a public marketplace where buyers browse `published` grain listings, self-serve orders, pay via Stripe Checkout, and track fulfillment. Sellers (Admin/Manager) get automated status flips as payments and dispatch events arrive.

## Goals

1. Public marketplace surface (browse + detail) that respects listing `visibility` and stock.
2. Authenticated buyer accounts (new `buyer` role) with an "My Orders" cockpit.
3. Stripe Checkout for buyer orders — one-off `mode: payment`, seamless (already enabled).
4. Webhook-driven state machine: `pending → confirmed → paid → dispatched → completed`.
5. Seller-side notifications + activity log entries on every buyer transition.
6. Downloadable invoice PDF from the buyer portal.

## Scope

### Data model (single migration)

- Extend `app_role` enum: add `'buyer'`.
- `buyer_accounts` table: `id`, `user_id (auth.users)`, `buyer_id (buyers.id)`, `company_name`, `contact_phone`, `default_shipping_address jsonb`, timestamps. Links a Supabase auth user to the existing `buyers` record.
- Extend `buyer_orders`:
  - `stripe_session_id text`, `stripe_payment_intent text`, `checkout_url text`, `paid_at timestamptz`, `dispatched_at timestamptz`, `completed_at timestamptz`, `buyer_account_id uuid`, `shipping_address jsonb`, `channel text default 'portal'` (portal | manual).
- Extend `grain_listings`: `slug text unique`, `cover_image_url text`, `min_order_kg numeric`, `available_from date`.
- New `buyer_notifications` view (or reuse `notifications` with `audience='buyer'`).
- RLS:
  - Public (anon): `SELECT` on `grain_listings` where `visibility='public' AND listing_status='published'` — projected columns only via a security-definer view `public_listings_v`.
  - `buyer`: `SELECT/INSERT` on their own `buyer_orders`, `SELECT` on their `buyer_invoices` and `buyer_payments`.
  - Grants: `authenticated` + `service_role` on new tables; `anon` on the `public_listings_v` view only.

### Server functions (`src/lib/`)

- `marketplace.functions.ts`
  - `listPublicListings({ commodity?, minKg?, maxPricePerKg?, region? })` — public read via server publishable client.
  - `getPublicListing({ slug })` — detail + seller display name + warehouse city.
- `buyer-portal.functions.ts` (auth: `requireSupabaseAuth`, role `buyer`)
  - `createBuyerOrder({ listingId, quantityKg, shippingAddress })` — validates stock, creates `pending` order + audit event.
  - `listMyOrders`, `getMyOrder`, `cancelMyOrder` (only while `pending`).
  - `downloadMyInvoice({ invoiceId })` — reuses Phase 11 PDF generator.
- `buyer-checkout.functions.ts`
  - `startBuyerCheckout({ orderId })` — creates Stripe Checkout Session (`mode: payment`, line item from order), stores `stripe_session_id` + `checkout_url`, returns URL.
- `src/routes/api/public/stripe/buyer-webhook.ts`
  - Verifies signature with `STRIPE_WEBHOOK_SECRET`.
  - Handles `checkout.session.completed` → transition order to `paid`, mark invoice paid, insert `buyer_payments`, emit seller notification + activity log.
  - Idempotent via `stripe_events`.
- Extend `buyer-orders.functions.ts` (Phase 11) with `markDispatched({ orderId, courier, tracking })` and `markCompleted` → notifies buyer via `dispatchNotification` (email/SMS from Phase 7).

### Routes (frontend)

- `src/routes/marketplace/index.tsx` — public grid of listings (SSR-friendly, uses public loader). Filters: commodity, price, region.
- `src/routes/marketplace/$slug.tsx` — public detail page with cover, price, warehouse city, "Order now" CTA (redirects unauthenticated buyers to `/auth?role=buyer`).
- `src/routes/_authenticated/buyer/orders.tsx` — buyer cockpit: order list, status chips, pay/cancel/download-invoice actions.
- `src/routes/_authenticated/buyer/orders.$orderId.tsx` — detail + timeline of `buyer_order_events`.
- Admin/Manager side: extend existing `/sales` order drawer with "Dispatch" + "Complete" actions and show Stripe payment metadata.

### Auth

- Signup flow: `role=buyer` query param on `/auth` creates a `buyer_accounts` row post-signup (trigger or server fn on first login).
- Sidebar: buyer-only nav ("Marketplace", "My Orders", "Invoices").

### Notifications & activity

- Emit `notifications` on: order created (seller), payment received (seller + buyer), dispatched (buyer), completed (both).
- Log each transition into `activity_logs` with `entity='buyer_order'`.

### Skeletons & UI

- Register skeletons in `src/router.tsx`: `MarketplaceSkeleton`, `MarketplaceDetailSkeleton`, `BuyerOrdersSkeleton`.
- Reuse `AdminPageShell`/`AdminDataCard` for buyer cockpit to stay on-theme; marketplace uses a lighter public shell (no sidebar).

## Out of scope (later phases)

- Escrow, split payouts, marketplace fees (Phase 13 candidates).
- Buyer↔seller in-app chat (Phase 14 candidate).
- Automated logistics/shipping label generation.

## Deliverables checklist

- [ ] Migration: `buyer` role, `buyer_accounts`, extended `buyer_orders`/`grain_listings`, RLS, grants, `public_listings_v` view.
- [ ] Server functions: marketplace, buyer-portal, buyer-checkout, Stripe webhook route.
- [ ] Routes: public marketplace (list + detail), buyer cockpit (list + detail), updated seller drawer.
- [ ] Sidebar + role gating updated.
- [ ] Skeletons registered for new routes.
- [ ] Stripe webhook secret already configured (`STRIPE_WEBHOOK_SECRET` present) — wire endpoint URL after deploy.
- [ ] Build passes; manual smoke via Playwright: browse → order → checkout (test mode) → webhook → paid.

Reply **go** to execute Phase 12.
