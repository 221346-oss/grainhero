-- Fix missing GRANTs on installation-tracking tables (saves were silently failing under RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_installations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_visit_events TO authenticated;
GRANT ALL ON public.hardware_order_installations TO service_role;
GRANT ALL ON public.hardware_order_devices TO service_role;
GRANT ALL ON public.hardware_order_visit_events TO service_role;

-- Seed default company origin address in platform_settings singleton so
-- installation "Origin" can auto-fill without hand-typing.
DO $$
DECLARE
  cur jsonb;
BEGIN
  SELECT COALESCE(config, '{}'::jsonb) INTO cur FROM public.platform_settings WHERE id = 'singleton';
  IF cur IS NULL THEN
    INSERT INTO public.platform_settings(id, config) VALUES ('singleton', '{}'::jsonb);
    cur := '{}'::jsonb;
  END IF;
  IF cur->'company' IS NULL THEN
    UPDATE public.platform_settings
    SET config = jsonb_set(cur, '{company}', jsonb_build_object(
      'origin_address', 'J453+GPQ, Old Airport Rd, Chaklala Cantt., Rawalpindi, 46000',
      'origin_lat', NULL,
      'origin_lng', NULL
    ), true)
    WHERE id = 'singleton';
  END IF;
END $$;

-- Backfill existing installations with the default origin address when blank
UPDATE public.hardware_order_installations
SET origin_address = 'J453+GPQ, Old Airport Rd, Chaklala Cantt., Rawalpindi, 46000'
WHERE origin_address IS NULL OR btrim(origin_address) = '';