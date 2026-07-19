
# Role-Aware Sidebar Shrink + Dashboard Command Centers

## Guiding principles

1. Sidebar = permanent muscle memory only. Max **6 pinned items + Home + Settings** per role. Everything else lives in **More** and on the dashboard.
2. Dashboard = command center. KPI tiles are the primary nav for secondary pages (click → drill in). Each dashboard fits in ~1.5 viewport heights (no infinite scroll).
3. AppSearch (⌘K) is the safety net — every removed sidebar item stays discoverable there.
4. Layouts use a **12-col bento grid** on desktop, **stacked accordion** on mobile. No stat card wider than 3 cols; charts max 6.

---

## 1. Sidebar reshape (single `AppSidebar.tsx` rewrite)

### Super Admin (6)
Home · Financials · Marketplace Ops · Insurance · Launch Readiness · Install Orders
→ More: Users, Leads, Pipeline, Health, Logs, Audit Logs, Metrics, Dashboards, SLA Alerts, Disputes, Returns, Quality, Reviews, Logistics (3), Finance (3), Mobile (5), Plans, Field Settings, Sellers, Messages, Invoice Failures

### Admin (6)
Home · Batches · Silos · Sensors · Alerts · Marketplace
→ More: Actuators, Warehouses, Buyers, Listings, Sales, Revenue, Earnings, Analytics, AI Predictions, ML Models, Reports, Data Viz, Traceability, Environmental, Incidents, Maintenance, Device Health, Insurance, Subscription, Plan Mgmt, Activity Logs, Notifications

### Manager (6)
Home · Batches · Silos · Sensors · Alerts · Orders
→ More: Actuators, Warehouses, Buyers, Listings, Sales, Analytics, Reports, Maintenance, Incidents, Environmental, Traceability, Notifications

### Technician (5)
Home · My Installs · Sensors · Actuators · Alerts
→ More: Silos, Maintenance, Incidents, Environmental, Device Health, Traceability, Notifications

### Footer (all roles)
Team · Settings · Sign out

---

## 2. Dashboard command centers (redesign, no new routes)

Every dashboard follows the same **3-band bento** so users learn one pattern:

```
┌─────── Band A: 4 KPI tiles (clickable → deep link) ───────┐
├──── Band B: Primary work surface (chart | list | map) ────┤
└──── Band C: Quick actions grid (6-8 icon tiles → More) ───┘
```

### 2.1 SuperAdmin `/dashboard`
- **A**: MRR · Active tenants · Open disputes · Failed webhooks
- **B**: Split 8/4 → Revenue trend chart | Recent platform activity feed (unified)
- **C**: 8 quick-tiles → Users, Leads, Pipeline, Health, Logs, Metrics, SLA Alerts, Logistics
- **Right rail** (desktop only, hidden mobile): Launch readiness score + pending moderation queue

### 2.2 Admin `/dashboard`
- **A**: Active batches · Silos at risk · Open alerts · Revenue this month
- **B**: 8/4 → Silo condition heatmap | Alerts stream
- **C**: 8 quick-tiles → Buyers, Listings, Sales, Analytics, AI Predictions, Reports, Insurance, Subscription
- **Right rail**: Plan usage meter + pending team invites

### 2.3 Manager `/dashboard`
- **A**: Batches in cycle · Sensors offline · Today's alerts · Orders to fulfil
- **B**: 8/4 → Batch pipeline kanban | Sensor grid mini
- **C**: 6 tiles → Warehouses, Buyers, Sales, Reports, Maintenance, Incidents

### 2.4 Technician `/dashboard`
- **A**: Installs today · Open tasks · Devices offline · Overdue maintenance
- **B**: 8/4 → Install schedule timeline | Assigned actuator queue
- **C**: 6 tiles → Sensors, Silos, Maintenance, Incidents, Device Health, Traceability

---

## 3. Anti-scroll rules applied to every existing page

- Wrap header + KPI band in `sticky top-0` where useful.
- Convert vertical stat lists → 2/4-col grids (`grid-cols-2 lg:grid-cols-4`).
- Replace tall empty-state cards with 1-line inline notices.
- Move any secondary chart into a `<Tabs>` next to the primary chart instead of stacking.
- Cap max-width at `max-w-7xl mx-auto`; use 2-col split on desktop for detail pages.

---

## 4. Files to change

- `src/components/app/AppSidebar.tsx` — rewrite `pinnedNav` per role, expand `moreGroups`.
- `src/components/dashboards/SuperAdminDashboard.tsx` — apply bento 3-band; wire tiles to routes.
- `src/components/dashboards/AdminDashboard.tsx` — same.
- `src/components/dashboards/ManagerDashboard.tsx` — same.
- `src/components/dashboards/TechnicianDashboard.tsx` — same.
- `src/components/dashboards/DashboardBlocks.tsx` — add reusable `KpiTile` (clickable), `QuickActionTile`, `RightRail`.
- Small polish sweep on 4 highest-scroll pages: `platform.financials.tsx`, `orders.tsx`, `grain-alerts.tsx`, `sensors.tsx` (grid density + sticky headers).

No route file changes, no data model changes, no new pages. Search bar continues to index every route so nothing gets lost.

---

## 5. Verification

After each dashboard edit: typecheck + open preview at 1440×900 and 390×844 (mobile) and confirm dashboard fits in ≤ 1.5 viewport heights, all tiles clickable, sidebar shows only pinned items for that role.
