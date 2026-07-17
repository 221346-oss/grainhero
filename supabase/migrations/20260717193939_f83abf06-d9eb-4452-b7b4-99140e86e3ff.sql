
-- Phase 13: Dispatch, delivery tracking & reviews

CREATE TYPE public.shipment_status AS ENUM ('queued','in_transit','out_for_delivery','delivered','exception');
CREATE TYPE public.review_direction AS ENUM ('buyer_to_seller','seller_to_buyer');
CREATE TYPE public.review_status AS ENUM ('pending','published','rejected');

-- 1) buyer_shipments
CREATE TABLE public.buyer_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  courier_key text NOT NULL,
  courier_label text,
  tracking_number text,
  tracking_url text,
  status public.shipment_status NOT NULL DEFAULT 'queued',
  dispatched_at timestamptz,
  expected_delivery_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_buyer_shipments_order ON public.buyer_shipments(order_id);
CREATE INDEX idx_buyer_shipments_admin ON public.buyer_shipments(admin_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_shipments TO authenticated;
GRANT ALL ON public.buyer_shipments TO service_role;
ALTER TABLE public.buyer_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipments_seller_manage" ON public.buyer_shipments
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "shipments_buyer_read" ON public.buyer_shipments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_orders bo
    JOIN public.buyer_accounts ba ON ba.id = bo.buyer_account_id
    WHERE bo.id = buyer_shipments.order_id AND ba.user_id = auth.uid()
  ));
CREATE TRIGGER trg_buyer_shipments_updated BEFORE UPDATE ON public.buyer_shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) buyer_shipment_events
CREATE TABLE public.buyer_shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.buyer_shipments(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  code text NOT NULL,
  label text NOT NULL,
  location text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_buyer_shipment_events_shipment ON public.buyer_shipment_events(shipment_id, at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_shipment_events TO authenticated;
GRANT ALL ON public.buyer_shipment_events TO service_role;
ALTER TABLE public.buyer_shipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipment_events_seller_manage" ON public.buyer_shipment_events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_shipments s
    WHERE s.id = shipment_id
      AND (s.admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.buyer_shipments s
    WHERE s.id = shipment_id
      AND (s.admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  ));
CREATE POLICY "shipment_events_buyer_read" ON public.buyer_shipment_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_shipments s
    JOIN public.buyer_orders bo ON bo.id = s.order_id
    JOIN public.buyer_accounts ba ON ba.id = bo.buyer_account_id
    WHERE s.id = shipment_id AND ba.user_id = auth.uid()
  ));

-- 3) buyer_reviews
CREATE TABLE public.buyer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  buyer_account_id uuid REFERENCES public.buyer_accounts(id) ON DELETE SET NULL,
  reviewer_user_id uuid NOT NULL,
  direction public.review_direction NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  status public.review_status NOT NULL DEFAULT 'pending',
  moderated_by uuid,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, direction)
);
CREATE INDEX idx_buyer_reviews_admin ON public.buyer_reviews(admin_id);
CREATE INDEX idx_buyer_reviews_status ON public.buyer_reviews(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_reviews TO authenticated;
GRANT SELECT ON public.buyer_reviews TO anon;
GRANT ALL ON public.buyer_reviews TO service_role;
ALTER TABLE public.buyer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read_published" ON public.buyer_reviews
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "reviews_reviewer_manage" ON public.buyer_reviews
  FOR ALL TO authenticated
  USING (reviewer_user_id = auth.uid())
  WITH CHECK (reviewer_user_id = auth.uid());
CREATE POLICY "reviews_seller_read_own" ON public.buyer_reviews
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()));
CREATE POLICY "reviews_superadmin_all" ON public.buyer_reviews
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_buyer_reviews_updated BEFORE UPDATE ON public.buyer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) buyer_orders extensions
ALTER TABLE public.buyer_orders
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.buyer_shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_prompt_sent_at timestamptz;

-- 5) realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_shipment_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_reviews;
