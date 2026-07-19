ALTER TABLE public.hardware_order_installations
  ADD COLUMN IF NOT EXISTS admin_signed_off_by uuid,
  ADD COLUMN IF NOT EXISTS admin_signed_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_signoff_note text;

CREATE OR REPLACE FUNCTION public.enforce_install_status_forward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rank_old int;
  _rank_new int;
  _stages constant text[] := ARRAY['scheduled','en_route','onsite','installed','completed'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'en_route'  AND NEW.en_route_at  IS NULL THEN NEW.en_route_at  := now(); END IF;
    IF NEW.status = 'onsite'    AND NEW.onsite_at    IS NULL THEN NEW.onsite_at    := now(); END IF;
    IF NEW.status = 'installed' AND NEW.installed_at IS NULL THEN NEW.installed_at := now(); END IF;
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  _rank_old := array_position(_stages, OLD.status);
  _rank_new := array_position(_stages, NEW.status);

  IF _rank_new IS NULL OR _rank_old IS NULL THEN
    RETURN NEW;
  END IF;

  IF _rank_new < _rank_old THEN
    RAISE EXCEPTION 'install status cannot move backward (% -> %)', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'en_route'  AND NEW.en_route_at  IS NULL THEN NEW.en_route_at  := now(); END IF;
  IF NEW.status = 'onsite'    AND NEW.onsite_at    IS NULL THEN NEW.onsite_at    := now(); END IF;
  IF NEW.status = 'installed' AND NEW.installed_at IS NULL THEN NEW.installed_at := now(); END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_enforce_install_status_forward ON public.hardware_order_installations;
CREATE TRIGGER trg_enforce_install_status_forward
  BEFORE INSERT OR UPDATE OF status ON public.hardware_order_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_install_status_forward();

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
      origin_order_id, address_line1, city, country
    ) VALUES (
      _order.admin_id, _order.admin_id,
      COALESCE(NULLIF(_order.install_city, ''), 'Warehouse') || ' — ' || upper(substr(_order.id::text, 1, 6)),
      'WH-' || upper(substr(_order.id::text, 1, 8)),
      'active', true,
      _order.id,
      NULLIF(_order.install_address, ''),
      NULLIF(_order.install_city, ''),
      COALESCE(NULLIF(_order.install_country, ''), 'Pakistan')
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
        _dev.serial,
        1000,
        'active', true,
        _order.id,
        _dev.serial
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
          'Silo ' || _i,
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

DROP TRIGGER IF EXISTS trg_auto_provision_install ON public.hardware_order_installations;
CREATE TRIGGER trg_auto_provision_install
  AFTER INSERT OR UPDATE OF status ON public.hardware_order_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_from_install();

CREATE OR REPLACE FUNCTION public.advance_install_stage(_order_id uuid, _next text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_super boolean;
  _admin_id uuid;
  _cur_status text;
  _install_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF _next NOT IN ('en_route','onsite','installed','completed','blocked') THEN
    RAISE EXCEPTION 'invalid stage %', _next USING ERRCODE = 'check_violation';
  END IF;

  SELECT admin_id INTO _admin_id FROM public.hardware_orders WHERE id = _order_id;
  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT public.has_role(_uid, 'super_admin') INTO _is_super;

  IF _next = 'completed' THEN
    IF NOT (_uid = _admin_id OR _is_super) THEN
      RAISE EXCEPTION 'only the order admin can sign off completion' USING ERRCODE = '42501';
    END IF;
  ELSIF _next IN ('en_route','onsite','installed','blocked') THEN
    IF NOT _is_super THEN
      RAISE EXCEPTION 'only super_admin can advance to %', _next USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.hardware_order_installations(order_id, status, assigned_at)
    VALUES (_order_id, 'scheduled', now())
    ON CONFLICT (order_id) DO NOTHING;

  SELECT id, status INTO _install_id, _cur_status
  FROM public.hardware_order_installations
  WHERE order_id = _order_id;

  IF _cur_status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'stage', 'completed', 'already_completed', true);
  END IF;

  UPDATE public.hardware_order_installations
     SET status = _next,
         assigned_at = COALESCE(assigned_at, now()),
         blocker_note = CASE WHEN _next = 'blocked' THEN COALESCE(_note, blocker_note) ELSE blocker_note END,
         admin_signed_off_by = CASE WHEN _next = 'completed' THEN _uid ELSE admin_signed_off_by END,
         admin_signed_off_at = CASE WHEN _next = 'completed' THEN now() ELSE admin_signed_off_at END,
         admin_signoff_note = CASE WHEN _next = 'completed' THEN _note ELSE admin_signoff_note END,
         updated_at = now()
   WHERE id = _install_id;

  IF _next = 'installed' THEN
    UPDATE public.hardware_orders
       SET status = 'installed', installed_at = COALESCE(installed_at, now()), updated_at = now()
     WHERE id = _order_id;
  END IF;

  INSERT INTO public.hardware_order_visit_events(order_id, event_type, note, created_by)
    VALUES (
      _order_id,
      CASE WHEN _next = 'completed' THEN 'admin_signoff' ELSE _next END,
      COALESCE(_note, CASE WHEN _next = 'completed' THEN 'Admin signed off installation completion.' ELSE NULL END),
      _uid
    );

  RETURN jsonb_build_object('ok', true, 'stage', _next, 'admin_signed_off', _next = 'completed');
END
$function$;