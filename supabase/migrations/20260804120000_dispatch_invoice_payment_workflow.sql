-- Business page: Invoice -> Dispatch -> Payment workflow for grain_dispatches.
-- Additive only: existing marketplace-order invoicing (buyer_orders -> generateInvoice
-- -> recordPayment) keeps working unchanged; this just lets buyer_invoices/buyer_payments
-- optionally attach to a grain_dispatches row instead of (or in addition to) a batch/order.

-- 1. buyer_invoices: allow a dispatch-linked invoice with no single batch yet
--    (FIFO batch allocation for a dispatch only happens at approveDispatch time).
ALTER TABLE public.buyer_invoices
  ALTER COLUMN batch_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS dispatch_id uuid REFERENCES public.grain_dispatches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_invoices_dispatch_id ON public.buyer_invoices(dispatch_id);

-- 2. buyer_payments: allow a payment to attach directly to a dispatch (covers the
--    "skip invoice, go straight to dispatch" path), plus receipt/OCR fields.
ALTER TABLE public.buyer_payments
  ADD COLUMN IF NOT EXISTS dispatch_id uuid REFERENCES public.grain_dispatches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS ocr_extracted jsonb;

CREATE INDEX IF NOT EXISTS idx_buyer_payments_dispatch_id ON public.buyer_payments(dispatch_id);

-- 3. Storage bucket for uploaded payment receipt screenshots (private; tenant-scoped
--    by folder = admin_id, mirroring the existing dispute-attachments bucket policy shape).
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
