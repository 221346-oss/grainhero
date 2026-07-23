
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_settings_singleton CHECK (id = 'singleton')
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any signed-in user can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (id, config)
VALUES ('singleton', '{"maintenance_mode": false, "feature_flags": {}, "default_thresholds": {}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
