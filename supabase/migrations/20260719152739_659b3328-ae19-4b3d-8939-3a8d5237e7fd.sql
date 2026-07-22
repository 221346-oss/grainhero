
-- 1. suppliers ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.supplier_kind AS ENUM ('external','own_farm','internal_transfer','anonymous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  created_by uuid,
  kind public.supplier_kind NOT NULL DEFAULT 'external',
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  country text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers tenant read" ON public.suppliers;
CREATE POLICY "suppliers tenant read" ON public.suppliers FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "suppliers tenant write" ON public.suppliers;
CREATE POLICY "suppliers tenant write" ON public.suppliers FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_suppliers_admin ON public.suppliers(admin_id);

-- 2. tenant_price_settings ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_price_settings (
  admin_id uuid PRIMARY KEY,
  default_margin_pct numeric NOT NULL DEFAULT 15,
  currency text NOT NULL DEFAULT 'PKR',
  per_grain_margin jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_price_settings TO authenticated;
GRANT ALL ON public.tenant_price_settings TO service_role;
ALTER TABLE public.tenant_price_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tps tenant read" ON public.tenant_price_settings;
CREATE POLICY "tps tenant read" ON public.tenant_price_settings FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "tps tenant write" ON public.tenant_price_settings;
CREATE POLICY "tps tenant write" ON public.tenant_price_settings FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_tps_updated_at BEFORE UPDATE ON public.tenant_price_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. grain_batches additions -------------------------------------------------
ALTER TABLE public.grain_batches
  ADD COLUMN IF NOT EXISTS unit_cost numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_kind public.supplier_kind;

CREATE INDEX IF NOT EXISTS idx_grain_batches_supplier ON public.grain_batches(supplier_id);

-- 4. grain_dispatches additions ---------------------------------------------
ALTER TABLE public.grain_dispatches
  ADD COLUMN IF NOT EXISTS price_basis text,
  ADD COLUMN IF NOT EXISTS market_price_snapshot numeric,
  ADD COLUMN IF NOT EXISTS avg_cost_snapshot numeric,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'staged';

-- 5. silo pool summary view --------------------------------------------------
CREATE OR REPLACE VIEW public.silo_pool_summary AS
SELECT
  b.silo_id,
  b.admin_id,
  COALESCE(SUM(b.remaining_kg),0)::numeric AS total_on_hand_kg,
  CASE WHEN COALESCE(SUM(b.remaining_kg),0) > 0
    THEN (SUM(b.remaining_kg * COALESCE(b.unit_cost,0)) / NULLIF(SUM(b.remaining_kg),0))::numeric
    ELSE 0 END AS weighted_avg_cost,
  MIN(b.intake_date) AS oldest_intake_at,
  COUNT(*) FILTER (WHERE COALESCE(b.remaining_kg,0) > 0) AS active_batch_count
FROM public.grain_batches b
WHERE COALESCE(b.remaining_kg, b.quantity_kg, 0) > 0
GROUP BY b.silo_id, b.admin_id;

GRANT SELECT ON public.silo_pool_summary TO authenticated, service_role;

-- 6. install-order provisioning trigger --------------------------------------
CREATE OR REPLACE FUNCTION public.hardware_order_provision_silo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin uuid;
  _wh_id uuid;
  _silo_count int;
  _i int;
BEGIN
  IF NEW.status <> 'completed' OR (OLD.status IS NOT DISTINCT FROM 'completed') THEN
    RETURN NEW;
  END IF;
  _admin := NEW.admin_id;
  IF _admin IS NULL THEN RETURN NEW; END IF;

  -- ensure warehouse
  SELECT id INTO _wh_id FROM public.warehouses
    WHERE admin_id = _admin AND (metadata->>'hardware_order_id') = NEW.id::text
    LIMIT 1;
  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (admin_id, created_by, name, warehouse_id, status, is_active,
      city, country, address, metadata)
    VALUES (_admin, _admin,
      COALESCE(NEW.shipping_city, 'Warehouse') || ' HQ',
      'WH-' || substr(NEW.id::text,1,8),
      'active', true,
      NEW.shipping_city, NEW.shipping_country, NEW.shipping_address,
      jsonb_build_object('hardware_order_id', NEW.id, 'auto_provisioned', true))
    RETURNING id INTO _wh_id;
  END IF;

  -- silo count from device_count / quantity or default 1
  _silo_count := GREATEST(COALESCE(NEW.device_count, NEW.quantity, 1), 1);

  FOR _i IN 1.._silo_count LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.silos
      WHERE admin_id = _admin
        AND (current_conditions->>'hardware_order_id') = NEW.id::text
        AND (current_conditions->>'seq') = _i::text
    ) THEN
      INSERT INTO public.silos (admin_id, created_by, warehouse_id, name, silo_id,
        capacity_kg, status, is_active, current_conditions)
      VALUES (_admin, _admin, _wh_id,
        'Silo ' || _i,
        'SILO-' || substr(NEW.id::text,1,6) || '-' || _i,
        1000, 'active', true,
        jsonb_build_object('hardware_order_id', NEW.id, 'seq', _i, 'auto_provisioned', true));
    END IF;
  END LOOP;

  -- notify admin
  BEGIN
    INSERT INTO public.notifications (admin_id, user_id, type, title, body, severity, metadata)
    VALUES (_admin, _admin, 'silo.provisioned',
      'Your silos are ready',
      'Installation complete. You can start adding grain batches now.',
      'info',
      jsonb_build_object('hardware_order_id', NEW.id, 'warehouse_id', _wh_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hardware_order_provision ON public.hardware_orders;
CREATE TRIGGER trg_hardware_order_provision
  AFTER UPDATE OF status ON public.hardware_orders
  FOR EACH ROW EXECUTE FUNCTION public.hardware_order_provision_silo();
