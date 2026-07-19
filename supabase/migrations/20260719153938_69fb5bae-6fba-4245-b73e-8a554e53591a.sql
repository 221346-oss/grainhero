
-- Add traceability columns
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS origin_order_id uuid REFERENCES public.hardware_orders(id) ON DELETE SET NULL;
ALTER TABLE public.silos ADD COLUMN IF NOT EXISTS origin_order_id uuid REFERENCES public.hardware_orders(id) ON DELETE SET NULL;
ALTER TABLE public.silos ADD COLUMN IF NOT EXISTS origin_device_serial text;

CREATE INDEX IF NOT EXISTS idx_warehouses_origin_order ON public.warehouses(origin_order_id);
CREATE INDEX IF NOT EXISTS idx_silos_origin_order ON public.silos(origin_order_id);

-- Auto-provision function
CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.hardware_orders%ROWTYPE;
  _wh_id uuid;
  _dev record;
BEGIN
  -- Only fire when status becomes 'completed'
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _order FROM public.hardware_orders WHERE id = NEW.order_id;
  IF _order.id IS NULL OR _order.admin_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reuse existing warehouse for this order, or create one
  SELECT id INTO _wh_id FROM public.warehouses WHERE origin_order_id = _order.id LIMIT 1;
  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (
      admin_id, created_by, name, warehouse_id, status, is_active, origin_order_id,
      address_line1, city, country
    ) VALUES (
      _order.admin_id, _order.admin_id,
      COALESCE(_order.install_city, 'Warehouse') || ' — ' || substr(_order.id::text, 1, 6),
      'WH-' || upper(substr(_order.id::text, 1, 8)),
      'active', true, _order.id,
      _order.install_address, _order.install_city, _order.install_country
    ) RETURNING id INTO _wh_id;
  END IF;

  -- One silo per shipped device serial (skip if already provisioned)
  FOR _dev IN
    SELECT serial FROM public.hardware_order_devices WHERE order_id = _order.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.silos WHERE origin_device_serial = _dev.serial) THEN
      INSERT INTO public.silos (
        admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
        status, is_active, origin_order_id, origin_device_serial
      ) VALUES (
        _order.admin_id, _order.admin_id, _wh_id,
        'Silo ' || upper(substr(_dev.serial, 1, 6)),
        _dev.serial, 1000, 'active', true, _order.id, _dev.serial
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_provision_install ON public.hardware_order_installations;
CREATE TRIGGER trg_auto_provision_install
  AFTER INSERT OR UPDATE OF status ON public.hardware_order_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_from_install();
