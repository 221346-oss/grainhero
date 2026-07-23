
CREATE TABLE IF NOT EXISTS public.mobile_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  push_token text,
  app_version text,
  os_version text,
  locale text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, push_token)
);
CREATE INDEX IF NOT EXISTS mobile_devices_user_idx ON public.mobile_devices(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_devices TO authenticated;
GRANT ALL ON public.mobile_devices TO service_role;
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own devices" ON public.mobile_devices;
CREATE POLICY "own devices" ON public.mobile_devices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_mobile_devices_updated ON public.mobile_devices;
CREATE TRIGGER trg_mobile_devices_updated BEFORE UPDATE ON public.mobile_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.mobile_idempotency_keys (
  key text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_hash text,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS mobile_idem_created_idx ON public.mobile_idempotency_keys(created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_idempotency_keys TO authenticated;
GRANT ALL ON public.mobile_idempotency_keys TO service_role;
ALTER TABLE public.mobile_idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own idem keys" ON public.mobile_idempotency_keys;
CREATE POLICY "own idem keys" ON public.mobile_idempotency_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

UPDATE public.platform_settings
SET config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{mobile}',
  coalesce(config->'mobile', '{}'::jsonb) || jsonb_build_object(
    'min_build', 1,
    'latest_build', 1,
    'force_update_below', 0,
    'sync_page_size', 200,
    'max_sync_page_size', 1000,
    'heartbeat_interval_seconds', 300,
    'uploads', jsonb_build_object(
      'install_photo', jsonb_build_object('bucket','logistics-receipts','max_mb',10,'allowed_mime', jsonb_build_array('image/jpeg','image/png','image/webp')),
      'dispute_evidence', jsonb_build_object('bucket','dispute-attachments','max_mb',15,'allowed_mime', jsonb_build_array('image/jpeg','image/png','application/pdf')),
      'quality_cert', jsonb_build_object('bucket','quality-certificates','max_mb',20,'allowed_mime', jsonb_build_array('application/pdf','image/jpeg','image/png'))
    ),
    'feature_flags', jsonb_build_object('offline_mode', true, 'push_v2', false, 'ml_inline', false),
    'deep_link', jsonb_build_object('scheme','grainhero','universal_host','app.grainhero.com')
  )
)
WHERE id = 'singleton';

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='mobile_idem_cleanup') THEN
      PERFORM cron.unschedule('mobile_idem_cleanup');
    END IF;
    PERFORM cron.schedule('mobile_idem_cleanup', '17 3 * * *',
      'DELETE FROM public.mobile_idempotency_keys WHERE created_at < now() - interval ''24 hours'';');
  END IF;
END
$outer$;
