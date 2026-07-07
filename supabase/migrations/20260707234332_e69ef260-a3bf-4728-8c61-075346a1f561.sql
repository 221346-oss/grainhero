CREATE TABLE IF NOT EXISTS public.hardware_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  plan_id TEXT,
  plan_name TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  hardware_quantity INTEGER NOT NULL DEFAULT 0,
  hardware_unit_price NUMERIC NOT NULL DEFAULT 7000,
  hardware_total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  install_address TEXT,
  install_city TEXT,
  install_country TEXT,
  contact_phone TEXT,
  preferred_install_date DATE,
  notes TEXT,
  business_name TEXT,
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  technician_name TEXT,
  technician_phone TEXT,
  scheduled_install_date TIMESTAMPTZ,
  installed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  refunded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.hardware_orders TO authenticated;
GRANT ALL ON public.hardware_orders TO service_role;

ALTER TABLE public.hardware_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
  ON public.hardware_orders FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Buyers can create their own orders"
  ON public.hardware_orders FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Super admins can update all orders"
  ON public.hardware_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_hardware_orders_admin ON public.hardware_orders (admin_id);
CREATE INDEX IF NOT EXISTS idx_hardware_orders_status ON public.hardware_orders (status);
CREATE INDEX IF NOT EXISTS idx_hardware_orders_session ON public.hardware_orders (stripe_session_id);

CREATE TRIGGER trg_hardware_orders_updated_at
  BEFORE UPDATE ON public.hardware_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hardware_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  emailed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.hardware_order_messages TO authenticated;
GRANT ALL ON public.hardware_order_messages TO service_role;

ALTER TABLE public.hardware_order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view messages"
  ON public.hardware_order_messages FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.hardware_orders o WHERE o.id = order_id AND o.admin_id = auth.uid())
  );

CREATE POLICY "Super admins can insert order messages"
  ON public.hardware_order_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') AND sender_id = auth.uid());