-- Migration: Merge duplicate warehouses at same location
-- This resolves the issue where same-location warehouses get separate IDs
-- after installation instead of being merged into one warehouse

-- =========================================================================
-- 1. For each admin + location combo, keep only ONE warehouse (the oldest)
-- =========================================================================

-- Create a temporary table mapping old warehouse IDs to their merge target
CREATE TEMP TABLE warehouse_merge_map AS
SELECT 
  w.id as old_id,
  first_value(w.id) OVER (
    PARTITION BY w.admin_id, w.location_city, w.location_address 
    ORDER BY w.created_at ASC
  ) as merge_target_id
FROM public.warehouses w
WHERE w.deleted_at IS NULL
  AND w.location_city IS NOT NULL;

-- =========================================================================
-- 2. Update all silos to point to the merge target warehouse
-- =========================================================================
UPDATE public.silos s
SET warehouse_id = m.merge_target_id
FROM warehouse_merge_map m
WHERE s.warehouse_id = m.old_id
  AND m.old_id != m.merge_target_id;

-- =========================================================================
-- 3. Soft-delete duplicate warehouses (keep only the oldest per location)
-- =========================================================================
UPDATE public.warehouses w
SET deleted_at = now()
FROM warehouse_merge_map m
WHERE w.id = m.old_id
  AND m.old_id != m.merge_target_id
  AND w.deleted_at IS NULL;

-- =========================================================================
-- 4. Log the merge operation
-- =========================================================================
INSERT INTO public.notifications (
  admin_id, user_id, title, message, type, category,
  entity_type, entity_id
)
SELECT DISTINCT
  w.admin_id, w.admin_id,
  'Warehouses merged',
  'Duplicate warehouses at the same location have been automatically merged. All silos have been consolidated into one warehouse for cleaner organization.',
  'warehouse.merged', 'operations',
  'warehouse', w.id
FROM public.warehouses w
WHERE EXISTS (
  SELECT 1 FROM warehouse_merge_map m 
  WHERE m.merge_target_id = w.id 
    AND m.old_id != m.merge_target_id
);

-- =========================================================================
-- 5. Verify the merge (optional - for debugging)
-- =========================================================================
-- After running, you can query to see results:
-- SELECT location_city, location_address, COUNT(*) as warehouse_count 
-- FROM public.warehouses 
-- WHERE deleted_at IS NULL 
-- GROUP BY location_city, location_address 
-- HAVING COUNT(*) > 1;
-- This should return 0 rows if merge was successful.
