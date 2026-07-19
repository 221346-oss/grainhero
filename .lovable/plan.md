## Goal
Collapse three sidebar links (Silos, Warehouses, Grain Batches) into one **Silo Management** hub. Warehouses become the left rail; silos are the middle list; batches open in a right-side drawer per silo.

## Layout (`/silos`)

```text
┌───────────────────────────────────────────────────────────────────┐
│ PageHeader: Silo Management  · [Range chip] [Request install]     │
├──────────────────┬────────────────────────────────────────────────┤
│ WAREHOUSES  (L)  │ SILOS TABLE (M)                                │
│  ▸ All (12)      │ Name | WH | Grain | Fill% | Status | Actions   │
│  ▸ WH-Lahore (4) │ …row click → opens Batches drawer              │
│  ▸ WH-Multan (3) │                                                │
│  + inline info   │                                                │
└──────────────────┴────────────────────────────────────────────────┘
                          ↘ Right drawer: "Batches in <Silo>"
                             - Compact batch table (intake / dispatch)
                             - Actions: Add batch · Dispatch · View details
```

- Left rail: warehouse list (from `warehouses` query) with silo counts. "All warehouses" default. Click filters middle table. Small "Warehouse details" (i) link opens a slim warehouse-info popover (address, capacity, origin order) — no separate page needed.
- Middle: existing silo table, filtered by selected warehouse. Row click opens the drawer.
- Right drawer (`Sheet`): shows that silo's batches using the existing `BatchesTable` component scoped by `silo_id`. Includes "Add batch" + "Dispatch" buttons (reuses current dialogs).

## Files

**New**
- `src/components/app/silos/WarehouseRail.tsx` — left list + counts + info popover.
- `src/components/app/silos/SiloBatchesDrawer.tsx` — Sheet wrapping BatchesTable + AddBatch + DispatchDialog for one silo.

**Modified**
- `src/routes/_authenticated/silos.tsx` — grid layout `[220px_1fr]`, wire warehouse filter, row click → drawer.
- `src/components/app/AppSidebar.tsx` — remove "Warehouses" and "Grain Batches" nav entries for admin/manager/technician.
- `src/routes/_authenticated/warehouses.tsx` — keep route file (so old bookmarks still resolve) but redirect to `/silos`.
- `src/routes/_authenticated/grain-batches.tsx` — keep as fallback deep view (accessible from drawer "Open full page"), remove sidebar link only.
- `src/routes/_authenticated/silos.$siloId.tsx` — keep; drawer's "Open full page" links here.

## Data
- Reuse existing server fns: `listSilos`, `listWarehouses`, `listGrainBatches({ siloId })`.
- No schema change. No new server functions.

## UX details
- Preserve current empty-state guides (Admins can't create warehouses/silos — install-order CTA).
- Drawer width: `w-full sm:max-w-2xl`, closes on route change.
- Batch drawer header shows silo name, fill%, grain type, and quick "Dispatch" primary button.
- Keyboard: Esc closes drawer; ↑/↓ moves row selection.
- Dark-mode: uses same semantic tokens already in `DataListPage`.

## Out of scope
- No changes to batch/dispatch business logic.
- SuperAdmin sidebar untouched.
- No warehouse edit UI added (view-only popover, since admins can't create warehouses anyway).
