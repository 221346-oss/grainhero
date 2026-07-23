
-- 1. Extend profiles for HubSpot + lifecycle tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
  ADD COLUMN IF NOT EXISTS hubspot_deal_id text,
  ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_hubspot_contact ON public.profiles(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_profiles_hubspot_deal ON public.profiles(hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);

-- 2. Super admin helper (uses existing user_roles + has_role pattern)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- 3. HubSpot sync log
CREATE TABLE IF NOT EXISTS public.hubspot_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  hubspot_object_type text NOT NULL,
  hubspot_object_id text,
  status text NOT NULL,
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hubspot_sync_log_user ON public.hubspot_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_log_created ON public.hubspot_sync_log(created_at DESC);

GRANT SELECT ON public.hubspot_sync_log TO authenticated;
GRANT ALL ON public.hubspot_sync_log TO service_role;

ALTER TABLE public.hubspot_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read hubspot sync log"
  ON public.hubspot_sync_log
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 4. Email send log (prevents duplicate lifecycle emails)
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user ON public.email_send_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_type ON public.email_send_log(email_type);

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own email history"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 5. Plan features (extend plan_prices with feature limits)
ALTER TABLE public.plan_prices
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS annual_price_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_annual text;
