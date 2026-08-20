-- 1) Add 'installing' to the CHECK constraint on hardware_order_installations.status
ALTER TABLE public.hardware_order_installations
  DROP CONSTRAINT IF EXISTS hardware_order_installations_status_check;

ALTER TABLE public.hardware_order_installations
  ADD CONSTRAINT hardware_order_installations_status_check
  CHECK (status IN ('scheduled','en_route','onsite','installing','installed','completed','blocked'));

-- 2) Update the enforce_install_status_forward trigger to include 'installing' in stages
CREATE OR REPLACE FUNCTION public.enforce_install_status_forward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rank_old int;
  _rank_new int;
  _stages constant text[] := ARRAY['scheduled','en_route','onsite','installing','installed','completed'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'en_route'    AND NEW.en_route_at    IS NULL THEN NEW.en_route_at    := now(); END IF;
    IF NEW.status = 'onsite'      AND NEW.onsite_at      IS NULL THEN NEW.onsite_at      := now(); END IF;
    IF NEW.status = 'installing'  AND NEW.installed_at   IS NULL THEN NEW.installed_at   := now(); END IF;
    IF NEW.status = 'installed'   AND NEW.installed_at   IS NULL THEN NEW.installed_at   := now(); END IF;
    IF NEW.status = 'completed'   AND NEW.completed_at   IS NULL THEN NEW.completed_at   := now(); END IF;
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

  IF NEW.status = 'en_route'    AND NEW.en_route_at    IS NULL THEN NEW.en_route_at    := now(); END IF;
  IF NEW.status = 'onsite'      AND NEW.onsite_at      IS NULL THEN NEW.onsite_at      := now(); END IF;
  IF NEW.status = 'installing'  AND NEW.installed_at   IS NULL THEN NEW.installed_at   := now(); END IF;
  IF NEW.status = 'installed'   AND NEW.installed_at   IS NULL THEN NEW.installed_at   := now(); END IF;
  IF NEW.status = 'completed'   AND NEW.completed_at   IS NULL THEN NEW.completed_at   := now(); END IF;

  RETURN NEW;
END
$function$;

-- 3) Fix advance_install_stage to decrement technician job count on completion
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
  _tech_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF _next NOT IN ('en_route','onsite','installing','installed','completed','blocked') THEN
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
  ELSIF _next IN ('en_route','onsite','installing','installed','blocked') THEN
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

  -- Capture technician_id before update for job count decrement
  SELECT technician_id INTO _tech_id
  FROM public.hardware_order_installations
  WHERE id = _install_id;

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

  -- Decrement technician job count when install is completed
  IF _next = 'completed' AND _tech_id IS NOT NULL THEN
    PERFORM public.decrement_technician_jobs(_tech_id);
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

-- 4) Recount active jobs for all technicians to fix stale counts
-- Active = status in ('scheduled','en_route','onsite','installing','installed')
UPDATE public.profiles p
SET current_job_count = COALESCE((
  SELECT COUNT(*)
  FROM public.hardware_order_installations i
  JOIN public.user_roles ur ON ur.user_id = i.technician_id AND ur.role = 'technician'
  WHERE i.technician_id = p.id
    AND i.status IN ('scheduled','en_route','onsite','installing','installed')
), 0),
updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'technician'
);

-- 5) Update advance_install_stage valid stages to include 'installing'
-- (already handled above in the CREATE OR REPLACE)
