-- hardware_order_provision_silo() (added in 20260719152739) referenced
-- columns that never existed on hardware_orders (shipping_city,
-- shipping_country, shipping_address, device_count, quantity), on
-- warehouses (city, country, address, metadata), and on notifications
-- (body, severity) — any UPDATE that set hardware_orders.status =
-- 'completed' would throw a Postgres error inside this AFTER trigger.
--
-- That direct hardware_orders.status='completed' update happens today from
-- updateInstallStatus() (hardware-lifecycle.functions.ts), called when a
-- technician marks their own install job complete — a separate, parallel
-- flow from the admin "Sign off & complete" button (orders.tsx), which
-- goes through advance_install_stage() and hardware_order_installations
-- instead, firing the *different*, already-correct auto_provision_from_install()
-- trigger (fixed in 20260719200341). Both flows end with the same real
-- goal (provision a warehouse + silo(s) for the order), so this fix also
-- makes the two idempotent with each other via the shared origin_order_id
-- column, instead of just correcting column names and letting it double-
-- provision a second warehouse/silo set on top of what the other trigger
-- already created.
CREATE OR REPLACE FUNCTION public.hardware_order_provision_silo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin uuid;
  _wh_id uuid;
  _silo_count int;
  _existing_silos int;
  _i int;
BEGIN
  IF NEW.status <> 'completed' OR (OLD.status IS NOT DISTINCT FROM 'completed') THEN
    RETURN NEW;
  END IF;
  _admin := NEW.admin_id;
  IF _admin IS NULL THEN RETURN NEW; END IF;

  -- Reuse the warehouse already provisioned by auto_provision_from_install()
  -- for this order (same origin_order_id column it uses), instead of
  -- creating a duplicate.
  SELECT id INTO _wh_id FROM public.warehouses
    WHERE origin_order_id = NEW.id
    LIMIT 1;

  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (admin_id, created_by, name, warehouse_id, status, is_active,
      origin_order_id, location)
    VALUES (_admin, _admin,
      COALESCE(NULLIF(NEW.install_city, ''), 'Warehouse') || ' HQ',
      'WH-' || substr(NEW.id::text, 1, 8),
      'active', true,
      NEW.id,
      jsonb_build_object(
        'address', NULLIF(NEW.install_address, ''),
        'city', NULLIF(NEW.install_city, ''),
        'country', NULLIF(NEW.install_country, '')
      ))
    RETURNING id INTO _wh_id;
  END IF;

  -- Same dedup logic for silos: skip if this order already has any
  -- (created here or by the sibling trigger).
  SELECT count(*) INTO _existing_silos FROM public.silos WHERE origin_order_id = NEW.id;
  IF _existing_silos = 0 THEN
    _silo_count := GREATEST(COALESCE(NEW.hardware_quantity, 1), 1);
    FOR _i IN 1.._silo_count LOOP
      INSERT INTO public.silos (admin_id, created_by, warehouse_id, name, silo_id,
        capacity_kg, status, is_active, origin_order_id)
      VALUES (_admin, _admin, _wh_id,
        'Silo ' || _i,
        'SILO-' || substr(NEW.id::text, 1, 6) || '-' || _i,
        1000, 'active', true, NEW.id);
    END LOOP;
  END IF;

  -- notify admin (real notifications columns are `message`/`category`,
  -- not `body`/`severity`)
  BEGIN
    INSERT INTO public.notifications (admin_id, user_id, type, category, title, message, metadata)
    VALUES (_admin, _admin, 'silo.provisioned', 'ops',
      'Your silos are ready',
      'Installation complete. You can start adding grain batches now.',
      jsonb_build_object('hardware_order_id', NEW.id, 'warehouse_id', _wh_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END $$;
