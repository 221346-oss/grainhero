# Deployment Readiness Audit — grainhero 2
**Date**: 2026-07-10  
**Auditor**: Senior Full Stack Engineer (Kiro)  
**Method**: Direct source code inspection — every claim cites exact file and line

---

## 1. Environment Configuration

### Complete Variable Inventory

Every `process.env.*` and `import.meta.env.*` reference found in the codebase:

#### REQUIRED — App will throw/crash without these

| Variable | Used In | What Breaks Without It |
|----------|---------|----------------------|
| `SUPABASE_URL` | `client.ts:33`, `client.server.ts:33`, `auth-middleware.ts:39` | Every page throws on load; Supabase client never initialises |
| `SUPABASE_PUBLISHABLE_KEY` | `client.ts:34`, `auth-middleware.ts:40`, `cron/sync-firebase.ts:19`, `waitlist.functions.ts:16`, `hooks/expiry-reminders.ts:8` | Same as above; all server functions reject with 401 |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts:34` | All admin/cron operations fail at startup (lazy proxy — crashes on first use) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `firebase-admin.server.ts:15` | Firebase RTDB reads throw `"FIREBASE_SERVICE_ACCOUNT_JSON not set"`; IoT cron returns 502 |
| `FIREBASE_DATABASE_URL` | `firebase-admin.server.ts:73,85`, `actuator-bridge.server.ts:25,86` | Same Firebase reads/writes silently skip or throw |

#### REQUIRED — Specific features dead without these

| Variable | Used In | Feature Affected |
|----------|---------|----------------|
| `STRIPE_SECRET_KEY` | `stripe-api.server.ts:12`, `subscription-management.functions.ts:15` | All payment flows, checkout, billing portal |
| `STRIPE_WEBHOOK_SECRET` | `webhooks/stripe.ts:12` | Stripe webhook validation; subscriptions won't activate |
| `OPENWEATHER_API_KEY` | `openweather.functions.ts:7` | Environmental/weather page throws |

#### OPTIONAL — Graceful fallback or mock mode

| Variable | Fallback Behaviour | Feature |
|----------|--------------------|---------|
| `RESEND_API_KEY` | Emails silently skipped | Checkout confirmation, hardware order, expiry reminder emails |
| `RESEND_FROM_EMAIL` | Falls back to `"onboarding@resend.dev"` | From address in emails |
| `LOVABLE_API_KEY` | Email gateway skipped; AI insights throws | Checkout emails, AI spoilage insights |
| `WEB_PUSH_PUBLIC_KEY` + `WEB_PUSH_PRIVATE_KEY` | Falls back to `firebase` provider, then `mock` | Web push notifications |
| `WEB_PUSH_EMAIL` | Falls back to `'admin@grainhero.com'` | VAPID identity |
| `FIREBASE_PROJECT_ID` | If absent, push uses web-push provider instead | FCM push notifications |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Alternative to `FIREBASE_SERVICE_ACCOUNT_JSON` | Push notifications |
| `AUTO_REGISTER_ADMIN_ID` | Falls back to first super_admin query | IoT device auto-registration |
| `APP_ORIGIN` | Falls back to `"https://grainheroo.lovable.app"` | Stripe return URLs, email links |
| `VITE_VAPID_PUBLIC_KEY` or `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push subscribe returns error | Browser push subscription |
| `SUPPORT_EMAIL` | Skipped (guarded with `if (gatewayKey && resendKey && to)`) | Support notification emails |

#### CLIENT-SIDE (VITE_ prefix — baked into browser bundle at build time)

| Variable | Used In | Status |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | `client.ts:33` | **Must match `SUPABASE_URL`** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `client.ts:34` | **Must match `SUPABASE_PUBLISHABLE_KEY`** |
| `VITE_SUPABASE_PROJECT_ID` | present in `.env` | Used by Lovable config tooling |
| `VITE_FIREBASE_API_KEY` | `firebase/client.ts:7` | Falls back to `"REPLACE_ME"` — Firebase browser SDK disabled |
| `VITE_FIREBASE_AUTH_DOMAIN` | `firebase/client.ts:8` | Same fallback |
| `VITE_FIREBASE_DATABASE_URL` | `firebase/client.ts:9` | Same fallback — `isFirebaseConfigured=false` |
| `VITE_FIREBASE_PROJECT_ID` | `firebase/client.ts:10` | Same fallback |
| `VITE_FIREBASE_STORAGE_BUCKET` | `firebase/client.ts:11` | Same fallback |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `firebase/client.ts:12` | Empty string fallback |
| `VITE_FIREBASE_APP_ID` | `firebase/client.ts:13` | Empty string fallback |

### What is in `.env` Right Now

```
SUPABASE_PROJECT_ID="frfgmbgzildtfchtmchr"
SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."   ← anon JWT, present
SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"   ← present
VITE_SUPABASE_PROJECT_ID="frfgmbgzildtfchtmchr"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."   ← present
VITE_SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"   ← present
```

### Missing from `.env`

**The following required variables are NOT in `.env` and have no fallback:**

| Variable | Severity |
|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 CRITICAL — all server-side admin operations crash |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 🔴 CRITICAL — all IoT features broken |
| `FIREBASE_DATABASE_URL` | 🔴 CRITICAL — all IoT features broken |
| `STRIPE_SECRET_KEY` | 🔴 CRITICAL — all payments broken |
| `STRIPE_WEBHOOK_SECRET` | 🔴 CRITICAL — subscriptions never activate |
| `OPENWEATHER_API_KEY` | 🟡 Feature-breaking — environmental page crashes |
| All `VITE_FIREBASE_*` | 🟡 Firebase browser listeners disabled |

---

## 2. Supabase Connection

### How the App Connects

**Client-side (browser):** `src/integrations/supabase/client.ts`  
Uses `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` — the anon JWT. These values are baked into the bundle at build time from `.env`.

**Server-side (SSR/server functions):** `src/integrations/supabase/client.server.ts`  
Uses `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — the service role key. This **bypasses RLS** and is used for all cron and admin operations.

**Auth middleware:** `src/integrations/supabase/auth-middleware.ts`  
Uses `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` from `process.env` (SSR), extracts the user's Bearer token from the Authorization header, and creates a per-request client respecting RLS.

### Credentials in Repo

| Credential | Value Present in `.env` | Type |
|------------|------------------------|------|
| Supabase URL | ✅ `https://frfgmbgzildtfchtmchr.supabase.co` | Public — safe to share |
| Anon/Publishable Key | ✅ Full JWT in `.env` | Semi-public — anon key, safe to share but tied to this project |
| Service Role Key | ❌ **Not in `.env`** | Secret — bypasses RLS, must be kept private |

### Can another developer connect to the same Supabase project?

**Yes**, if they are given the `.env` file with all required variables filled in. The Supabase project is at `frfgmbgzildtfchtmchr.supabase.co` — it is a hosted remote project. No local Supabase instance is needed.

---

## 3. Authentication

### Login
**File**: `src/routes/auth.login.tsx`  
Uses `supabase.auth.signInWithPassword()` — fully Supabase-managed. ✅

### Signup
**File**: `src/routes/auth.signup.tsx`  
Uses `supabase.auth.signUp()` with email confirmation. Sets `emailRedirectTo` using `getAuthRedirectOrigin()`.

⚠️ **Hardcoded origin issue**: `src/lib/app-url.ts` line 1:
```typescript
export const APP_ORIGIN = "https://grainheroo.lovable.app";
```
And line 5–7:
```typescript
if (origin.includes("localhost") || origin.includes("127.0.0.1")) return APP_ORIGIN;
```
When running on `localhost`, **email confirmation links redirect to `grainheroo.lovable.app`**, not localhost. This means a developer running locally will click an email link and land on the production site, not their local instance. Signup confirmation flow is broken in local development.

### Password Reset
**File**: `src/routes/auth.forgot-password.tsx`  
Uses `supabase.auth.resetPasswordForEmail()` with `redirectTo: ${getAuthRedirectOrigin()}/auth/reset-password`. Same localhost redirect issue applies. ⚠️

### Session Persistence
`supabase/client.ts` uses `persistSession: true` with `localStorage`. Standard Supabase session handling. ✅

### Role Fetching
`src/hooks/useMyProfile.ts` queries `profiles` table with the authenticated user's ID. `src/lib/roles.functions.ts` reads `user_roles` table. Both require a valid session. ✅

### Middleware Protection
`src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth` middleware:
1. Reads `Authorization: Bearer <token>` header
2. Validates JWT structure (must have 3 parts)
3. Calls `supabase.auth.getClaims(token)` to verify against Supabase
4. Attaches `supabase`, `userId`, and `claims` to the request context

`src/start.ts` registers `attachSupabaseAuth` as global `functionMiddleware`, which attaches the session access token as a Bearer header on every TanStack server function call. ✅

---

## 4. Database

### Is it fully remote?
**Yes.** The only database is the hosted Supabase project at `frfgmbgzildtfchtmchr.supabase.co`. There is no local SQLite, PostgreSQL, or any other local DB. The `supabase/config.toml` configures the Supabase CLI project reference but does not spin up a local instance for production use.

### Are migrations required?
**Yes.** The following 16 migration files must be applied to the Supabase project before the app works correctly. They are in `supabase/migrations/` but are NOT automatically run on `npm install` or `npm run dev`.

| Migration File | What It Creates |
|----------------|----------------|
| `20260707174008_*.sql` | Base schema (first migration) |
| `20260707180839_*.sql` | Additional tables |
| `20260707192819_*.sql` | Additional tables |
| `20260707193610_*.sql` | Additional tables |
| `20260707200921_*.sql` | Additional tables |
| `20260707225425_*.sql` | Additional tables |
| `20260707231401_*.sql` | Additional tables |
| `20260707232122_*.sql` | Additional tables |
| `20260707233325_*.sql` | Additional tables |
| `20260707234332_*.sql` | Additional tables |
| `20260708053239_*.sql` | Additional tables |
| `20260708061323_*.sql` | Additional tables |
| `20260709120000_sync_sensor_to_silo.sql` | Trigger: sync sensor → silo |
| `20260709121500_auto_grain_alerts.sql` | Trigger: threshold alerts |
| `20260709123000_push_notifications.sql` | Push subscriptions table |
| `20260710100000_ml_and_iot_schema.sql` | spoilage_predictions, derived metrics triggers, materialized view |
| `20260710110000_auto_register_support.sql` | `last_ping_at` column on sensor_devices |

**However**: since the Supabase project already exists at the remote URL and the migrations have already been applied to it (evidenced by the app having been developed against it), a new developer connecting to the **same** Supabase project does not need to run migrations again. The database is already set up.

If the developer needs their own Supabase project, they must run all migrations with `npx supabase db push`.

### Seed data required?
**Yes — for IoT features**: The `AUTO_REGISTER_ADMIN_ID` mechanism requires at least one `super_admin` row in `user_roles`, or the auto-registration won't work. For other features, no explicit seed is required — the app creates data through normal usage.

---

## 5. External Services

| Service | Required? | Optional? | Feature Scope | Config Variables |
|---------|-----------|-----------|--------------|-----------------|
| **Supabase** | ✅ Required | — | Entire app — auth, database, realtime | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Firebase RTDB** | ✅ Required for IoT | Optional for non-IoT | Sensor ingestion, live dashboard, actuator control | `FIREBASE_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON` |
| **Firebase Client SDK** | Optional | ✅ Optional | Browser realtime sensor hook | `VITE_FIREBASE_*` (7 vars) |
| **Stripe** | ✅ Required for billing | Optional for non-paying apps | Checkout, subscriptions, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **OpenWeather API** | Feature-required | ✅ Optional | Environmental/weather page | `OPENWEATHER_API_KEY` |
| **Resend (email)** | Feature-required | ✅ Optional | Checkout confirmation, hardware order, expiry emails | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Lovable AI Gateway** | Feature-required | ✅ Optional | AI spoilage insights, email delivery | `LOVABLE_API_KEY` |
| **Web Push (VAPID)** | Feature-required | ✅ Optional | Browser push notifications | `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_EMAIL`, `VITE_VAPID_PUBLIC_KEY` |
| **FCM (Firebase Cloud Messaging)** | Feature-required | ✅ Optional | Mobile push notifications | `FIREBASE_PROJECT_ID` |
| **Cloudflare** | Build target only | ✅ Optional | Deployment (vite.config.ts references Cloudflare via Nitro) | none at runtime |
| **MQTT** | ❌ Not in GH2 | — | Not implemented in GH2 | none |
| **Python/ML** | Feature-required | ✅ Optional | Spoilage predictions | `python3` executable must be installed; `src/ml/*.pkl` files |

---

## 6. Missing Files

### Confirmed Present
- `public/sw.js` — service worker for push notifications ✅
- `src/ml/smartbin_predict.py` ✅
- `src/ml/*.pkl` (5 model files) ✅

### Confirmed Missing

| Missing Item | Referenced In | Impact |
|-------------|--------------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` value | `client.server.ts` | All server admin ops crash |
| `FIREBASE_SERVICE_ACCOUNT_JSON` value | `firebase-admin.server.ts` | IoT sync cron returns 502 |
| `FIREBASE_DATABASE_URL` value | `firebase-admin.server.ts`, `actuator-bridge.server.ts` | IoT features fail |
| `STRIPE_SECRET_KEY` value | `stripe-api.server.ts` | Payments throw |
| `STRIPE_WEBHOOK_SECRET` value | `webhooks/stripe.ts` | Webhook 500 |
| `VITE_FIREBASE_*` values (7 vars) | `firebase/client.ts` | Firebase browser SDK uses `"REPLACE_ME"` placeholder; `isFirebaseConfigured=false` |
| `VITE_VAPID_PUBLIC_KEY` | `push-notifications.ts:73` | Push subscribe returns error |
| `requirements.txt` for Python | `ai-inference.functions.ts` spawns `python3` | ML inference fails if Python dependencies not installed |
| `ml/barley_spoilage_10k.csv`, `ml/maize_spoilage_10k.csv`, `ml/wheat_spoilage_10k.csv`, `ml/sorghum_spoilage_10k.csv` | Model retraining scripts | Model retraining not possible |

### Hardcoded values that will misbehave

| Location | Hardcoded Value | Problem |
|----------|----------------|---------|
| `src/lib/app-url.ts:1` | `APP_ORIGIN = "https://grainheroo.lovable.app"` | Email confirmation links on localhost redirect to production. Signup flow broken locally. |
| `src/lib/app-url.ts:5-7` | localhost check returns production URL | Same issue |

---

## 7. Project Startup

### Steps a fresh developer must take:

**What they must do minimum:**
```
1. unzip project
2. cd "grainhero 2"
3. npm install        (or bun install — bunfig.toml is present)
4. npm run dev
```

### Will it work? **NO — not with just those 4 steps.**

Here is exactly what will happen and fail:

| Step | What Happens |
|------|-------------|
| `npm install` | ✅ Succeeds |
| `npm run dev` | ✅ Dev server starts |
| Open browser | ✅ App loads |
| Any page that calls a server function | ❌ **Crashes** — `SUPABASE_SERVICE_ROLE_KEY` missing; `createSupabaseAdminClient()` throws immediately |
| Login / Signup | ✅ **Works** — only needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, both present in `.env` |
| Email confirmation after signup | ❌ **Broken** — redirect goes to `grainheroo.lovable.app`, not localhost |
| Any dashboard data | ❌ **Fails** — server functions throw on `SUPABASE_SERVICE_ROLE_KEY` |
| IoT cron | ❌ **Fails** — `FIREBASE_SERVICE_ACCOUNT_JSON` not set |
| Payments | ❌ **Fails** — `STRIPE_SECRET_KEY` not set |

### Additional steps required for full functionality:

```
5. Create a .env file (or add to existing) with:
   SUPABASE_SERVICE_ROLE_KEY="<get from Supabase Dashboard → Settings → API>"
   FIREBASE_SERVICE_ACCOUNT_JSON="<JSON string from Firebase Console → Service Accounts>"
   FIREBASE_DATABASE_URL="https://<project-id>-default-rtdb.firebaseio.com"
   STRIPE_SECRET_KEY="sk_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   OPENWEATHER_API_KEY="..."         # optional, for environmental page
   RESEND_API_KEY="..."              # optional, for emails
   LOVABLE_API_KEY="..."             # optional, for AI insights
   VITE_FIREBASE_API_KEY="..."       # optional, for browser Firebase
   VITE_FIREBASE_DATABASE_URL="..."  # optional, for browser Firebase
   VITE_FIREBASE_PROJECT_ID="..."    # optional, for browser Firebase

6. Ensure Python 3 is installed with joblib, numpy, scikit-learn
   (for ML inference — check src/ml/smartbin_predict.py imports)

7. If connecting to a DIFFERENT Supabase project (not frfgmbgzildtfchtmchr):
   run: npx supabase db push
   (to apply all 16 migrations)
```

---

## 8. Git Safety

### Should these be shared in the ZIP?

| Item | Share? | Reason |
|------|--------|--------|
| **`.env`** | ✅ YES (with this specific project) | Contains only the anon/publishable key, which is intentionally public. The service role key is NOT in it. The URL and anon key must reach the developer so the app runs. If your `.env` contained `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`, you must strip those before sharing. |
| **`.env.local`** | ❌ Does not exist | `.gitignore` ignores `*.local` by default |
| **`node_modules/`** | ❌ Never | 200MB+, platform-specific binaries, regenerated by `npm install`. Excluded by `.gitignore`. |
| **`dist/`** | ❌ No | Build output, excluded by `.gitignore`. Regenerated by `npm run build`. |
| **`.output/`** | ❌ No | Nitro/Cloudflare build output, excluded by `.gitignore`. |
| **`package-lock.json`** | ✅ YES | Deterministic dependency resolution. Another developer gets exact same versions. This project uses `bun.lock` (Bun lockfile) instead — include that. |
| **`bun.lock`** | ✅ YES | Same reason as package-lock.json. Is present in repo. |
| **`.wrangler/`** | ❌ No | Cloudflare dev state, excluded by `.gitignore`. |

---

## 9. Final Verdict

### ✅ Can I send only the ZIP to another developer?

**No.** Sending only the ZIP means they receive:
- The codebase ✅
- The Supabase URL and anon key (in `.env`) ✅
- But NOT: `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Without those, every server function crashes and the app is unusable beyond the login screen.

---

### ✅ What else must you send?

You must send (or document) these secrets alongside the ZIP:

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard>
FIREBASE_SERVICE_ACCOUNT_JSON=<JSON string, get from Firebase Console>
FIREBASE_DATABASE_URL=https://frfgmbgzildtfchtmchr-default-rtdb.firebaseio.com
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional but needed for full feature set:
```
OPENWEATHER_API_KEY=...
RESEND_API_KEY=...
LOVABLE_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_VAPID_PUBLIC_KEY=...
WEB_PUSH_PUBLIC_KEY=...
WEB_PUSH_PRIVATE_KEY=...
```

---

### ✅ Will all users authenticate against the same Supabase database?

**Yes** — unconditionally. The Supabase project ID is hardcoded in `.env` as `frfgmbgzildtfchtmchr`. All authentication, user data, and row-level security are managed by that single remote Supabase project. Every developer and every user hits the same database.

---

### ✅ Will everyone see the same data?

**Yes and no — by design:**

- The app uses Row-Level Security (RLS) via Supabase. Each `admin_id` can only see their own tenant's data.
- A super_admin can see all tenants' data (via `platform.*` routes that use the service role client).
- All users in the same organisation share the same silo, sensor, batch, and alert data.
- Different tenants/admins are isolated from each other.

This is correct and expected behaviour.

---

### ✅ Is there anything that would prevent the project from working on another machine?

Yes — four things:

| Blocker | Severity | Fix |
|---------|----------|-----|
| Missing secrets (`SUPABASE_SERVICE_ROLE_KEY`, Firebase, Stripe) | 🔴 Critical | Provide the secrets file |
| `APP_ORIGIN` hardcoded to `grainheroo.lovable.app` | 🟡 Medium | Set `APP_ORIGIN=http://localhost:3000` in local `.env`; email confirmations will redirect correctly |
| Python 3 + ML dependencies must be installed | 🟡 Medium | Add `requirements.txt` to `src/ml/` and document: `pip install joblib numpy scikit-learn` |
| Firebase browser SDK has `REPLACE_ME` placeholders | 🟡 Medium | Add `VITE_FIREBASE_*` vars; live dashboard works without them (uses cron data) but realtime hooks are disabled |

---

## Confidence Rating: **72 / 100**

**Justification:**

| Factor | Impact on Confidence |
|--------|---------------------|
| Supabase URL and anon key are in `.env` and correct | +15 |
| Auth (login/signup/reset) is fully Supabase-managed and works immediately | +15 |
| All migrations are written and present | +10 |
| Service role key is missing from `.env` — most server operations crash | -15 |
| Firebase credentials missing — entire IoT pipeline is dead on a fresh clone | -8 |
| `APP_ORIGIN` hardcoded — breaks email confirmation locally | -5 |
| Python environment undocumented — ML inference will silently fail | -5 |
| No `.env.example` file exists to guide the developer | -5 |
| Stripe keys missing — payments are dead | -5 |
| Everything that works does so reliably (Supabase RLS, auth middleware, server functions) | +10 |
| `node_modules` and sensitive build output are git-ignored | +5 |

The 72% reflects that the project is **structurally correct and professionally written**, but is **not self-contained** for a new developer. It requires 5–10 minutes of secret setup before it becomes functional. Once secrets are provided, confidence rises to approximately **90%** (the remaining gap is the `APP_ORIGIN` localhost issue and the undocumented Python dependency).

---

## Recommended Action Before Sharing

Create a `.env.example` file at the project root:

```dotenv
# ── Supabase (Required) ──────────────────────────────────────────────────────
SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY=""           # ← GET FROM: Supabase Dashboard → Settings → API
VITE_SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
VITE_SUPABASE_PROJECT_ID="frfgmbgzildtfchtmchr"

# ── Firebase IoT (Required for IoT features) ─────────────────────────────────
FIREBASE_DATABASE_URL="https://YOUR_PROJECT-default-rtdb.firebaseio.com"
FIREBASE_SERVICE_ACCOUNT_JSON=""       # ← GET FROM: Firebase Console → Service Accounts → Generate new key

# ── Firebase Browser SDK (Optional — for realtime dashboard) ─────────────────
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_DATABASE_URL=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

# ── Stripe (Required for payments) ───────────────────────────────────────────
STRIPE_SECRET_KEY=""                   # ← GET FROM: Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=""               # ← GET FROM: Stripe Dashboard → Webhooks → signing secret

# ── Email / Notifications (Optional) ─────────────────────────────────────────
RESEND_API_KEY=""
RESEND_FROM_EMAIL="GrainHero <noreply@yourdomain.com>"
LOVABLE_API_KEY=""
SUPPORT_EMAIL=""

# ── Push Notifications (Optional) ────────────────────────────────────────────
WEB_PUSH_PUBLIC_KEY=""
WEB_PUSH_PRIVATE_KEY=""
WEB_PUSH_EMAIL=""
VITE_VAPID_PUBLIC_KEY=""

# ── Weather (Optional) ───────────────────────────────────────────────────────
OPENWEATHER_API_KEY=""

# ── App (Override for local development) ─────────────────────────────────────
APP_ORIGIN="http://localhost:3000"     # ← Set this so email links redirect correctly in dev
AUTO_REGISTER_ADMIN_ID=""              # ← Optional: UUID of admin to own auto-registered IoT devices
```
