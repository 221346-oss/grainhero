
## Phase 15 — Buyer trust, seller reputation, and post-sale intelligence

Builds on Phases 11–14 (marketplace, dispatch, disputes, refunds). Goal:
close the loop after every sale so buyers can trust listings, sellers can
compete on quality, and super-admins get an at-a-glance health score. No
hardcoded copy — everything is driven from `platform_settings.marketplace`.

### 15.1 Seller reputation & badges (backend)

- New view `seller_reputation` derived on-read from
  `buyer_reviews`, `buyer_disputes`, `buyer_shipments`:
  - `avg_rating`, `review_count` (last 90d + all-time)
  - `dispute_rate` = disputes ÷ delivered orders
  - `on_time_rate`, `avg_transit_hours`
  - `fulfillment_score` (0–100) computed from the above with weights
    editable in marketplace settings.
- New settings block `marketplace.reputation`:
  - `weights: { rating, onTime, disputeFree, transitSpeed }` (sum = 100)
  - `badges: [{ key, label, minScore, colorToken }]` — fully editable.
- Server fn `getSellerReputation({ adminId })` returning score + badges.

### 15.2 Public seller storefront

- Route `marketplace.seller.$slug.tsx` (public):
  - Seller name, city, badges, reputation score, review histogram.
  - Recent listings from that seller.
  - "Report seller" link → opens a general (non-order) dispute flow.
- Route `_authenticated/platform.sellers.tsx` (super-admin):
  - Sortable table of every tenant admin ranked by fulfillment score.
  - Drill-in reuses `/platform/admins/$adminId` with a new
    "Reputation" tab.

### 15.3 Post-purchase review loop

- Extend `buyer_reviews`:
  - `seller_response text`, `seller_response_at timestamptz`,
    `helpful_count int default 0`, `reported_at timestamptz`.
- Server fns:
  - `respondToReview({ reviewId, response })` — seller-only, one edit.
  - `markReviewHelpful({ reviewId })` — buyer-only, deduped per user.
  - `reportReview({ reviewId, reason })` → super-admin moderation queue.
- Buyer prompt: 24h after delivery, `sendBuyerOrderEmail` fires
  `reviewPromptBuyer` if not already reviewed (cron: reuse
  `sla-digest` handler pattern, new endpoint `cron/review-prompts`).

### 15.4 Repeat-buy accelerators

- On buyer order tracking page, when order status = `completed` and the
  listing is still active, show "Reorder" that pre-fills a new order.
- Server fn `duplicateOrder({ orderId })` returns a draft in `pending`.
- Add `favorite_listings` (buyer_account_id, listing_id, unique).
  - Heart button on marketplace + storefront.
  - Buyer profile page shows "Favourites" list.

### 15.5 Super-admin marketplace health

- New page `/platform/marketplace-health`:
  - GMV (30d/90d), take-rate, gross vs net revenue.
  - Funnel: listings → orders → paid → delivered → reviewed.
  - Top 10 sellers by score, bottom 10 by dispute rate.
  - Reasons breakdown for cancellations, refunds, disputes.
- All chart config (period, thresholds, funnel steps) editable in
  marketplace settings.

### 15.6 Configurable review policies & auto-moderation

- Extend `marketplace.reviews`:
  - `autoPublishThreshold` (star rating below which review is held).
  - `bannedPhrases string[]` — auto-flag on submit.
  - `sellerResponseWindowDays`.
- Update `submitReview` to apply threshold + phrase check.
- Super-admin queue reused (Reviews page).

### 15.7 Buyer trust surfaces on public listings

- Listing card + detail page shows:
  - Seller badge, rating snapshot (`4.7 · 128 reviews`).
  - "Delivered in ~X days on average" pill from `seller_reputation`.
  - Verified-seller checkmark when `fulfillment_score >= threshold`.

### Data model summary

```text
marketplace.reputation (JSON in platform_settings)
  weights: { rating, onTime, disputeFree, transitSpeed }
  badges:  [{ key, label, minScore, colorToken }]
  verifiedMinScore: number

buyer_reviews
  + seller_response text
  + seller_response_at timestamptz
  + helpful_count int default 0
  + reported_at timestamptz

buyer_review_helpful
  buyer_account_id + review_id (unique)

favorite_listings
  buyer_account_id + listing_id (unique)

seller_reputation  (view or materialized)
  admin_id, avg_rating, review_count_90d, dispute_rate,
  on_time_rate, avg_transit_hours, fulfillment_score
```

### Cron additions

- `/api/public/cron/review-prompts` — 24h after delivery, send
  `reviewPromptBuyer` email if no review yet. Bearer-authed with
  `CRON_SECRET`.
- Weekly `/api/public/cron/reputation-refresh` — refresh cached scores
  if we go materialized.

### Zero-hardcoding checklist (must-hold)

- Badge labels, thresholds, colors → `platform_settings.marketplace`.
- Reputation weights → same.
- Review policies (auto-publish, banned phrases, response window) → same.
- Email subjects/bodies for review prompt & seller response → existing
  email template system.
- All UI copy on health/storefront pulls from settings, no literals.

### Rollout order

1. Schema + settings shape (one migration).
2. Reputation view + server fns.
3. Public seller storefront + listing trust pills.
4. Review response/helpful/report + auto-moderation.
5. Reorder + favourites.
6. Super-admin marketplace-health page.
7. Crons (review prompts, optional reputation refresh).

Reply **go** to execute Phase 15.
