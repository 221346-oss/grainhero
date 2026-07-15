# Super Admin + HubSpot + Email Automation

Implements everything in your uploaded spec across three parts. Existing `/platform.*` routes are already the Super Admin area — we'll extend them (rename intent, not URLs, to avoid breaking links) and add the missing pages.

## Part 1 — Super Admin restructuring

### Access control
- Add a Super Admin role gate that hides operational features from Super Admin users in the sidebar and blocks routing to them:
  - Silos, Warehouses, Grain Batches, Sensors, Actuators (IoT config)
- Keep these features fully available to `admin` / `manager` / `technician` — only Super Admin is blocked.
- Enforced in `AppSidebar` (hide links) + `_authenticated/route.tsx` (redirect Super Admin away from `/silos`, `/warehouses`, `/grain-batches`, `/sensors`, `/actuators`).

### Pages (all under existing `/platform.*` namespace)
Already present, will be reviewed/tightened: `platform.index` (dashboard), `platform.tenants`, `platform.users`, `platform.revenue`, `platform.logs`, `platform.orders`, `plans`.

Missing pages to build:
- `/platform/plans` — CRUD for subscription plans (name, price monthly/annual, Stripe price IDs, feature limits: max users, max batches, max silos, storage GB, API calls/mo, feature toggles: AI predictions, advanced analytics, API access, white-label). Uses existing `plan_prices` table + a new `plan_features` JSON column.
- `/platform/health` — System health: server status pills, CPU/memory (from `security_events` + a new lightweight metrics ping), API p50/p95/p99 response time (recorded via middleware), error rates 24h/7d/30d, uptime %, recent incidents.
- `/platform/audit-logs` — filtered view over `activity_logs` + `security_events` (config changes, security events, access logs).
- `/platform/pipeline` — HubSpot deals funnel (see Part 2).
- `/platform/leads` — HubSpot contacts list + activity (see Part 2).

### Dashboard (`platform.index`) additions
Cards for: total tenants (active/trial/churned), total users, MRR, ARR, uptime %, active subs per plan.

## Part 2 — HubSpot CRM integration

### Secrets (server-side only — never `VITE_*` for the API key)
- `HUBSPOT_ACCESS_TOKEN` (added via secrets tool)
- `HUBSPOT_PORTAL_ID` (added via secrets tool)

Note: your spec uses `VITE_HUBSPOT_API_KEY`, but that would leak the token into the browser bundle. We'll call HubSpot from TanStack server functions with the secret token instead.

### Database migration
- `profiles`: add `hubspot_contact_id text`, `hubspot_deal_id text` + indexes.
- New `hubspot_sync_log` (user_id, action, object_type, object_id, status, error_message, created_at) with RLS: super admin read-only, service_role full.

### Files
- `src/lib/hubspot/client.server.ts` — server-only HubSpot client using `@hubspot/api-client`.
- `src/lib/hubspot.functions.ts` — server functions: `createHubspotContact`, `createHubspotDeal`, `updateHubspotDealStage`, `listHubspotDeals`, `listHubspotContacts`. Each logs to `hubspot_sync_log`.
- Deal-stage mapping table from your spec (Trial Started → Closed Won/Lost).

### Integration triggers
- Signup (`auth.signup.tsx` success path) → create contact + deal in `appointmentscheduled`.
- Login counter → increment on `profiles.login_count`; at 3+ push stage `qualifiedtobuy`.
- First warehouse/silo created (`operations.functions.ts`) → `presentationscheduled`.
- Demo request (contact form with `subject=demo`) → `decisionmakerboughtin`.
- Stripe webhook `checkout.session.completed` (`api/public/webhooks/stripe.ts`) → `closedwon`.
- Trial-expired cron → `closedlost`.

### Super Admin views
- `/platform/pipeline` — funnel viz + deal list + actions (send quote / update stage) calling server fns.
- `/platform/leads` — contact list with activity feed.

## Part 3 — Email automation (Resend)

### Secrets
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_ORIGIN` (already partially present, will verify).

### Templates
- New `src/lib/email-templates.ts` with `welcomeEmailHTML`, `day3EmailHTML`, `day10EmailHTML`, `trialEndingEmailHTML`, `reengagementEmailHTML` (verbatim from your spec, escapeHtml included).

### Sending
- `src/lib/email-automation.functions.ts` — server functions: `sendWelcomeEmail`, `sendScheduledLifecycleEmail(userId, stage)`, `sendTrialEndingEmail`, `sendReengagementEmail`. Uses Resend HTTP API. Records sent emails to a new `email_send_log` table so we never double-send.

### Triggers
- **Welcome** — inline server fn call on signup success.
- **Day 3 / Day 10 / Trial Ending / Re-engagement** — new cron route `src/routes/api/public/cron/lifecycle-emails.ts` that runs daily. Signed with a shared secret in `x-cron-secret`. Query users by `created_at`, `trial_ends_at`, `last_login_at`, filter against `email_send_log`, send + record.

### Migration
- `email_send_log` (user_id, email_type, sent_at) with unique(user_id, email_type) to prevent duplicates.
- `profiles`: add `trial_ends_at`, `last_login_at`, `login_count` if not present.

## Technical notes
- No secrets in client bundle: HubSpot + Resend calls run in TanStack server functions / server routes only.
- Cron endpoint under `/api/public/*` requires header `x-cron-secret` matching env `CRON_SECRET`.
- Sidebar hiding + route guards both use the existing `useMyProfile` role check plus a new `is_super_admin(uid)` security-definer SQL function.
- All new tables get GRANTs to `authenticated` + `service_role` and RLS scoped to super admin reads.

## Order of execution
1. Migration: profiles columns, `hubspot_sync_log`, `email_send_log`, `is_super_admin()` fn, plan feature columns.
2. Secrets: `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_PORTAL_ID`, `CRON_SECRET` (Resend already set).
3. `bun add @hubspot/api-client`.
4. HubSpot client + server functions + sync log.
5. Email templates + automation server functions + cron route.
6. Trigger wiring (signup, login, warehouse/silo create, Stripe webhook, contact form demo).
7. Super Admin route gating + sidebar hiding.
8. Build `/platform/plans` (full CRUD), `/platform/health`, `/platform/audit-logs`, `/platform/pipeline`, `/platform/leads`.
9. Extend `/platform/index` dashboard with MRR/ARR/uptime/plan-breakdown cards.

## Open questions
- Confirm HubSpot access token type (Private App recommended — safest for server-side).
- Confirm Resend `from` domain is verified so emails send in production.
- OK to reuse existing `/platform.*` URLs instead of your `/super-admin/*` paths? (existing routes already work; renaming breaks bookmarks and would require redirects.)
