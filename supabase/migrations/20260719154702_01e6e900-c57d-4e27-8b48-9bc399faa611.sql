
CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order public.hardware_orders%ROWTYPE;
  _wh_id uuid;
  _wh_created boolean := false;
  _dev record;
  _silo_id uuid;
  _silo_count int := 0;
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
    _wh_created := true;

    BEGIN
      INSERT INTO public.activity_logs(
        admin_id, user_id, user_role, action, category, entity_type, entity_id,
        description, metadata, severity
      ) VALUES (
        _order.admin_id, NULL, 'system', 'warehouse.auto_provisioned', 'operations',
        'warehouse', _wh_id::text,
        'Warehouse auto-provisioned from install order',
        jsonb_build_object('origin_order_id', _order.id, 'city', _order.install_city),
        'info'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

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
      ) RETURNING id INTO _silo_id;
      _silo_count := _silo_count + 1;

      BEGIN
        INSERT INTO public.activity_logs(
          admin_id, user_id, user_role, action, category, entity_type, entity_id,
          description, metadata, severity
        ) VALUES (
          _order.admin_id, NULL, 'system', 'silo.auto_provisioned', 'operations',
          'silo', _silo_id::text,
          'Silo auto-provisioned from install (device ' || _dev.serial || ')',
          jsonb_build_object(
            'origin_order_id', _order.id,
            'origin_device_serial', _dev.serial,
            'warehouse_id', _wh_id
          ),
          'info'
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;

  -- Notify the admin (in-app). Email pipeline picks this up via lifecycle cron.
  BEGIN
    INSERT INTO public.notifications(
      admin_id, user_id, title, message, type, category,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      _order.admin_id, _order.admin_id,
      'You''re good to go 🚜',
      CASE WHEN _silo_count > 0
        THEN 'Installation complete. ' || _silo_count || ' silo(s) are ready in your dashboard — start adding grain batches.'
        ELSE 'Installation complete. Your warehouse is ready in the dashboard.'
      END,
      'silo.provisioned', 'operations',
      'hardware_order', _order.id::text,
      '/silos',
      jsonb_build_object(
        'origin_order_id', _order.id,
        'warehouse_id', _wh_id,
        'silos_created', _silo_count,
        'event', 'install.completed'
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$;

-- Helper: emit install.scheduled / install.enroute notifications from application code
CREATE OR REPLACE FUNCTION public.notify_install_progress(
  _order_id uuid,
  _event text,
  _title text,
  _message text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _admin uuid;
BEGIN
  SELECT admin_id INTO _admin FROM public.hardware_orders WHERE id = _order_id;
  IF _admin IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(
    admin_id, user_id, title, message, type, category,
    entity_type, entity_id, action_url, metadata
  ) VALUES (
    _admin, _admin, _title, _message, _event, 'operations',
    'hardware_order', _order_id::text, '/orders',
    jsonb_build_object('origin_order_id', _order_id, 'event', _event)
  );
  BEGIN
    INSERT INTO public.activity_logs(
      admin_id, user_id, user_role, action, category, entity_type, entity_id,
      description, metadata, severity
    ) VALUES (
      _admin, NULL, 'system', _event, 'operations',
      'hardware_order', _order_id::text, _title,
      jsonb_build_object('message', _message), 'info'
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_install_progress(uuid, text, text, text) TO authenticated, service_role;
