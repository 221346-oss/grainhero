# Phase 24 — Mobile Push, Deep Links & Offline Write Queue

Builds on Phase 23's mobile API surface. Zero-hardcode: every provider key, template, throttle, and deep-link route is editable in super-admin settings.

---

## 1. Push Notification Delivery (FCM + APNs via FCM v1)

**Goal:** Every `dispatchNotification` fan-out that targets a user with registered mobile devices also sends a push.

- Extend `notification_channel_prefs` with `push_enabled boolean default true` and per-category push toggles (mirrors existing email/sms shape).
- New `push-dispatch.server.ts`:
  - Reads FCM service-account JSON from `FCM_SERVICE_ACCOUNT_JSON` secret (added via `add_secret`).
  - Mints OAuth2 access token via `google-auth-library` equivalent — use raw JWT sign with `crypto.subtle` (Worker-safe, no node-only deps).
  - POSTs to `https://fcm.googleapis.com/v1/projects/<id>/messages:send` per device token.
  - Handles `UNREGISTERED` / `INVALID_ARGUMENT` → mark device `revoked_at = now()`.
- Hook into `dispatchNotification` (existing) alongside email/sms.
- Write to `notification_deliveries` with `channel = 'push'`, response payload, and `error_code`.

## 2. Deep Link Resolver

- New table `mobile_deep_link_routes` (key, native_route, web_fallback, params_schema jsonb) — super-admin editable.
- Server route `GET /api/public/v1/deeplink/$key` returns `{ native, web, params }` for a given key + query params.
- `dispatchNotification` payloads that carry `deep_link` (Phase 21) now also emit a mobile-safe payload: `{ scheme, host, path, params }` resolved from settings.
- Super-admin page `/platform/mobile-deep-links` — CRUD table with live preview of native + web URLs.

## 3. Offline Write Queue Endpoint

- New route `POST /api/public/v1/actions/replay` — accepts an array of queued mutations from the client:
  ```
  { ops: [{ endpoint, idempotency_key, body }] }
  ```
- Server iterates, dispatches each to the matching internal handler via a small registry (`ackAlert`, `installStep`, `confirmDelivery`, `ackShipment`).
- Returns per-op `{ status, response|error }` array. Uses existing `mobile_idempotency_keys` so duplicates are safe.
- Registry lives in `src/lib/mobile-action-registry.server.ts` — new endpoints register once and are automatically replayable.

## 4. Silo Cockpit Sync (read-side)

- Add sync endpoint `GET /api/public/v1/sync/silos-cockpit?since=` returning silo + latest reading + open-alert count (server-side join, already used by web cockpit).
- Reuses `runSync` with a Postgres view `mobile_silo_cockpit_v` (RLS piggybacks on `silos`).

## 5. Push Diagnostics & Testing

- Super-admin route `/platform/mobile-push-diagnostics`:
  - List last 100 push deliveries (query `notification_deliveries` where channel='push').
  - Filters: user, category, status.
  - "Send test push" action against a chosen device.
- Cron `pg_cron` daily: prune devices with `last_seen_at < now() - interval '90 days'` OR revoked > 30 days.

## 6. Mobile-Facing Notification Endpoints

- `GET /api/public/v1/notifications?since=` — same shape as web `useNotifications`.
- `POST /api/public/v1/notifications/read` — `{ ids: uuid[] }`, marks read; idempotent.
- `POST /api/public/v1/notifications/preferences` — updates `notification_channel_prefs` for caller.

---

## Migration summary (single migration)

1. `mobile_deep_link_routes` + grants/RLS (super_admin write, authenticated read).
2. Extend `notification_channel_prefs`: add `push_enabled`, `push_categories jsonb`.
3. Extend `mobile_devices`: add `last_push_success_at`, `last_push_error text`, `last_push_error_at`.
4. Create view `mobile_silo_cockpit_v` on top of `silos` + `sensor_readings` (SECURITY INVOKER).
5. `pg_cron` job: `mobile_device_prune` daily 03:00 UTC.
6. Seed `platform_settings.mobile.push` with `{ enabled: true, ttl_seconds: 3600, high_priority_categories: [...] }`.

## Server functions / files (new)

- `src/lib/push-dispatch.server.ts` — FCM v1 signer + sender.
- `src/lib/mobile-action-registry.server.ts` — replay dispatch table.
- `src/lib/mobile-deep-links.functions.ts` — CRUD.
- `src/lib/mobile-push-diagnostics.functions.ts` — list / test send.
- Extend `src/lib/notify.ts` (dispatchNotification) → add `sendPushIfEnabled`.

## Routes (new)

- `POST /api/public/v1/actions/replay`
- `GET  /api/public/v1/deeplink/$key`
- `GET  /api/public/v1/sync/silos-cockpit`
- `GET  /api/public/v1/notifications`
- `POST /api/public/v1/notifications/read`
- `POST /api/public/v1/notifications/preferences`
- `/platform/mobile-deep-links` (super-admin UI)
- `/platform/mobile-push-diagnostics` (super-admin UI)
- Register both in `router.tsx` skeletons and `AppSidebar.tsx` "Mobile" group (super-admin only).

## Secrets to add

- `FCM_SERVICE_ACCOUNT_JSON` — via `add_secret` (required before push works; UI shows disabled state until present).

## Zero-hardcode confirmations

- Push TTL, high-priority categories, retry policy → `platform_settings.mobile.push`.
- Deep-link scheme & host → `platform_settings.mobile.deep_link` (Phase 23) + per-key overrides in new table.
- Notification category → channel mapping → `notification_channel_prefs` per user.

## Out of scope (Phase 25+)

- Web-push parity (already Phase 7).
- Rich media / images in push payloads.
- SMS fallback when push fails (Phase 25 resilience matrix).

Reply **go** to execute.
