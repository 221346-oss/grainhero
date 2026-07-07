# Super-Admin Revenue + Admin Plan Management

Two related surfaces plus a shared expiry-alert engine.

---

## 1. Super-Admin Revenue Dashboard (`/revenue`)

Rebuild the existing `revenue.tsx` (super-admin only) as a full analytics page.

**KPI cards**
- MRR (sum of active monthly-normalized subscriptions)
- Total revenue (all-time, from paid invoices)
- Active subscribers / Trial / Cancelled
- Churn rate (last 30d)
- Expiring in next 7 days

**Charts** (Recharts, already in project)
- Revenue over time (line, 30/90/365-day toggle)
- Revenue by plan (stacked bar: Starter/Professional/Enterprise)
- Subscriber growth (area chart)
- Plan distribution (pie chart)

**Tables**
- Recent transactions (invoices)
- Subscriptions expiring soon (with "Send reminder" button)
- Top customers by revenue

**Actions**
- "Trigger expiry emails now" button → runs the reminder job on demand
- Export CSV of revenue for accounting

Data comes from a new `getRevenueAnalytics` server fn (super_admin gated) that aggregates from `subscriptions` and `invoices`.

---

## 2. Admin Subscription Management (`/subscription`)

Extend existing `subscription.tsx` for tenant admins.

**Current plan card** — shows plan name, next renewal, usage bars (already exists).

**New actions**
- **Upgrade / Downgrade** → opens plan picker; calls Stripe API to swap the subscription item (prorated). Uses `stripe.subscriptions.update` server-side.
- **Cancel subscription** → confirm dialog; calls `stripe.subscriptions.update({cancel_at_period_end: true})`. Shows "Cancels on <date>" banner after.
- **Resume** (if cancel_at_period_end true) → clears cancellation.
- **Manage billing** (Stripe portal) — already exists.

**Alert preferences (in Settings → Notifications tab)**
- Toggle: Email me when plan is about to expire (7/3/1 day)
- Toggle: Browser push notification for expiry
- Stored in `profiles.preferences` JSONB.

---

## 3. Expiry Alert Engine

**Server fn `sendExpiryReminders`** (callable manually by super-admin + via cron)
- Finds subscriptions where `end_date` falls in {7, 3, 1} days and status='active'.
- Sends email via **Resend connector** (project already has `RESEND_API_KEY`).
- Sends browser push via existing web-push setup (`WEB_PUSH_*` secrets present).
- Writes `security_events` audit row per notification to prevent duplicate sends within the same day/threshold.

**Automation** — pg_cron job runs daily at 09:00 UTC calling
`/api/public/hooks/expiry-reminders` (server route, apikey-authed) which invokes the reminder fn.

**Templates**
- Subject: "Your Grainheroo plan expires in N days"
- Body: plan name, expiry date, "Renew / Manage billing" CTA linking to `/subscription`.

---

## 4. Files to touch / create

**New**
- `src/lib/revenue-analytics.functions.ts` — `getRevenueAnalytics`, `listExpiringSubscriptions`
- `src/lib/subscription-management.functions.ts` — `changePlan`, `cancelSubscription`, `resumeSubscription`
- `src/lib/expiry-reminders.functions.ts` + `.server.ts` — reminder engine (Resend + web-push)
- `src/routes/api/public/hooks/expiry-reminders.ts` — cron endpoint
- `src/components/revenue/*` — chart components

**Edited**
- `src/routes/_authenticated/revenue.tsx` — full rebuild
- `src/routes/_authenticated/subscription.tsx` — add upgrade/downgrade/cancel
- `src/routes/_authenticated/settings.tsx` — add "Notifications" tab with expiry-alert toggles

**Migration**
- Add `notified_expiry_thresholds INT[] DEFAULT '{}'` to `subscriptions` (dedupe reminders)
- pg_cron job for daily reminder trigger

---

## 5. Technical notes

- Stripe plan changes: retrieve subscription, update its item to the new `price_id` with `proration_behavior: 'create_prorations'`. Webhook already handles the `customer.subscription.updated` event → keeps DB in sync.
- Revenue currency: normalize everything to PKR (project's currency) — subscriptions store `currency` and `price_per_month`.
- All super-admin fns gate on `has_role(uid, 'super_admin')`; return 403 otherwise.
- Charts use existing `recharts` from shadcn.

Approve to build.