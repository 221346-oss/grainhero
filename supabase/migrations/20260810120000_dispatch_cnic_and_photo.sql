-- Business -> Revenue: dispatch/truck-details gaps from the Batch 5 audit.
-- Driver CNIC (identity capture alongside name/phone) and a dispatch photo,
-- reusing the exact same signed-upload-URL pattern + policy shape as the
-- payment-receipts bucket (20260804120000_dispatch_invoice_payment_workflow.sql).

ALTER TABLE public.grain_dispatches
  ADD COLUMN IF NOT EXISTS driver_cnic text,
  ADD COLUMN IF NOT EXISTS dispatch_photo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dispatch-photos', 'dispatch-photos', false, 15728640, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dispatch photos: tenant insert" ON storage.objects;
CREATE POLICY "dispatch photos: tenant insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispatch-photos'
  AND (storage.foldername(name))[1] = public.get_tenant_admin_id(auth.uid())::text
);

DROP POLICY IF EXISTS "dispatch photos: tenant read" ON storage.objects;
CREATE POLICY "dispatch photos: tenant read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispatch-photos'
  AND ((storage.foldername(name))[1] = public.get_tenant_admin_id(auth.uid())::text
       OR public.has_role(auth.uid(), 'super_admin'))
);
