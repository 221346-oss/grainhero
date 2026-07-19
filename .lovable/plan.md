# Admin Dashboard — Nav Tabs + Filterable Blocks + Batch Table

Inspired by the reference: compact top nav, KPI cards with inline filter chips (This month / Today etc.), an info-circle for descriptions instead of body copy, and a dense table for batches.

## 1. Top nav tabs (contextual, customizable, max 5)
New: `src/components/dashboards/DashTabs.tsx`.
- Pill-style horizontal tabs rendered under the welcome banner. Active pill = emerald filled; inactive = ghost.
- Admin default set (5): **Overview**, **Silos**, **Batches**, **Alerts**, **Marketplace**. Each tab = a filter for what section the dashboard highlights (no route change — swaps the middle band).
- Customization: gear icon → dropdown lets user check up to 5 from a full catalog (Overview, Silos, Batches, Alerts, Actuators, Sensors, Buyers, Marketplace, Orders, Team). Selection persisted in `localStorage` under `gh_admin_tabs`.
- Overflow: on `<sm` the tab bar becomes horizontally scrollable; gear button stays sticky right.
- No lucide icons inside the pills (per your rule "min icons are not encouraged" for pills — text-only), gear icon is the only icon and sits outside the tab list.

## 2. KPI Summary band (with per-card filter chip)
New: `src/components/dashboards/KpiSummary.tsx` — replaces the current `KpiStrip`.
- Header row: title "KPI Summary" + tiny `(i)` info-circle tooltip ("Live totals for your tenant") + right-side global range chip (`This month ▾`) → `Today / 7d / 30d / MTD / YTD` — persisted in URL search param `range`.
- Each KPI tile:
  - Small monotone icon in a soft emerald square (kept because it's the tile identity, not repeated inline).
  - Label + `(i)` tooltip explaining the metric.
  - Big number.
  - Delta pill (`+35% vs last month`) computed from the selected range vs prior period.
  - Whole tile deep-links to its detail page (Buyers/Warehouses/Batches/Silos/Sensors).
- Tiles: Total Batches Value, Active Batches, Silos in Use, Sensors Online, Open Alerts. (5 tiles, matching image density.)

## 3. Insights & Performance band (mini-metric strip)
New: `src/components/dashboards/InsightsStrip.tsx`.
- 5 slim cards each with: title + `(i)`, big number, tiny two-row mini bar comparing **This period vs Last period** (emerald bar for current, muted bar for previous), delta % right-aligned.
- Cards: **Pending QC**, **Rejected QC**, **Batches At-Risk** (risk_score ≥ 70), **Ready to Ship**, **Actuators On**.
- Uses the same range filter from band 2.

## 4. "Your batches" table (replaces batch card list)
New: `src/components/dashboards/BatchesTable.tsx`.
- Header: title + `(i)` + right-side inline search input + status multi-filter (`All / Storing / QC / Dispatched / Rejected`) + expand-to-fullscreen link to `/grain-batches`.
- Columns: **Batch ID**, **Grain**, **Silo**, **Qty (kg)**, **Risk** (colored dot + score), **Status** (pill), **Actions** (row-hover arrow → batch detail).
- Sticky header, zebra rows, `max-h-[420px]` scroll body, tabular-nums, `text-xs` dense.
- Empty state: single line "No batches match".

## 5. Right rail becomes secondary strip (kept minimal)
Below the batch table, a 2-col strip:
- **Silo occupancy** — existing bar-stack visual (already refactored), header adds `(i)`.
- **Recent alerts** — dot + title list, header adds `(i)`.
Actuators dot-grid drops into the Insights band as "Actuators On" mini, so it doesn't repeat here.

## 6. Info tooltips (i-circle)
Small helper `src/components/ui/InfoDot.tsx`:
- `<InfoDot text="..." />` renders a 12px circle with `i`, shows the shadcn `Tooltip` on hover/focus.
- Used in every band header and every KPI/insight label to replace body-copy descriptions.

## 7. Final layout
```text
[ Welcome banner (self-vanishes) ]
[ Dash tabs: Overview · Silos · Batches · Alerts · Marketplace   ⚙ ]
[ KPI Summary (i) ................................ range chip ]
[ 5 KPI tiles with per-tile (i) + delta ]
[ Insights & Performance (i) ..................... range chip ]
[ 5 mini insight cards ]
[ Your batches (i) ..... search | status filter | expand ]
[ dense scrollable table ]
[ Silos (i)  |  Alerts (i) ]
```

## Interaction rules
- Global `range` state lives in URL search params → shared by KPI Summary + Insights + Batches table date filter.
- Tab click = local filter only. `Overview` shows all bands; other tabs hide bands that don't match (e.g. `Batches` collapses KPI Summary to just batch-relevant tiles and expands the table).
- All numbers remain clickable → their canonical page with the same filter carried through search params.

## Files
- add: `src/components/ui/InfoDot.tsx`
- add: `src/components/dashboards/DashTabs.tsx`
- add: `src/components/dashboards/KpiSummary.tsx`
- add: `src/components/dashboards/InsightsStrip.tsx`
- add: `src/components/dashboards/BatchesTable.tsx`
- edit: `src/components/dashboards/AdminDashboard.tsx` — new composition, drop old `KpiStrip`, `RecentBatchesCard`, `ActuatorsCard`, `InstallOrdersMini`, `RevenueMini` from this page (they remain available for other roles/pages).
- edit: `src/lib/dashboard-extras.functions.ts` — accept `range` arg, add previous-period counts for delta %, add QC/at-risk/ready-to-ship counters.
- keep: `SilosOccupancyCard`, `RecentAlertsCard` (already dense visuals).

## Notes
- Icons stay only where they're identity (KPI tile leading icon, gear for tab settings, action arrow). No decorative icons in pills, table cells, or tooltip triggers.
- Everything continues to respect dark mode via existing tokens (bg-card, border-border/60, emerald-500 accent).
