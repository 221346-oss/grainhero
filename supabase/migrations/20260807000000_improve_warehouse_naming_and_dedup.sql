-- Migration: Improve warehouse naming and deduplication
-- Goals:
-- 1. Use location-based names instead of generic "Silo X" names
-- 2. Detect and reuse warehouses at the same location (deduplication)
-- 3. Store location info for better regional grouping

-- =========================================================================
-- 1. Enhance warehouses table with location columns for deduplication
-- =========================================================================
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_address text;

-- Create index to help find warehouses by location
CREATE INDEX IF NOT EXISTS idx_warehouses_location
  ON public.warehouses (admin_id, location_city, location_address)
  WHERE deleted_at IS NULL;

-- =========================================================================
-- 2. Update auto_provision_from_install RPC to use location-based naming
--    and deduplication
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.hardware_orders%ROWTYPE;
  _wh_id uuid;
  _dev record;
  _silo_id uuid;
  _silo_count int := 0;
  _wh_name text;
  _location_key text;
BEGIN
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

  -- ────────────────────────────────────────────────────────────────────
  -- Check if warehouse exists at this location (deduplication)
  -- ────────────────────────────────────────────────────────────────────
  _location_key := COALESCE(_order.install_city, '') || '|' || COALESCE(_order.install_address, '');
  
  IF _location_key != '|' THEN -- Only if location info is available
    SELECT id INTO _wh_id 
      FROM public.warehouses 
      WHERE admin_id = _order.admin_id
        AND location_city IS NOT DISTINCT FROM _order.install_city
        AND location_address IS NOT DISTINCT FROM _order.install_address
        AND deleted_at IS NULL
      LIMIT 1;
  END IF;

  -- ────────────────────────────────────────────────────────────────────
  -- If no warehouse at this location, create one with location-based name
  -- ────────────────────────────────────────────────────────────────────
  IF _wh_id IS NULL THEN
    -- Build a friendly warehouse name based on location
    _wh_name := CASE
      WHEN _order.install_city IS NOT NULL AND _order.install_address IS NOT NULL THEN
        _order.install_city || ' — ' || substr(_order.install_address, 1, 30)
      WHEN _order.install_city IS NOT NULL THEN
        _order.install_city || ' Warehouse'
      WHEN _order.install_address IS NOT NULL THEN
        substr(_order.install_address, 1, 40)
      ELSE
        'Warehouse ' || upper(substr(_order.id::text, 1, 6))
    END;

    INSERT INTO public.warehouses (
      admin_id, created_by, name, warehouse_id, status, is_active, 
      origin_order_id, address_line1, city, country,
      location_city, location_address
    ) VALUES (
      _order.admin_id, _order.admin_id, _wh_name,
      'WH-' || upper(substr(_order.id::text, 1, 8)),
      'active', true, _order.id,
      _order.install_address, _order.install_city, _order.install_country,
      _order.install_city, _order.install_address
    ) RETURNING id INTO _wh_id;
  END IF;

  -- ────────────────────────────────────────────────────────────────────
  -- Create silos for each device (if not already commissioned)
  -- ────────────────────────────────────────────────────────────────────
  FOR _dev IN SELECT serial FROM public.hardware_order_devices WHERE order_id = _order.id LOOP
    IF NOT EXISTS (SELECT 1 FROM public.silos WHERE origin_device_serial = _dev.serial) THEN
      INSERT INTO public.silos (
        admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
        status, is_active, origin_order_id, origin_device_serial
      ) VALUES (
        _order.admin_id, _order.admin_id, _wh_id,
        'Silo ' || upper(substr(_dev.serial, 1, 6)),
        _dev.serial, 1000, 'active', true, _order.id, _dev.serial
      ) RETURNING id INTO _silo_id;
      _silo_count := _silo_count + 1;
    END IF;
  END LOOP;

  -- ────────────────────────────────────────────────────────────────────
  -- Notify admin that installation is complete
  -- ────────────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.notifications(
      admin_id, user_id, title, message, type, category,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      _order.admin_id, _order.admin_id,
      'You''re good to go 🚜',
      CASE WHEN _silo_count > 0
        THEN 'Installation confirmed. ' || _silo_count || ' silo(s) are ready — start adding grain batches.'
        ELSE 'Installation confirmed. Your warehouse is ready in the dashboard.'
      END,
      'silo.provisioned', 'operations',
      'hardware_order', _order.id::text, '/silos',
      jsonb_build_object('origin_order_id', _order.id, 'warehouse_id', _wh_id, 'silos_created', _silo_count)
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END $$;

-- =========================================================================
-- 3. Backfill location_city and location_address from existing orders
-- =========================================================================
UPDATE public.warehouses w
  SET location_city = o.install_city,
      location_address = o.install_address
  FROM public.hardware_orders o
  WHERE w.origin_order_id = o.id
    AND (w.location_city IS NULL OR w.location_address IS NULL);

COMMENT ON COLUMN public.warehouses.location_city IS 
  'City for deduplication and regional grouping (extracted from origin order or manually set)';
COMMENT ON COLUMN public.warehouses.location_address IS 
  'Address for deduplication and display (extracted from origin order or manually set)';
