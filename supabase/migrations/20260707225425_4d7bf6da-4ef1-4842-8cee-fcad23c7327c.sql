
-- Security events audit log
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid,
  event text NOT NULL,
  ip text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_user_id_idx ON public.security_events(user_id, created_at DESC);
CREATE INDEX security_events_tenant_id_idx ON public.security_events(tenant_id, created_at DESC);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins read tenant security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_admin_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Stripe plan price mapping
CREATE TABLE public.plan_prices (
  plan_id text PRIMARY KEY,
  product_id text NOT NULL,
  subscription_price_id text NOT NULL,
  setup_price_id text,
  currency text NOT NULL DEFAULT 'usd',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT ALL ON public.plan_prices TO service_role;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read plan prices"
  ON public.plan_prices FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER plan_prices_set_updated_at BEFORE UPDATE ON public.plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
