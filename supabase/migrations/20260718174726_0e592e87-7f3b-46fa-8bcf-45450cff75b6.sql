ALTER TABLE public.mobile_commerce_settings
  ADD COLUMN IF NOT EXISTS cod_max_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quote_ttl_seconds integer NOT NULL DEFAULT 300;