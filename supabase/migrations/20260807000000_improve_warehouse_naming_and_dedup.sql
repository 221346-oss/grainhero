-- Migration: Improve warehouse naming and deduplication
-- Goals:
-- 1. Use location-based names instead of generic "Silo X" names
-- 2. Detect and reuse warehouses at the same location (deduplication)
-- 3. Store location info for better regional grouping

-- =========================================================================
-- 1. Enhance warehouses table with location columns for deduplication
-- =========================================================================
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_address text;

-- Create index to help find warehouses by location
CREATE INDEX IF NOT EXISTS idx_warehouses_location
  ON public.warehouses (admin_id, location_city, location_address)
  WHERE deleted_at IS NULL;

-- =========================================================================
-- 2. Update auto_provision_from_install RPC to use location-based naming
--    and deduplication
-- =========================================================================
-- NOTE: The function definition is now in migration 20260813170000
-- which provides the working implementation. This section is kept for
-- reference but the actual function is defined in the later migration.
-- The trigger will use the latest version from 20260813170000.

-- =========================================================================
-- 3. Backfill location_city and location_address from existing orders
-- =========================================================================
UPDATE public.warehouses w
  SET location_city = o.install_city,
      location_address = o.install_address
  FROM public.hardware_orders o
  WHERE w.origin_order_id = o.id
    AND (w.location_city IS NULL OR w.location_address IS NULL);

COMMENT ON COLUMN public.warehouses.location_city IS 
  'City for deduplication and regional grouping (extracted from origin order or manually set)';
COMMENT ON COLUMN public.warehouses.location_address IS 
  'Address for deduplication and display (extracted from origin order or manually set)';
