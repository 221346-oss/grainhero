
CREATE TABLE public.mobile_deep_link_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  native_route TEXT NOT NULL,
  web_fallback TEXT NOT NULL,
  params_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.mobile_deep_link_routes TO authenticated;
GRANT ALL ON public.mobile_deep_link_routes TO service_role;
ALTER TABLE public.mobile_deep_link_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read deep links"
  ON public.mobile_deep_link_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "super admin manage deep links"
  ON public.mobile_deep_link_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_deep_links_updated_at
  BEFORE UPDATE ON public.mobile_deep_link_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.mobile_deep_link_routes(key, native_route, web_fallback, description) VALUES
  ('alert.detail', '/alerts/:id', '/alerts/:id', 'Open an alert'),
  ('silo.detail', '/silos/:id', '/silos/:id', 'Open a silo'),
  ('order.detail', '/orders/:id', '/orders/:id', 'Open an order'),
  ('installation.detail', '/installations/:id', '/hardware-orders/:id', 'Open an installation'),
  ('claim.timeline', '/claims/:id/timeline', '/insurance/claims/:id/timeline', 'Open a claim timeline')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.notification_channel_prefs
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_categories JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.mobile_devices
  ADD COLUMN IF NOT EXISTS last_push_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_push_error TEXT,
  ADD COLUMN IF NOT EXISTS last_push_error_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW public.mobile_silo_cockpit_v
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.admin_id,
  s.name,
  s.warehouse_id,
  s.capacity_kg,
  s.current_occupancy_kg,
  s.status,
  s.updated_at,
  (
    SELECT jsonb_build_object(
      'temperature', sr.temperature_value,
      'humidity', sr.humidity_value,
      'co2_ppm', sr.co2_value,
      'reading_at', sr.reading_timestamp
    )
    FROM public.sensor_readings sr
    WHERE sr.silo_id = s.id
    ORDER BY sr.reading_timestamp DESC NULLS LAST
    LIMIT 1
  ) AS latest_reading,
  (
    SELECT COUNT(*) FROM public.grain_alerts a
    WHERE a.silo_id = s.id AND a.acknowledged_at IS NULL
  ) AS open_alerts
FROM public.silos s;
GRANT SELECT ON public.mobile_silo_cockpit_v TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='mobile_device_prune') THEN
      PERFORM cron.unschedule('mobile_device_prune');
    END IF;
    PERFORM cron.schedule(
      'mobile_device_prune', '0 3 * * *',
      $q$
        DELETE FROM public.mobile_devices
        WHERE (last_seen_at IS NOT NULL AND last_seen_at < now() - interval '90 days')
           OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days');
      $q$
    );
  END IF;
END $$;

UPDATE public.platform_settings
SET config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{mobile,push}',
  coalesce(config #> '{mobile,push}', '{}'::jsonb) ||
    jsonb_build_object(
      'enabled', true,
      'ttl_seconds', 3600,
      'high_priority_categories', jsonb_build_array('alert','insurance','order'),
      'max_devices_per_user', 10
    ),
  true
)
WHERE id = 'singleton';
