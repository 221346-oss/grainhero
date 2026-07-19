## Goal
Redesign the Admin dashboard from an airy vertical stack into a dense, information-rich command center. Every number becomes a deep link to its dedicated page, so the dashboard functions as the primary navigation surface (reducing sidebar dependency).

## Problems today
- KPI tiles are large but static (not clickable) and take a full band for 5 numbers.
- Cards use large padding + single-column stacking on narrow viewports → excessive scroll.
- `column "fill_percentage" does not exist` error breaks the Silo Fill widget.
- Recent Batches / Alerts / Team rows are not clickable — user must jump to sidebar to drill in.
- Actuators & Silo Occupancy blocks repeat headers/CTAs, wasting space.

## Redesign — 3-band bento layout

### Band 1 — KPI strip (clickable)
Replace `AdminSummaryTiles` with a compact `KpiStrip` (h-20, 2 cols mobile / 5 cols desktop). Each tile:
- Icon + label + big number + trend delta (↑/↓ vs 7d).
- Wrapped in `<Link>` with hover: `ring-1 ring-emerald-500/40 bg-emerald-50/40`.
- Deep links: Buyers→`/buyers`, Warehouses→`/warehouses`, Active batches→`/grain-batches?status=stored`, Silos→`/silos`, Sensors online→`/sensors?status=online`.

### Band 2 — Operations grid (2 cols desktop, 1 col mobile)
Left column (stacked, compact):
- **Silo occupancy** — sparkline bars, each row clickable → `/silos/$id`. Fix `fill_percentage` bug by computing `occupancy_kg/capacity_kg` in the server fn (already done in `SilosOccupancyCard`; remove the custom widget that queries `fill_percentage`).
- **Actuators** — chip grid (3 per row), tap = toggle drawer to `/actuators?device=$id`.

Right column:
- **Recent alerts** (top 4) — priority chip + title, entire row → `/grain-alerts/$id`. Header shows count badge → `/grain-alerts`.
- **Recent batches** (top 4) — row → `/grain-batches/$id`.

### Band 3 — Secondary strip (3 cols)
- **Team** — 3 avatars + "+N" → `/team-management`.
- **Install orders** compact status (`Pending 2 · Scheduled 1 · Done 5`) → `/install-orders`.
- **Revenue snapshot** — MRR + trend spark → `/subscription`.

## UX rules applied everywhere
- Any number in the dashboard = link. Use `underline-offset-4 hover:underline decoration-emerald-500` for text numerics.
- Card padding tightened: `p-3` (was `p-6`), `gap-3` grid (was `gap-6`).
- Card headers use single-line: title + count badge + arrow-icon "View" (no separate button).
- Hover state: subtle emerald outline (`hover:ring-1 hover:ring-emerald-500/30`) for cursor affordance.
- Empty states: 1-line inline instead of 6-line centered block.

## Bug fixes bundled
- Remove/replace the `fill_percentage` widget (in `CustomWidgetsBand` metric registry) — use derived expression from `silos.current_occupancy_kg / capacity_kg`.
- Skeleton for AdminDashboard sized to new bento (5-tile strip + 2-col + 3-col strip) so loading state doesn't overflow viewport.

## Files to touch
- `src/components/dashboards/AdminDashboard.tsx` — new layout.
- `src/components/dashboards/DashboardBlocks.tsx` — tighten cards, add row-level `<Link>`s, compact variants.
- New: `src/components/dashboards/KpiStrip.tsx` — clickable KPIs with trend.
- New: `src/components/dashboards/InstallOrdersMini.tsx`, `RevenueMini.tsx`.
- `src/lib/dashboard-extras.functions.ts` — add trend deltas (buyers/batches/sensors 7d), install order counts, MRR snapshot.
- `src/components/app/skeletons.tsx` — update `AdminDashboardSkeleton` to match new bento.
- Fix `fill_percentage` metric in the analytics metric registry migration or in `CustomWidgetsBand` default set.

## Out of scope (next passes)
- Manager / Technician / SuperAdmin dashboards (same pattern, separate turn).
- Sidebar further pruning (already done last pass).

Approve to implement.
