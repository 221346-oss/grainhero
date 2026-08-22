-- Item 4 re-fix: dispatch/truck photo upload was failing with "new row
-- violates row-level security policy" — no bucket-not-found error, no JS
-- error, meaning the bucket exists but there's no applicable INSERT policy
-- for it (when RLS is enabled on a table/bucket with zero matching
-- policies for an operation, Postgres denies everything for that
-- operation). Compared byte-for-byte against the working payment-receipts
-- bucket's policy (20260804120000_dispatch_invoice_payment_workflow.sql) —
-- identical shape, so this isn't a policy-logic bug. The likely explanation
-- is that 20260810120000_dispatch_cnic_and_photo.sql (which creates this
-- bucket + its policies) was never applied, or only partially applied.
--
-- Every statement here is idempotent (DROP POLICY IF EXISTS + CREATE,
-- INSERT ... ON CONFLICT DO NOTHING) — safe to run whether or not the
-- original migration went through.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dispatch-photos', 'dispatch-photos', false, 26214400, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

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
