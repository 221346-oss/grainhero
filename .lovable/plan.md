# Phase 17 — Logistics Orchestration, Carrier Integrations & Route Optimization

## Why now
Phases 13–16 covered dispatch tracking, disputes, refunds, messaging, returns, and quality. What's still missing is the **operational spine that plans the dispatch itself**: who drives, which vehicle, which route, how much fuel, and how carrier tracking events flow back automatically instead of being typed by the seller. Phase 17 turns dispatch from a manual log into a coordinated logistics workflow — while staying fully super-admin-configurable (no hardcoded carriers, vehicle types, or SLA rules).

## Goals
1. Model **carriers, vehicles, and drivers** as first-class, super-admin-managed entities.
2. Let sellers **assign a carrier + driver + vehicle** to a shipment and auto-generate expected pickup / delivery windows from marketplace settings.
3. **Auto-ingest tracking events** from external carriers (webhook + polling fallback) and merge them into the existing shipment timeline.
4. Provide **route optimization** for multi-stop dispatches (nearest-neighbour + distance matrix) with a map preview.
5. Add a **logistics cost ledger** (fuel, driver payout, tolls) that feeds the financials dashboard and profit calc.
6. Give super-admins a **Logistics Command Center** with fleet utilization, on-time %, and cost-per-kg analytics.

## Data model (new tables)

```text
carriers                    (super-admin managed catalog)
  ├─ code, name, type (in_house | third_party)
  ├─ webhook_secret, tracking_url_template
  └─ contact_email, contact_phone, active

vehicles
  ├─ carrier_id → carriers
  ├─ registration_no, type (truck|van|pickup), capacity_kg
  ├─ fuel_type, avg_kmpl, active
  └─ current_status (idle|assigned|in_transit|maintenance)

drivers
  ├─ carrier_id → carriers
  ├─ profile_id (nullable — optional link to app user)
  ├─ full_name, phone, license_no, license_expiry
  └─ active, rating (denormalized)

shipment_assignments
  ├─ shipment_id → buyer_shipments (1-1)
  ├─ carrier_id, vehicle_id, driver_id
  ├─ planned_pickup_at, planned_delivery_at
  ├─ actual_pickup_at, actual_delivery_at
  ├─ distance_km, route_polyline (text)
  └─ status, assigned_by, assigned_at

shipment_route_stops        (multi-stop support)
  ├─ assignment_id, sequence
  ├─ stop_type (pickup|dropoff|waypoint)
  ├─ address, lat, lng
  └─ eta, arrived_at, departed_at

logistics_cost_entries
  ├─ assignment_id, category (fuel|driver_payout|toll|misc)
  ├─ amount, currency, incurred_at
  └─ recorded_by, receipt_url

carrier_tracking_events     (raw carrier payloads)
  ├─ shipment_id, carrier_id
  ├─ external_event_id (unique per carrier)
  ├─ event_code, event_label, occurred_at
  └─ raw_payload jsonb, mapped_status
```

All tables: RLS on, GRANTs to `authenticated` + `service_role`, updated_at triggers.

## Super-admin settings (extend marketplace_settings JSON)

```text
logistics: {
  carriers_enabled: true,
  default_pickup_window_hours: 24,
  default_delivery_window_hours: 72,
  fuel_cost_per_litre: 285,
  driver_payout_per_km: 12,
  route_optimizer: "nearest_neighbour" | "off",
  distance_provider: "haversine" | "osrm",
  osrm_base_url: "",
  polling_interval_minutes: 15,
  auto_close_after_delivery_hours: 48
}
```

## Server functions (`src/lib/logistics.functions.ts`)
- `listCarriers`, `upsertCarrier`, `deactivateCarrier` (super-admin only)
- `listVehicles`, `upsertVehicle`, `listDrivers`, `upsertDriver`
- `assignShipment({shipmentId, carrierId, vehicleId, driverId, stops[]})`
  - validates capacity, driver license expiry, active flags
  - computes distance via haversine or OSRM (settings driven)
  - writes `shipment_assignments` + `shipment_route_stops`
  - appends a `buyer_shipment_events` row ("Carrier assigned")
- `optimizeRoute({assignmentId})` → nearest-neighbour reordering of stops
- `recordLogisticsCost({assignmentId, category, amount, receiptFile})`
- `getFleetUtilization({from,to})`, `getOnTimeStats`, `getCostPerKg`

## Public endpoints (external, signed)
- `POST /api/public/carrier-webhook/$carrierCode`
  - HMAC verify against `carriers.webhook_secret`
  - upsert `carrier_tracking_events` (dedupe on `external_event_id`)
  - map `event_code` → shipment status via a super-admin mapping table field on `carriers.event_map` (JSONB)
  - append normalized `buyer_shipment_events` row (actor = "carrier:<code>")
- Cron `GET /api/public/cron/carrier-poll` (hourly)
  - for carriers without webhooks, poll `tracking_url_template` and reconcile

## UI

### Seller side
- **Dispatch drawer** gains a "Logistics" tab: pick carrier → vehicle → driver → auto-suggest pickup/delivery windows → optional multi-stop editor with drag-to-reorder + "Optimize route" button → live map preview (Leaflet via `<ClientOnly>` + dynamic import) → cost estimate.
- Cost ledger: add fuel/tolls with receipt upload after delivery.

### Super-admin
- `/platform/logistics/carriers` — CRUD carriers, webhook secret rotation, event-map JSON editor with schema hints.
- `/platform/logistics/fleet` — vehicles + drivers tabs, utilization sparklines, license-expiry warnings.
- `/platform/logistics/command-center` — KPIs (on-time %, avg cost/kg, active shipments), map of live shipments, filters by carrier/date/silo.
- `marketplace-settings` gets a "Logistics" section for the JSON knobs above.

### Buyer side
- Order tracking page shows carrier logo, driver first name, vehicle reg (masked last 3 chars), external tracking URL when available, and the merged timeline.

## Notifications
Reuse existing `dispatchNotification`. New templates (all editable in marketplace settings):
- `logistics.carrier_assigned` (buyer + seller)
- `logistics.eta_updated` (buyer)
- `logistics.delivery_delayed` (buyer + super-admin, triggered when now > planned_delivery_at and status ≠ delivered)

## Financials integration
- `financials.functions.ts` extended: subtract `logistics_cost_entries.amount` from gross when computing per-order profit.
- New "Logistics costs" line item on the financial PDF report.

## Cron / automation
- `carrier-poll` — hourly
- `delivery-delay-scan` — every 30 min, fires the delayed notification once per shipment
- `driver-license-expiry-scan` — daily, notifies super-admin 14/7/1 days before expiry

## Zero-hardcoding checklist
- Carrier list, event-code mappings, cost rates, polling interval, optimizer choice, distance provider, notification templates → all in `marketplace_settings` or per-carrier rows.
- No literal carrier names or vehicle types anywhere in components.

## Rollout order in this phase
1. Migration (all tables + settings extension + storage bucket `logistics-receipts`).
2. `logistics.functions.ts` + carrier webhook route + cron routes.
3. Super-admin carriers/fleet/settings UI.
4. Seller dispatch-drawer logistics tab + map + optimizer.
5. Buyer tracking enhancements + notification templates.
6. Command Center analytics + financials integration.

Reply **go** to execute Phase 17.
