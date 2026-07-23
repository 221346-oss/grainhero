
ALTER TABLE public.tenant_plan_change_requests
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS apply_at timestamptz,
  ADD COLUMN IF NOT EXISTS charge_amount_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema='public' AND table_name='tenant_plan_change_requests'
      AND constraint_name='tenant_plan_change_requests_billing_cycle_chk'
  ) THEN
    ALTER TABLE public.tenant_plan_change_requests
      ADD CONSTRAINT tenant_plan_change_requests_billing_cycle_chk
      CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','yearly'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema='public' AND table_name='profiles'
      AND constraint_name='profiles_billing_cycle_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_billing_cycle_chk
      CHECK (billing_cycle IN ('monthly','yearly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plan_change_scheduled
  ON public.tenant_plan_change_requests (status, apply_at)
  WHERE status = 'scheduled';
