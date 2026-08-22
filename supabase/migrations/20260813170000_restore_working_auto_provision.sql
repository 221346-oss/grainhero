-- Restore working auto_provision_from_install function
-- This was broken by merge conflict in commit 1b0d8c0 which tried to insert
-- into both old (address_line1, city, country) and new (location_city, location_address) columns
-- 
-- The working version from commit 5879d47 used location jsonb only
-- We're restoring that working implementation with proper silo naming (A, B, C... Z, AA, AB...)

CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order       public.hardware_orders%ROWTYPE;
  _wh_id       uuid;
  _dev         record;
  _silo_count  int := 0;
  _target_count int := 0;
  _i           int;
  _serial      text;
  _silo_name   text;
  _suffix      text;
  _idx         int;
  _tmp         int;
  _used_names  text[];
  _alpha       text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  _candidate   text;
BEGIN
  -- Only fire on transition TO 'completed'
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

  -- ── Provision warehouse ──────────────────────────────────────────────────
  -- First try to find existing warehouse in same city/location (deduplication)
  -- Match by: exact city name, or address, or case-insensitive city
  SELECT id INTO _wh_id
  FROM public.warehouses
  WHERE admin_id = _order.admin_id
    AND deleted_at IS NULL
    AND (
      -- Exact match on description (city)
      lower(location->>'description') = lower(_order.install_city)
      -- Or exact match on address
      OR lower(location->>'address') = lower(_order.install_address)
      -- Or city appears in warehouse name
      OR lower(_order.install_city) != '' AND lower(_order.install_city) = lower(split_part(name, ' — ', 1))
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (
      admin_id, created_by, name, warehouse_id, status, is_active,
      origin_order_id, location
    ) VALUES (
      _order.admin_id,
      _order.admin_id,
      COALESCE(NULLIF(_order.install_city, ''), 'Warehouse')
        || ' — ' || upper(substr(_order.id::text, 1, 6)),
      'WH-' || upper(substr(_order.id::text, 1, 8)),
      'active',
      true,
      _order.id,
      jsonb_build_object(
        'description', COALESCE(NULLIF(_order.install_city, ''), ''),
        'address',     COALESCE(NULLIF(_order.install_address, ''), '')
      )
    ) RETURNING id INTO _wh_id;
  END IF;

  -- ── Helper: get next unique silo name for this warehouse ─────────────────
  -- Loads existing names once, then iterates Silo A, B, … Z, AA, AB, …
  SELECT array_agg(lower(name))
    INTO _used_names
    FROM public.silos
   WHERE warehouse_id = _wh_id;

  IF _used_names IS NULL THEN
    _used_names := ARRAY[]::text[];
  END IF;

  -- ── Provision silos from device serials ──────────────────────────────────
  FOR _dev IN
    SELECT serial
    FROM public.hardware_order_devices
    WHERE order_id = _order.id
    ORDER BY created_at
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.silos WHERE origin_device_serial = _dev.serial
    ) THEN
      -- Generate unique name
      _idx := 0;
      LOOP
        _suffix := '';
        _tmp := _idx;
        LOOP
          _suffix := substr(_alpha, (_tmp % 26) + 1, 1) || _suffix;
          _tmp := (_tmp / 26) - 1;
          EXIT WHEN _tmp < 0;
        END LOOP;
        _candidate := 'Silo ' || _suffix;
        EXIT WHEN NOT (_candidate = ANY(_used_names) OR lower(_candidate) = ANY(_used_names));
        _idx := _idx + 1;
      END LOOP;

      _used_names := array_append(_used_names, lower(_candidate));

      INSERT INTO public.silos (
        admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
        status, is_active, origin_order_id, origin_device_serial
      ) VALUES (
        _order.admin_id, _order.admin_id, _wh_id,
        _candidate,
        _dev.serial,
        1000,
        'active', true,
        _order.id,
        _dev.serial
      );
      _silo_count := _silo_count + 1;
    END IF;
  END LOOP;

  -- ── Fallback: no device serials → provision by hardware_quantity ──────────
  SELECT COUNT(*)::int
    INTO _target_count
    FROM public.hardware_order_devices
   WHERE order_id = _order.id;

  IF _target_count = 0 THEN
    _target_count := GREATEST(COALESCE(_order.hardware_quantity, 1), 1);
    FOR _i IN 1.._target_count LOOP
      _serial := 'AUTO-' || upper(substr(_order.id::text, 1, 6))
                 || '-' || lpad(_i::text, 2, '0');
      IF NOT EXISTS (
        SELECT 1 FROM public.silos
         WHERE origin_order_id = _order.id
           AND origin_device_serial = _serial
      ) THEN
        -- Generate unique name
        _idx := 0;
        LOOP
          _suffix := '';
          _tmp := _idx;
          LOOP
            _suffix := substr(_alpha, (_tmp % 26) + 1, 1) || _suffix;
            _tmp := (_tmp / 26) - 1;
            EXIT WHEN _tmp < 0;
          END LOOP;
          _candidate := 'Silo ' || _suffix;
          EXIT WHEN NOT (_candidate = ANY(_used_names) OR lower(_candidate) = ANY(_used_names));
          _idx := _idx + 1;
        END LOOP;

        _used_names := array_append(_used_names, lower(_candidate));

        INSERT INTO public.silos (
          admin_id, created_by, warehouse_id, name, silo_id, capacity_kg,
          status, is_active, origin_order_id, origin_device_serial
        ) VALUES (
          _order.admin_id, _order.admin_id, _wh_id,
          _candidate,
          _serial,
          1000,
          'active', true,
          _order.id,
          _serial
        );
        _silo_count := _silo_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- ── Mark hardware order live ──────────────────────────────────────────────
  UPDATE public.hardware_orders
     SET status = 'live',
         installed_at = COALESCE(installed_at, now()),
         updated_at   = now()
   WHERE id = _order.id;

  -- ── Notify admin ─────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.notifications (
      admin_id, user_id, title, message, type, category,
      entity_type, entity_id, action_url, metadata
    ) VALUES (
      _order.admin_id, _order.admin_id,
      'You''re live on GrainHero 🚜',
      CASE
        WHEN _silo_count > 0
          THEN 'Sign-off recorded. ' || _silo_count
               || ' silo(s) and your warehouse are ready.'
        ELSE 'Sign-off recorded. Your warehouse and silos are already live.'
      END,
      'silo.provisioned', 'operations',
      'hardware_order', _order.id::text, '/silos',
      jsonb_build_object(
        'origin_order_id',    _order.id,
        'warehouse_id',       _wh_id,
        'silos_created',      _silo_count,
        'admin_signed_off_at', NEW.admin_signed_off_at
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- ── Activity log ─────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.activity_logs (
      admin_id, user_id, user_role, action, category,
      entity_type, entity_id, description, metadata, severity
    ) VALUES (
      _order.admin_id,
      NEW.admin_signed_off_by,
      'admin',
      'install.completed',
      'operations',
      'hardware_order',
      _order.id::text,
      'Admin signed off; warehouse and silos provisioned.',
      jsonb_build_object('warehouse_id', _wh_id, 'silos_created', _silo_count),
      'info'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END
$function$;

-- Re-attach trigger to use the corrected function
DROP TRIGGER IF EXISTS trg_auto_provision_install ON public.hardware_order_installations;
CREATE TRIGGER trg_auto_provision_install
  AFTER INSERT OR UPDATE OF status
  ON public.hardware_order_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_from_install();
