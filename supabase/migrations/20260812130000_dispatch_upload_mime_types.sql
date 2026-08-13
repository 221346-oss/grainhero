-- Business -> Revenue: Item 5 fix. Traced the dispatch/receipt photo upload
-- pipeline end to end: signed-upload-URL generation and the storage RLS
-- policies (tenant-folder-scoped, from 20260804120000_dispatch_invoice_payment_workflow.sql
-- and 20260810120000_dispatch_cnic_and_photo.sql) are both correct. The gap is
-- the bucket's allowed_mime_types list — it only allowed jpeg/png/webp (+pdf
-- for receipts), so a photo taken directly on an iPhone (HEIC/HEIF by
-- default) or an Android capture reporting a slightly different MIME string
-- gets rejected by Supabase Storage. The wizard does surface the raw error
-- via toast, but it reads as "upload broken" rather than "unsupported format."

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'],
    file_size_limit = 26214400 -- 25MB, headroom for modern phone camera output
WHERE id = 'dispatch-photos';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'],
    file_size_limit = 26214400
WHERE id = 'payment-receipts';
