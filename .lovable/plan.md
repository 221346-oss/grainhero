# Phase 14 — Dispatch Ops, Invoicing PDFs, Disputes & Refunds

Phase 13 gave sellers a dispatch drawer and buyers a live tracking column. Phase 14 closes the post-sale surface: a real seller event console, a super-admin analytics view for dispatch SLA, downloadable branded invoices emailed on payment, a buyer dispute flow with a moderation queue, and a Stripe-backed cancel/refund path. Every policy, template, and outcome remains editable in Super-admin → Marketplace Settings — zero hardcoding.

## Goals
1. Seller "Add event" console on `ShipmentPanel` with a preset library (`picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `exception`), each preset mapped to a status transition; timeline + order events update live.
2. `/platform/dispatch-analytics` — SLA compliance %, overdue shipments, on-time delivery rate, avg time in each state, with silo/batch/courier/date filters and CSV export.
3. Real PDF invoices stored in Supabase Storage; auto-generated on `paid` and attached (link) to the payment-success email using the super-admin's template.
4. Buyer dispute flow: post-delivery "Report an issue" with category + evidence; super-admin moderation queue with configurable resolution outcomes (refund, replacement, partial credit, reject).
5. Cancel/refund flow: buyer self-cancel window + seller cancel, driving Stripe refund (full/partial) — window, allowed reasons, refund policy all in settings.

## Data model (one migration)
- Extend `platform_settings.config`:
  - `dispatch.eventPresets[]` (code, label, sets_status?, requires_location?, requires_note?) — seeded defaults.
  - `dispatch.analytics` (retentionDays, includedStatuses, exportEnabled).
  - `invoicing` (storageBucket, numberPrefix, brandingLogoUrl, footerNote, emailAttachmentMode: `link`|`none`).
  - `disputes` (enabled, windowHours, categories[], evidenceRequired, autoAckHours, resolutionOutcomes[] with `key,label,requiresRefundPct?`).
  - `refunds` (buyerCancelWindowHours, sellerCancelAllowedStates[], reasons[], allowPartial, autoRefundOnCancel).
- New tables (all with GRANT + RLS + realtime where noted):
  - `buyer_disputes` (order_id, buyer_id, admin_id, category, description, evidence_urls[], status: `open|under_review|resolved|rejected`, resolution_key, resolution_note, refund_amount, opened_at, closed_at, moderated_by).
  - `buyer_dispute_events` (dispute_id, at, actor_user_id, action, note) — realtime.
  - `buyer_refunds` (order_id, invoice_id, dispute_id?, amount, currency, reason_key, stripe_refund_id, status: `pending|succeeded|failed`, created_by).
- Extend `buyer_orders`: `cancelled_at`, `cancellation_reason`, `refund_status`, `invoice_pdf_url`.
- Create private Storage bucket `invoices` with authenticated-read policy scoped to buyer_id / admin_id.

## Server functions
- `dispatch.functions.ts` (extend): `getEventPresets`, harden `appendShipmentEvent` to validate against preset list and drive status transitions atomically.
- `dispatch-analytics.functions.ts`: aggregate queries (SLA %, overdue counts, avg dwell time per state) with filters; `exportDispatchCsv`.
- `invoicing-pdf.server.ts`: build PDF via `pdf-lib` (Worker-safe), upload to `invoices/` bucket, return signed URL; called from Stripe webhook + retryable `regenerateInvoicePdf` fn.
- Extend `buyer-emails.server.ts` `paymentSucceeded` kind to include `{{invoice_url}}` placeholder; template edited in settings.
- `disputes.functions.ts`: `openDispute` (buyer, gated by settings window + delivered state), `listMyDisputes`, `listModerationQueue` (super-admin), `resolveDispute` (applies outcome; if outcome carries `requiresRefundPct`, calls refund helper).
- `refunds.functions.ts`: `cancelOrder` (buyer/seller, state-machine gated), `issueRefund` (super-admin or auto from dispute); loads `supabaseAdmin` inside handler, calls Stripe `refunds.create` with `payment_intent` from `buyer_orders.stripe_payment_intent_id`, records `buyer_refunds`, updates order `status='refunded'` or `cancelled`.
- Extend Stripe webhook: handle `charge.refunded` / `refund.updated` → sync `buyer_refunds.status`, emit buyer + seller notification via templated email.

## UI
- `ShipmentPanel.tsx`: replace freeform input with a Preset select (from settings) + optional location/note fields; disable delivered button until required prior states exist per settings.
- `/platform/dispatch-analytics`: `AdminPageShell` with summary tiles (SLA %, overdue, avg transit hrs), Recharts line + bar, filter bar (silo, batch, courier, date range), "Export CSV" button.
- Buyer `/buyer/orders/$orderId`: after delivered → "Report an issue" button opens `DisputeDialog` (category from settings, description, evidence upload to `invoices/disputes/`). Cancel button visible during buyer window.
- Sales cockpit: cancel button on paid orders (seller policy), refund action opens `RefundDialog` (full/partial per settings).
- `/platform/disputes`: moderation queue table (open first), drawer with timeline, resolution outcome dropdown (from settings), optional refund amount input, resolve/reject actions.
- `/platform/marketplace-settings`: add **Dispatch presets**, **Invoicing**, **Disputes**, **Refunds** tabs (list editors + toggles); no code deploys needed to change categories, outcomes, windows, or copy.

## Skeletons & routing
Register `DispatchAnalyticsSkeleton`, `DisputesQueueSkeleton`, `BuyerDisputeDialogSkeleton` in `PAGE_SKELETONS`. Sidebar: add "Dispatch analytics" and "Disputes" under Super-admin.

## Automation
- Extend `/api/public/cron/dispatch-sla-sweep` to also expire buyer cancel windows and auto-acknowledge stale disputes based on `disputes.autoAckHours`.
- On successful Stripe refund webhook: update order + refund row, email both parties with settings-driven templates, emit notification, insert `buyer_order_events` entry.

## Zero-hardcoding checklist
- Event presets, SLA analytics filters, invoice branding/footer, dispute categories + outcomes, refund reasons + windows — all in `platform_settings.config`.
- Every email (payment success w/ invoice, dispute opened/resolved, refund issued, cancellation) reads subject/body from settings with placeholder substitution.

## Acceptance
- Seller picks "Out for delivery" from the preset list → shipment status flips, buyer sees the event within seconds via realtime.
- Super-admin loads `/platform/dispatch-analytics` and filters by silo → tiles + chart + CSV export all reflect the filter.
- A paid order automatically has `invoice_pdf_url` set within a few seconds of the Stripe webhook; the buyer's payment-success email contains a working link.
- Buyer opens a dispute inside the configured window; super-admin resolves with a "50% refund" outcome and Stripe processes the refund automatically; both parties get the resolution email.
- Buyer cancels within window → Stripe refund fires, order transitions to `cancelled`, batch returns to `ready`, and the audit trail (`buyer_order_events` + `buyer_refunds`) is complete.

Reply **go** to execute Phase 14.
