
-- ============ buyer_order_messages ============
CREATE TABLE public.buyer_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer','seller','super_admin')),
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_by_seller_at TIMESTAMPTZ,
  read_by_buyer_at TIMESTAMPTZ,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.buyer_order_messages (order_id, created_at);
CREATE INDEX ON public.buyer_order_messages (admin_id);

GRANT SELECT, INSERT, UPDATE ON public.buyer_order_messages TO authenticated;
GRANT ALL ON public.buyer_order_messages TO service_role;

ALTER TABLE public.buyer_order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg seller read/write" ON public.buyer_order_messages
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = auth.uid() OR public.is_super_admin(auth.uid()) OR sender_user_id = auth.uid());

CREATE POLICY "msg buyer read/write" ON public.buyer_order_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_orders o
    JOIN public.buyer_accounts a ON a.id = o.buyer_account_id
    WHERE o.id = buyer_order_messages.order_id AND a.user_id = auth.uid()
  ))
  WITH CHECK (sender_user_id = auth.uid() AND sender_role = 'buyer');

-- ============ buyer_returns ============
CREATE TABLE public.buyer_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  buyer_user_id UUID,
  reason_key TEXT NOT NULL,
  reason_label TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','denied','received','refunded','closed')),
  requested_qty NUMERIC,
  resolution TEXT CHECK (resolution IN ('refund_full','refund_partial','replace','reject')),
  refund_id UUID REFERENCES public.buyer_refunds(id),
  notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_flagged BOOLEAN NOT NULL DEFAULT false,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.buyer_returns (admin_id, status);
CREATE INDEX ON public.buyer_returns (order_id);

GRANT SELECT, INSERT, UPDATE ON public.buyer_returns TO authenticated;
GRANT ALL ON public.buyer_returns TO service_role;

ALTER TABLE public.buyer_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns seller" ON public.buyer_returns
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "returns buyer" ON public.buyer_returns
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_orders o
    JOIN public.buyer_accounts a ON a.id = o.buyer_account_id
    WHERE o.id = buyer_returns.order_id AND a.user_id = auth.uid()
  ))
  WITH CHECK (buyer_user_id = auth.uid());

CREATE TRIGGER trg_buyer_returns_updated_at
  BEFORE UPDATE ON public.buyer_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ buyer_return_events ============
CREATE TABLE public.buyer_return_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.buyer_returns(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_user_id UUID,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.buyer_return_events (return_id, created_at);

GRANT SELECT, INSERT ON public.buyer_return_events TO authenticated;
GRANT ALL ON public.buyer_return_events TO service_role;

ALTER TABLE public.buyer_return_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return events read" ON public.buyer_return_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_returns r
    WHERE r.id = buyer_return_events.return_id
      AND (r.admin_id = auth.uid()
        OR r.buyer_user_id = auth.uid()
        OR public.is_super_admin(auth.uid()))
  ));

CREATE POLICY "return events insert" ON public.buyer_return_events
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- ============ batch_quality_certificates ============
CREATE TABLE public.batch_quality_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.grain_batches(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  issued_by TEXT,
  lab_name TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  moisture_pct NUMERIC,
  purity_pct NUMERIC,
  foreign_matter_pct NUMERIC,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.batch_quality_certificates (admin_id);
CREATE INDEX ON public.batch_quality_certificates (batch_id);

GRANT SELECT, INSERT, UPDATE ON public.batch_quality_certificates TO authenticated;
GRANT SELECT ON public.batch_quality_certificates TO anon;
GRANT ALL ON public.batch_quality_certificates TO service_role;

ALTER TABLE public.batch_quality_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert public read verified" ON public.batch_quality_certificates
  FOR SELECT TO anon, authenticated
  USING (verified = true);

CREATE POLICY "cert seller manage" ON public.batch_quality_certificates
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_batch_quality_certs_updated_at
  BEFORE UPDATE ON public.batch_quality_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ buyer_order_weight_reconciliation ============
CREATE TABLE public.buyer_order_weight_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  dispatched_weight_kg NUMERIC,
  dispatched_at TIMESTAMPTZ,
  dispatched_by UUID,
  received_weight_kg NUMERIC,
  received_at TIMESTAMPTZ,
  received_by UUID,
  variance_pct NUMERIC,
  auto_flagged BOOLEAN NOT NULL DEFAULT false,
  return_id UUID REFERENCES public.buyer_returns(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.buyer_order_weight_reconciliation (admin_id);

GRANT SELECT, INSERT, UPDATE ON public.buyer_order_weight_reconciliation TO authenticated;
GRANT ALL ON public.buyer_order_weight_reconciliation TO service_role;

ALTER TABLE public.buyer_order_weight_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weight seller" ON public.buyer_order_weight_reconciliation
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "weight buyer" ON public.buyer_order_weight_reconciliation
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_orders o
    JOIN public.buyer_accounts a ON a.id = o.buyer_account_id
    WHERE o.id = buyer_order_weight_reconciliation.order_id AND a.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.buyer_orders o
    JOIN public.buyer_accounts a ON a.id = o.buyer_account_id
    WHERE o.id = buyer_order_weight_reconciliation.order_id AND a.user_id = auth.uid()
  ));

CREATE TRIGGER trg_weight_reconciliation_updated_at
  BEFORE UPDATE ON public.buyer_order_weight_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ column additions ============
ALTER TABLE public.grain_listings
  ADD COLUMN IF NOT EXISTS certificate_id UUID REFERENCES public.batch_quality_certificates(id);

ALTER TABLE public.buyer_orders
  ADD COLUMN IF NOT EXISTS messages_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_seller_messages INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_buyer_messages INT NOT NULL DEFAULT 0;

-- ============ message counter trigger ============
CREATE OR REPLACE FUNCTION public.bump_order_message_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_role = 'buyer' THEN
    UPDATE public.buyer_orders
      SET messages_count = messages_count + 1,
          unread_seller_messages = unread_seller_messages + 1
      WHERE id = NEW.order_id;
  ELSIF NEW.sender_role = 'seller' THEN
    UPDATE public.buyer_orders
      SET messages_count = messages_count + 1,
          unread_buyer_messages = unread_buyer_messages + 1
      WHERE id = NEW.order_id;
  ELSE
    UPDATE public.buyer_orders
      SET messages_count = messages_count + 1
      WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_order_message_counters
  AFTER INSERT ON public.buyer_order_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_order_message_counters();
