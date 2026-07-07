# Security + Auth Flow + Stripe Checkout Plan

Ports the auth experience from `frontend_code/` into the current TanStack Start app, hardens session/security since this is a paid product handling admin/customer business data, and wires Stripe (via Lovable connector) for subscription purchase against the existing `src/lib/pricing-data.ts` plans.

---

## Part 1 — Security hardening (session, tokens, data)

Goal: treat this like a real SaaS billing app. Short sessions, forced re-auth for sensitive actions, safe token handling, tight RLS, audit trail.

### 1.1 Supabase Auth config (migration + `supabase/config.toml`)
- JWT expiry: **1 hour** (down from default 24h).
- Refresh token: rotation ON, reuse-interval 10s, absolute lifetime **30 days**.
- Password: min length 12, require upper/lower/digit/symbol, block leaked passwords (HIBP), rate-limit sign-in attempts.
- Email confirmations ON.
- Enable MFA (TOTP) provider — used by the 2FA screen we port.

### 1.2 Client-side session behavior (`src/integrations/supabase/client.ts` + new `src/lib/session-guard.ts`)
- Keep publishable client (already correct: `persistSession`, `autoRefreshToken`, PKCE flow).
- New `SessionGuard` mounted in `_authenticated/route.tsx`:
  - **Idle timeout: 20 min** of no pointer/keyboard/visibility activity → `supabase.auth.signOut()` + redirect `/auth?reason=idle`.
  - **Absolute session cap: 12 h** → forced sign-out even if active.
  - Warning toast at T-2min with "Stay signed in" (refreshes session).
  - On `visibilitychange` back to visible → `supabase.auth.getUser()` revalidate; if invalid, sign out.
- Reactive sign-out across tabs via `onAuthStateChange('SIGNED_OUT')` + `BroadcastChannel('auth')`.

### 1.3 Server-side hardening
- Every mutating `createServerFn` uses `requireSupabaseAuth` (already the pattern) — audit `src/lib/*.functions.ts` and add it where missing.
- Add `src/lib/security/rate-limit.server.ts`: in-memory token bucket per `(userId, action)` for sensitive fns (billing, role changes, invites). Server functions run on stateless workers so this is per-instance best-effort — good enough to blunt abuse, real limits live at the Supabase gateway.
- Sensitive fns (change email, change password, cancel subscription, add payment method, promote user) require a **fresh session** (< 5 min since sign-in / re-auth). If stale → return `{ requiresReauth: true }`; UI prompts password re-entry.
- Never log tokens, emails in full, or Stripe secrets. Redact in `error-capture.ts`.

### 1.4 RLS + roles audit (SQL migration)
- Re-verify every table listed in `<supabase-tables>` scopes to `tenant admin_id` via `get_tenant_admin_id(auth.uid())` and `has_role(...)`.
- Add `security_events` table: `id, user_id, tenant_id, event, ip, ua, meta jsonb, created_at`. GRANTs + RLS: user reads own; admin reads tenant. Insert-only from server fns.
- Log: sign-in, sign-out, failed sign-in, password change, MFA enroll/verify, role change, subscription create/cancel, payment success/failure.

### 1.5 Headers, CSRF, misc
- Add security headers in `src/routes/__root.tsx` head + a small server middleware: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Server functions are same-origin RPC (already CSRF-safe via bearer token, not cookies) — keep it that way, do not switch to cookie-only auth.
- Webhook route `/api/public/webhooks/stripe` verifies Stripe signature (timing-safe), rejects on skew > 5 min.

---

## Part 2 — Auth flow ported from `frontend_code/`

Replace the current 3-tab `src/routes/auth.tsx` with dedicated routes matching the original UX.

### 2.1 New route files (all public, top-level)
- `src/routes/auth.login.tsx` — email+password, "remember me", link to signup/forgot, handles `?prefill=` and `?reason=idle|expired`, prompts MFA if enrolled.
- `src/routes/auth.signup.tsx` — full form (name, email, phone, password, confirm) with `PasswordStrengthIndicator`, invitation-token support (`?token=`), post-signup redirect: if `?plan=<id>` present → `/checkout?plan=<id>&email=...`; else → `/auth/login?prefill=...`.
- `src/routes/auth.forgot-password.tsx` — sends reset email.
- `src/routes/auth.reset-password.tsx` — already exists; keep + wire strength indicator.
- `src/routes/auth.verify-2fa.tsx` — TOTP challenge (`supabase.auth.mfa.challenge` + `verify`), 6-digit input, recovery-code fallback.
- Keep `/auth` as a small chooser that redirects to `/auth/login`.

### 2.2 Shared pieces (ported / created)
- `src/components/auth/PasswordStrengthIndicator.tsx` — port from `frontend_code/components/PasswordStrengthIndicator.tsx`.
- `src/lib/validation.ts` — port `validateField`, `validatePassword`, `createFieldValidation`, strength scorer.
- MFA enrollment lives in `settings.tsx` → "Security" section: enroll TOTP, show QR, verify, download recovery codes.

### 2.3 Post-signup / post-login redirects
- Login: if `redirect` search param present and same-origin → go there; else `/dashboard`.
- Signup with plan context: preserve plan through email confirmation via `?plan=` on `emailRedirectTo`.

---

## Part 3 — Stripe via connector + plan purchase flow

### 3.1 Connector
- Call `standard_connectors--connect` with `connector_id: "stripe"`. This injects `STRIPE_API_KEY` (gateway) — server fns call Stripe through `https://connector-gateway.lovable.dev/stripe/...` with `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $STRIPE_API_KEY`. No user-provided key.
- Do NOT touch the pre-existing `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` secrets — checkout uses the connector; webhook signing continues to use `STRIPE_WEBHOOK_SECRET` (ask user to paste the signing secret from Stripe dashboard for the new endpoint).

### 3.2 One-time bootstrap: create Stripe Products/Prices for existing plans
Server fn `src/lib/billing/sync-plans.functions.ts` (admin-only, idempotent):
- For each plan in `src/lib/pricing-data.ts` (`basic`, `intermediate`, `pro`): create/lookup a Stripe Product; create a recurring Price (PKR, monthly) + a one-time Price for the Rs. 7,000 IoT setup fee.
- Persist real Stripe `price_id`s in a new `plan_prices` table (`plan_id text pk, product_id text, subscription_price_id text, setup_price_id text, currency text, updated_at`). GRANTs: `select` to authenticated, all to service_role. Public-safe read.
- Replace placeholder `priceId` values in `pricing-data.ts` by reading `plan_prices` at runtime (a server fn returns hydrated plans).

### 3.3 Checkout flow (ported from `frontend_code/checkout`)
- New route `src/routes/checkout.tsx` (public, but the account step reuses the ported signup form when user is not signed in).
- Steps: (1) Plan select w/ IoT quantity, (2) Account (sign up or sign in), (3) Redirect to Stripe Checkout Session.
- Server fn `createCheckoutSession` (requires auth): calls Stripe `/v1/checkout/sessions` via gateway with `mode=subscription`, `line_items` = subscription price + IoT setup price × qty, `client_reference_id = userId`, `metadata = { plan_id, tenant_admin_id }`, success `/checkout/success?session_id={CHECKOUT_SESSION_ID}`, cancel `/checkout?canceled=1`.

### 3.4 Webhook `/api/public/webhooks/stripe` (server route)
- Verify signature with `STRIPE_WEBHOOK_SECRET` (timing-safe HMAC over raw body).
- Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`.
- Upsert into existing `subscriptions` table with `supabaseAdmin` (loaded via `await import(...)` inside handler).
- Emit `security_events` row for each billing event.

### 3.5 Subscription UI
- `src/routes/_authenticated/subscription.tsx`: show current plan from `subscriptions`, "Manage billing" → server fn `createBillingPortalSession` (Stripe Customer Portal). Cancel/upgrade handled in portal.
- `plans.tsx` "Subscribe" button → `/checkout?plan=<id>`.

---

## Part 4 — Order of implementation

1. SQL migration: `plan_prices`, `security_events`, RLS + GRANTs; auth config tightening.
2. `src/lib/validation.ts` + `PasswordStrengthIndicator`.
3. Split `/auth` into `login`, `signup`, `forgot-password`, `verify-2fa` routes.
4. `SessionGuard` + idle/absolute timeout + fresh-session check helper.
5. Connect Stripe connector → `sync-plans` fn → run once → verify `plan_prices` populated.
6. `checkout.tsx` + `createCheckoutSession` + webhook route + success page.
7. `subscription.tsx` billing portal wiring.
8. Audit `*.functions.ts` for `requireSupabaseAuth`; add `security_events` logging on billing/role changes.
9. Playwright smoke: signup → email confirm (dev auto-confirm) → login → /checkout → Stripe test card → webhook → /subscription shows active plan.

---

## Technical notes

- Stripe gateway URL pattern: `POST https://connector-gateway.lovable.dev/stripe/v1/checkout/sessions` with `application/x-www-form-urlencoded` body (Stripe API convention).
- Currency: pricing-data uses PKR; confirm Stripe account supports PKR — if not, we display PKR but charge in a Stripe-supported currency the user picks in `sync-plans` (fallback USD). Will confirm with user during step 5.
- MFA is optional at signup, required only for `super_admin` and `admin` roles (enforced client-side + server-side on sensitive fns).
- No new secret prompts needed beyond the Stripe connector connect flow; `STRIPE_WEBHOOK_SECRET` already exists but must be regenerated for the new `/api/public/webhooks/stripe` endpoint — I'll open the `add_secret`/update flow at that step.
