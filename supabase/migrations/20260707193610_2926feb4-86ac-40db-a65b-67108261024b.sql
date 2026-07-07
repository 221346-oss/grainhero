-- INSURANCE POLICIES
CREATE TABLE public.insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  created_by uuid,
  policy_number text NOT NULL,
  provider_name text NOT NULL,
  coverage_type text NOT NULL DEFAULT 'comprehensive',
  coverage_amount numeric NOT NULL DEFAULT 0,
  premium_amount numeric NOT NULL DEFAULT 0,
  deductible numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  renewal_date date,
  covered_batches jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_insurance_policies_admin ON public.insurance_policies(admin_id, created_at DESC);
CREATE INDEX idx_insurance_policies_status ON public.insurance_policies(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_policies TO authenticated;
GRANT ALL ON public.insurance_policies TO service_role;

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read policies" ON public.insurance_policies
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE POLICY "tenant write policies" ON public.insurance_policies
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = public.get_tenant_admin_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "tenant update policies" ON public.insurance_policies
  FOR UPDATE TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE POLICY "tenant delete policies" ON public.insurance_policies
  FOR DELETE TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE TRIGGER trg_insurance_policies_updated
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INSURANCE CLAIMS
CREATE TABLE public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  created_by uuid,
  policy_id uuid REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  claim_number text NOT NULL,
  claim_type text NOT NULL DEFAULT 'spoilage',
  description text,
  amount_claimed numeric NOT NULL DEFAULT 0,
  amount_approved numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'filed',
  incident_date date,
  filed_date date DEFAULT CURRENT_DATE,
  approved_date date,
  batch_affected jsonb NOT NULL DEFAULT '{}'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_insurance_claims_admin ON public.insurance_claims(admin_id, created_at DESC);
CREATE INDEX idx_insurance_claims_policy ON public.insurance_claims(policy_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT ALL ON public.insurance_claims TO service_role;

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read claims" ON public.insurance_claims
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE POLICY "tenant write claims" ON public.insurance_claims
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE POLICY "tenant update claims" ON public.insurance_claims
  FOR UPDATE TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE POLICY "tenant delete claims" ON public.insurance_claims
  FOR DELETE TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE TRIGGER trg_insurance_claims_updated
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();