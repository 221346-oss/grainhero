# Phase 18 — Finance Operations, Payouts & Tax Compliance

## Why this phase now
Phases 11–17 built the marketplace, dispatch, disputes, refunds, reputation, and logistics cost tracking. Money currently flows in (buyer payments) and out (refunds, logistics costs), but there is no formal **seller payout ledger**, no **tax handling**, and no **finance reconciliation surface** for super-admins. Kimi's roadmap and our finalized plan both call for a "Finance & Payouts" pillar before we open the platform to external sellers at scale. This phase closes that gap — fully driven by super-admin settings, zero hardcoding.

## Goals
1. Track every money movement (payment, refund, platform fee, logistics cost, tax, payout) in a unified **finance ledger**.
2. Compute seller **payout balances** automatically after each delivered/refunded order.
3. Let super-admins **approve, schedule, and mark payouts as paid** (manual bank transfer first; Stripe Connect stub ready for later).
4. Apply **tax rules** (VAT/GST/sales tax) configurable per region and per plan tier.
5. Give super-admins a **Finance Command Center** with reconciliation, aging, and export.
6. Give sellers a **Payouts & Earnings** page with statement PDFs.

## Data model (new tables)
- `finance_ledger_entries` — append-only rows: `entry_type` (payment_in, refund_out, platform_fee, logistics_cost, tax, payout_out, adjustment), `direction` (credit/debit), `amount`, `currency`, `seller_id`, `order_id`, `payout_id?`, `occurred_at`, `metadata jsonb`.
- `seller_payout_accounts` — bank details (encrypted), preferred method, minimum payout threshold override.
- `seller_payouts` — batch: `status` (pending, approved, processing, paid, failed, cancelled), `period_start/end`, `gross`, `fees`, `tax_withheld`, `net`, `reference`, `paid_at`, `receipt_url`.
- `seller_payout_items` — join between `seller_payouts` and `finance_ledger_entries`.
- `tax_rules` — `region`, `rule_type` (vat/gst/sales), `rate_pct`, `applies_to` (buyer/seller/platform_fee), `effective_from/to`, `active`.
- `tax_registrations` — seller VAT/GST IDs per region for reverse-charge logic.
- `finance_statements` — generated PDFs per seller per period.

All tables: standard grants (`authenticated` + `service_role`), RLS scoping sellers to their own rows, super-admins to all.

## Marketplace settings extension (super-admin, no hardcoding)
Extend `marketplace-settings.functions.ts` `finance` schema with:
- `payoutSchedule`: `manual | weekly | biweekly | monthly` + day-of-week/month.
- `minimumPayoutAmount` per currency.
- `platformFeePct` (default) + optional per-plan overrides.
- `holdPeriodDays` after delivery before funds become payable.
- `defaultCurrency`, `supportedCurrencies[]`.
- `taxMode`: `inclusive | exclusive`.
- `payoutMethods[]` (bank_transfer, stripe_connect_future) with per-method fee.
- `statementTemplate` (heading, footer, tax notes).

## Server functions
`src/lib/finance-ledger.functions.ts`
- `recordLedgerEntry` (internal helper, called from Stripe webhook, refund handler, logistics cost handler).
- `getSellerBalance({ sellerId })` — running balance + `payable / on_hold / paid_out`.
- `getPlatformFinanceSummary({ range })` — GMV, fees, refunds, tax collected, net platform revenue.

`src/lib/payouts.functions.ts`
- `listPayableSellers()` (super-admin) — sellers over threshold.
- `createPayoutBatch({ sellerIds, periodStart, periodEnd })`.
- `approvePayout / markPayoutPaid / cancelPayout` (super-admin) with receipt upload to `logistics-receipts`-style new `payout-receipts` bucket.
- `getSellerPayouts()` (seller-scoped).
- `generatePayoutStatementPdf` — pdf-lib, stored in `finance-statements` bucket.

`src/lib/tax.functions.ts`
- `resolveTaxForOrder({ orderId })` — applied at checkout and to platform fee.
- `listTaxRules / upsertTaxRule / archiveTaxRule` (super-admin).
- `upsertTaxRegistration` (seller).

## Integration points (retrofit, non-breaking)
- Stripe webhook (`charge.succeeded`, `charge.refunded`): also call `recordLedgerEntry` for payment_in, platform_fee, tax.
- `refunds.functions.ts`: emit refund_out entry.
- `logistics-cost-entries` insert trigger → ledger entry `logistics_cost` (debit against relevant seller when attributable, else platform).
- `buyer-checkout.functions.ts`: compute tax via `resolveTaxForOrder` when `taxMode=exclusive`, store on invoice.
- `invoicing-pdf.server.ts`: render tax line + seller VAT ID.

## Cron / automation (`/api/public/cron/*`)
- `finance-hold-release` (hourly) — moves ledger entries past `holdPeriodDays` from `on_hold` → `payable`.
- `payout-auto-batch` (daily) — when schedule ≠ manual, auto-create payout batches ready for super-admin approval.
- `finance-daily-digest` — email super-admins today's GMV, fees, refunds, and pending payout count.

## UI

Super-admin:
- `/platform/finance` — Command Center: KPI tiles (GMV, net revenue, refunds, tax collected, pending payouts), 30d trend chart, top sellers by GMV, aging buckets. CSV + PDF export.
- `/platform/finance/payouts` — batches table, filters (status, seller, period), detail sheet with items, approve/mark-paid/upload receipt actions.
- `/platform/finance/tax-rules` — CRUD table with region/rate/effective dates.
- `/platform/finance/ledger` — filterable ledger explorer with drill-down to source order.
- Extend `/platform/marketplace-settings` with a **Finance** tab.

Seller (admin role acting as seller):
- `/earnings` — balance card (payable / on-hold / lifetime paid), upcoming payout ETA, recent payouts table with statement PDF download.
- `/earnings/tax` — enter VAT/GST registration per region.
- `/earnings/payout-account` — bank details form.

Buyer:
- Invoice PDF and order summary already show line items; add tax breakdown row when `taxMode=exclusive`.

## Skeletons & navigation
- Register `FinanceCenterSkeleton`, `PayoutsSkeleton`, `LedgerSkeleton`, `EarningsSkeleton` in `router.tsx`.
- Sidebar: add "Finance" group for super-admin (Command Center, Payouts, Ledger, Tax Rules); add "Earnings" for admin/seller role.

## Notifications
Reuse `dispatchNotification`:
- Seller: payout approved, payout paid (with statement link), payout failed, tax registration verified.
- Super-admin: seller crossed payout threshold, payout marked failed by bank, tax rule expiring in 7 days.

Templates all live in marketplace settings (editable, no hardcoding).

## Security & compliance
- Bank details encrypted at rest via `pgcrypto` symmetric key stored in `FINANCE_ENCRYPTION_KEY` secret (add via `add_secret`).
- Ledger is append-only: RLS blocks UPDATE/DELETE for everyone except `service_role`; corrections happen via `adjustment` entries.
- Super-admin payout actions logged to `activity_logs` with actor + IP.

## Deliverables order
1. Migration (tables, buckets, grants, RLS, ledger triggers).
2. `add_secret FINANCE_ENCRYPTION_KEY` if missing.
3. Marketplace settings extension.
4. `finance-ledger`, `tax`, `payouts` server functions.
5. Retrofit Stripe webhook, refunds, logistics cost, invoicing.
6. Cron routes + pg_cron jobs.
7. Super-admin UI (4 pages) + settings tab.
8. Seller UI (3 pages) + sidebar wiring.
9. Skeletons + notifications templates + activity logging.

Reply **go** to execute.
