## Goal
Fix the messy first-impression app chrome. Take direct inspiration from Slack's **Electric Fusion** theme (lime-yellow sidebar, mint-green selected state, purple accents) and the Slack layout you shared (dense left rail, workspace column, main content column). Strip the "GrainHero" wordmark from the sidebar header, top bar, and other chrome spots.

## Palette (from your Electric Fusion picks)
Wired into `src/styles.css` as semantic tokens (light + dark):
- `--nav` (system navigation / sidebar): `#DCF095` (light) · `#1a1f14` (dark)
- `--nav-foreground`: near-black in light, lime-white in dark
- `--selected` (active nav row): `#ADFFBC` (light) · `#2b6b3a` (dark)
- `--presence` (online dot, avatars): `#C674F2`
- `--notify` (badges, unread): `#C674F2` → hot-pink accent option for alerts
- `--accent-lime`: `#DCF095`, `--accent-mint`: `#ADFFBC`, `--accent-grape`: `#C674F2`
- Gradient `--gradient-fusion`: `linear-gradient(135deg,#DCF095 0%,#ADFFBC 100%)` (used for logo tile, hero pills, key CTAs)

Existing shadcn tokens (`--primary`, `--sidebar`, `--sidebar-accent`, `--ring`, etc.) get re-pointed to the new palette so every screen re-skins for free — no per-page rewrites.

## Layout inspired by Slack
Two-column shell inside `_authenticated/route.tsx`:

```text
┌────┬──────────────────────────────────────────────┐
│ R  │  ┌─ top bar (search · presence · avatar) ──┐ │
│ a  │  │                                          │ │
│ i  │  └──────────────────────────────────────────┘ │
│ l  │  main content                                 │
└────┴──────────────────────────────────────────────┘
```

- **Left rail** (72px, lime `--nav`): compact icon-only shortcuts — Home, Search, DMs, Activity, More, Admin/Settings at bottom, avatar w/ purple presence dot. Slack-style.
- **Main column**: sticky top bar with a real search input (Slack-style pill), notifications bell w/ purple dot, avatar menu. No "GrainHero" text anywhere in chrome.
- **Sidebar nav** (current grouped nav) collapses into a secondary drawer that opens from the rail on desktop-wide, and is the default sidebar on narrow screens — keeps all existing routes, just re-skinned.

## Changes
1. **`src/styles.css`** — add Electric Fusion tokens (light + dark), gradients, `--nav*`, `--selected*`, `--presence`, `--notify`; repoint `--sidebar`, `--sidebar-accent`, `--sidebar-primary`, `--primary`, `--ring` to the new palette.
2. **`src/components/app/AppSidebar.tsx`** — replace green "G" tile + "GrainHero / ADMIN" text with a small gradient tile only (no wordmark). Active row uses `bg-[--selected]` w/ dark text. Section labels use muted-on-lime. Footer sign-out icon-only in collapsed state.
3. **`src/routes/_authenticated/route.tsx`** — new two-column shell: 72px `IconRail` + existing `AppSidebar` as secondary drawer. Top bar becomes: `SidebarTrigger` (mobile) · search pill (grows) · notifications button (purple dot) · avatar. Remove the "GrainHero" text.
4. **New `src/components/app/IconRail.tsx`** — Slack-style vertical icon rail with tooltips, lime background, mint active pill, purple presence dot on avatar.
5. **Dashboard header polish** — the "GrainHero ADMIN" chip shown in your last screenshot lives in `src/components/dashboards/_shared.tsx` (or the per-role dashboard header). Replace with just a gradient avatar tile + role name.

## Out of scope
- No changes to routes, data fetching, server functions, or business logic.
- Individual page bodies (silos, sensors, etc.) are not rewritten — they re-skin automatically via the new tokens.
- Dark mode gets a tuned variant of the same palette (deep charcoal + lime accents) but no theme switcher is added in this pass.

## Verification
- `tsgo --noEmit` after edits.
- Playwright screenshot at 563×568 (current preview viewport) and 1280×800 to confirm the new rail, top bar, and dashboard header look right in both light and dark.
