# Phase 11 — Buyer marketplace, invoicing & payment lifecycle

Phases 1–10 covered platform hardening, telemetry, actuators, silo cockpit, batches, and automation. Phase 11 closes the **revenue loop for the tenant**: turn `ready` grain batches into buyer-facing listings, orders, invoices, and tracked payments. This is the "outbound" side of Grain Hero: everything after the grain leaves the silo.

## Goals

1. Every silo batch that reaches `ready` state is one click away from being listed to buyers.
2. Buyers can be invited, browse a tenant-scoped catalog, place a reservation, and pay.
3. Invoices generate deterministically from reservations; PDF + email dispatch via existing notify + Resend.
4. Payments (Stripe + manual bank/cash) update invoice status, unlock batch `dispatched → sold` transitions, and feed the Financials dashboard already built in earlier phases.
5. Manager gets a **Sales cockpit** page mirroring Phase 10's Silo cockpit style (KPIs, table, drawers).

## Data model

Additive migration:

- `grain_listings` — `batch_id` (unique), `admin_id`, `title`, `price_per_kg`, `available_kg`, `min_order_kg`, `visibility` (`private|buyer_network|public`), `status` (`draft|active|paused|sold_out|archived`), `expires_at`.
- `buyer_orders` — `admin_id`, `buyer_id`, `listing_id`, `quantity_kg`, `unit_price`, `subtotal`, `status` (`pending|confirmed|invoiced|paid|dispatched|completed|cancelled|refunded`), `expected_delivery_date`, `notes`.
- `buyer_order_events` — audit trail (`from_state`, `to_state`, `actor_user_id`, `note`).
- Extend existing `buyer_invoices`: add `order_id` (FK), `pdf_url`, `stripe_payment_intent_id`, `paid_via` (`stripe|bank|cash|adjustment`).
- Extend existing `buyer_payments`: add `invoice_id` FK if missing, `receipt_url`.
- Enable Realtime on `grain_listings`, `buyer_orders`, `buyer_invoices`.
- RLS: tenant scoped by `admin_id`; buyers see their own orders/invoices via `buyer_id` mapping already in `buyers`.

Every new table follows the required `CREATE → GRANT → RLS → POLICY` order with `authenticated` + `service_role` grants (no `anon`).

## Server functions (`src/lib/`)

- `listings.functions.ts` — `createListingFromBatch`, `updateListing`, `pauseListing`, `archiveListing`, `listListings` (tenant + buyer views), `getListingPublic`.
- `buyer-orders.functions.ts` — `placeOrder` (buyer role), `confirmOrder` / `cancelOrder` / `markDispatched` / `markCompleted` (tenant), `listOrders`, `getOrder`. State machine mirrors Phase 10 (`ALLOWED` map + `buyer_order_events` insert + `logActivity`).
- `invoicing.functions.ts` — `generateInvoiceForOrder` (idempotent by `order_id`), `sendInvoiceEmail` (Resend via existing `dispatchNotification`), `renderInvoicePdf` (server-side PDF via existing pdf util already used in Financials).
- `buyer-payments.functions.ts` — `recordManualPayment`, `createStripeCheckout`, and webhook-driven `applyStripePayment` extension to the existing Stripe webhook route (idempotent via `stripe_events`).
- Cross-links: on `buyer_orders` → `paid` transition, allow the matching `grain_batches` transition `ready → dispatched → sold` via Phase 10's `transitionBatch`, gated by an internal helper (not exposed as a public server fn).

## UI

- `src/routes/_authenticated/sales.tsx` — Manager sales cockpit: KPI tiles (open orders, invoiced, paid this month, overdue), split table (Orders | Invoices | Payments) using `AdminDataCard` shell, drawers for status changes.
- `src/routes/_authenticated/listings.tsx` — Listings CRUD, "Publish from ready batch" quick action showing eligible `ready` batches with their `quality_snapshot`.
- `src/routes/_authenticated/buyers.$buyerId.tsx` — Buyer profile with order/invoice/payment history (mirrors `admins.$adminId.tsx` layout).
- `src/routes/_authenticated/orders.$orderId.tsx` — Order detail: line items, event timeline (reuses `BatchLifecycleActions` timeline pattern), invoice download, payment history.
- Buyer-facing (existing buyer role): `src/routes/_authenticated/marketplace.tsx` + `marketplace.$listingId.tsx` — catalog + reservation flow scoped to buyers the tenant has invited.
- Skeletons registered in `src/router.tsx`: `SalesSkeleton`, `ListingsSkeleton`, `MarketplaceSkeleton`, `OrderDetailSkeleton` — each mirroring its page shell (max-w-7xl, tile row, table).
- Sidebar: add **Sales** (manager+) and **Marketplace** (buyer role) using the existing role-aware nav.

## Notifications & realtime

- New order → notify admin + manager (`ops`, `info`).
- Invoice sent → notify buyer (`billing`, `info`) via email + in-app.
- Payment received → notify manager + buyer.
- Overdue invoice cron sweep: reuse `/api/public/cron/heartbeat-sweep` pattern — new route `/api/public/cron/invoice-sweep` marks overdue and emits notifications.
- Realtime channels on `buyer_orders` and `buyer_invoices` invalidate `sales`, `orders`, `buyers.*` queries.

## Plan gating

Extend `plan-gate.ts` with:
- `max_active_listings`
- `max_monthly_orders`
Enforced in `createListingFromBatch` and `placeOrder`.

## Out of scope for Phase 11

- Shipping/logistics tracking (Phase 12: dispatch & delivery).
- ML price recommendation (Phase 13: analytics & predictions polish).
- Multi-currency (single tenant currency from `platform_settings`).

## Acceptance criteria

- Creating a listing from a `ready` batch requires zero re-entry of grain data.
- Placing an order → invoice generated → payment recorded → batch auto-transitions to `sold` with full audit trail in both `buyer_order_events` and `grain_batch_events`.
- Financials dashboard (built in earlier phase) shows the new revenue without code changes (reads `subscriptions` + `buyer_invoices`).
- All state changes appear in unified `activity_logs`.
- Every new page uses the emerald/slate `AdminPageShell` + registered skeleton.

Reply **go** to start Phase 11.
