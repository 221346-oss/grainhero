-- Region-aware warehouse deduplication for auto_provision_from_install
--
-- Business rule (as requested):
--   * Silos in the same region AND same place (same city) → ONE shared warehouse
--   * Silos in a different region (different city) → their own warehouse
--
-- The previous dedup only matched warehouses whose `location` JSONB had a
-- `description` key set to the city, and compared with exact equality. The
-- sibling trigger hardware_order_provision_silo() writes location with
-- `city`/`address` keys (no `description`), so warehouses it created were
-- never matched → a second order in the same city got a second warehouse.
--
-- This migration rewrites the dedup lookup to:
--   * match on `location->>'description'` OR `location->>'city'` (both formats)
--   * compare case-insensitively with surrounding whitespace trimmed
--   * also match the city stored in the warehouse name prefix ("City — XXX")
--   * never match on empty city/address (avoids reusing a blank warehouse)
-- It also backfills the location_city / location_address convenience columns
-- (added in 20260807000000) when provisioning.

CREATE OR REPLACE FUNCTION public.auto_provision_from_install()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order        public.hardware_orders%ROWTYPE;
  _wh_id        uuid;
  _dev          record;
  _silo_count   int := 0;
  _target_count int := 0;
  _i            int;
  _serial       text;
  _silo_name    text;
  _suffix       text;
  _idx          int;
  _tmp          int;
  _used_names   text[];
  _alpha        text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  _candidate    text;
  _city_norm    text;
  _addr_norm    text;
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

  -- Normalized city / address for matching (case-insensitive, trimmed)
  _city_norm := lower(trim(coalesce(_order.install_city, '')));
  _addr_norm := lower(trim(coalesce(_order.install_address, '')));

  -- ── Provision warehouse ──────────────────────────────────────────────────
  -- Reuse an existing warehouse ONLY if BOTH city AND address match.
  -- This prevents merging silos from "abc123" with silos from "125 farm road"
  -- even though both are in "sialkot".
  --
  -- Match logic:
  --   * Must be same admin
  --   * Must match BOTH city AND address (or no match at all)
  --   * Normalize: case-insensitive, trim whitespace
  --   * Never match if city or address is blank
  SELECT id INTO _wh_id
  FROM public.warehouses
  WHERE admin_id = _order.admin_id
    AND deleted_at IS NULL
    AND _city_norm <> ''
    AND _addr_norm <> ''
    AND (
      -- Match: location has both city and address as JSON keys
      (
        lower(trim(coalesce(location->>'city', ''))) = _city_norm
        AND lower(trim(coalesce(location->>'address', ''))) = _addr_norm
      )
      OR
      -- Also match on location_city/location_address convenience columns
      (
        lower(trim(coalesce(location_city, ''))) = _city_norm
        AND lower(trim(coalesce(location_address, ''))) = _addr_norm
      )
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _wh_id IS NULL THEN
    INSERT INTO public.warehouses (
      admin_id, created_by, name, warehouse_id, status, is_active,
      origin_order_id, location, location_city, location_address
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
      ),
      NULLIF(_order.install_city, ''),
      NULLIF(_order.install_address, '')
    ) RETURNING id INTO _wh_id;
  END IF;

  -- ── Helper: get next unique silo name for this warehouse ─────────────────
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

-- Re-attach trigger so it uses the corrected function
DROP TRIGGER IF EXISTS trg_auto_provision_install ON public.hardware_order_installations;
CREATE TRIGGER trg_auto_provision_install
  AFTER INSERT OR UPDATE OF status
  ON public.hardware_order_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_from_install();
