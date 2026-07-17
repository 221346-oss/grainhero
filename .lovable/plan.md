
## Problem

1. Current skeleton on `/grain-batches` (and other pages) is a generic full-page `DashboardSkeleton` — it doesn't match the actual page composition (header + 5 KPI tiles + toolbar + card grid), it extends full-bleed and overflows the mobile viewport (uploaded screenshot shows skeleton bars running off the right edge and no page container padding).
2. Empty-state text like "Create a silo first →" uses `text-emerald-700` on a nearly-black `bg-white/50` card → in dark mode the underline link fades out / stays on a white patch. Same class-based issues exist on Silos, Sensors, Actuators, Alerts, Settings, and Team pages.
3. Skeletons for Silos, Sensors, Actuators, Alerts, Settings, Team pages don't exist (or reuse `DashboardSkeleton`) — they must mirror the real component layout of each page (same container width, same grid columns, same tile counts).

## Fix strategy

### A. Add page-specific skeletons in `src/components/app/skeletons.tsx`

Each new skeleton wraps in the same container the real page uses (`p-4 md:p-8 max-w-7xl mx-auto`) so it never bleeds edge-to-edge, and uses `bg-muted` tokens (theme-aware) instead of hardcoded slate.

- `GrainBatchesSkeleton` — header row (title block + count pill) → 5 KPI mini-tiles on `grid-cols-2 md:grid-cols-5` → toolbar (search + 2 selects + button) → responsive card grid `sm:grid-cols-2 lg:grid-cols-3` with 6 placeholder batch cards (icon, title, badge, 3 detail lines, action row).
- `SilosSkeleton` — header + 4 KPI tiles + toolbar + card grid of silo tiles (round capacity meter + name + occupancy bar + 2 stats).
- `SensorsSkeleton` — header + 4 KPI tiles + tab strip + table-like list of sensor rows (icon, name, silo, reading pill, status dot, actions).
- `ActuatorsSkeleton` — header + 3 KPI tiles + toolbar + card grid with toggle-switch shaped placeholders and quick-action buttons.
- `AlertsSkeleton` — header + severity filter pills + timeline list of alert cards (icon + title + description + timestamp + action button).
- `SettingsSkeleton` — vertical tab list on the left (sm:col-span-1) + form panel on right with grouped field sections (label + input rows, 2-col on md).
- `TeamSkeleton` — header + role filter row + card grid of member cards (avatar + name/email + role badge + action menu).

All new skeletons follow the same rules:
- Root: `p-4 md:p-8 max-w-7xl mx-auto space-y-6` (never full-bleed).
- Card surfaces: `rounded-xl border bg-card` (theme-aware).
- Bars: `<Skeleton />` (shimmer class already token-based).
- Grid breakpoints exactly match the real page's grid so widths align.

### B. Wire each route to its matching skeleton

Replace `<DashboardSkeleton />` (or bare spinners) in these route files with the page-specific skeleton:

- `src/routes/_authenticated/grain-batches.tsx` → `GrainBatchesSkeleton`
- `src/routes/_authenticated/silos.tsx` → `SilosSkeleton`
- `src/routes/_authenticated/sensors.tsx` → `SensorsSkeleton`
- `src/routes/_authenticated/actuators.tsx` → `ActuatorsSkeleton`
- `src/routes/_authenticated/grain-alerts.tsx` → `AlertsSkeleton`
- `src/routes/_authenticated/settings.tsx` → `SettingsSkeleton`
- `src/routes/_authenticated/team-management.tsx` → `TeamSkeleton`

### C. Dark-mode empty-state cleanup

For every empty-state block on the 7 pages above:
- Replace `border-slate-300 bg-white/50` with `border-border bg-card/60`.
- Replace `text-slate-500` with `text-muted-foreground`.
- Replace `text-emerald-700` links with `text-primary hover:text-primary/80` and keep `underline underline-offset-4` so the link renders correctly under both themes.
- Icon (`Inbox`, etc.) uses `text-muted-foreground` (drop hardcoded opacity that reads wrong on dark card).

### D. Verification

1. `bunx tsgo --noEmit` to confirm imports/exports line up.
2. Playwright at 563px width (matches current viewport) on `/grain-batches`, `/silos`, `/sensors`, `/actuators`, `/grain-alerts`, `/settings`, `/team-management` in both light and dark mode; screenshot to confirm:
   - No horizontal overflow (skeleton bars stay inside container).
   - Skeleton block widths visually align with the real UI once loaded.
   - Empty-state link is readable in dark mode.

## Out of scope

- No changes to business logic, server functions, or data queries.
- No design-token or color-palette changes; only theme-aware replacements of hardcoded slate/emerald/white utilities on these 7 pages.
