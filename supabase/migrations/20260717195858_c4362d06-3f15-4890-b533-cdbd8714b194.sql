
ALTER TABLE public.buyer_orders
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM ('open','under_review','resolved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.refund_state AS ENUM ('pending','succeeded','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.buyer_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status public.dispute_status NOT NULL DEFAULT 'open',
  resolution_key TEXT,
  resolution_note TEXT,
  refund_amount NUMERIC(14,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  moderated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_disputes TO authenticated;
GRANT ALL ON public.buyer_disputes TO service_role;
ALTER TABLE public.buyer_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_disputes_read" ON public.buyer_disputes FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR admin_id = public.get_tenant_admin_id(auth.uid())
    OR buyer_id IN (SELECT buyer_id FROM public.buyer_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "buyer_disputes_insert" ON public.buyer_disputes FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id IN (SELECT buyer_id FROM public.buyer_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "buyer_disputes_update" ON public.buyer_disputes FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR admin_id = public.get_tenant_admin_id(auth.uid()));
CREATE TRIGGER buyer_disputes_updated_at BEFORE UPDATE ON public.buyer_disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.buyer_dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.buyer_disputes(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  note TEXT
);
GRANT SELECT, INSERT ON public.buyer_dispute_events TO authenticated;
GRANT ALL ON public.buyer_dispute_events TO service_role;
ALTER TABLE public.buyer_dispute_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispute_events_read" ON public.buyer_dispute_events FOR SELECT TO authenticated
  USING (dispute_id IN (
    SELECT id FROM public.buyer_disputes WHERE
      public.is_super_admin(auth.uid())
      OR admin_id = public.get_tenant_admin_id(auth.uid())
      OR buyer_id IN (SELECT buyer_id FROM public.buyer_accounts WHERE user_id = auth.uid())
  ));
CREATE POLICY "dispute_events_insert" ON public.buyer_dispute_events FOR INSERT TO authenticated
  WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_dispute_events;

CREATE TABLE IF NOT EXISTS public.buyer_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.buyer_invoices(id) ON DELETE SET NULL,
  dispute_id UUID REFERENCES public.buyer_disputes(id) ON DELETE SET NULL,
  admin_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason_key TEXT,
  stripe_refund_id TEXT,
  status public.refund_state NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.buyer_refunds TO authenticated;
GRANT ALL ON public.buyer_refunds TO service_role;
ALTER TABLE public.buyer_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds_read" ON public.buyer_refunds FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR admin_id = public.get_tenant_admin_id(auth.uid())
    OR order_id IN (
      SELECT o.id FROM public.buyer_orders o
      WHERE o.buyer_id IN (SELECT buyer_id FROM public.buyer_accounts WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "refunds_insert" ON public.buyer_refunds FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR admin_id = public.get_tenant_admin_id(auth.uid()));
CREATE POLICY "refunds_update" ON public.buyer_refunds FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR admin_id = public.get_tenant_admin_id(auth.uid()));
CREATE TRIGGER buyer_refunds_updated_at BEFORE UPDATE ON public.buyer_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
