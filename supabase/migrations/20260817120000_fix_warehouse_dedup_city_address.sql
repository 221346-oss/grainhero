-- Migration: Fix warehouse deduplication to require BOTH city AND address match
-- Date: 2026-08-17
-- 
-- Previous bug: Deduplication matched on city alone, so:
--   * Order 1: "abc123, Block A" → Created warehouse W1
--   * Order 2: "125 farm road, block a" → Matched W1 (WRONG - different address!)
--   * Result: Both silos merged into same warehouse
--
-- Fix: Require city AND address to match exactly (case-insensitive, trimmed)

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
  -- FIX: Reuse warehouse ONLY if BOTH city AND address match exactly.
  -- This prevents merging different addresses into the same warehouse.
  --
  -- Business rule:
  --   * Same city + same address → ONE warehouse (reuse)
  --   * Same city + different address → SEPARATE warehouses (create new)
  SELECT id INTO _wh_id
  FROM public.warehouses
  WHERE admin_id = _order.admin_id
    AND deleted_at IS NULL
    AND _city_norm <> ''
    AND _addr_norm <> ''
    AND (
      -- Match on JSON keys (both formats from different triggers)
      (
        lower(trim(coalesce(location->>'city', ''))) = _city_norm
        AND lower(trim(coalesce(location->>'address', ''))) = _addr_norm
      )
      OR
      -- Also match on convenience columns (location_city, location_address)
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
        'city',    COALESCE(NULLIF(_order.install_city, ''), ''),
        'address', COALESCE(NULLIF(_order.install_address, ''), '')
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

  RETURN NEW;
END;
$function$;
