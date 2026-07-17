# Phase 2 — Auth Hardening & Session Hygiene

Tighten the auth boundary so every protected surface has a verified session, sign-out fully drains client state, and suspicious activity is observable. Strictly additive — no route removals, no schema breaks.

## Scope

1. **Session verification on the server**
   - Add `src/lib/session.server.ts` helper `getVerifiedUser()` that wraps `context.supabase.auth.getUser()` (re-validates the JWT with the Auth server) — used by any server fn that must trust identity beyond `context.userId`.
   - Audit `requireSupabaseAuth` call sites that make privileged decisions (role changes, plan changes, admin subscription actions) and swap them to `getVerifiedUser()` before the write.

2. **Client sign-out drain**
   - Centralize sign-out into `src/lib/auth/signOut.ts`:
     `cancelQueries → clear → supabase.auth.signOut → navigate('/auth', { replace: true })`.
   - Replace ad-hoc `supabase.auth.signOut()` calls in `AppSidebar`, `settings.tsx`, and any header menu to use the helper.

3. **Session-aware header affordance**
   - Ensure the marketing/landing header reflects session state (sign-in vs. account menu) driven by the existing root `onAuthStateChange` → `router.invalidate()` subscriber. No new listeners.

4. **Security event logging (additive)**
   - Reuse existing `security_events` table. Add `logSecurityEvent()` helper in `src/lib/security-events.ts` (client + server variants).
   - Emit events for: `sign_in_success`, `sign_in_failed`, `sign_out`, `password_reset_requested`, `role_change`, `plan_change_request`, `admin_suspend_toggle`.
   - No UI changes — feeds the existing Security Center page.

5. **Password reset page sanity**
   - Verify `/reset-password` exists and is a public route; if missing, add minimal page that handles `type=recovery` and calls `updateUser({ password })`.

6. **Rate-limit sensitive server fns (soft)**
   - Add `src/lib/rate-limit.ts` in-memory token bucket (per-user, per-fn). Apply to `requestPlanChange`, `cancelSubscription`, admin mutation fns. Returns typed `{ error: 'rate_limited', retryAfter }` — no throws that break UI.

7. **Audit script**
   - Extend `scripts/audit-server-fns.ts` to flag privileged fns (name matches `/promote|suspend|cancel|change|delete|admin/i` under `.middleware([requireSupabaseAuth])`) that don't call `getVerifiedUser()`.

## Out of scope
- MFA, OAuth providers, session timeout UI, device management — later phase.
- Any schema changes (security_events already exists).

## Deliverables
- 5 new files, ~4 file edits, 1 audit script extension.
- Both audit scripts stay green.
- No visual regressions; sign-out flow verified via Playwright (localhost, then check no cached protected data on `/auth`).

Reply **approve** and I'll implement.
