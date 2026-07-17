# Plan: Admin Profiles, Financial Dashboard & IoT Install Tracking

Three self-contained feature blocks. All UI theme-aware (light/dark), aligned with existing PageHeader / StatBox conventions.

---

## 1. Super-Admin → Admin Profile Page

**New route:** `/_authenticated/admins/$adminId.tsx` (linked from existing admin list rows).

**Layout** (image 3 style):
- Header card: avatar initials, name, email, phone, "Active/Suspended" pill, `Edit Profile` and kebab menu (Impersonate / Suspend / Reactivate).
- KPI row: Last Login · Total Revenue · Silos · Warehouses · Batches · Open Alerts.
- Two-column: Contact & Address card (editable inline) + Order Frequency bar chart (last 6 months of grain batches OR hardware orders — toggle).
- Recent Activity list (last 10 activity_logs entries).

**Server fns** (`src/lib/admin-profile.functions.ts`, `requireSupabaseAuth`, super_admin check):
- `getAdminProfile({ adminId })` — profile + role + aggregated stats
- `updateAdminContact({ adminId, patch })` — name/phone/address/notes
- `impersonateAdmin({ adminId })` — returns short-lived magic-link URL via `supabaseAdmin.auth.admin.generateLink`
- `setAdminSuspended({ adminId, suspended })` — writes `profiles.suspended` flag
- `getAdminOrderFrequency({ adminId, source })` — 6-month buckets

**DB:** add `profiles.suspended boolean default false`, `profiles.notes text`. No new tables.

---

## 2. Financial Dashboard (Revenue page upgrade)

Enhance existing `/_authenticated/revenue` (or add if missing).

**Widgets:**
- KPI tiles: Total Revenue · Subscription MRR · IoT Hardware Revenue · Insurance Commission · Gross Profit · Net Profit % (each with MoM delta, numbers colored — cards neutral).
- **P&L Summary card** — Sales, COGS, Gross Profit, Opex, Other Income, Net Profit, Net %.
- **Revenue mix donut** — Subscriptions / IoT Hardware / Insurance Commission / Other.
- **MRR trend line** — 12 months, plus churn %.
- **Sales split by plan** — Starter/Pro/Enterprise horizontal bars.
- **Reports section** — "Export PDF" buttons for: Monthly P&L, Revenue Breakdown, MRR Report. Generated server-side via a lightweight PDF (pdf-lib) server route `/api/reports/[type].pdf` gated to super_admin.

**Data sources** (existing tables):
- `subscriptions` (MRR, plan mix)
- `hardware_orders` (IoT revenue)
- `insurance_policies` — add `commission_rate numeric` and computed `commission_amount`
- `buyer_invoices` / `invoices` (sales)

**DB migration:**
- `insurance_policies.commission_rate numeric(5,2) default 0`
- optional `platform_settings` rows for default commission rate & COGS overrides

**Server fns** (`src/lib/financials.functions.ts`): `getFinancialSummary`, `getRevenueMix`, `getMrrTrend`, `getPlanSplit`, `generateReportPdf`.

---

## 3. IoT Installation Tracking (extends existing Orders page)

**Where:** existing `/_authenticated/orders` — add **"Installation"** tab per order row (drawer or `/orders/$orderId` detail).

**Fields super admin can add per hardware_order:**
- Installer: name, phone, photo URL, company
- Location: city, warehouse_id, silo_id, scheduled_visit_at, our_origin_address, customer_address (auto from tenant), lat/lng
- Devices: array of `{ serial, model, status: shipped|en_route|installed|verified }`
- Visit timeline: append-only notes with timestamp + optional photo

**Map component** (image 1 style):
- Mapbox GL JS (public token via connector) OR Google Maps if user prefers — we'll use Mapbox.
- Shows origin marker (our warehouse) → destination marker (customer address) → directions polyline via Mapbox Directions API (server fn using secret token).
- Purple styled route line, ETA/distance badge overlay.

**Manager view:** same order detail is read-only for managers — they see installer profile, live status timeline, map, and device serials.

**DB migration:** new table `hardware_order_installations`
```
id, order_id (fk hardware_orders), installer_name, installer_phone, installer_photo_url,
installer_company, city, warehouse_id, silo_id, scheduled_visit_at,
origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng,
status, created_at, updated_at
```
Plus `hardware_order_devices` (serial, model, status, order_id) and `hardware_order_visit_events` (order_id, note, photo_url, event_at, created_by).

RLS: super_admin full; tenant admin/manager SELECT where `hardware_orders.admin_id = get_tenant_admin_id(auth.uid())`.

**Server fns** (`src/lib/installations.functions.ts`): `upsertInstallation`, `addVisitEvent`, `upsertDevices`, `getInstallation`, `getRouteGeometry` (Mapbox Directions via gateway).

**Connector:** requires Mapbox connector (public + secret token). I'll prompt to link.

---

## Build order

1. Migrations (admin fields, insurance commission, installation tables).
2. Mapbox connector link.
3. Admin profile page + server fns.
4. Financial dashboard widgets + PDF report route.
5. Orders page → Installation tab + map.

## Out of scope
- Live GPS tracking of installer (only static route line).
- Multi-stop routes.
- Real-time collaboration on visit notes.
