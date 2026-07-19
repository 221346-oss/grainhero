# Grain Batches — Intake vs Dispatch Redesign

## Concept shift

Today `grain-batches.tsx` mixes two different business events into one row:

1. **Intake** — a farmer/supplier delivers X kg of grain into a silo.
2. **Dispatch** — later, we sell N kg out of a silo to a buyer.

Kimi's phases (Phase 8 batch lifecycle, Phase 11 listings, Phase 13–14 dispatch/shipments) already assume this split. We'll make the UI and data flow match.

Rule going forward:

- **A batch = one intake event.** It has: supplier, grain, quantity_in_kg, silo_in, intake_date, quality snapshot. It never "dispatches itself".
- **A dispatch = one outbound sale from a silo.** It draws from one or more batches in that silo (FIFO by intake date by default), picks buyer, price/kg, qty, and creates a `buyer_order` + `buyer_shipment` (reuses existing tables from Phase 13/14).  
  
in here once batches arrived from supplier they gets mixed up in silo so there is no need to mention any perticluar batch on selling, cost to us will be then aveage of batches cost we bought for and on seelling it profit will be calulated accordinlgy

## 1. Batches page → compact table

Replace the card grid with a dense table (like the reference marketplace list).

Columns:
`Batch ID · Grain · Supplier · Silo · Intake qty · Remaining · Intake date · Quality · Status · ⋯`

- **Remaining** = `quantity_kg - SUM(dispatch_allocations.qty)` (see §3).
- **Status** simplified to: `stored`, `partially_dispatched`, `depleted`, `on_hold`, `damaged`, `expired`.
- Row actions (icon buttons): View drawer, Print QR, Edit, Spoilage, Delete. **No "Dispatch" button on the batch row** — dispatch happens from silos.
- Toolbar: search, grain filter, status filter, silo filter, date range, `+ New intake`.
- Sticky header, zebra rows, hover emerald tint (match `BatchesTable.tsx` styling).
- Row click → side drawer with full detail + dispatch allocation history for this batch.

`+ New intake` dialog fields: supplier, grain, quality grade, qty (kg), silo, intake date, notes, optional quality snapshot (moisture/temp).

## 2. New "Dispatch" flow — from Silos

New page: `/silos/$siloId/dispatch` (also opened via a `Dispatch` button on the silo card and silo detail page).

Dispatch form:

- Buyer (autocomplete from `buyers`) or new-buyer inline.
- Grain type filter (auto-inferred from batches in the silo).
- Quantity to dispatch (kg).
- Price per kg + currency + total (auto).
- Expected pickup/delivery date, carrier (optional), notes.
- Allocation preview: shows FIFO batch draw, e.g.
`BATCH-W-001 → 40,000 kg · BATCH-W-002 → 45,000 kg`
with option to override quantities per batch.

On submit (single server fn `createDispatchFromSilo`):

1. Insert `grain_dispatches` row (see §3).
2. Insert `grain_dispatch_allocations` per drawn batch, decrement remaining.
3. Insert `buyer_orders` row (status `confirmed`, source `direct_dispatch`) reusing Phase 13 tables so shipments/invoices/refunds all keep working.
4. Insert `buyer_shipments` + initial `buyer_shipment_events` (`created`).
5. Update each batch's status: `partially_dispatched` or `depleted` when remaining hits 0.
6. Append `grain_batch_events` (from → to) for audit.
7. Log activity + notify buyer.

## 3. Data model (migration)

New tables (Phase-consistent naming):

```sql
grain_dispatches (
  id, admin_id, silo_id, buyer_id, buyer_order_id,
  grain_type, total_qty_kg, price_per_kg, currency,
  total_amount, status, expected_date, dispatched_at,
  carrier_id, notes, created_by, created_at, updated_at
)

grain_dispatch_allocations (
  id, dispatch_id, batch_id, qty_kg, unit_cost, created_at
)
```

Columns added on `grain_batches`:

- `supplier_name text`, `supplier_contact text`, `intake_source text` — cleaner intake identity.
- `remaining_kg numeric` — maintained by trigger from allocations (or computed view `grain_batches_with_remaining`).

Trigger `trg_batch_remaining_after_allocation` recomputes `remaining_kg` and flips status (`stored → partially_dispatched → depleted`) atomically.

RLS: tenant-scoped via `admin_id` (same pattern as existing batch tables). GRANT to `authenticated` + `service_role`.

Backfill: existing dispatched batches get a synthetic `grain_dispatches` row + one allocation for their `dispatched_quantity_kg`, so history stays intact.

## 4. Silos page changes

- Silo card gets a `Dispatch` button (emerald primary) that opens the new dispatch dialog for that silo.
- Silo detail (`silos.$siloId.tsx`) gets two new tabs:
  - **Batches in silo** — table of active (non-depleted) batches with remaining kg.
  - **Dispatch history** — table of `grain_dispatches` for that silo, click → buyer order drawer.

## 5. Server functions (new / updated)

New in `src/lib/dispatches.functions.ts`:

- `createDispatchFromSilo({ siloId, buyerId, grainType, qtyKg, pricePerKg, currency, expectedDate, allocations? })` — the orchestrator.
- `listDispatches({ siloId?, buyerId?, status?, from?, to? })`.
- `getDispatchDetail({ id })` — returns dispatch + allocations + linked order/shipment.
- `cancelDispatch({ id, reason })` — reverts allocations, cancels order per Phase 14 rules.

Updated in `src/lib/grain-batches.functions.ts`:

- `createBatchIntake` (rename of createBatch) — enforces intake-only fields.
- Remove/deprecate `dispatchGrainBatch` (kept as thin shim that errors with "use silo dispatch").
- `listBatches` returns computed `remaining_kg` and joined supplier/silo.

## 6. UI components (new)

- `src/components/app/batches/BatchesDataTable.tsx` — the compact table (build on shadcn `Table`, mirrors `BatchesTable.tsx` styling).
- `src/components/app/batches/BatchIntakeDialog.tsx`
- `src/components/app/batches/BatchDetailDrawer.tsx` (with allocation timeline)
- `src/components/app/silos/DispatchDialog.tsx` (FIFO preview + override)
- `src/components/app/silos/SiloDispatchHistory.tsx`

All use existing tokens (emerald primary, muted borders, no hardcoded colors).

## 7. Rollout order (single feature branch)

1. Migration (§3) + backfill.
2. Server fns (§5) + tests in `tests/integration/dispatches.test.ts` (allocation math, FIFO, cancel).
3. `BatchesDataTable` + intake dialog + drawer; wire into `grain-batches.tsx`, remove old dispatch controls.
4. `DispatchDialog` + silo integration.
5. Route `/silos/$siloId/dispatch` (deep link) + activity/notification wiring.
6. Update SuperAdmin financials / dispatch analytics queries to read from `grain_dispatches` (they already join `buyer_orders`, so mostly additive).

## Non-goals (kept as-is)

- Marketplace listings flow (Phase 11) untouched — a listing can still be created from a batch, but "sold via listing" now also creates a `grain_dispatches` row for consistency.
- Buyer app, shipments UI, invoices, refunds — no change; they hang off `buyer_orders` as today.