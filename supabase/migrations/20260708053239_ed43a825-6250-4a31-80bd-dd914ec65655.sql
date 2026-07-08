ALTER TABLE public.hardware_orders
  ALTER COLUMN admin_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_hardware_orders_customer_email
  ON public.hardware_orders (lower(customer_email));

DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.hardware_orders;
CREATE POLICY "Buyers can view their own orders"
  ON public.hardware_orders FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Buyers can create their own orders" ON public.hardware_orders;
CREATE POLICY "Buyers can create their own orders"
  ON public.hardware_orders FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());