# Manager Dashboard Redesign

Rebuild the Manager dashboard to mirror the Admin dashboard's structure (WelcomeBanner → QuickTabs → KpiSummary → Bento) while keeping the Manager's operational focus. Preserve the current "card-within-card-within-scrollable" pattern used by `ViewBatchesCard` — it is the interaction model for every action block.

## Layout (top → bottom)

```text
┌────────────────────────────────────────────────────────────┐
│ WelcomeBanner  (typewriter, collapses after 4s)            │
├────────────────────────────────────────────────────────────┤
│ RangeChip (today/7d/30d/mtd/ytd)                           │
├────────────────────────────────────────────────────────────┤
│ ManagerKpiSummary   65 / 35 split                          │
│  ┌─────── Hero: Silo Fill % ────┐ ┌── KPI list ───────┐    │
│  │ big % + sparkline of avg     │ │ Batches (deltas)  │    │
│  │ occupancy over range         │ │ Open Alerts       │    │
│  │ CTA: Silo Management         │ │ Pending QC        │    │
│  └──────────────────────────────┘ │ Dispatch ready    │    │
│                                    │ Active Actuators  │    │
│                                    └───────────────────┘    │
├────────────────────────────────────────────────────────────┤
│ ManagerBento  (2-col md, 3-col xl)                         │
│ ┌── Ops split (LEFT) ──────┐  ┌── Fulfillment (RIGHT) ──┐  │
│ │ Silos live list          │  │ Dispatch queue          │  │
│ │  (scrollable, inline     │  │  (FIFO suggestions,     │  │
│ │   temp/humidity chips)   │  │   Dispatch button)      │  │
│ │ Alert triage             │  │ Pending QC queue        │  │
│ │  (Ack / Resolve inline)  │  │  (Approve / Reject)     │  │
│ │ Actuator quick toggles   │  │ Buyer orders to fulfill │  │
│ │  (fan / heater on-off,   │  │  (compact rows)         │  │
│ │   inside scrollable card)│  │                         │  │
│ └──────────────────────────┘  └─────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│ Team & Tasks strip (full width)                            │
│  Technician assignments · Open tasks · SLA countdown       │
├────────────────────────────────────────────────────────────┤
│ CustomWidgetsBand (kept, unchanged)                        │
└────────────────────────────────────────────────────────────┘
```

## Interaction rules (per user)

- **Cards-within-cards-within-scrollable** is the norm. Each bento block is a card whose body contains a bordered inner card with a `max-h` scroll region and inline row actions — same pattern as `ViewBatchesCard`.
- Density: compact rows, small pills, medium padding (h-9 rows, text-xs/text-sm).
- Every number is a link that deep-links to its filtered page.
- Manager focus = management, not decoration → drop hero animations and the big `StatCard` grid; replace with `ManagerKpiSummary` and dense operational lists.

## Quick tabs (topbar)

Add Manager preset in `DashboardQuickTabs.tsx`:
default = `Overview, Silos, Batches, Alerts, Dispatch`, catalog also includes `Orders, Sensors, Actuators, Team, Warehouses, Reports, Marketplace, Buyers`. User can customize (max 5, Overview pinned).

## Data

One new server fn `getManagerDashboard({ range })` in `src/lib/manager-dashboard.functions.ts`:
- KPIs: silo fill %, batches counts + prior-window delta, open/critical alerts, pending QC count, dispatch-ready count, active actuators.
- Rows: top 10 silos (name, fill %, temp, humidity, status), top 10 active alerts, top 10 pending-QC batches, top 10 dispatch-ready batches, top 10 buyer orders to fulfill, actuators (id, name, on/off, silo).
- Team: technicians in tenant + open field_incidents/tasks for SLA.

Wire silo-fill sparkline from a simple time-bucket over `grain_batches` occupancy or `sensor_readings` averages (best-effort — fall back to current fill if no history).

## Files

**New**
- `src/lib/manager-dashboard.functions.ts` — `getManagerDashboard` server fn.
- `src/components/dashboards/ManagerKpiSummary.tsx` — 65/35 hero + KPI list (mirrors `KpiSummary.tsx`).
- `src/components/dashboards/ManagerBento.tsx` — 2-column bento with 6 scrollable inner cards + inline actions.
- `src/components/dashboards/ManagerTeamStrip.tsx` — technicians & open-task strip.

**Edited**
- `src/components/dashboards/ManagerDashboard.tsx` — replace body with `<WelcomeBanner /> <RangeChip /> <ManagerKpiSummary /> <ManagerBento /> <ManagerTeamStrip /> <CustomWidgetsBand />`. Keep `useDashboardStats` for backwards compat but source real data from new server fn.
- `src/components/app/DashboardQuickTabs.tsx` — add Manager catalog + default, gate on role via `useMyProfile`/role hook already in tree.

**Untouched**
- Admin/SuperAdmin dashboards, sidebar, existing pages, business logic, DB schema.

## Verification

- Route: `/dashboard` as manager — visual check at 525px and desktop.
- Deep-links: click every KPI + inline row → lands on correct filtered page.
- Inline actions: Ack alert, Approve QC, Dispatch, toggle actuator — all use existing server fns already wired on their respective pages.
- Typecheck via build.
