-- Add 'installing' to the allowed status values on hardware_order_installations.
-- Our technician workflow uses: scheduled → en_route → onsite → installing → completed
-- The DB constraint originally only had 'installed' (singular), not 'installing'.

-- 1) Drop old constraint and re-create with 'installing' added
ALTER TABLE public.hardware_order_installations
  DROP CONSTRAINT IF EXISTS hardware_order_installations_status_check;

ALTER TABLE public.hardware_order_installations
  ADD CONSTRAINT hardware_order_installations_status_check
  CHECK (status IN ('scheduled','en_route','onsite','installing','installed','completed','blocked'));

-- 2) Update the enforce_install_status_forward trigger to include 'installing' in the stages array
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
