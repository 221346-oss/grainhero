
# GrainHero Flow Rework — Plan

Goal: make the platform behave like the real business flow you described. Silos and warehouses come from IoT installation (never hand-created by admins), grain moves in via batches from tracked sources, pools inside a silo, is sold by quantity with price guidance, and every step lands in notifications + audit logs.

---

## 1. Silo & Warehouse — provisioning from install orders

**Rule:** Admin can no longer create a silo or warehouse. Both are created by the platform, driven by the install order.

Two provisioning paths (both supported):
- **Auto** — when SuperAdmin marks a `hardware_orders` row `status = completed` (or the last `hardware_order_installations` visit is `installed`), a trigger provisions:
  - `warehouses` row from the order's shipping info (name, city, country, coordinates, contact).
  - `silos` row per installed device (name = "Silo 1", capacity from install form, `device_id`/`warehouse_id` bound).
  - `sensor_devices` rows linked to the new silo.
- **Manual override** — inside `/platform/install-orders/$id`, a "Provision silo & warehouse" panel lets SuperAdmin edit generated names/capacities and click **Provision** before completing the order. Idempotent — re-clicks update, don't duplicate.

Admin side:
- Remove "New silo" / "New warehouse" CTAs.
- Silo edit form: only `name`, `description`, `notes`, `current_grain_type` editable. Locked (read-only, with lock icon + tooltip "Set by SuperAdmin at install"): `device_id`, `warehouse_id`, `capacity_kg`, warehouse `city` / `country` / `coordinates`.
- New empty state on `/silos` when admin has none: "No silos yet — request an IoT install to get started" → `/plan-management` install flow.

Notifications:
- Admin gets in-app notification + email when: install scheduled, technician on the way, installation complete + silo provisioned ("You're good to go").

## 2. Suppliers — first-class entity with profiles + history

New table `suppliers` (tenant-scoped): `id, admin_id, kind, name, phone, email, address, city, notes, is_internal_farm, created_at`.

`kind` enum: `external`, `own_farm`, `internal_transfer`, `anonymous`.

- `/suppliers` list page (admin/manager): table with name, kind, total kg delivered, last delivery, avg cost, actions.
- `/suppliers/$id` profile page: contact info + full batch history (every intake with silo, qty, price, date) + running totals + "trust badge" (on-time %, quality avg).
- Batch intake dialog gets a **Source** picker with 4 tabs matching supplier kinds; on submit, either picks an existing supplier or creates one inline (anonymous = ephemeral row).

## 3. Batches — intake only, pooled in silo

Batches page (already table-form) becomes strictly **intake events**:
- Columns: Batch ID, Grain, Source (supplier chip + kind icon), Silo, Qty (kg), **Unit cost**, Remaining, Intake date, Quality, Status, actions.
- Intake dialog fields: source picker, grain, quantity, **purchase price/kg** (required — drives avg cost), currency, quality snapshot (moisture/temp auto-pulled from silo at time of intake), notes.
- After intake, per-silo pooled inventory is what matters. The "which batch" is irrelevant to the seller UX; batches remain only for cost + traceability.

Add on `grain_batches`: `unit_cost numeric`, `currency text default 'PKR'`, `supplier_id uuid references suppliers(id)`.

## 4. Silo pooled view + avg cost

Silo detail page gets a **"Pool"** header card:
- `Total on hand = SUM(remaining_kg)` across active batches.
- `Weighted avg cost/kg = SUM(remaining_kg * unit_cost) / total_on_hand`.
- `Oldest intake` chip (FIFO hint).
- `Suggested sell price` panel (see §5).

## 5. Dispatch — sell by quantity, dual price suggestion

DispatchDialog (already exists) gets:
- **Suggested price** section with two cards side by side:
  - **Cost + margin** — `avg_cost × (1 + margin%)`; margin% pulled from new `tenant_price_settings.default_margin_pct` (per grain type, editable in settings).
  - **Market** — latest Yahoo Futures price for that commodity (via existing commodity feed), converted to local currency.
- Admin picks one (radio) or overrides with a manual price. Chosen basis is logged on the dispatch row (`price_basis` = `cost_margin` | `market` | `manual`).
- Dispatch destination toggle: **On-premise (staged)** vs **Dispatched (in transit)**. Only "Dispatched" creates a `buyer_shipments` row; "On-premise" keeps stock allocated but physically present so manager can update "position" later.

Add on `grain_dispatches`: `price_basis text`, `market_price_snapshot numeric`, `avg_cost_snapshot numeric`, `stage text default 'staged'` (`staged` | `in_transit` | `delivered`).

Manager gets a **"Staged dispatches"** widget on their dashboard to move them from `staged` → `in_transit` when the truck actually leaves.

## 6. Buyers — always tracked (incl. anonymous)

- `/buyers` already exists; add "anonymous" quick-create identical to suppliers.
- Every dispatch requires a buyer id; anonymous still creates a row so history/analytics stay whole.

## 7. Traceability & logs — unified activity stream

- Every action from account creation onward already writes to `activity_logs` via `logActivity()`. Audit the following server fns to make sure they call it (adding where missing): supplier CRUD, batch intake, silo provisioning, dispatch create/stage change, price setting change, threshold change, plan change.
- New Admin page `/traceability` (also linked from every silo/batch/supplier detail): timeline filtered by entity, exportable CSV.

## 8. Notifications & email

Extend the existing notification pipeline with these event types (in-app + email via existing lifecycle-emails cron):
- `install.scheduled`, `install.enroute`, `install.completed`, `silo.provisioned`
- `batch.intake.created`, `dispatch.staged`, `dispatch.in_transit`, `dispatch.delivered`
- `threshold.breach`, `plan.changed`

Admin gets a "Ready to go" summary email when first silo is provisioned.

## 9. UI touch-points (concrete file list)

- `src/routes/_authenticated/silos.tsx` — remove create button, add empty state.
- `src/components/app/silos/SiloEditDialog.tsx` — lock protected fields.
- `src/routes/_authenticated/warehouses.tsx` — same treatment.
- New `src/routes/_authenticated/suppliers.tsx` + `suppliers.$id.tsx`.
- New `src/routes/platform/install-orders.$id.provision.tsx` (or inline panel).
- `src/components/app/silos/DispatchDialog.tsx` — dual price cards + stage toggle.
- New `src/components/app/batches/IntakeDialog.tsx` — source picker.
- New `src/routes/_authenticated/traceability.tsx`.
- Sidebar: add **Suppliers** and **Traceability** under Operations for admin/manager.

## 10. DB migration summary (one migration)

- `CREATE TABLE suppliers` (+ grants + RLS tenant-scoped).
- `CREATE TABLE tenant_price_settings` (per-tenant margin/currency defaults).
- `ALTER TABLE grain_batches ADD unit_cost, currency, supplier_id`.
- `ALTER TABLE grain_dispatches ADD price_basis, market_price_snapshot, avg_cost_snapshot, stage`.
- Trigger `hardware_order_provision_silo()` on `hardware_orders` completion → inserts warehouse + silos + sensor_devices; idempotent by `(hardware_order_id, device_id)`.
- View `silo_pool_summary` returning `silo_id, total_on_hand, weighted_avg_cost, oldest_intake_at`.

## 11. Rollout order

1. Migration + trigger + backfill (existing silos get `provisioned_by = 'legacy'`).
2. Suppliers table + CRUD server fns + `/suppliers` pages.
3. Batch intake dialog rewrite with source picker + unit cost.
4. Silo pool summary + avg cost display.
5. Dispatch dialog dual-price + stage toggle.
6. Install-order provisioning panel + auto trigger + admin lockdowns.
7. Traceability page + notification/email event wiring.
8. Sidebar + dashboard tile updates.

## Non-goals for this pass

- No changes to marketplace listings, insurance, or finance ledger schema — they consume the new `grain_dispatches` fields additively.
- No mobile-app changes; the mobile sync layer already reads from these tables.

---

Reply **yes** to start with step 1 (migration) or tell me what to adjust.
