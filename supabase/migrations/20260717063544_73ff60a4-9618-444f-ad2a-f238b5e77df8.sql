
-- Plan thresholds: super_admin editable, all authenticated read.
CREATE TABLE public.plan_thresholds (
  plan_id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_users integer NOT NULL DEFAULT 0,
  max_silos integer NOT NULL DEFAULT 0,
  max_batches integer NOT NULL DEFAULT 0,
  max_sensors integer NOT NULL DEFAULT 0,
  max_actuators integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_thresholds TO service_role;
GRANT ALL ON public.plan_thresholds TO service_role;

ALTER TABLE public.plan_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_thresholds read all authenticated"
  ON public.plan_thresholds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "plan_thresholds super_admin write"
  ON public.plan_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_plan_thresholds_updated
  BEFORE UPDATE ON public.plan_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default plans (aligned with pricing-data)
INSERT INTO public.plan_thresholds (plan_id, name, description, price_cents, max_users, max_silos, max_batches, max_sensors, max_actuators, features, sort_order, is_popular)
VALUES
  ('starter',  'Starter',    'For small farms getting started',    2900,   3, 2,  10,  10,  4, '{"analytics":"basic","support":"email"}', 1, false),
  ('growth',   'Growth',     'Growing operations',                 9900,  10, 8,  50,  50, 20, '{"analytics":"advanced","support":"priority","insurance":true}', 2, true),
  ('scale',    'Scale',      'Larger multi-site operations',      24900,  30,25, 200, 200, 80, '{"analytics":"advanced","support":"priority","insurance":true,"api":true}', 3, false),
  ('enterprise','Enterprise','Custom SLAs and unlimited scale',   99900, 999,999,9999,9999,9999,'{"analytics":"advanced","support":"dedicated","insurance":true,"api":true,"sso":true}', 4, false)
ON CONFLICT (plan_id) DO NOTHING;

-- Tenant plan change requests: admin requests, super_admin decides.
CREATE TABLE public.tenant_plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_plan text NOT NULL REFERENCES public.plan_thresholds(plan_id),
  current_plan text,
  direction text NOT NULL CHECK (direction IN ('upgrade','downgrade')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_applied','cancelled')),
  note text,
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tpcr_tenant ON public.tenant_plan_change_requests(tenant_admin_id, created_at DESC);
CREATE INDEX idx_tpcr_status ON public.tenant_plan_change_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_plan_change_requests TO authenticated;
GRANT ALL ON public.tenant_plan_change_requests TO service_role;

ALTER TABLE public.tenant_plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpcr admin sees own tenant"
  ON public.tenant_plan_change_requests FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR tenant_admin_id = public.get_tenant_admin_id(auth.uid())
  );

CREATE POLICY "tpcr admin insert own"
  ON public.tenant_plan_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_admin_id = public.get_tenant_admin_id(auth.uid())
    AND requested_by = auth.uid()
  );

CREATE POLICY "tpcr super_admin update"
  ON public.tenant_plan_change_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "tpcr requester cancel"
  ON public.tenant_plan_change_requests FOR UPDATE
  TO authenticated
  USING (requested_by = auth.uid() AND status = 'pending')
  WITH CHECK (requested_by = auth.uid() AND status IN ('pending','cancelled'));

CREATE TRIGGER trg_tpcr_updated
  BEFORE UPDATE ON public.tenant_plan_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add auto_upgrade preference to profiles (tenant-level, on admin's own row)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_upgrade_enabled boolean NOT NULL DEFAULT false;
