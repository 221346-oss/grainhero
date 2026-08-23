# Grain Hero — Flutter Integration Guide

Everything the Flutter team needs to connect the mobile app to the shared
Grain Hero backend. The web app and the Flutter app talk to the **same
Supabase project** and the **same public HTTP API** (`/api/public/v1/*`);
you do not run a separate backend.

---

## 1. Environment

| Name                            | Value                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase project ref            | `frfgmbgzildtfchtmchr`                                                                                                                                                                                             |
| Supabase URL                    | `https://frfgmbgzildtfchtmchr.supabase.co`                                                                                                                                                                         |
| Supabase anon (publishable) key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Nzg4NzEsImV4cCI6MjA5MzI1NDg3MX0.NosVCB74WEpoOLcioOWO731wcxAuZf7Dkv3Eyj9O5bY` |
| API base (production)           | `https://grainheroo.lovable.app/api/public/v1`                                                                                                                                                                     |
| API base (preview)              | `https://project--08a93ae3-e513-4d21-8fb9-bf6979e71541-dev.lovable.app/api/public/v1`                                                                                                                              |
| Health probe                    | `GET /api/public/v1/status` (no auth)                                                                                                                                                                              |

The anon key is safe to embed in the mobile binary. **Never ship the
service-role key** — it is server-only.

---

## 2. Auth — use Supabase Auth directly

Add `supabase_flutter` and sign in against the same Supabase project the
web app uses. Users created on the web work in the app and vice versa.

```dart
await Supabase.initialize(
  url: 'https://frfgmbgzildtfchtmchr.supabase.co',
  anonKey: '<anon key above>',
);

await Supabase.instance.client.auth.signInWithPassword(
  email: email, password: password,
);
```

Every request to `/api/public/v1/*` MUST include:

| Header            | Value                           |
| ----------------- | ------------------------------- |
| `Authorization`   | `Bearer <session.accessToken>`  |
| `x-app-build`     | integer build number, e.g. `42` |
| `x-app-platform`  | `ios` or `android`              |
| `Content-Type`    | `application/json` (POST/PUT)   |
| `Idempotency-Key` | UUID v4, required on mutations  |

If `x-app-build < min_build` the server returns HTTP **426** with the
minimum + latest build; force an update screen.

Refresh via `supabase.auth.refreshSession()` when the API returns
`401 invalid_token`.

---

## 3. Roles & tenancy

Roles live in `public.user_roles` and are read by RLS via
`has_role(auth.uid(), 'admin')`. Do NOT trust any role claim the client
sends. Known roles: `super_admin`, `admin` (tenant owner), `manager`,
`technician`, `buyer`, `pending`.

Tenant scoping is `admin_id` on every business table. The API resolves
the caller's tenant server-side using `get_tenant_admin_id(auth.uid())`,
so mobile never sends `admin_id`.

---

## 4. API contract

All endpoints live under `/api/public/v1`. Responses are always
`{ "data": ..., "meta": { server_time, cursor, version } }`; errors are
`{ "error": "code", ...extra }` with a matching HTTP status.

### Meta & lifecycle

| Method | Path                 | Purpose                                                         |
| ------ | -------------------- | --------------------------------------------------------------- |
| GET    | `/status`            | Public health probe (no auth).                                  |
| GET    | `/meta`              | Server time, min/latest build, feature flags, deep-link config. |
| POST   | `/devices/register`  | Register FCM push token.                                        |
| POST   | `/devices/heartbeat` | Keep-alive + battery/network telemetry.                         |
| POST   | `/devices/revoke`    | On sign-out.                                                    |
| GET    | `/deeplink/:key`     | Resolve a deep-link key to a route + payload.                   |

### Delta sync (cursor-based)

Call with `?since=<ISO>&cursor=<opaque>&limit=200`. Persist
`meta.cursor`; next call sends it back.

| Path                    | Returns                                       |
| ----------------------- | --------------------------------------------- |
| `/sync/silos`           | Silos for the tenant.                         |
| `/sync/silos-cockpit`   | Silo + latest reading + open alerts.          |
| `/sync/sensors`         | Sensor devices + latest reading.              |
| `/sync/alerts`          | Grain alerts.                                 |
| `/sync/notifications`   | In-app notifications.                         |
| `/sync/hardware-orders` | Install orders + status.                      |
| `/sync/field-tasks`     | Technician tasks.                             |
| `/sync/field-incidents` | Field incidents.                              |
| `/sync/marketplace`     | Public listings, filtered by mobile settings. |
| `/sync/buyer-orders`    | Buyer's own orders.                           |
| `/sync/buyer-summary`   | Buyer dashboard KPIs.                         |

### Field ops (offline-first)

| Method | Path               | Notes                                                             |
| ------ | ------------------ | ----------------------------------------------------------------- |
| GET    | `/field/bundle`    | Offline bundle for a technician; supports `If-None-Match` -> 304. |
| POST   | `/field/mutations` | Batched, idempotent mutations queued while offline.               |

`/field/mutations` body:

```json
{
  "mutations": [
    { "id": "<uuid>", "type": "alerts-ack", "payload": { "alert_id": "..." } },
    {
      "id": "<uuid>",
      "type": "install-step",
      "payload": { "order_id": "...", "step": "delivered" }
    },
    { "id": "<uuid>", "type": "notifications-read", "payload": { "ids": ["..."] } }
  ]
}
```

Response returns per-mutation status; retry only `failed` ones with the
same `id`.

### Commerce (buyer app)

| Method          | Path                   | Notes                                                            |
| --------------- | ---------------------- | ---------------------------------------------------------------- |
| GET             | `/commerce/config`     | Currency, tax rules, `cod_max_cents`, `quote_ttl_seconds`.       |
| GET/POST/DELETE | `/commerce/addresses`  | Buyer shipping addresses.                                        |
| GET/PUT/DELETE  | `/commerce/cart`       | Persistent server cart.                                          |
| POST            | `/commerce/quote`      | Totals, taxes, shipping estimate. TTL from config.               |
| POST            | `/commerce/checkout`   | Idempotent — returns Stripe `client_secret` or COD confirmation. |
| GET             | `/commerce/orders`     | Paged order history for the buyer.                               |
| GET             | `/commerce/orders/:id` | Full order + timeline.                                           |

Stripe: use `stripe_flutter` with the `client_secret` from
`/commerce/checkout`. The backend handles `payment_intent.succeeded` /
`payment_failed` webhooks and writes back to `buyer_orders`; the mobile
app just polls `/commerce/orders/:id`.

### Notifications

| Method  | Path                         |
| ------- | ---------------------------- |
| GET     | `/notifications`             |
| POST    | `/notifications/read`        |
| GET/PUT | `/notifications/preferences` |

### Uploads

`POST /uploads/sign` returns a signed Supabase Storage URL. Buckets in
use: `dispute-attachments`, `return-attachments`,
`insurance-attachments`, `quality-certificates`. Never PUT directly to
Storage — always go through `/uploads/sign` so RLS + MIME/size limits
are enforced.

### Realtime

Use the Supabase client's Realtime directly — the API layer doesn't
proxy websockets:

```dart
Supabase.instance.client
  .channel('mobile-alerts')
  .onPostgresChanges(
    event: PostgresChangeEvent.insert,
    schema: 'public', table: 'grain_alerts',
    callback: (p) { /* ... */ })
  .subscribe();
```

RLS enforces that a user only receives rows they can SELECT.

---

## 5. Response envelope & error codes

```json
{ "data": <payload>, "meta": { "server_time": "...", "cursor": "...", "version": "v1" } }
```

| HTTP | `error`                            | Meaning                                  |
| ---- | ---------------------------------- | ---------------------------------------- |
| 401  | `missing_bearer` / `invalid_token` | Refresh session then retry.              |
| 403  | `forbidden`                        | Role/tenant mismatch — do not retry.     |
| 409  | `conflict` / `already_processed`   | Idempotency replay; treat as success.    |
| 422  | `validation_failed`                | Body validation. `details` lists fields. |
| 423  | `sync_in_progress`                 | Another sync holds the lock; back off.   |
| 426  | `upgrade_required`                 | Force in-app update.                     |
| 429  | `rate_limited`                     | Retry with `Retry-After`.                |
| 5xx  | `internal_error`                   | Exponential backoff (max 5 attempts).    |

---

## 6. Offline-first pattern

1. On login, call `/field/bundle` and cache with the returned `ETag`.
2. Every ~5 min while foregrounded, re-call with
   `If-None-Match: <etag>` — most calls come back `304`.
3. Queue user actions locally with a UUID; flush via
   `/field/mutations` when online. Never generate DB primary keys
   client-side for anything but the mutation `id`; the server assigns
   real IDs.
4. For delta lists (`/sync/*`), store `last_cursor` per endpoint; on
   reconnect, resume from that cursor.
5. Treat `409 already_processed` as success.

---

## 7. Push notifications

FCM v1 only.

1. Get the FCM token from `firebase_messaging`.
2. `POST /devices/register` with
   `{ "token": "...", "platform": "ios"|"android", "app_build": 42 }`.
3. Handle background messages; when the user taps, read the `deep_link`
   payload key and resolve via `GET /deeplink/:key` — the server returns
   the canonical in-app route and any params.
4. On sign-out call `POST /devices/revoke`.

---

## 8. Deep links

Config comes from `GET /meta`:

```json
"deep_link": { "scheme": "grainhero", "universal_host": "app.grainhero.com" }
```

Register both `grainhero://...` (custom scheme) and
`https://app.grainhero.com/...` (universal links / App Links) in the
Flutter project. Resolve unknown keys with `/deeplink/:key`.

---

## 9. Do / Don't

Do:

- Use the anon key + Supabase Auth for sign-in.
- Send `Authorization`, `x-app-build`, `x-app-platform`, `Idempotency-Key`.
- Use `/sync/*` cursors — don't full-refresh every open.
- Route Stripe payments through `/commerce/checkout`.
- Rely on RLS: query Supabase directly for reads, use the API for
  business flows.

Don't:

- Don't call Supabase Edge Functions — this backend uses TanStack server
  routes under `/api/public/v1`.
- Don't ship the service-role key.
- Don't upload directly to Storage without `/uploads/sign`.
- Don't build parallel role tables — read `user_roles` via RLS helpers.
- Don't cache `min_build` / `feature_flags` longer than 15 min.

---

## 10. Smoke test

```bash
# 1. Health (no auth)
curl https://grainheroo.lovable.app/api/public/v1/status

# 2. Meta (auth)
TOKEN=<paste from supabase.auth.currentSession.accessToken>
curl https://grainheroo.lovable.app/api/public/v1/meta \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-app-build: 1" -H "x-app-platform: ios"

# 3. Silos delta
curl "https://grainheroo.lovable.app/api/public/v1/sync/silos?limit=50" \
  -H "Authorization: Bearer $TOKEN" -H "x-app-build: 1" -H "x-app-platform: ios"
```

If (1) fails the backend is down. If (2) returns 401 the token is
expired — refresh. If (2) returns 426 bump `x-app-build`.

---

## 11. Ownership

- Backend & DB: web team (this repo).
- Auth issues: Supabase dashboard -> Authentication -> Users.
- New endpoint or field needed: open an issue in this repo; do not
  bypass with direct privileged reads.

Locked contract: `/api/public/v1/*` is versioned. Breaking changes ship
as `/api/public/v2/*`; `v1` is maintained until the Flutter app migrates.
