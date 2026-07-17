
-- 1. Invoice email retry tracking
ALTER TABLE public.buyer_invoices
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz;

-- 2. Shipment event audit trail
ALTER TABLE public.buyer_shipment_events
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS note text;

-- 3. Dispute attachments (structured, alongside evidence_urls)
ALTER TABLE public.buyer_disputes
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Storage RLS for dispute-attachments bucket
DROP POLICY IF EXISTS "dispute uploads: owner insert" ON storage.objects;
CREATE POLICY "dispute uploads: owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "dispute uploads: owner read" ON storage.objects;
CREATE POLICY "dispute uploads: owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Digest send log (dedupe SLA digest emails)
CREATE TABLE IF NOT EXISTS public.platform_email_digest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_key text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_email_digest_log_key_idx
  ON public.platform_email_digest_log (digest_key, window_end DESC);

GRANT SELECT ON public.platform_email_digest_log TO authenticated;
GRANT ALL ON public.platform_email_digest_log TO service_role;

ALTER TABLE public.platform_email_digest_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read digest log" ON public.platform_email_digest_log;
CREATE POLICY "super_admin can read digest log"
ON public.platform_email_digest_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));
