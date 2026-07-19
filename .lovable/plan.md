
# Admin Dashboard — Compact & Revenue-First Refresh

Scope: `src/components/dashboards/AdminDashboard.tsx` and its children only. No business logic changes.

## 1. KPI Summary — 35 / 65 split, revenue on top

Replace the current 5-equal-tile grid with a two-column band:

```text
┌──────────────────────────────┬───────────────────────────────────────────┐
│ REVENUE (35%)                │ 4 mini KPI rows (65%)                     │
│  PKR 128,400   +12% vs prev  │  Buyers  2      Warehouses 2              │
│  Grain Professional · MTD    │  Active  3      Silos      4              │
│  ▁▂▃▅▆▇  tiny sparkline      │  Sensors 3                                │
└──────────────────────────────┴───────────────────────────────────────────┘
```

- Left card (35%): Revenue is the hero — big number in emerald (`text-emerald-600`), current plan chip, delta vs prev, 24px sparkline. Clickable → `/financials` (admin) or `/subscription`.
- Right card (65%): Buyers, Warehouses, Active Batches, Silos, Sensors Online as **compact rows** (icon-less, label left · value right · delta pill). No large icon squares, no `(i)` per row — one `(i)` on the card header. Each row is a `<Link>` with hover ring.
- Range chip stays in the header row.
- Removes ~40% of vertical space vs the current grid.

## 2. Insights & Performance — diversify, theme-safe colors

Current strip is all batch-derived and uses red/yellow. Rebuild with 4 tenant-wide insights, each with a subtle emerald/slate palette (no raw red/yellow):

| Tile | Metric | Source | Accent |
|---|---|---|---|
| QC Health | pending + rejected ratio | grain_batches | emerald / muted |
| Storage Risk | at-risk batches vs total | grain_batches + alerts | amber via `text-amber-600` sparingly on number only |
| Fulfillment | ready-to-ship / dispatched | batches + orders | emerald |
| Automation | actuators on / total + open alerts | actuators + alerts | slate + emerald dot |

- Layout: 4 columns on lg, 2 on sm, single card height ~72px.
- Colors: value colored, card stays neutral (`bg-card`, `border`). Use `text-emerald-600`, `text-amber-600`, `text-slate-500` only. No `bg-red-*`, `bg-yellow-*`.
- Each tile deep-links to its filtered page (e.g. QC → `/grain-batches?status=qc_pending`).

## 3. Top Nav Tabs → icon buttons in the app topbar

Move `DashTabs` out of the dashboard body and into the existing topbar next to the search bar.

- New component `src/components/app/DashboardQuickTabs.tsx` rendered by `AppSidebar`'s header/topbar area (or the header slot the search lives in).
- Rendered as **icon-only pill buttons**; label appears on hover/focus as a tooltip and inline when the tab is active (image ref 45 behavior).
- Max 5, still customizable via the existing gear popover.
- Icons: Overview `LayoutDashboard`, Silos `Container`, Batches `Wheat`, Alerts `Bell`, Marketplace `Store`, Sensors `Radio`, Actuators `ToggleRight`, Buyers `Users`, Orders `Package`, Team `UserCog`.
- Only shown on `/dashboard` route (hide elsewhere).

## 4. AI section highlighted in the same tab bar

Add a separate, always-visible AI cluster to the right of the custom tabs — this is the primary selling point:

```text
[Overview] [Silos] [Batches] [Alerts] [Marketplace]  │  ✨ AI ▸ [Predictions] [Spoilage] [Insights]
```

- Rendered with an emerald gradient chip (`bg-gradient-to-r from-emerald-500 to-emerald-600 text-white`) and a `Sparkles` icon.
- Clicking each AI tab routes to the actual AI page (`/ai-predictions`, `/ai-spoilage-detection`, `/ai-insights`).

## 5. "Page-loads-inside-dashboard" feel

When a non-Overview tab is selected:

- Instead of navigating away, keep the user on `/dashboard` and swap the dashboard body for the target page's **existing skeleton** for ~200ms then render an inline embed of that page's primary panel (reuse the route's default component through a lightweight `<PageEmbed name="silos" />` wrapper that renders the same query + table used by the dedicated route).
- Overview tab renders the full dashboard.
- Clicking the tab a second time (or a "Open full page ↗" link in the embed header) navigates to the standalone route.
- Uses the existing skeletons from `src/components/app/skeletons.tsx` (`SilosSkeleton`, `BatchesSkeleton`, etc.) during the transition — no new skeletons needed.

## 6. Files touched

- Edit: `src/components/dashboards/KpiSummary.tsx` — rewrite to 35/65 split.
- Edit: `src/components/dashboards/InsightsStrip.tsx` — 4 diversified tiles, theme colors.
- Edit: `src/components/dashboards/AdminDashboard.tsx` — remove old `DashTabs`, add `PageEmbed` slot.
- New: `src/components/app/DashboardQuickTabs.tsx` — icon tabs + AI cluster, mounted in topbar.
- New: `src/components/dashboards/PageEmbed.tsx` — maps tab key → embedded panel + skeleton.
- Edit: `src/components/app/AppSidebar.tsx` (topbar/header area) — mount `DashboardQuickTabs` next to search on `/dashboard`.
- Data: extend `getDashboardExtras` return with `revenueMtd`, `revenueSpark` (12-point series) and `plan.name` so revenue card has real numbers without extra requests.

## Technical notes

- Sparkline: inline SVG polyline, no new deps.
- Tooltips already provided by `TooltipProvider` in `AdminDashboard`.
- Revenue value formatting via `Intl.NumberFormat('en-PK', { style:'currency', currency:'PKR', maximumFractionDigits:0 })`.
- All colors stay within existing tokens: `emerald-500/600`, `amber-600` (numbers only), `slate-500`, `border`, `bg-card`, `muted`.
- No changes to routes, sidebar links, or server functions beyond the two extra fields on `getDashboardExtras`.
