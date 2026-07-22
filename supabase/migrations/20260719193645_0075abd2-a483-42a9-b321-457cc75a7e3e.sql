
-- Extend installation status enum-lite to include 'installed'
ALTER TABLE public.hardware_order_installations
  DROP CONSTRAINT IF EXISTS hardware_order_installations_status_check;
ALTER TABLE public.hardware_order_installations
  ADD CONSTRAINT hardware_order_installations_status_check
  CHECK (status IN ('scheduled','en_route','onsite','installed','completed','blocked'));

-- Timestamp columns per stage on installations
ALTER TABLE public.hardware_order_installations
  ADD COLUMN IF NOT EXISTS assigned_at    timestamptz,
  ADD COLUMN IF NOT EXISTS en_route_at    timestamptz,
  ADD COLUMN IF NOT EXISTS onsite_at      timestamptz,
  ADD COLUMN IF NOT EXISTS installed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at   timestamptz;

-- Extend the event_type list so lifecycle transitions can be logged as events
ALTER TABLE public.hardware_order_visit_events
  DROP CONSTRAINT IF EXISTS hardware_order_visit_events_event_type_check;
ALTER TABLE public.hardware_order_visit_events
  ADD CONSTRAINT hardware_order_visit_events_event_type_check
  CHECK (event_type IS NULL OR event_type IN (
    'arrived','inspection','install','test','handover','issue',
    'assigned','en_route','onsite','installed','completed','blocked'
  ));

-- Forward-only enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_install_status_forward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order_map constant int[] := ARRAY[1,2,3,4,5,6];
  _rank_old int; _rank_new int;
  _stages constant text[] := ARRAY['scheduled','en_route','onsite','installed','completed'];
BEGIN
  IF NEW.status = 'blocked' OR (OLD.status IS NULL) THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'blocked' THEN
    -- allow unblocking to any earlier-or-equal stage
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
  -- stamp timestamps
  IF NEW.status = 'en_route'  AND NEW.en_route_at  IS NULL THEN NEW.en_route_at  := now(); END IF;
  IF NEW.status = 'onsite'    AND NEW.onsite_at    IS NULL THEN NEW.onsite_at    := now(); END IF;
  IF NEW.status = 'installed' AND NEW.installed_at IS NULL THEN NEW.installed_at := now(); END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_install_status_forward ON public.hardware_order_installations;
CREATE TRIGGER trg_enforce_install_status_forward
  BEFORE UPDATE OF status ON public.hardware_order_installations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_install_status_forward();

-- Update auto-provision so it fires only on 'installed' -> 'completed' transition
CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.hardware_orders%ROWTYPE;
  _wh_id uuid;
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
  END IF;

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

-- RPC: advance stage with role gating
CREATE OR REPLACE FUNCTION public.advance_install_stage(_order_id uuid, _next text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_super boolean;
  _admin_id uuid;
  _cur_status text;
  _install_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF _next NOT IN ('en_route','onsite','installed','completed','blocked') THEN
    RAISE EXCEPTION 'invalid stage %', _next USING ERRCODE = 'check_violation';
  END IF;

  SELECT admin_id INTO _admin_id FROM public.hardware_orders WHERE id = _order_id;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found'; END IF;

  SELECT public.has_role(_uid, 'super_admin') INTO _is_super;

  -- role gating
  IF _next = 'completed' THEN
    IF NOT (_uid = _admin_id OR _is_super) THEN
      RAISE EXCEPTION 'only the order admin can confirm completed' USING ERRCODE = '42501';
    END IF;
  ELSIF _next IN ('en_route','onsite','installed','blocked') THEN
    IF NOT _is_super THEN
      RAISE EXCEPTION 'only super_admin can advance to %', _next USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ensure an installations row exists
  INSERT INTO public.hardware_order_installations(order_id, status)
    VALUES (_order_id, 'scheduled')
    ON CONFLICT (order_id) DO NOTHING;

  SELECT id, status INTO _install_id, _cur_status
    FROM public.hardware_order_installations WHERE order_id = _order_id;

  UPDATE public.hardware_order_installations
     SET status = _next,
         assigned_at = COALESCE(assigned_at, now()),
         blocker_note = CASE WHEN _next = 'blocked' THEN COALESCE(_note, blocker_note) ELSE blocker_note END
   WHERE id = _install_id;

  -- log event
  INSERT INTO public.hardware_order_visit_events(order_id, event_type, note, created_by)
    VALUES (_order_id, _next, _note, _uid);

  RETURN jsonb_build_object('ok', true, 'stage', _next);
END $$;

GRANT EXECUTE ON FUNCTION public.advance_install_stage(uuid, text, text) TO authenticated;
