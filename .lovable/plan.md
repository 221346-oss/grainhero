# Phase 13 — Dispatch, Delivery Tracking & Post-Sale Reviews

Phase 12 got buyers to `paid`. Phase 13 closes the loop: sellers dispatch the batch, buyers track it in real time, and both sides leave a rating that feeds back into marketplace trust. Every label, threshold, template and rating rule is editable by the super-admin — no hardcoded strings.

## Goals
1. Seller-side dispatch workflow with courier + tracking metadata and status timeline.
2. Buyer-side live tracking page (order timeline, shipment map/steps, invoice link, receipt).
3. Delivery confirmation → auto-transition to `completed`, unlocking reviews.
4. Two-way reviews (buyer→seller and seller→buyer) with moderation queue.
5. All copy, courier list, SLA windows, review prompts, and moderation rules configurable via `platform_settings.config.dispatch` + `.reviews` from the SuperAdmin dashboard.

## Data Model
- `buyer_shipments` (new): `id, order_id, admin_id, courier_key, tracking_number, tracking_url, dispatched_at, expected_delivery_at, delivered_at, status (queued|in_transit|out_for_delivery|delivered|exception), notes`.
- `buyer_shipment_events` (new): timeline entries (`shipment_id, at, code, label, location, source`), realtime-enabled.
- `buyer_reviews` (new): `order_id, direction (buyer_to_seller|seller_to_buyer), rating (1-5), title, body, status (pending|published|rejected), moderated_by, moderated_at`.
- Extend `buyer_orders`: `shipment_id`, `delivered_at`, `review_prompt_sent_at`.
- Extend `platform_settings.config` with:
  - `dispatch.couriers[]` (key, label, tracking_url_template)
  - `dispatch.slaHours` (in_transit / out_for_delivery / delivered)
  - `dispatch.emailSubjects/Bodies` for dispatched/out_for_delivery/delivered/exception
  - `reviews.enabled`, `reviews.minChars`, `reviews.autoPublish`, `reviews.prompts` (buyer/seller subject+body)

Every table ships with `GRANT` + RLS + owner/buyer-scoped policies and is added to `supabase_realtime`.

## Server functions
- `dispatch.functions.ts`: `createShipment`, `updateShipmentStatus`, `appendShipmentEvent`, `markDelivered` (transitions order to `completed`, fires review prompt).
- `dispatch-settings.functions.ts`: get/update `dispatch` and `reviews` blobs (super-admin only), reused by webhook and email helpers.
- `reviews.functions.ts`: `submitReview`, `moderateReview`, `listReviewsForListing/Seller/Buyer`, `getMyPendingReviews`.
- Extend `buyer-emails.server.ts` with `dispatched | outForDelivery | delivered | exception | reviewPrompt` kinds — all templates from settings.
- Extend `buyer-portal.functions.ts` with `getOrderTracking(orderId)` returning shipment + events + review status.

## UI
- Seller (Sales cockpit): "Dispatch" drawer on paid orders — pick courier from settings, enter tracking number, expected date. Post-dispatch shows timeline editor + "Mark delivered" and "Report exception".
- Buyer portal (`/buyer/orders/$orderId`): live tracking column (status pill, ETA, event timeline via Supabase realtime), invoice download, "Leave a review" CTA once delivered.
- Public listing page (`/marketplace/$slug`): show aggregate rating + latest published reviews (settings-gated).
- Super-admin `/platform/marketplace-settings`: add **Dispatch** and **Reviews** tabs (couriers table editor, SLA sliders, email templates, moderation toggles).
- Super-admin `/platform/reviews` moderation queue with approve/reject actions.

## Automation & realtime
- Cron `/api/public/cron/dispatch-sla-sweep` reads SLA hours from settings, flags overdue shipments as `exception`, notifies seller + buyer.
- Realtime subscription on `buyer_shipment_events` for the tracking page.
- On `markDelivered`: transition order `dispatched → completed`, insert `grain_batch_events` note, enqueue `reviewPrompt` emails to both sides after settings-defined delay.

## Skeletons & routing
- Register `ShipmentDrawerSkeleton`, `BuyerTrackingSkeleton`, `ReviewsModerationSkeleton` in `src/router.tsx` `PAGE_SKELETONS`.
- New routes: `/platform/reviews`, existing `/buyer/orders/$orderId` extended, `/sales` drawer extended.

## Zero hardcoding checklist
- Courier list, tracking URL patterns → settings.
- SLA thresholds → settings.
- Every email subject/body (dispatch, delivery, exception, review prompts) → settings.
- Review moderation policy (auto-publish vs queue, min length, allow anonymous) → settings.
- Storefront review display (show/hide, min count before showing average) → settings.

## Acceptance
- Seller can dispatch a paid order, buyer sees status change live without refresh.
- Marking delivered auto-completes the order and unlocks reviews for both parties.
- Super-admin edits a courier label or email template and the change is visible on next dispatch — no redeploy.
- SLA cron flags an overdue shipment and both parties get the exception email using the current template.

Reply **go** to execute Phase 13.
