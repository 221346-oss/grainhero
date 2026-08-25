-- Root cause of "Could not generate a unique invoice number after 5
-- attempts: duplicate key value violates unique constraint
-- 'buyer_invoices_invoice_number_key'":
--
-- buyer_invoices.invoice_number was declared a bare column-level UNIQUE
-- (20260707180839_...sql: `invoice_number VARCHAR(100) UNIQUE NOT NULL`) —
-- unique across the ENTIRE table, i.e. across every tenant, not per admin.
-- nextInvoiceNumber() in invoice-number.ts, on the other hand, has always
-- computed "the next number" scoped to one tenant only
-- (`.eq("admin_id", adminId)` before taking MAX). That mismatch is the bug,
-- not the retry loop: insertInvoiceWithUniqueNumber DOES re-derive
-- nextInvoiceNumber() fresh on every attempt (verified by reading
-- invoice-number.ts directly — the call is inside the for-loop, not hoisted
-- above it), so the "same precomputed number retried 5 times" theory this
-- was reported under doesn't match the code. What actually happens: once
-- ANY other tenant already holds e.g. "INV-2026-00001" (routine after this
-- many rounds of multi-tenant test data), a tenant computing their own
-- first invoice of the year only ever sees ITS OWN rows (0 of them) and
-- keeps proposing "INV-2026-00001" — colliding with the other tenant's row
-- identically on every retry, since that row is invisible to the
-- admin_id-scoped query that decides what "next" means. This is
-- deterministic, not a rare race: it fails the same way forever until this
-- tenant is manually reseeded past the taken number, which is exactly the
-- "exhausting all 5 retries" symptom reported. The exact constraint name in
-- the error ("buyer_invoices_invoice_number_key") is Postgres's default
-- auto-generated name for that original bare UNIQUE — confirming this is
-- still the live constraint, not something already narrowed by a later
-- migration (grep across every migration turned up only the one file that
-- created it).
--
-- Fix: make the constraint match what the generator actually guarantees —
-- unique per tenant, not globally. Each tenant's own "INV-2026-00001" is a
-- different, legitimate invoice from every other tenant's "INV-2026-00001";
-- nothing else in the codebase looks up buyer_invoices by invoice_number
-- alone (every other query keys off `id`, and the PDF storage path is
-- already namespaced by admin_id), so narrowing the uniqueness scope is
-- safe. insertInvoiceWithUniqueNumber's retry-on-23505 logic needs no code
-- change — it already re-derives per attempt, so it will now correctly
-- resolve genuine same-tenant races instead of being defeated by
-- cross-tenant numbers it was never able to see in the first place.

ALTER TABLE public.buyer_invoices
  DROP CONSTRAINT IF EXISTS buyer_invoices_invoice_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS buyer_invoices_admin_invoice_number_key
  ON public.buyer_invoices (admin_id, invoice_number);
