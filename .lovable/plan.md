# Phase 16 — Buyer↔Seller Messaging, Returns/RMA, and Post-Delivery Quality Loop

Builds on Phases 11–15.5 (marketplace, dispatch, disputes, refunds, reputation).
Focus: closing the loop **after** the money has moved — direct communication,
formal returns, and continuous quality signals feeding reputation.

Everything configurable via Super-admin Marketplace Settings — zero hardcoded strings.

## Goals

1. **Order-scoped messaging** — buyer and seller can talk on the order, with
   super-admin visibility and moderation.
2. **Returns / RMA workflow** — buyers request returns on delivered orders;
   sellers approve/deny; refunds tie into the existing Stripe flow.
3. **Quality certificates** — sellers attach lab/moisture/purity certificates
   per batch; buyers see them before ordering and on the order page.
4. **Post-delivery quality loop** — buyer quality rating (separate from stars)
   flows into a "quality score" on the seller storefront and reputation.
5. **Weight / count reconciliation** — sellers log actual dispatched weight;
   buyers confirm received weight; variance triggers automatic dispute draft.

## Data model (single migration)

- `buyer_order_messages` — `order_id`, `sender_user_id`, `sender_role`, `body`,
  `attachments jsonb`, `read_by_seller_at`, `read_by_buyer_at`,
  `moderated_at`, `moderation_reason`.
- `buyer_returns` — `order_id`, `admin_id`, `buyer_id`, `reason_key`,
  `status` (`requested|approved|denied|received|refunded|closed`),
  `requested_qty`, `resolution` (`refund_full|refund_partial|replace|reject`),
  `refund_id nullable`, `notes`, `attachments jsonb`, timestamps.
- `buyer_return_events` — audit trail with actor.
- `batch_quality_certificates` — `batch_id`, `admin_id`, `issued_by`,
  `issued_at`, `expires_at`, `moisture_pct`, `purity_pct`, `foreign_matter_pct`,
  `lab_name`, `document_url`, `verified` (super-admin flag).
- `buyer_order_weight_reconciliation` — `order_id`, `dispatched_weight_kg`,
  `received_weight_kg`, `variance_pct`, `auto_flagged bool`.
- Add columns: `grain_listings.certificate_id` (FK), `buyer_orders.messages_count`.

All tables: GRANT to authenticated + service_role, RLS by
`admin_id = auth.uid()` OR buyer via `buyer_accounts.user_id`, super-admin
via `has_role`.

## Marketplace settings additions

- `messaging.enabled`, `messaging.autoModerationKeywords[]`, `messaging.attachmentsAllowed`
- `returns.reasons[]` (key/label/refundEligible)
- `returns.autoApproveHours` (auto-approve if seller doesn't respond)
- `returns.varianceThresholdPct` (weight variance auto-drafts return)
- `quality.requiredForListings` (bool), `quality.certificateValidityDays`
- `quality.metrics[]` (metric key, label, unit, min/max acceptable)
- Email templates: `returnRequested`, `returnApproved`, `returnDenied`,
  `returnRefunded`, `messageReceived`, `qualityCertificateAdded`

## Server functions

- `messaging.functions.ts` — `sendMessage`, `listMessages`, `markRead`, admin `moderateMessage`
- `returns.functions.ts` — `requestReturn` (buyer), `approveReturn`, `denyReturn`,
  `markReceived`, `finalizeReturn` (triggers `createRefund` from Phase 14)
- `quality-certificates.functions.ts` — `uploadCertificate`, `attachToListing`,
  `verifyCertificate` (super-admin), `listCertificates`
- `weight-reconciliation.functions.ts` — `logDispatchedWeight`,
  `logReceivedWeight` → auto-draft return if variance > threshold
- Extend `reputation.functions.ts` — include quality score, response time to
  messages, return rate

## UI pages / components

- **Buyer**
  - `/buyer/orders/$orderId` → new tabs: Messages, Returns, Quality certs, Weight
  - `<ReturnRequestDialog>` with reason dropdown + attachment upload
- **Seller**
  - `/orders/$orderId` → matching Messages panel with unread badge
  - `/returns` — inbox of pending return requests
  - `/quality-certificates` — upload/manage per batch
  - `/listings/$id/edit` — attach certificate before publishing
- **Super-admin**
  - `/platform/messaging-moderation` — flagged messages queue
  - `/platform/returns` — cross-tenant returns overview + intervention
  - `/platform/quality-verifications` — certificates awaiting verify
- **Marketplace public**
  - Seller storefront gains "Quality verified" badge when >X% listings have valid certs
  - Listing detail shows certificate summary + download link
- **Notifications** — reuse `emitNotification` + `dispatchNotification` for
  every message, return state change, and certificate verification

## Automation / cron

- `/api/public/cron/returns-auto-approve` — hourly; auto-approves returns older
  than `autoApproveHours` when seller silent
- `/api/public/cron/certificates-expiring` — daily; warns sellers 14/7/1 days
  before expiry, hides listing when expired if `requiredForListings=true`

## Backfill / migration hygiene

- Backfill `messages_count = 0` on `buyer_orders`.
- Create `dispute-attachments`-style private bucket `return-attachments`
  and `quality-certificates` (private, seller+buyer+super_admin read via signed URLs).

## Zero-hardcoding checklist

- Return reasons, variance threshold, auto-approve window, quality metrics,
  every email subject/body, moderation keywords — all from `platform_settings`.

## Out of scope (deferred to later phases)

- Chat-style realtime typing indicators (Phase 17)
- ML-based fraud detection on returns (Phase 20)
- Third-party lab API integrations (Phase 21)

Reply **go** to execute Phase 16.
