
-- Phase: intake vs dispatch redesign
-- 1. Add supplier fields + remaining_kg to grain_batches (nullable so existing rows keep working)
ALTER TABLE public.grain_batches
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS supplier_contact text,
  ADD COLUMN IF NOT EXISTS intake_source text,
  ADD COLUMN IF NOT EXISTS remaining_kg numeric;

-- Backfill remaining_kg for existing rows
UPDATE public.grain_batches
   SET remaining_kg = GREATEST(COALESCE(quantity_kg,0) - COALESCE(dispatched_quantity_kg,0), 0)
 WHERE remaining_kg IS NULL;

-- Backfill supplier_name from legacy farmer_name where applicable
UPDATE public.grain_batches
   SET supplier_name = farmer_name
 WHERE supplier_name IS NULL AND farmer_name IS NOT NULL;

-- 2. grain_dispatches: one outbound sale from a silo
CREATE TABLE IF NOT EXISTS public.grain_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  silo_id uuid NOT NULL REFERENCES public.silos(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  buyer_order_id uuid REFERENCES public.buyer_orders(id) ON DELETE SET NULL,
  dispatch_number text NOT NULL,
  grain_type text NOT NULL,
  total_qty_kg numeric NOT NULL CHECK (total_qty_kg > 0),
  price_per_kg numeric NOT NULL CHECK (price_per_kg >= 0),
  currency text NOT NULL DEFAULT 'PKR',
  total_amount numeric NOT NULL DEFAULT 0,
  avg_unit_cost numeric,
  total_cost numeric,
  profit numeric,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft','confirmed','in_transit','delivered','cancelled')),
  expected_date timestamptz,
  dispatched_at timestamptz DEFAULT now(),
  vehicle_number text,
  driver_name text,
  driver_contact text,
  destination text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grain_dispatches TO authenticated;
GRANT ALL ON public.grain_dispatches TO service_role;

ALTER TABLE public.grain_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads its dispatches"
  ON public.grain_dispatches FOR SELECT
  TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Tenant writes its dispatches"
  ON public.grain_dispatches FOR ALL
  TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS idx_grain_dispatches_silo ON public.grain_dispatches(silo_id, dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_grain_dispatches_admin ON public.grain_dispatches(admin_id, dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_grain_dispatches_buyer ON public.grain_dispatches(buyer_id);

CREATE TRIGGER trg_grain_dispatches_updated
  BEFORE UPDATE ON public.grain_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. grain_dispatch_allocations: per-batch draw for a dispatch (FIFO)
CREATE TABLE IF NOT EXISTS public.grain_dispatch_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.grain_dispatches(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.grain_batches(id) ON DELETE RESTRICT,
  qty_kg numeric NOT NULL CHECK (qty_kg > 0),
  unit_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grain_dispatch_allocations TO authenticated;
GRANT ALL ON public.grain_dispatch_allocations TO service_role;

ALTER TABLE public.grain_dispatch_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads its allocations"
  ON public.grain_dispatch_allocations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grain_dispatches d
                 WHERE d.id = dispatch_id
                   AND (d.admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))));

CREATE POLICY "Tenant writes its allocations"
  ON public.grain_dispatch_allocations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grain_dispatches d
                 WHERE d.id = dispatch_id
                   AND (d.admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.grain_dispatches d
                      WHERE d.id = dispatch_id
                        AND (d.admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))));

CREATE INDEX IF NOT EXISTS idx_dispatch_alloc_dispatch ON public.grain_dispatch_allocations(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_alloc_batch ON public.grain_dispatch_allocations(batch_id);

-- 4. Trigger: keep grain_batches.remaining_kg + status in sync from allocations
CREATE OR REPLACE FUNCTION public.recalc_batch_remaining(_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qty numeric;
  _alloc numeric;
  _remaining numeric;
BEGIN
  SELECT COALESCE(quantity_kg,0) INTO _qty FROM public.grain_batches WHERE id = _batch_id;
  SELECT COALESCE(SUM(qty_kg),0) INTO _alloc FROM public.grain_dispatch_allocations WHERE batch_id = _batch_id;
  _remaining := GREATEST(_qty - _alloc, 0);
  UPDATE public.grain_batches
     SET remaining_kg = _remaining,
         dispatched_quantity_kg = _alloc,
         status = CASE
           WHEN _remaining <= 0 THEN 'sold'
           WHEN _alloc > 0 THEN 'dispatched'
           ELSE status
         END,
         updated_at = now()
   WHERE id = _batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dispatch_alloc_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_batch_remaining(OLD.batch_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_batch_remaining(NEW.batch_id);
    IF TG_OP = 'UPDATE' AND OLD.batch_id <> NEW.batch_id THEN
      PERFORM public.recalc_batch_remaining(OLD.batch_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_alloc_recalc ON public.grain_dispatch_allocations;
CREATE TRIGGER trg_alloc_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.grain_dispatch_allocations
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_alloc_recalc();
