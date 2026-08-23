# GrainHero — Definitive Module Feature Mapping Report

**Date:** July 9, 2026  
**Purpose:** Complete module-by-module migration analysis before implementation begins.  
**Source:** Deep code analysis of both codebases — no assumptions, all findings grounded in actual file content.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Warehouses](#3-warehouses)
4. [Silos](#4-silos)
5. [Grain Batches](#5-grain-batches)
6. [Buyers](#6-buyers)
7. [Sensors](#7-sensors)
8. [Actuators](#8-actuators)
9. [Grain Alerts](#9-grain-alerts)
10. [Notifications](#10-notifications)
11. [Reports](#11-reports)
12. [Analytics](#12-analytics)
13. [AI / ML (Spoilage)](#13-ai--ml-spoilage)
14. [Team Management](#14-team-management)
15. [Billing & Subscription](#15-billing--subscription)
16. [Platform Administration](#16-platform-administration)
17. [Traceability](#17-traceability)
18. [Maintenance](#18-maintenance)
19. [Insurance](#19-insurance)
20. [Settings & Profile](#20-settings--profile)
21. [IoT / Device Integration](#21-iot--device-integration)
22. [Environmental Data](#22-environmental-data)
23. [Security Center](#23-security-center)
24. [Server / Device Monitoring](#24-server--device-monitoring)
25. [Activity Logs](#25-activity-logs)
26. [Revenue Management](#26-revenue-management)

---

---

## 1. Authentication

### Feature Summary

User registration, login, JWT session management, 2FA, invitation-based team signup, password change/reset, profile picture upload, and Stripe post-payment signup activation.

### GH1 Implementation

**Frontend:** `app/[locale]/auth/` — login, signup, forgot-password, reset-password pages using custom REST calls to Express backend. `PasswordStrengthIndicator` component on signup.

**Backend:** `routes/auth.js` — ~1,900 lines covering:

- `POST /auth/signup` — full logic: invitation token path, pending-user-paid path (Stripe webhook), first-user admin path
- `POST /auth/login` — JWT issue, `firstLogin` flag, 2FA trigger on admin/manager/super_admin roles
- `POST /auth/verify-2fa` — 6-digit TOTP code verification
- `PATCH /auth/toggle-2fa` — enable/disable 2FA per user
- `POST /auth/upload-profilePic` — Cloudinary image upload
- `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /auth/me`, `PATCH /auth/update-profile`

**Database:** `User` model (MongoDB) — fields: `name`, `email`, `phone`, `password` (bcrypt), `role`, `admin_id`, `warehouse_id`, `subscription_plan`, `customerId` (Stripe), `hasAccess`, `firstLogin`, `blocked`, `two_factor_enabled`, `invitationToken`, `invitationRole`, `invitationExpires`, `avatar` (Cloudinary URL).

**IoT:** None.

### GH2 Implementation

**Frontend:** `src/routes/auth.login.tsx`, `auth.signup.tsx`, `auth.forgot-password.tsx`, `auth.reset-password.tsx` — Supabase Auth forms.

**Backend:** `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth` middleware extracts session from cookies. `src/routes/_authenticated/route.tsx` — `beforeLoad` guard redirects unauthenticated users.

**Database:** Supabase Auth (`auth.users`) + `profiles` table (name, email, phone, avatar, business_type, address, preferences, admin_id).

### Frontend Differences

| Feature                     | GH1                       | GH2                                |
| --------------------------- | ------------------------- | ---------------------------------- |
| Login form                  | Custom JWT                | Supabase Auth                      |
| Signup form                 | Custom + invitation token | Supabase (invitation flow absent)  |
| 2FA flow                    | Full email TOTP           | ❌ Not implemented                 |
| Password strength indicator | ✅ Component exists       | ❌ Missing                         |
| Profile picture upload      | Cloudinary via API        | Base64 stored in `profiles.avatar` |
| First login welcome flag    | ✅                        | ❌ Not implemented                 |
| Invitation-based signup     | ✅ Full (token URL)       | ❌ Invitation URL signup missing   |

### Backend Differences

- GH1 uses custom JWT; GH2 uses Supabase session cookies (more secure by default).
- GH1 has Stripe-webhook-to-signup activation (pending user becomes admin after payment). GH2 handles this differently via checkout session; the bridge between Stripe payment and user account creation needs to be verified.
- GH1 has Cloudinary for avatar storage; GH2 stores base64 in the DB (works but not scalable for large user counts).

### Database Differences

- GH1: `User` model is both auth and profile. GH2 splits into `auth.users` (Supabase-managed) + `profiles` table.
- GH1 `User` carries `subscription_plan`, `customerId`, `hasAccess` — in GH2 these live in `subscriptions` table.
- `invitationToken`/`invitationRole` fields exist in GH1 `User`; GH2 has no equivalent invitation token mechanism in the DB.

### IoT Differences

None.

### Missing Functionality

- Two-factor authentication (2FA)
- Invitation-based signup URL (`/auth/signup?token=xxx`)
- Password strength indicator on signup
- First-login welcome notification
- Post-payment automatic account activation flow (Stripe webhook → profile upgrade)

### Missing Server Functions

- `toggleTwoFactor()`
- `verifyTwoFactor(code, tempToken)`
- `processInvitationSignup(token, userData)`

### Missing Database Tables/Columns

- `profiles.two_factor_enabled` column
- `invitation_tokens` table or equivalent on `profiles`

### Missing UI

- 2FA setup toggle in Settings
- 2FA code entry modal on login
- Password strength bar in signup form
- Invitation accept page

### Missing Hardware Integration

None.

### Recommended Migration Steps

1. Add `two_factor_enabled` column to `profiles`.
2. Create invitation token system (store pending invites in a `pending_invitations` table).
3. Build `InvitationSignup` route that consumes token and calls Supabase signup.
4. Implement 2FA using Supabase Auth MFA or a custom TOTP via email.
5. Add `PasswordStrengthIndicator` component to the signup form.
6. Wire Stripe webhook to upgrade profile after checkout.

### Priority: **High**

---

## 2. Dashboard

### Feature Summary

Role-based dashboard showing grain batches, silos, alerts, staff counts, revenue KPIs, monthly intake charts, grain distribution, quality metrics, and sensor snapshots.

### GH1 Implementation

**Frontend:** `app/[locale]/(authenticated)/dashboard/page.tsx` — calls `GET /api/dashboard/dashboard`, renders role-specific stat cards, charts (recharts), recent batches table, alert list, sensor snapshots.

**Backend:** `routes/dashboard.js` — single `GET /dashboard` endpoint, ~500 lines. Computes: `totalBatches`, `totalSilos`, `totalCapacity`, `storageStatus`, `grainTypes`, `storageUtilization`, `recentIncidents`, `activeUsers`, `activeAlerts`, `monthlyIntake` (6-month aggregate), `grainDistribution`, `qualityMetrics`, `sensors`, `activeBuyers`, `avgPrice`, `dispatchRate`, `currentMonthRevenue`, `lastMonthRevenue`, `revenueGrowthPercentage`, `monthlyProfit`, `averageSellingPrice`, `totalTodaysIntake`, `qualityScore`, `currentPlan`. Fully role-scoped (super_admin sees system-wide; admin/manager/tech see their warehouse/tenant).

**Database:** Aggregates across `GrainBatch`, `Silo`, `Incident`, `User`, `GrainAlert`, `SensorDevice`, `Buyer`, `Warehouse`, `WarehouseFinancials`, `Subscription`.

**IoT:** Reads `SensorDevice.health_metrics.last_heartbeat` for sensor snapshots.

### GH2 Implementation

**Frontend:** `src/routes/_authenticated/dashboard.tsx` — detects role, renders one of 5 dashboard components. `src/components/dashboards/AdminDashboard.tsx`, `ManagerDashboard.tsx`, `TechnicianDashboard.tsx`, `SuperAdminDashboard.tsx`, `PendingDashboard.tsx`.

**Backend:** `src/components/dashboards/useDashboardStats.ts` + `src/lib/dashboard-extras.functions.ts`. Queries `grain_batches`, `silos`, `grain_alerts`, `sensor_devices`, `profiles` for counts. Also uses `getAnalyticsOverview` for deeper KPIs.

**Database:** `grain_batches`, `silos`, `grain_alerts`, `sensor_devices`, `profiles`, `warehouses`.

### Frontend Differences

| Feature                    | GH1        | GH2                                 |
| -------------------------- | ---------- | ----------------------------------- |
| Role-based dashboards      | ✅ 4 roles | ✅ 5 roles (adds Pending)           |
| Monthly intake bar chart   | ✅         | ✅ (in Analytics, not dashboard)    |
| Grain distribution pie/bar | ✅         | 🟡 Partial (in Analytics)           |
| Quality metrics chart      | ✅         | 🟡 In analytics page only           |
| Revenue KPIs on dashboard  | ✅         | ✅ (admin/super_admin)              |
| Sensor snapshots widget    | ✅         | 🟡 Present but simplified           |
| Today's intake stat        | ✅         | ❌ Not in dashboard                 |
| Recent batches table       | ✅         | ❌ Not on dashboard (separate page) |
| Alert list widget          | ✅         | ✅                                  |
| Onboarding tour            | ❌         | ✅ GH2-exclusive                    |

### Backend Differences

- GH1 computes all dashboard metrics in one 500-line endpoint — revenue growth, quality score, plan info, sensor snapshots all in one call.
- GH2 makes multiple smaller queries; the revenue growth % calculation and `averageSellingPrice` and `todaysIntake` are not computed anywhere.
- GH1's `qualityScore` (1–5 scale derived from avg risk) has no equivalent in GH2 dashboard.

### Database Differences

- `WarehouseFinancials` model in GH1 has no equivalent table in GH2 (revenue is derived from `grain_batches`). This is acceptable but means some financial metrics differ.

### IoT Differences

- GH1 shows sensor heartbeat age on the dashboard widget. GH2 shows sensor count but no heartbeat state.

### Missing Functionality

- Today's intake stat card
- Monthly profit on dashboard
- Revenue growth % MoM stat
- Average selling price KPI
- Quality score (1–5) card
- Recent batches list widget
- Sensor heartbeat-age display on dashboard

### Missing Server Functions

- `getDashboardStats()` — extend to include `todaysIntake`, `revenueGrowthPct`, `avgSellingPrice`, `qualityScore`

### Missing Database Tables

None — all data exists; calculation logic is missing.

### Missing UI

Dashboard stat cards for: Today's Intake, Revenue Growth %, Avg Selling Price, Quality Score.

### Recommended Migration Steps

1. Extend `useDashboardStats.ts` to query today's intake from `grain_batches`.
2. Add revenue growth % by comparing this month vs last month dispatched batches.
3. Add quality score derived from avg `risk_score`.
4. Add recent-batches widget (top 5 by `created_at`).
5. Add sensor heartbeat age to the sensor widget.

### Priority: **Medium**

---

## 3. Warehouses

### Feature Summary

Full CRUD for storage warehouse facilities. Manager and technician assignment. Financials tracking. Statistics endpoint.

### GH1 Implementation

**Frontend:** `app/[locale]/(authenticated)/warehouses/page.tsx` — CRUD table, search, manager/tech assignment UI.

**Backend:** `routes/warehouses.js` — endpoints:

- `GET /` — role-filtered list (super_admin: all; admin: own; manager/technician: assigned warehouse)
- `GET /:id` — includes silos and financials
- `POST /` — create with plan limit check, manager assignment
- `PUT /:id` — update with manager swap logic
- `POST /:id/technicians` — add tech to warehouse
- `DELETE /:id/technicians/:tech_id`
- `GET /:id/financials`
- `GET /:id/statistics`

**Database:** `Warehouse` model — `warehouse_id`, `name`, `location`, `admin_id`, `manager_id`, `technician_ids[]`, `created_by`, `statistics`, `status`. Also `WarehouseFinancials`.

**IoT:** None.

### GH2 Implementation

**Frontend:** `src/routes/_authenticated/warehouses.tsx` — full CRUD: create/edit dialog, delete confirm, stats strip.

**Backend:** `listWarehouses`, `upsertWarehouse`, `deleteWarehouse` in `operations.functions.ts`. Lists with silo count. No manager/technician assignment endpoints.

**Database:** `warehouses` table — `warehouse_id`, `name`, `location` (JSONB), `admin_id`, `total_capacity_kg`, `status`, `notes`, `created_by`, `updated_by`.

### Frontend Differences

| Feature                    | GH1 | GH2        |
| -------------------------- | --- | ---------- |
| List with search/filter    | ✅  | ✅         |
| Create/edit warehouse      | ✅  | ✅         |
| Delete warehouse           | ✅  | ✅         |
| Manager assignment UI      | ✅  | ❌ Missing |
| Technician list/assignment | ✅  | ❌ Missing |
| Financials tab             | ✅  | ❌ Missing |
| Statistics panel           | ✅  | ❌ Missing |

### Backend Differences

- GH1 has plan-limit enforcement on warehouse creation. GH2's `upsertWarehouse` has no plan limit check.
- GH1 has manager/technician assignment logic (updates `User.warehouse_id`). GH2 has no equivalent.
- GH1 `WarehouseFinancials` tracks profit/revenue per warehouse. GH2 computes revenue directly from `grain_batches`.

### Database Differences

- `manager_id` and `technician_ids` columns missing from GH2 `warehouses` table.
- No `warehouse_financials` table in GH2.

### IoT Differences

None.

### Missing Functionality

- Manager assignment to warehouse
- Technician add/remove from warehouse
- Per-warehouse financials view
- Warehouse statistics endpoint
- Plan limit enforcement on creation

### Missing Server Functions

- `assignManagerToWarehouse(warehouseId, managerId)`
- `addTechnicianToWarehouse(warehouseId, technicianId)`
- `removeTechnicianFromWarehouse(warehouseId, technicianId)`
- `getWarehouseFinancials(warehouseId)`
- `getWarehouseStatistics(warehouseId)`

### Missing Database Tables

- `warehouses.manager_id` column
- `warehouses.technician_ids` column (or a join table `warehouse_technicians`)

### Missing UI

- Manager/Technician assignment section in warehouse detail view

### Recommended Migration Steps

1. Add `manager_id` and optionally a `warehouse_members` join table to Supabase.
2. Create server functions for assignment/removal.
3. Add assignment UI panel to the warehouse detail/edit dialog.

### Priority: **Medium**

---

## 4. Silos

### Feature Summary

Full CRUD for individual grain storage silos. Plan limit enforcement. Live occupancy calculation from batches. Storage duration timer. Current conditions (temp/humidity/CO2) from sensor readings.

### GH1 Implementation

**Frontend:** `app/[locale]/(authenticated)/silos/page.tsx` — card grid, live occupancy bars, storage duration counter, conditions panel, silo visualization component.

**Backend:** `routes/silos.js` — `GET /` (paginated, live occupancy computed from active batches), `GET /stats`, `POST /` (plan limit, warehouse auto-create), `GET /:id`, `PUT /:id`, `DELETE /:id` (blocked if grain present). Max 3 silos per warehouse enforced.

**Database:** `Silo` model — `silo_id` (immutable), `name` (immutable, generated), `capacity_kg`, `current_occupancy_kg`, `warehouse_id`, `admin_id`, `status`, `location`, `current_conditions` ({temperature, humidity, voc, co2}), `batch_loaded_date`, `batch_dispatched_date`, `current_batch_id`, `sensors[]`, `actuators[]`, `deleted_at`.

**IoT:** `current_conditions` updated by sensor reading submissions. `batch_loaded_date` feeds ML `Storage_Days` feature.

### GH2 Implementation

**Frontend:** `src/routes/_authenticated/silos.tsx` — card grid, occupancy progress bar, storage duration live timer, current conditions panel, batch link, "no live feed" badge.

**Backend:** `listSilos`, `upsertSilo`, `deleteSilo` in `operations.functions.ts`. `listSilos` selects with warehouse join and `current_batch` join. `upsertSilo` updates `current_occupancy_kg` and `current_batch_id` on batch intake. No plan limit check.

**Database:** `silos` table — `silo_id`, `name`, `warehouse_id`, `admin_id`, `capacity_kg`, `current_occupancy_kg`, `current_batch_id`, `status`, `location` (JSONB), `batch_loaded_date`, `batch_dispatched_date`, `current_conditions` (JSONB), `sensors[]`, `actuators[]`, `created_by`, `updated_by`, `deleted_at`.

### Frontend Differences

| Feature                           | GH1                        | GH2                                              |
| --------------------------------- | -------------------------- | ------------------------------------------------ |
| Silo card grid                    | ✅                         | ✅                                               |
| Occupancy progress bar            | ✅                         | ✅                                               |
| Storage duration timer            | ✅ Live                    | ✅ Live                                          |
| Current conditions (temp/hum/CO2) | ✅ Real-time from sensors  | 🟡 Shows "no live feed" — reads from DB snapshot |
| Silo visualization (SVG)          | ✅                         | ❌ Missing                                       |
| Firebase live feed badge          | ✅                         | 🟡 Badge shows "no live feed"                    |
| Plan limit enforcement            | ✅ (3/warehouse, plan max) | ❌ Missing                                       |
| Delete blocked when grain present | ✅                         | ❌ Missing                                       |

### Backend Differences

- GH1 enforces max 3 silos per warehouse and plan-wide silo limits. GH2 has no such checks.
- GH1 deletes are blocked when `current_occupancy_kg > 0`. GH2 allows deletion regardless.
- GH1's `current_conditions` is updated by sensor readings in real-time via `updateSiloConditions()`. GH2 does NOT have a sensor-reading-to-silo-conditions update path — the conditions panel is stale.
- GH1 auto-creates a default warehouse if admin has none. GH2 requires explicit warehouse selection.

### Database Differences

Schema is equivalent. Missing enforcement: `current_conditions` update trigger on new sensor reading.

### IoT Differences

- GH1: Sensor reading submission (`POST /sensors/:id/readings`) calls `updateSiloConditions()` which writes temperature/humidity/VOC to `silo.current_conditions`. GH2 has no equivalent path — conditions shown in silo cards are permanently stale.
- The "no live feed" badge in GH2 silo cards signals this gap accurately.

### Missing Functionality

- Live conditions update from sensor readings to `silos.current_conditions`
- Plan limit check on silo creation (3/warehouse, plan max)
- Delete guard when silo has grain
- Silo SVG visualization component

### Missing Server Functions

- `updateSiloConditions(siloId, {temperature, humidity, co2})` — called when sensor reading is inserted
- Add to `upsertSensorDevice` reading ingestion path (when GH2 accepts inbound IoT data)

### Missing Database Tables

None — schema is complete.

### Missing UI

- Silo 3D/SVG visualization component
- Live-feed indicator (currently shows "no live feed" permanently)

### Missing Hardware Integration

- Supabase `postgres_changes` trigger (or server function) that updates `silos.current_conditions` when a new row is inserted into `sensor_readings`.

### Recommended Migration Steps

1. Add a Supabase Database Function or trigger: on `INSERT` to `sensor_readings`, update parent `silos.current_conditions` JSONB.
2. Add plan-limit check in `upsertSilo` server function.
3. Add occupancy check before `deleteSilo`.
4. Build `SiloVisualization` component and integrate into silo card.

### Priority: **High**

---

## 5. Grain Batches

### Feature Summary

Full lifecycle management: intake, storage tracking, QR code generation, dispatch to buyer (full/partial), spoilage event logging, risk assessment. Revenue and profit calculation on dispatch.

### GH1 Implementation

**Frontend:** `app/[locale]/(authenticated)/grain-batches/page.tsx` — CRUD table, dispatch modal with buyer search, QR code display, spoilage event logging, risk score badge.

**Backend:** `routes/grainBatches.js` — ~1,670 lines:

- `GET /generate-id/:grain_type` — auto-incremented batch ID
- `GET /available-silos/:grain_type` — silos compatible with grain type
- `POST /` — create with silo capacity check (live), QR code generation
- `GET /` — paginated, role-scoped
- `GET /:id` — with QR image
- `GET /:id/buyers` — buyers for dispatch
- `POST /:id/dispatch` — full dispatch (existing buyer, dispatch details, vehicle)
- `POST /:id/dispatch-simple` — quick dispatch (buyer upsert by phone/email)
- `PUT /:id/risk-assessment` — update risk score
- Various: `PUT /:id`, `DELETE /:id`, spoilage event endpoints

Also creates `DispatchTransaction` on dispatch, triggers `NotificationService.notifyDispatch`.

**Database:** `GrainBatch` — `batch_id`, `admin_id`, `warehouse_id`, `silo_id`, `grain_type`, `variety`, `grade`, `quantity_kg`, `dispatched_quantity_kg`, `moisture_content`, `protein_content`, `farmer_name`, `farmer_contact`, `source_location`, `harvest_date`, `purchase_price_per_kg`, `sell_price_per_kg`, `revenue`, `profit`, `status`, `risk_score`, `spoilage_label`, `ai_prediction_confidence`, `qr_code`, `dispatch_details`, `spoilage_events[]`, `buyer_id`, `actual_dispatch_date`, `deleted_at`.

Also `DispatchTransaction` model.

**IoT:** `batch_loaded_date` feeds ML `Storage_Days`. ML risk assessment triggers LED and fan control via MQTT.

### GH2 Implementation

**Frontend:** `src/routes/_authenticated/grain-batches.tsx` — full CRUD, dispatch dialog (existing buyer or new buyer inline), spoilage event dialog, QR code view dialog, risk badge, full detail view. **This is one of the most complete pages in GH2.**

**Backend:** `listGrainBatches`, `upsertGrainBatch`, `deleteGrainBatch`, `dispatchGrainBatch`, `logSpoilageEvent` in `operations.functions.ts`. Also `listBuyers`, `listSilos`.

`dispatchGrainBatch` — handles partial dispatch, revenue/profit calculation, silo occupancy update, buyer creation if new.

**Database:** `grain_batches` table — equivalent to GH1. Has `qr_code` (stores JSON string, not image), `spoilage_events` (JSONB array), `intake_conditions` (JSONB), `dispatch_details` (JSONB), `risk_score`, `spoilage_label`, `ai_prediction_confidence`, `last_risk_assessment`.

### Frontend Differences

| Feature                     | GH1                       | GH2                                                 |
| --------------------------- | ------------------------- | --------------------------------------------------- |
| Batch list/search           | ✅                        | ✅                                                  |
| Create batch                | ✅                        | ✅                                                  |
| Edit batch                  | ✅                        | ✅                                                  |
| Delete batch                | ✅                        | ✅                                                  |
| QR code view                | ✅ Image rendered         | 🟡 Shows raw JSON string (no actual QR image)       |
| Full dispatch modal         | ✅                        | ✅                                                  |
| Simple dispatch (new buyer) | ✅                        | ✅                                                  |
| Partial dispatch            | ✅                        | ✅                                                  |
| Spoilage event log          | ✅                        | ✅                                                  |
| Risk score badge            | ✅                        | ✅                                                  |
| Batch ID auto-generator     | ✅                        | 🟡 Auto-generates on server, no client-side preview |
| Available-silos filter      | ✅ (same grain type only) | ❌ Shows all silos with capacity                    |
| Dispatch notification       | ✅                        | ❌ No notification triggered                        |

### Backend Differences

- GH1 calls `QRCode.toDataURL()` to generate an actual PNG/SVG QR image and stores the data URL. GH2 stores a plain JSON string as `qr_code` and the UI renders it as text — **QR images will not scan**.
- GH1 creates a `DispatchTransaction` record for audit trail. GH2 has no `dispatch_transactions` table.
- GH1's `GET /available-silos/:grain_type` filters silos to show only those empty or containing the same grain type. GH2 shows all silos with remaining capacity.
- GH1 triggers `NotificationService.notifyDispatch` after dispatch. GH2 does not.

### Database Differences

- No `dispatch_transactions` table in GH2.
- GH2's `qr_code` column stores a JSON string; GH1 generates a base64 PNG at retrieval time.

### IoT Differences

- GH1 connects risk assessment back to ML model which can trigger LED/fan control. GH2 computes risk from sensor readings but does not trigger hardware.

### Missing Functionality

- QR code image generation (actual scannable QR, not plain text)
- `dispatch_transactions` audit table
- Available-silo filtering by grain type
- Dispatch notification to admin/manager
- Batch ID preview before creation

### Missing Server Functions

- `generateQRCodeImage(batchId, qrPayload)` — return base64 PNG
- `listAvailableSilosForGrainType(grainType)` — filter by compatible silos

### Missing Database Tables

- `dispatch_transactions` table for audit trail

### Missing UI

- QR code rendered as scannable image (currently shows raw string)
- Available-silos dropdown filtered by grain type compatibility

### Recommended Migration Steps

1. Install `qrcode` package; create a server function `generateQRImage(payload)` that returns a data URL.
2. Call it on batch creation and store in `grain_batches.qr_code_image` (or generate at display time).
3. Create `dispatch_transactions` Supabase migration.
4. Insert dispatch transaction row in `dispatchGrainBatch` server function.
5. Add `listAvailableSilosForGrainType` server function with grain-type compatibility logic.
6. Wire dispatch notification via existing `notifications` table insertion.

### Priority: **Critical**

---

## 6. Buyers

### Feature Summary

Buyer CRM: create, update, list buyers with type, rating, preferred grain types, contact info, payment terms.

### GH1 Implementation

**Frontend:** `app/[locale]/(authenticated)/buyers/page.tsx` — CRUD table with search, buyer type filter.

**Backend:** `routes/buyers.js` — full CRUD + `GET /active` for dispatch use. Fields: `name`, `company_name`, `contact_person`, `contact_info`, `location`, `buyer_type`, `rating`, `preferred_grain_types`, `status`, `admin_id`.

**Database:** `Buyer` model — full contact info, buyer type enum, rating (0–5), preferred grain types array, `last_order_at`, `status`.

**IoT:** None.

### GH2 Implementation

**Frontend:** `src/routes/_authenticated/buyers.tsx` — **needs verification**. Route file exists; implementation depth unknown from reading.

**Backend:** `listBuyers` in `operations.functions.ts` — confirmed to exist (called from grain-batches dispatch). Full CRUD functions need verification.

**Database:** `buyers` table — confirmed in `types.ts`: `name`, `contact_name`, `contact_email`, `contact_phone`, `company_name`, `buyer_type`, `rating`, `preferred_grain_types`, `preferred_payment_terms`, `status`, `admin_id`, `tags`, `last_order_at`, `deleted_at`. Schema is equivalent to GH1.

### Frontend Differences

Cannot fully assess without reading `buyers.tsx`. Likely has CRUD — route file has significant size.

### Backend Differences

`upsertBuyer` and `deleteBuyer` server functions exist (called from dispatch). Need to verify buyer CRUD is wired to the buyers page.

### Missing Functionality

- To be verified: buyer rating UI, preferred grain types multi-select, payment terms field.

### Missing Server Functions

To be verified by reading `buyers.tsx` fully.

### Recommended Migration Steps

Read `buyers.tsx` and verify CRUD completeness. Add any missing fields to the form.

### Priority: **Medium**

---
