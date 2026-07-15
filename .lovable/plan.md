# Alignment Plan

## 1. Super Admin scope cleanup
**Keep** (platform-owner only): global analytics, tenants, users, revenue/subs, plans & pricing, feature flags, usage limits, system health, audit logs, security, platform alerts, HubSpot pipeline & leads.

**Remove from super_admin nav & routes** (operational — Admin/Manager only): Silos, Warehouses, Grain Batches, Sensors, Actuators, individual IoT device configuration.

Changes:
- `AppSidebar.tsx`: verify super_admin sees only platform items (no Silos/Warehouses/Batches/Sensors/Actuators). Admin/Manager keep them.
- `_authenticated/route.tsx`: redirect super_admin away from those operational routes to `/platform`.
- Admin/Manager dashboards keep the operational shortcuts.

## 2. Restore previous skeleton loaders
User rejected the branded GrainHero spinner. Revert `src/components/app/skeletons.tsx` to the previous lightweight grey pulse skeletons (`Stats`, `List`, `Table`, `Cards`, `Form`, `Dashboard`, `InlineList`) — no full-screen brand loader. Keep the same exported names so all imports keep working.

## 3. Auth / session behavior
Problem: every login forces OTP; no password step; session appears short.

Fixes:
- **Signup**: user sets password → email OTP verification (already exists).
- **Login flow (`auth.login.tsx`)**: 
  - Step 1: email + **password** (real inputs with proper `placeholder`s and `autoComplete`).
  - Step 2: OTP only if the account has MFA enabled or on first device; otherwise `signInWithPassword` completes login directly. Do **not** always send OTP.
- **Session timeout = 24h**: configure Supabase client with `persistSession: true`, `autoRefreshToken: true`; add a client-side idle/expiry guard in `SessionGuard.tsx` that signs the user out exactly 24h after `signed_in_at` (stored in localStorage on login, cleared on logout).
- Placeholders everywhere: "you@company.com", "Enter your password", "6-digit code".

## 4. Platform dashboard widgets (finish Phase 4)
On `/platform` overview (`platform.index.tsx`) replace the three placeholders with live data:
- **Recent Signups** — last 10 rows from `profiles` ordered by `created_at desc` (name, email, plan, joined).
- **System Alerts** — latest 10 `grain_alerts` with severity=critical/high across all tenants.
- **Global Analytics** — small charts: signups per day (30d), active tenants, MRR trend (reuse `getSaasRevenueAnalytics`).

Add one server fn `getPlatformOverviewWidgets` (super_admin only, uses `supabaseAdmin` after `has_role` check) returning `{ recentSignups, systemAlerts, signupsSeries }`.

## Technical notes
- No schema changes required.
- All new reads go through `createServerFn` + `requireSupabaseAuth` + super_admin check.
- Skeleton revert is presentation-only.
- Login change is frontend + Supabase client config only.

## Out of scope
- HubSpot pipeline UI already shipped; no changes here.
- Email automation already shipped; no changes here.
