-- Items 1 & 4 root cause: "Invoice generation broken again" and "OCR not
-- working again" both trace back to the same missing schema change, not to
-- either previously-fixed bug regressing.
--
-- buyer_invoices.batch_id was created NOT NULL (20260707180839_...sql).
-- dispatch-sales.functions.ts's createDispatchInvoice (the Business page's
-- "New sale" quote step) inserts batch_id: null by design — a dispatch
-- quote has no single batch until FIFO allocation happens later, at
-- approveDispatch. 20260804120000_dispatch_invoice_payment_workflow.sql
-- already contains the fix (DROP NOT NULL + adds buyer_invoices.dispatch_id
-- and buyer_payments.dispatch_id/receipt_url/ocr_extracted + the
-- payment-receipts storage bucket) — but per the same pattern already hit
-- twice this session (dispatch-photos bucket, grain_batch_events/
-- automation_rules), the migration file existing in the repo doesn't mean
-- it was ever actually run here. If it wasn't:
--   - Every createDispatchInvoice call fails outright on
--     `null value in column "batch_id" violates not-null constraint`
--     (Item 1 — deterministic, not the old invoice-number race, which is
--     confirmed untouched and correct in invoice-number.ts).
--   - The payment-receipts bucket doesn't exist, so DispatchSaleWizard's
--     receipt upload (createReceiptUploadUrl) throws before OCR ever runs —
--     extractPaymentDetails() and its [ocr]-prefixed logs never execute,
--     which looks identical to "OCR isn't working" from the outside even
--     though ocr-service.ts itself is untouched and correct (still uses the
--     plain `await import("tesseract.js")`, not the broken dynamic-import
--     workaround from before).
--
-- Every statement below is identical to the original migration and equally
-- idempotent — safe to run whether or not the original went through.

ALTER TABLE public.buyer_invoices
  ALTER COLUMN batch_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS dispatch_id uuid REFERENCES public.grain_dispatches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_invoices_dispatch_id ON public.buyer_invoices(dispatch_id);

ALTER TABLE public.buyer_payments
  ADD COLUMN IF NOT EXISTS dispatch_id uuid REFERENCES public.grain_dispatches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS ocr_extracted jsonb;

CREATE INDEX IF NOT EXISTS idx_buyer_payments_dispatch_id ON public.buyer_payments(dispatch_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts', 'payment-receipts', false, 15728640, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment receipts: tenant insert" ON storage.objects;
CREATE POLICY "payment receipts: tenant insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = public.get_tenant_admin_id(auth.uid())::text
);

DROP POLICY IF EXISTS "payment receipts: tenant read" ON storage.objects;
CREATE POLICY "payment receipts: tenant read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND ((storage.foldername(name))[1] = public.get_tenant_admin_id(auth.uid())::text
       OR public.has_role(auth.uid(), 'super_admin'))
);
