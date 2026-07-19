# Admin Dashboard — Simplify & Animate

## Goal
Replace the static header + verbose blocks with an animated welcome that self-destructs, then let a denser, more visual bento fill the reclaimed space. Remove redundancy (role badge, Team mini — already in sidebar).

## 1. Animated Welcome Banner (self-vanishing)
New component `src/components/dashboards/WelcomeBanner.tsx`:
- Typewriter animation: `Welcome back, {name}` (char-by-char, ~40ms/char, blinking caret).
- Hold ~1.6s after typing completes.
- Fade + collapse height to 0 (framer-motion `AnimatePresence` + `layout` animation on parent grid so blocks below animate upward smoothly).
- Session-scoped: use `sessionStorage` key `gh_welcome_shown` so it only plays on first dashboard visit per session (not every re-render / tab switch).
- Reduced-motion: if `prefers-reduced-motion`, skip typing → show static line for 1s → vanish.

## 2. AdminDashboard header cleanup
In `src/components/dashboards/AdminDashboard.tsx`:
- Remove `AdminPageShell`'s title/subtitle/actions (no "Admin — Name", no "Tenant overview…", no Admin badge).
- Wrap content in a plain padded container with `motion.div layout` so children reflow when the banner unmounts.
- Render `<WelcomeBanner name={name} />` at the top, above the KPI strip.

## 3. Simplify blocks (less text, more visual)
Goal: every card = 1 line title + dense visual. No descriptions, no helper copy.

- `KpiStrip` (keep, already compact): drop the `delta` text row entirely — just number + icon. Sparkline optional later.
- `SilosOccupancyCard`: replace list rows with a compact **horizontal bar stack** — one thin bar per silo, colored by fill band (emerald < 70, amber 70–90, red > 90), silo name only on hover tooltip. Header: just "Silos" + count pill.
- `ActuatorsCard`: replace text rows with a **status dot grid** (e.g. 6-col grid of dots colored on/off/fault) + tiny legend. Header: "Actuators".
- `RecentAlertsCard`: keep list but drop the description/second line; show severity dot + title + relative time only. Cap at 4 rows.
- `RecentBatchesCard`: convert to compact table (batch code · status pill · qty) — no meta paragraph.

## 4. Remove redundancy
- Delete `<TeamMini />` from the dashboard (already pinned in sidebar).
- Restructure secondary strip into 2 columns: `InstallOrdersMini` + `RevenueMini`.
- Both minis: keep number + tiny status split (e.g. mini stacked bar for install statuses, single number + delta for revenue). Strip descriptive sentences.

## 5. Final layout
```text
[ Welcome banner — vanishes ]
[ KPI strip: 5 tiles, no delta text ]
[ Silos (bar stack) | Alerts (dot list) ]
[ Actuators (dot grid) | Batches (mini table) ]
[ Install Orders | Revenue ]
```
All cards `p-3`, `text-sm` titles, tabular-nums for numbers, emerald hover ring preserved.

## Technical notes
- Use `framer-motion` (already a common dep — verify with `bun pm ls framer-motion`; if missing, `bun add framer-motion`).
- `AnimatePresence mode="popLayout"` on the dashboard root so removing the banner triggers `layout` transitions on siblings.
- Typewriter: pure `useEffect` + `setInterval`, no extra dep.
- Skeleton (`DashboardSkeleton`) stays as-is; banner not shown during skeleton phase.

## Files touched
- add: `src/components/dashboards/WelcomeBanner.tsx`
- edit: `src/components/dashboards/AdminDashboard.tsx` (remove header, add banner, drop TeamMini, restructure grid)
- edit: `src/components/dashboards/DashboardBlocks.tsx` (simplify Silos, Actuators, Alerts, Batches visuals + remove descriptive text)
- edit: `src/components/dashboards/KpiStrip.tsx` (drop delta line)
- edit: `src/components/dashboards/MiniBlocks.tsx` (simplify InstallOrders + Revenue, remove TeamMini export usage)
