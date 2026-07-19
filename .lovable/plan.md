# Admin Dashboard — Topbar Nav + KPI Split Fix

## 1. Fix KPI Summary split (revenue dominant)

`src/components/dashboards/KpiSummary.tsx`
- Swap grid to `md:grid-cols-[1fr_35%]` so **Revenue hero = LEFT 65%**, compact list = RIGHT 35%.
- Revenue card: keep big emerald PKR value, plan chip top-right, delta + "12-mo trend" line, sparkline full width; scale value to `text-3xl md:text-4xl` since it now has room.
- Right list: unchanged (icon-less rows, delta pill, deep links). Slightly tighter row padding to fit 5 rows at 35%.
- Single `(i)` stays only on the section header.

## 2. Topbar tabs = navigation shortcuts, NOT dashboard filters

`src/components/app/DashboardQuickTabs.tsx`
- Remove the "active tab filters the dashboard body" behavior entirely. Stop using `useDashboardTab` for click handling.
- Every pill becomes a `<Link to="…">` to the real route (Silos → `/silos`, Batches → `/grain-batches`, Alerts → `/alerts`, Marketplace → `/marketplace`, Sensors → `/sensors`, Actuators → `/actuators`, Buyers → `/buyers`, Orders → `/orders`, Team → `/team-management`).
- **Overview** pill added as first item → links to `/dashboard`. This replaces the "pinned overview" tab concept.
- Active state = current route matches the pill's `to` (via `useRouterState` pathname). Active pill: emerald pill + label visible; inactive: icon-only round button with tooltip.
- Show topbar on **every authenticated route**, not just `/dashboard`, so it feels like a fixed nav (the sidebar is already fixed).
- Keep the ⚙️ customize popover (max 5 visible, Overview pinned) — user already liked this.
- **Remove the AI cluster** from the topbar (user rejected AI mentions in sidebar; keep AI links reachable only via their own pages/search).

## 3. "Page loads inside the dashboard" feel

`src/routes/_authenticated/route.tsx` (already renders topbar in the shell)
- Wrap `<Outlet />` in a `motion.div` keyed by `pathname` with a 180ms opacity + 4px translateY fade-in. With the fixed sidebar + fixed topbar staying mounted, only the content region animates — giving the "page loads into the dashboard frame" impression.
- No route-level changes needed; skeletons per route already handle loading.

## 4. Sidebar: swap Overview slot for collapse toggle

`src/components/app/AppSidebar.tsx`
- Remove the "Overview / Dashboard" nav item from the sidebar list (it now lives in the topbar).
- In its place at the top of the sidebar, render the sidebar open/close toggle icon (uses existing `SidebarTrigger`), styled like a nav row so it occupies the same visual slot.
- Remove any lingering "AI" section/labels from the sidebar (user: "no need of ai mentions").

## 5. Dashboard body cleanup

`src/components/dashboards/AdminDashboard.tsx`
- Delete the `useDashboardTab` filtering logic and the `switching` opacity effect (motion now lives at the route Outlet).
- Always render: KpiSummary → InsightsStrip → BatchesTable → (Silos + Alerts grid). Single continuous scroll; topbar no longer hides/shows bands.
- Keep `RangeChip` in KpiSummary for period comparison.

## 6. Cleanup

- `useDashboardTab.ts` becomes unused → delete.
- Remove `DashTabs.tsx` if no other consumer (grep).
- Typecheck.

## Technical notes
- Fixed topbar already exists in `_authenticated/route.tsx`; only its content and the Outlet wrapper change.
- No backend / server-fn changes.
- No new dependencies (framer-motion already installed).
