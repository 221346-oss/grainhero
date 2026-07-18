# Phases 25 & 26 — Mobile Surface Contracts

Both phases add server APIs, super-admin config, and web-side parity for the
external Flutter app. No mobile UI is built here — Flutter consumes the
contracts.

---

## Phase 25 — Field Ops Mobile Surface (technician + manager)

Goal: give the Flutter app everything a technician or on-site manager needs
to run installs, silo checks, actuator overrides, and incident intake from
the field — offline-tolerant, deep-linkable, admin-configurable.

### 25.1 Data & schema

- Migration `mobile_field_task_v` (view): unifies technician's queue —
hardware install steps + open grain alerts + overdue maintenance +
actuator attention items, keyed by `updated_at` cursor.
- Migration `mobile_field_settings` (table, singleton row) — super-admin
configurable: default sync page size, max attachment MB, allowed offline
hours, geofence enforcement toggle, required photo steps per install
event type (JSON), incident categories (JSON).
- Extend `mobile_action_registry` (server module) with:
`field.report-incident`, `field.upload-photo`, `field.override-actuator`,
`field.silo-inspection`, `field.geofence-checkin`.
- New table `field_incidents` (id, tenant_id, silo_id?, reporter_user_id,
category, severity, notes, attachments[], location_lat, location_lng,
status, created_at, resolved_at, resolved_by, resolution_notes) with RLS
by tenant + super-admin read-all, plus GRANTs.

### 25.2 Server endpoints (`/api/public/v1/field/*`)

- `GET /sync/field-tasks` — delta sync of `mobile_field_task_v`.
- `GET /sync/incidents` — my/tenant incidents, cursor by `updated_at`.
- `POST /field/incidents` — idempotent create (uses `mobile_idempotency_keys`).
- `POST /field/incidents/:id/resolve` — manager/tech scoped by RLS.
- `POST /field/silo-inspection` — writes `grain_batch_events` +
auto-creates alert if thresholds exceeded (reuses existing alert logic).
- `POST /field/actuator-override` — thin wrapper around
`actuators.functions.ts` command dispatch with reason field, subject to
role check and settings toggle.
- All routes: `authenticateMobile` + idempotency + zod input + audit log
entry in `activity_logs`.

### 25.3 Field settings (super-admin)

- `src/lib/field-settings.functions.ts` — `getFieldSettings`,
`updateFieldSettings` (super-admin gate; publishes to
`mobile_field_settings`; snapshot mirrored into `mobile_settings` cache).
- `/platform/field-settings` page — Attachment limits, required-photo
rules, incident categories, geofence toggle, actuator override policy.

### 25.4 Web parity + moderation

- `/platform/field-incidents` — Super-admin queue: filters (silo, severity,
status), reassign, resolve, export CSV.
- `/incidents` (existing) gains a "Field-reported" filter tab and pulls
from `field_incidents` in addition to legacy incidents.
- Notification categories: `field.incident.new`, `field.override.executed`
wired through `dispatchNotification` (email/push based on prefs).

### 25.5 Skeletons + sidebar

- `FieldIncidentsSkeleton`, `FieldSettingsSkeleton` in `skeletons.tsx`,
registered in `PAGE_SKELETONS`.
- Sidebar (super_admin): Field Incidents, Field Settings.

---

## Phase 26 — Marketplace Mobile Surface (buyer + seller)

Goal: expose the storefront, buyer order lifecycle, seller listing
management, messaging, and dispute intake to the Flutter app with the
same server rules as the web experience — nothing hardcoded, all
customization goes through super-admin.

### 26.1 Data & schema

- Migration `mobile_marketplace_v` (view): public listing feed (id, slug,
seller, commodity, grade, price, min qty, hero image, badges,
reputation snapshot, updated_at) — reads honor existing
`grain_listings` public RLS; no PII.
- Migration `mobile_marketplace_settings` (table, singleton): super-admin
configurable — featured category order, hero copy, min mobile app
version, disabled-flag, moderation banners.
- `mobile_buyer_summary_v` view: buyer's active orders, unread messages,
pending disputes, invoice status — keyed by buyer_user_id.
- Extend `mobile_action_registry` with:
`market.favorite-listing`, `market.unfavorite`,
`market.checkout-intent`, `market.confirm-delivery`,
`market.open-dispute`, `market.send-message`,
`seller.publish-listing`, `seller.pause-listing`,
`seller.mark-dispatched`.

### 26.2 Server endpoints (`/api/public/v1/market/*`)

- `GET /market/listings` — cursor + filters (commodity, min_price,
max_distance, grade) — anonymous allowed (no auth), rate-limited via
IP header count in `mobile_settings`.
- `GET /market/listings/:slug` — full listing detail + seller reputation
snapshot + recent reviews (anonymous ok).
- `GET /sync/buyer-orders` (auth) — delta sync of buyer's orders.
- `GET /sync/seller-orders` (auth) — delta sync of seller's orders.
- `POST /market/checkout-intent` — returns Stripe Checkout URL from
existing `buyer-checkout.functions.ts` logic; idempotent.
- `POST /market/messages` — thin wrapper around `messaging.functions.ts`
with moderation flag check.
- `POST /market/disputes` — thin wrapper around `disputes.functions.ts`,
supports pre-signed attachment references.
- `POST /seller/listings/:id/publish|pause` — wraps existing seller
actions with idempotency.

### 26.3 Marketplace mobile settings (super-admin)

- `src/lib/marketplace-mobile-settings.functions.ts` — get/update.
- `/platform/marketplace-mobile` page: feed ordering, featured categories,
hero copy per language, min build, kill-switch banner, allowed
attachment types, max message length.

### 26.4 Web parity

- Existing `/marketplace` public storefront: add feed order + hero banner
driven by `mobile_marketplace_settings` so web + mobile share the
configuration.
- `/platform/marketplace-mobile-analytics` — small tile page: mobile
listing views (from ip-audit log), mobile checkouts, mobile-originated
disputes vs. web (source column added to `buyer_orders.source`).

### 26.5 Notifications & deep links

- Seed `mobile_deep_link_routes`: `market.listing`, `market.order`,
`market.message`, `market.dispute`, `seller.listing`, `seller.order`,
`field.incident`, `field.task`. Each row has native route + web
fallback so `/api/public/v1/deeplink/:key` resolves both.
- Add `field.*` and `market.*` categories to
`notification_channel_prefs.categories` default JSON so users can
toggle per-channel granularly.

### 26.6 Skeletons + sidebar

- `MarketplaceMobileSkeleton`, `MarketplaceMobileAnalyticsSkeleton` in
`skeletons.tsx`; registered in `PAGE_SKELETONS`.
- Sidebar (super_admin): Marketplace Mobile, Marketplace Mobile Analytics.

---

## Delivery order

1. **Phase 25 migration** (view + settings table + `field_incidents` +
  GRANTs/RLS).
2. **Phase 26 migration** (views + settings + `buyer_orders.source`
  column + deep-link seed).
3. Server endpoints for Phase 25 + registry entries.
4. Server endpoints for Phase 26 + registry entries.
5. `field-settings.functions.ts`, `marketplace-mobile-settings.functions.ts`.
6. Super-admin pages: `/platform/field-settings`,
  `/platform/field-incidents`, `/platform/marketplace-mobile`,
   `/platform/marketplace-mobile-analytics`.
7. Skeletons + `router.tsx` map + sidebar entries.
8. Web-side pulls of `field_incidents` into `/incidents`, and
  marketplace hero/feed order into `/marketplace`.

## Non-goals (explicit)

- No Flutter code. No native project scaffolding.
- No new payment providers. Stripe reused as-is.
- No changes to auth model — reuses `authenticateMobile`.
- No hardcoded copy — every user-visible string in these surfaces reads
from a settings table owned by super-admin.  
  


## Ready to implement on approval.