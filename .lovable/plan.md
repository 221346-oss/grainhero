# Phase 8 — Hardware Order Lifecycle & Installation Workflow

Turn the current hardware-order tables into an end-to-end operational flow: order placed → payment confirmed → warehouse packs → technician assigned → on-site install → device commissioned → subscription features unlocked. Every state change emits a notification (Phase 7) and an activity log (Phase 1).

## Goals

1. Deterministic order state machine with server-enforced transitions.
2. Super-admin: assign technicians, mark shipped, view whole pipeline.
3. Technician: see assigned installs, log visit events, upload proof, mark installed.
4. Admin (buyer): live tracker of their order + install progress + device serials.
5. Devices auto-registered to the admin's tenant and linked to a silo on commissioning.

## Data (migration)

- Extend `hardware_orders.status` enum semantics used by app code (no DB enum change; keep TEXT with a check constraint):
  `pending_payment | paid | packing | shipped | in_transit | installing | completed | cancelled | refunded`.
- Add columns: `assigned_technician_id uuid`, `shipped_at`, `expected_arrival_at`, `tracking_carrier`, `tracking_number`, `installed_at`, `cancelled_reason`.
- `hardware_order_installations`: add `technician_id`, `silo_id`, `status` (`scheduled|en_route|onsite|completed|blocked`), `scheduled_for`, `completed_at`, `blocker_note`.
- `hardware_order_visit_events`: already exists — add `photo_urls text[]`, `location jsonb` (lat/lng), `event_type` check (`arrived|inspection|install|test|handover|issue`).
- `hardware_order_devices`: add `sensor_device_id uuid` (nullable, links to `sensor_devices` once commissioned), `commissioned_at`.
- New table `hardware_order_status_history` (order_id, from_status, to_status, actor_id, note, created_at) with GRANTs + RLS (tenant admin read own, technician read assigned, super-admin all).

## Server functions (`src/lib/hardware-lifecycle.functions.ts`)

All protected via `requireSupabaseAuth`, role-checked, emitting notify + activity:

- `superadminListOrdersPipeline({ status?, search? })` — grouped by status for kanban.
- `superadminAssignTechnician({ orderId, technicianId, scheduledFor })`.
- `superadminMarkShipped({ orderId, carrier, trackingNumber, expectedArrivalAt })`.
- `superadminCancelOrder({ orderId, reason })` — refund path handled separately (Phase 6).
- `technicianListMyInstalls()` — installs assigned to me, joined with order + admin contact.
- `technicianUpdateInstallStatus({ installId, status, note? })`.
- `technicianLogVisitEvent({ installId, eventType, note, photoUrls?, location? })`.
- `technicianCommissionDevice({ installId, deviceId, serialNumber, siloId, sensorMetadata })` — inserts `sensor_devices`, links via `hardware_order_devices.sensor_device_id`, flips install to `completed` when all devices commissioned.
- `adminGetMyOrderTracker({ orderId })` — timeline: status history, tracking, install events (sanitised — no technician PII beyond first name).

State machine enforced by a helper `assertTransition(from, to, actorRole)`; illegal transitions throw a typed error. Every transition writes to `hardware_order_status_history` + emits notification to admin (order updates) and super-admin (exception events).

## UI

### Super-admin
- `/platform/orders` upgraded: filter chips per status, "Assign technician" and "Mark shipped" dialogs inline in the existing table, per-row link → `/platform/orders/$orderId`.
- `/platform/orders/$orderId` — full detail: timeline, devices, install log, admin/tenant, actions.

### Technician
- `/technician/installs` list (route already scoped under `_authenticated`).
- `/technician/installs/$installId` — status stepper, event log form (photo upload via existing Cloudinary connector), commissioning wizard (add serial → pick silo → confirm).

### Admin (buyer)
- `/orders/$orderId` — public-to-tenant tracker (already partially exists; wire to `adminGetMyOrderTracker`). Shows ETA, carrier + tracking link, install schedule, current step badge, and a "Contact support" CTA.

Shared components: `<OrderStatusStepper>`, `<InstallTimeline>`, `<DeviceCommissioningWizard>`.

## Notifications (uses Phase 7 dispatcher)

Category `order` / `install`, severity varies:
- Admin: paid → packing → shipped (with tracking) → technician assigned (with ETA) → completed.
- Technician: new assignment; schedule change; cancellation.
- Super-admin: any `blocked` install event; any failed commissioning; cancellations.

## Skeletons & loading

- Add `OrderPipelineSkeleton`, `OrderDetailSkeleton`, `TechnicianInstallSkeleton` to `src/components/app/skeletons.tsx`; register in `PAGE_SKELETONS`.

## Audits & docs

- Extend `scripts/audit-server-fns.ts` warn-list acknowledging that all new lifecycle fns must call `getVerifiedUser()` (they will).
- Update `docs/route-matrix.md` with new routes and role scope.
- Update `docs/public-server-fns.md` — none of the new fns are public.

## Non-goals

- No refund automation (Phase 6 covers billing side; cancel just marks status).
- No mobile technician app (Phase 15+ in master plan).
- No GPS live tracking — just carrier tracking link + optional lat/lng snapshot on visit events.

Reply **go** to build.
