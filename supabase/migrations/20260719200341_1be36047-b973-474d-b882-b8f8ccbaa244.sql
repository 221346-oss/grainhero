CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order public.hardware_orders%ROWTYPE;
  _wh_id uuid;
  _dev record;
  _silo_count int := 0;
  _target_count int := 0;
  _i int;
  _serial text;
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

  SELECT id INTO _wh_id
  FROM public.warehouses
  WHERE origin_order_id = _order.id
  LIMIT 1;

  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (
      admin_id, created_by, name, warehouse_id, status, is_active,
      origin_order_id, location
    ) VALUES (
      _order.admin_id, _order.admin_id,
      COALESCE(NULLIF(_order.install_city, ''), 'Warehouse') || ' — ' || upper(substr(_order.id::text, 1, 6)),
      'WH-' || upper(substr(_order.id::text, 1, 8)),
      'active', true,
      _order.id,
      jsonb_build_object(
        'address', NULLIF(_order.install_address, ''),
        'city', NULLIF(_order.install_city, ''),
        'country', COALESCE(NULLIF(_order.install_country, ''), 'Pakistan')
      )
    ) RETURNING id INTO _wh_id;
  END IF;

  FOR _dev IN SELECT serial FROM public.hardware_order_devices WHERE order_id = _order.id ORDER BY created_at LOOP
    IF NOT EXISTS (SELECT 1 FROM public.silos WHERE origin_device_serial = _dev.serial) THEN
      INSERT INTO public.silos (
        admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
        status, is_active, origin_order_id, origin_device_serial
      ) VALUES (
        _order.admin_id, _order.admin_id, _wh_id,
        'Silo ' || upper(substr(_dev.serial, 1, 6)),
        _dev.serial, 1000, 'active', true, _order.id, _dev.serial
      );
      _silo_count := _silo_count + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*)::int INTO _target_count FROM public.hardware_order_devices WHERE order_id = _order.id;
  IF _target_count = 0 THEN
    _target_count := GREATEST(COALESCE(_order.hardware_quantity, 1), 1);
    FOR _i IN 1.._target_count LOOP
      _serial := 'AUTO-' || upper(substr(_order.id::text, 1, 6)) || '-' || lpad(_i::text, 2, '0');
      IF NOT EXISTS (SELECT 1 FROM public.silos WHERE origin_order_id = _order.id AND origin_device_serial = _serial) THEN
        INSERT INTO public.silos (
          admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
          status, is_active, origin_order_id, origin_device_serial
        ) VALUES (
          _order.admin_id, _order.admin_id, _wh_id,
          'Silo ' || _i, _serial, 1000, 'active', true, _order.id, _serial
        );
        _silo_count := _silo_count + 1;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.hardware_orders
     SET status = 'live',
         installed_at = COALESCE(installed_at, now()),
         updated_at = now()
   WHERE id = _order.id;

  BEGIN
    INSERT INTO public.notifications(
      admin_id, user_id, title, message, type, category,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      _order.admin_id, _order.admin_id,
      'You''re good to go 🚜',
      CASE WHEN _silo_count > 0
        THEN 'Admin sign-off received. ' || _silo_count || ' silo(s) and your warehouse are ready.'
        ELSE 'Admin sign-off received. Your warehouse and silos are already ready.'
      END,
      'silo.provisioned', 'operations',
      'hardware_order', _order.id::text, '/silos',
      jsonb_build_object('origin_order_id', _order.id, 'warehouse_id', _wh_id, 'silos_created', _silo_count, 'admin_signed_off_at', NEW.admin_signed_off_at)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.activity_logs(
      admin_id, user_id, user_role, action, category, entity_type, entity_id,
      description, metadata, severity
    ) VALUES (
      _order.admin_id, NEW.admin_signed_off_by, 'admin', 'install.completed', 'operations',
      'hardware_order', _order.id::text,
      'Admin signed off installation; warehouse and silos were provisioned.',
      jsonb_build_object('warehouse_id', _wh_id, 'silos_created', _silo_count),
      'info'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END
$function$;