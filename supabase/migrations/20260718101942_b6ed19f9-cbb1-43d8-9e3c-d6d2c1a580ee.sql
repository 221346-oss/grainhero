
CREATE TABLE public.finance_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN ('payment_in','refund_out','platform_fee','logistics_cost','tax','payout_out','adjustment')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.buyer_orders(id) ON DELETE SET NULL,
  payout_id uuid,
  status text NOT NULL DEFAULT 'on_hold' CHECK (status IN ('on_hold','payable','paid','void')),
  hold_until timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_seller ON public.finance_ledger_entries(seller_id, status);
CREATE INDEX idx_ledger_order ON public.finance_ledger_entries(order_id);
CREATE INDEX idx_ledger_type_occ ON public.finance_ledger_entries(entry_type, occurred_at DESC);
GRANT SELECT ON public.finance_ledger_entries TO authenticated;
GRANT ALL ON public.finance_ledger_entries TO service_role;
ALTER TABLE public.finance_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller reads own ledger" ON public.finance_ledger_entries FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE public.seller_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'bank_transfer',
  bank_name text,
  account_holder text,
  account_number_encrypted text,
  iban_encrypted text,
  swift text,
  country text,
  currency text NOT NULL DEFAULT 'USD',
  minimum_payout_override numeric(14,2),
  verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_payout_accounts TO authenticated;
GRANT ALL ON public.seller_payout_accounts TO service_role;
ALTER TABLE public.seller_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller manages own payout account" ON public.seller_payout_accounts FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (seller_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER seller_payout_accounts_updated BEFORE UPDATE ON public.seller_payout_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.seller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid','failed','cancelled')),
  currency text NOT NULL DEFAULT 'USD',
  period_start date,
  period_end date,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  fees_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_withheld numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'bank_transfer',
  reference text,
  receipt_url text,
  statement_url text,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seller_payouts_seller ON public.seller_payouts(seller_id, status);
GRANT SELECT ON public.seller_payouts TO authenticated;
GRANT ALL ON public.seller_payouts TO service_role;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller reads own payouts" ON public.seller_payouts FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER seller_payouts_updated BEFORE UPDATE ON public.seller_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.seller_payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.seller_payouts(id) ON DELETE CASCADE,
  ledger_entry_id uuid NOT NULL REFERENCES public.finance_ledger_entries(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payout_id, ledger_entry_id)
);
GRANT SELECT ON public.seller_payout_items TO authenticated;
GRANT ALL ON public.seller_payout_items TO service_role;
ALTER TABLE public.seller_payout_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller reads own payout items" ON public.seller_payout_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_payouts sp WHERE sp.id = payout_id AND (sp.seller_id = auth.uid() OR public.is_super_admin(auth.uid()))));

CREATE TABLE public.tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('vat','gst','sales','withholding')),
  rate_pct numeric(6,3) NOT NULL,
  applies_to text NOT NULL CHECK (applies_to IN ('buyer','seller','platform_fee')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tax_rules_active ON public.tax_rules(region, active);
GRANT SELECT ON public.tax_rules TO authenticated;
GRANT ALL ON public.tax_rules TO service_role;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone auth reads tax rules" ON public.tax_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "super admin writes tax rules" ON public.tax_rules FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER tax_rules_updated BEFORE UPDATE ON public.tax_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tax_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region text NOT NULL,
  registration_number text NOT NULL,
  rule_type text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, region, rule_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_registrations TO authenticated;
GRANT ALL ON public.tax_registrations TO service_role;
ALTER TABLE public.tax_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller manages own tax reg" ON public.tax_registrations FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (seller_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER tax_registrations_updated BEFORE UPDATE ON public.tax_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
