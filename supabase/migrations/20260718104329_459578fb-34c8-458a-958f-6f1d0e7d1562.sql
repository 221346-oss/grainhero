
-- Carriers
CREATE TABLE IF NOT EXISTS public.insurance_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  api_mode text NOT NULL DEFAULT 'manual',
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_carriers TO authenticated;
GRANT ALL ON public.insurance_carriers TO service_role;
ALTER TABLE public.insurance_carriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "carriers_read_auth" ON public.insurance_carriers;
CREATE POLICY "carriers_read_auth" ON public.insurance_carriers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "carriers_super_admin_write" ON public.insurance_carriers;
CREATE POLICY "carriers_super_admin_write" ON public.insurance_carriers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS trg_insurance_carriers_updated ON public.insurance_carriers;
CREATE TRIGGER trg_insurance_carriers_updated BEFORE UPDATE ON public.insurance_carriers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Products
CREATE TABLE IF NOT EXISTS public.insurance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.insurance_carriers(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  coverage_type text NOT NULL CHECK (coverage_type IN ('batch','shipment','hardware')),
  base_premium_bps integer NOT NULL DEFAULT 100,
  deductible_bps integer NOT NULL DEFAULT 0,
  max_payout_cents bigint,
  currency text NOT NULL DEFAULT 'USD',
  terms_url text,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, code)
);
GRANT SELECT ON public.insurance_products TO authenticated;
GRANT ALL ON public.insurance_products TO service_role;
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_read_auth" ON public.insurance_products;
CREATE POLICY "products_read_auth" ON public.insurance_products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "products_super_admin_write" ON public.insurance_products;
CREATE POLICY "products_super_admin_write" ON public.insurance_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS trg_insurance_products_updated ON public.insurance_products;
CREATE TRIGGER trg_insurance_products_updated BEFORE UPDATE ON public.insurance_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend existing insurance_policies
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.insurance_products(id),
  ADD COLUMN IF NOT EXISTS subject_type text,
  ADD COLUMN IF NOT EXISTS subject_id uuid,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS external_ref text;
CREATE INDEX IF NOT EXISTS idx_policies_subject ON public.insurance_policies(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_policies_product ON public.insurance_policies(product_id);

-- Extend existing insurance_claims
ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS narrative text;

-- Events
CREATE TABLE IF NOT EXISTS public.insurance_claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_events_claim ON public.insurance_claim_events(claim_id, created_at DESC);
GRANT SELECT, INSERT ON public.insurance_claim_events TO authenticated;
GRANT ALL ON public.insurance_claim_events TO service_role;
ALTER TABLE public.insurance_claim_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claim_events_super_admin" ON public.insurance_claim_events;
CREATE POLICY "claim_events_super_admin" ON public.insurance_claim_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "claim_events_holder_read" ON public.insurance_claim_events;
CREATE POLICY "claim_events_holder_read" ON public.insurance_claim_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.insurance_claims c
    WHERE c.id = claim_id AND c.admin_id = public.get_tenant_admin_id(auth.uid())
  ));

-- Attachments
CREATE TABLE IF NOT EXISTS public.insurance_claim_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim ON public.insurance_claim_attachments(claim_id);
GRANT SELECT, INSERT, DELETE ON public.insurance_claim_attachments TO authenticated;
GRANT ALL ON public.insurance_claim_attachments TO service_role;
ALTER TABLE public.insurance_claim_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claim_att_super_admin" ON public.insurance_claim_attachments;
CREATE POLICY "claim_att_super_admin" ON public.insurance_claim_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "claim_att_holder_manage" ON public.insurance_claim_attachments;
CREATE POLICY "claim_att_holder_manage" ON public.insurance_claim_attachments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.insurance_claims c
    WHERE c.id = claim_id AND c.admin_id = public.get_tenant_admin_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.insurance_claims c
    WHERE c.id = claim_id AND c.admin_id = public.get_tenant_admin_id(auth.uid())
  ));

-- Storage policies for insurance-attachments bucket
DROP POLICY IF EXISTS "insurance_att_super_admin_all" ON storage.objects;
CREATE POLICY "insurance_att_super_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'insurance-attachments' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'insurance-attachments' AND public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "insurance_att_holder_rw" ON storage.objects;
CREATE POLICY "insurance_att_holder_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'insurance-attachments' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'insurance-attachments' AND owner = auth.uid());
