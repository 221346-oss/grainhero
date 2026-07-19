## Goals

1. Fix rendering gaps on SuperAdmin surfaces (impersonation banner + reports).
2. Rebuild `SuperAdminDashboard.tsx` to mirror the Admin dashboard shell (WelcomeBanner → hero → insights/filters → bento) but with an MRR-trend hero.
3. Make the top quick-nav role-aware so SuperAdmin gets a **customizable** icon bar (default: Install Orders + 4 others, +Customize popover) — same UX admin already has.

Nothing outside SuperAdmin surfaces will change.

---

## 1. Fix rendering gaps

- **ImpersonationBanner**: no visible entry point when SuperAdmin sits on `/dashboard`. It only renders when session exists — verify Start button on `platform/users` still writes to `gh_impersonation_session` and confirm the "Viewing as" bar shows across all routes. If broken, restore save call.
- **Reports/reporting**: `/platform/reporting` exists. Add a "Reports" quick-tile back into the new dashboard so it isn't orphaned, and make the `/reports` (financial reports) route reachable from the SuperAdmin quick-nav catalog.

## 2. New SuperAdmin dashboard structure

Rewrite `src/components/dashboards/SuperAdminDashboard.tsx` to compose the same primitives Admin uses, plus one SuperAdmin-specific hero:

```text
┌ WelcomeBanner (typewriter, self-vanishing) ────────────────┐
│ Platform KPI Summary  [MTD | WTD | 30D | YTD]              │
│ ┌────────── 65% Hero ──────────┐┌── 35% compact list ─────┐│
│ │ MRR PKR X • +Δ% • 12-mo spark││ Tenants        N        ││
│ │ (click → /platform/financials)│ Users          N        ││
│ │                              ││ Active subs    N        ││
│ │                              ││ Install orders N (open) ││
│ │                              ││ Critical alerts N       ││
│ └──────────────────────────────┘└─────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ Platform Insights strip (4 tiles):                         │
│  Signups WoW · Reporting tickets · Pipeline · Health       │
├────────────────────────────────────────────────────────────┤
│ Recent signups table  │  Recent platform activity          │
└────────────────────────────────────────────────────────────┘
```

Everything is a link — every number jumps to the matching page.

### Files

- **New** `src/components/dashboards/SuperKpiSummary.tsx`
  - 65/35 split; hero = MRR + spark from `getSaasRevenueAnalytics().revenueSeries`; list = Tenants / Users / Active subs / Install orders / Critical alerts (all as `<Link>`).
- **New** `src/components/dashboards/SuperInsightsStrip.tsx`
  - 4 tiles reusing the InsightsStrip visual pattern: Signups (WoW Δ), Reporting tickets (`reportingStats.totalTickets` → `/platform/reporting`), Pipeline (`pipelineTotal` → `/platform/pipeline`), Health (`criticalAlerts` → `/platform/health`).
- **New** `src/components/dashboards/SuperBento.tsx`
  - Left: Recent signups table (existing content, condensed). Right: Recent platform activity from `activity_logs` (limit 6, links to `/platform/audit-logs`).
- **Rewrite** `SuperAdminDashboard.tsx` to:
  - Wrap in `TooltipProvider`, `WelcomeBanner`, then the three sections above.
  - Drop the current "Quick access — Sales / Operations / Monitoring" three-band grid (top-nav pills replace it).

## 3. Role-aware DashboardQuickTabs

Update `src/components/app/DashboardQuickTabs.tsx`:

- Accept role via `useIsSuperAdmin()` hook (already exists).
- Add a second `CATALOG_SUPER` array:
  - `overview → /dashboard` (pinned)
  - `orders → /platform/orders` (default, "Install Orders")
  - `financials → /platform/financials` (default)
  - `users → /platform/users` (default)
  - `plans → /platform/plans` (default)
  - `+ reporting`, `health`, `audit-logs`, `system-logs`, `pipeline`, `leads`, `insurance`, `subscription`, `security`, `launch-readiness` (all opt-in via Customize)
- Storage key becomes role-scoped: `gh_super_tabs_v1` vs `gh_admin_tabs_v3`.
- Default super list: `[overview, orders, financials, users, plans]` (Install Orders is second).

## 4. Small polish

- Ensure `<AdminPageShell>` wrapper is removed from SuperAdmin dashboard so it matches Admin's edge-to-edge look (`min-h-screen p-4 sm:p-6 bg-gradient…`).
- Verify InfoDot descriptions + delta formatting stay under two lines.
- `tsgo` after edits to catch any typing regressions.

## Out of scope

- No schema changes.
- No changes to other dashboards, sidebar catalog, or route registration beyond quick-tabs.
- Reporting/financial data logic already exists — dashboard is view-only over it.
