-- =========================================================================
-- Technicians can read ONLY their own assigned installs (and the order behind
-- them). Company technicians have admin_id IS NULL, so the existing
-- "tenant reads own installations" policy (which scopes via the order's
-- admin_id) excludes them entirely — their "My Installs" list was empty.
--
-- These policies keep tenant isolation intact: a technician sees exactly the
-- rows where technician_id = auth.uid(), never another tenant's data.
-- =========================================================================

-- 1. Installations assigned to the technician
DROP POLICY IF EXISTS "technician reads own installations" ON public.hardware_order_installations;
CREATE POLICY "technician reads own installations"
  ON public.hardware_order_installations FOR SELECT TO authenticated
  USING (technician_id = auth.uid());

-- 2. The order behind an install assigned to the technician (needed for the
--    install detail page, which embeds hardware_orders)
DROP POLICY IF EXISTS "technician reads own install orders" ON public.hardware_orders;
CREATE POLICY "technician reads own install orders"
  ON public.hardware_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_order_installations i
      WHERE i.order_id = public.hardware_orders.id
        AND i.technician_id = auth.uid()
    )
  );
