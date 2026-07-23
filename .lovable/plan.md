# Plan Management — Prorated PKR Upgrades

## Scope
Rebuild `/plan-management` so tenant Admins can change their plan cleanly:
- Admin-only (hidden + guarded for Manager / Technician / Buyer / Super Admin)
- Monthly / Yearly toggle — yearly = 10 × monthly (2 months free)
- Upgrade → charged prorated difference **immediately** via Stripe Checkout
- Downgrade → scheduled at current period end (no immediate charge / no refund)
- Cycle change (monthly ↔ yearly) → prorate the difference on the spot
- Kill the auto-upgrade toggle (no auto upgrades)
- Notify super admins + log activity for every change

## User answers driving this
- Downgrade → schedule at period end
- Yearly → 12 × monthly with 2 months free (i.e. 10× monthly)
- Upgrade math → true daily proration on remaining days
- Cycle switch → allowed anytime, prorated

## Data model (single migration)
Extend `public.tenant_plan_change_requests`:
- `billing_cycle text check (billing_cycle in ('monthly','yearly'))`
- `apply_at timestamptz` (for scheduled downgrades)
- `charge_amount_cents integer` (prorated PKR × 100 that we charged / will charge)
- `stripe_session_id text`
- extend `status` to allow `'scheduled'` and `'auto_applied'` already present

Extend `public.profiles`:
- `billing_cycle text default 'monthly' check (billing_cycle in ('monthly','yearly'))`
- `current_period_end timestamptz` (used to compute proration + schedule downgrades)

Grants + RLS unchanged (columns added to existing tables).

## Server (`src/lib/plan-upgrade.functions.ts`)
1. `getMyPlanState` (admin only) — returns
   `{ current_plan, current_cycle, current_period_end, plans: [{ plan_id, name, price_monthly_pkr, price_yearly_pkr, limits }], pending: {...} | null }`
2. `previewPlanChange({ requested_plan, billing_cycle })` — pure calc, no writes:
   - `direction = upgrade | downgrade | same_tier_cycle_change`
   - `days_remaining = max(1, ceil((period_end - now)/day))`
   - `days_in_cycle = 30 (monthly) | 365 (yearly)`
   - `credit = current_price × days_remaining / days_in_cycle`
   - `new_period_charge = new_price × days_remaining / days_in_cycle`
   - `prorated_charge_pkr = max(0, round(new_period_charge - credit))`
   - Returns amounts + `apply_now` boolean.
3. `initiatePlanChange({ requested_plan, billing_cycle })` — admin only, rate-limited:
   - Upgrade / same-tier upsize / cycle switch that raises price → create Stripe Checkout session `mode=payment`, currency `pkr`, one line item = `prorated_charge_pkr × 100`, `metadata.plan_change_request_id`, redirect URLs `/plan-management?status=success|cancel`. Insert a `tenant_plan_change_requests` row with `status='pending_payment'` + `stripe_session_id`. Return `{ url }`.
   - Downgrade / neutral change → insert row with `status='scheduled'`, `apply_at = current_period_end`. Emit super-admin notification + activity log. Return `{ scheduled: true, apply_at }`.
4. `cancelScheduledDowngrade` — admin cancels their own `status='scheduled'` row.

## Stripe webhook
Extend the existing `checkout.session.completed` block in
`src/routes/api/public/webhooks/stripe.ts`:
- When `metadata.plan_change_request_id` is set → mark the request `approved`, update `profiles.subscription_plan` + `billing_cycle` + `current_period_end` (extend by 30/365 days from now for upgrades, keep period-end for cycle upgrades), keep any existing `subscriptions` row's `plan_name`/`billing_cycle` in sync, emit super-admin notification, activity log.

## Cron for scheduled downgrades
Add a lightweight endpoint `src/routes/api/public/cron/apply-scheduled-plan-changes.ts` (CRON_SECRET-protected) that:
- Finds `tenant_plan_change_requests` where `status='scheduled'` and `apply_at <= now()`
- Updates `profiles.subscription_plan` + `billing_cycle`, marks row `approved`, notifies super admin + activity log.

## UI (`src/routes/_authenticated/plan-management.tsx`)
- Route `beforeLoad`: if effective role ≠ `admin`, redirect to `/dashboard`.
- Hide the topbar “Upgrade” pill for non-admins in `_authenticated/route.tsx`.
- New layout:
  - Header with billing cycle toggle (Monthly · Yearly — “Save 2 months”).
  - 3 plan cards (Starter / Professional / Enterprise) in PKR, showing current-plan badge.
  - For non-current plans: “Preview cost” → server-side `previewPlanChange` fills a callout with proration math + a single primary CTA:
    - Upgrade: **“Pay Rs. X now”** → opens Stripe Checkout in new tab.
    - Downgrade: **“Schedule at period end (dd/mm/yyyy)”** → confirm dialog, then schedule.
  - Pending downgrade banner with cancel button.
  - Auto-upgrade toggle removed.

## Notifications & activity
Use existing `emitToSuperAdmins` + `logActivity` on: preview→initiate, scheduled downgrade created / cancelled, webhook-confirmed upgrade, cron-applied downgrade.

## Out of scope
- Full Stripe Subscription lifecycle rewrite. We keep proration explicit
  (Checkout one-off) so it works for admins without an existing Stripe
  subscription and for the existing PKR test data.
- Refunds on downgrade — user chose “schedule at period end”, so no refund.
