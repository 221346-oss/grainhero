## Scope discovered

`frontend_code/app/[locale]/(authenticated)/` contains **44 route folders** and 4 role-dashboard components (SuperAdmin, Admin, Manager, Technician). That's too much to port in one pass without prioritization — so I'm splitting it into 5 phases, each with an explicit **cron / edge / server-fn audit** as you requested.

## Phase 3 — Authenticated shell + role routing (this next step)

Port the app chrome and the 4 role dashboards so login lands somewhere real.

Files to create:
- `src/routes/_authenticated/route.tsx` — integration-managed gate (already correct pattern; verify `ssr:false` + `getUser()` redirect to `/auth`).
- `src/components/app/AppSidebar.tsx` — port `frontend_code/components/sidebar.tsx`, role-aware nav (super_admin/admin/manager/technician menus).
- `src/components/app/AppShell.tsx` — top bar + sidebar layout with `<Outlet/>`.
- `src/routes/_authenticated/dashboard.tsx` — reads `user_roles`, renders the matching dashboard component below.
- `src/components/dashboards/{SuperAdmin,Admin,Manager,Technician}Dashboard.tsx` — 1:1 UI port, mock data initially, real queries wired in Phase 4.
- `src/routes/_authenticated/not-allowed.tsx` — role-gated fallback.
- `src/lib/roles.functions.ts` — `getMyRole()` server fn (uses `requireSupabaseAuth` + `has_role`).

**Cron / edge audit for Phase 3:** none required. Pure UI + one auth-gated server fn. No webhooks, no scheduled work.

## Phase 4 — Core operational pages (real Supabase data)

Pages: `warehouses`, `silos`, `grain-batches`, `sensors`, `actuators`, `grain-alerts`, `alerts`, `buyers`, `payments`, `invoices`, `profile`, `settings`, `notifications`, `notification-settings`.

For each: list + detail + create/edit form, server fns backed by RLS.

**Cron / edge audit for Phase 4:**
- **Cron needed:** `alerts-escalation` (every 5 min) — scan `grain_alerts` where `status='open'` past SLA, mark escalated, insert notification rows. Implement as TanStack server route `/api/public/hooks/alerts-escalation` + `pg_cron` calling it with `apikey` header.
- **Cron needed:** `sensor-offline-detector` (every 2 min) — flag `sensor_devices` where `last_seen < now() - 5min` as `offline`, emit `grain_alerts`.
- **Edge / webhook:** none in this phase.

## Phase 5 — Firebase sensor bridge (this is your "sensor readings come from Firebase" answer)

Two viable patterns; recommending **Option A** you already picked:

- **TanStack server route** `/api/public/hooks/firebase-sensor-ingest` — Firebase Cloud Function or Realtime Database `onWrite` trigger posts each new reading here. Route verifies HMAC signature (`FIREBASE_INGEST_SECRET` via `add_secret`), validates payload with Zod, writes to `sensor_readings` via `supabaseAdmin`, and evaluates thresholds → inserts `grain_alerts` when breached.
- Client dashboards then use **Supabase Realtime** (already enabled on `sensor_readings`, `grain_alerts`, `grain_batches`) — no direct Firebase read from the browser.

**Cron / edge audit for Phase 5:**
- **Webhook (edge-style):** the ingest route above. Public prefix, signature-verified.
- **Cron needed:** `sensor-rollups` (every 15 min) — aggregate `sensor_readings` into hourly/daily buckets for charts, so dashboards don't scan raw rows.
- **Optional cron:** `firebase-poll-fallback` — only if you also want a pull path when the Firebase push webhook is down. Skipping unless you ask.

Deliverable at end of Phase 5: live temperature/humidity/CO2 streams from your existing Firebase into Supabase, feeding realtime dashboards.

## Phase 6 — Analytics, AI, reporting

Pages: `analytics`, `global-analytics`, `data-visualization`, `reports`, `ai-analytics`, `ai-predictions`, `ai-spoilage`, `model-performance`, `environmental`, `traceability`, `incidents`, `maintenance`, `insurance`.

- AI features use Lovable AI Gateway (default) via server fn — no third-party keys needed.

**Cron / edge audit for Phase 6:**
- **Cron needed:** `ai-spoilage-nightly` (02:00) — run spoilage risk model over active `grain_batches`, upsert predictions.
- **Cron needed:** `report-digest-weekly` (Mon 07:00) — build weekly PDF/email digest per admin tenant.
- **Edge:** none.

## Phase 7 — Admin, billing, security, super-admin

Pages: `super-admin`, `team-management`, `users`, `plans`, `plan-management`, `billing`, `checkout`, `revenue-management`, `subscriptions`, `security`, `security-center`, `system-health`, `system-logs`, `server-monitoring`, `activity-logs`, `mobile`.

- Role management uses admin server fns gated by `has_role(_, 'super_admin')` or `'admin'`.
- Stripe billing via existing Stripe knowledge if you want real payments; otherwise stub UI.

**Cron / edge audit for Phase 7:**
- **Webhook:** Stripe `/api/public/hooks/stripe-webhook` (only if enabling real billing) — signature-verified, updates `subscriptions`.
- **Cron needed:** `subscription-renewals-check` (daily 06:00) — flag subs expiring in 7 days, notify admins.
- **Cron needed:** `activity-logs-retention` (daily 03:00) — delete `activity_logs` older than N days (SQL-only cron, no route).

## Executing this turn

I'll build **Phase 3 only** now (shell + 4 role dashboards + role gate). No cron/edge work required for Phase 3. After you confirm the login flow lands correctly, I'll move to Phase 4 and stand up the first cron jobs listed above.

If you want a different order (e.g., Phase 5 Firebase bridge first, before feature pages), say so and I'll reshuffle. Otherwise I proceed with Phase 3 immediately.