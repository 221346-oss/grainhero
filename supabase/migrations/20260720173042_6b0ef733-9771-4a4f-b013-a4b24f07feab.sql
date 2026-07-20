
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS retention_discount_pct integer,
  ADD COLUMN IF NOT EXISTS retention_discount_until timestamptz,
  ADD COLUMN IF NOT EXISTS retention_offer_used_at timestamptz;

ALTER TABLE public.tenant_plan_change_requests
  ADD COLUMN IF NOT EXISTS downgrade_reason text,
  ADD COLUMN IF NOT EXISTS downgrade_reason_details text,
  ADD COLUMN IF NOT EXISTS retention_offer_declined boolean DEFAULT false;
