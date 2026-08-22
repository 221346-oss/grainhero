-- ─────────────────────────────────────────────────────────────────────────────
-- Diagnostic: "Silo created but not showing up"
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) for the project.
-- It checks (1) the provisioning trigger exists, (2) your order's status,
-- (3) whether a warehouse + silo were provisioned for it.
-- All queries are read-only — safe to run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Does the provisioning trigger exist in this database?
--    If this returns 0 rows, the migrations were never applied and the silo
--    could never be auto-created. Apply the migration files (or the latest
--    one, 20260817000000_region_aware_warehouse_dedup.sql) and re-run the
--    "Mark as complete" step — the trigger will provision retroactively if
--    you flip the installation back to completed, or just re-sign off.
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN ('trg_auto_provision_install', 'trg_provision_silo_on_complete');

-- 2) Your orders in Sialkot (or all recent silo orders if Sialkot isn't found)
SELECT id, status, install_city, install_address, hardware_quantity,
       created_at, updated_at
FROM hardware_orders
WHERE (lower(install_city) LIKE '%sialkot%' OR install_city IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- 3) For each order above: was a warehouse provisioned?
--    Paste an order id from query 2 into the quote below if you want to
--    check one order specifically.
SELECT id, name, warehouse_id, origin_order_id, location,
       location_city, location_address, created_at
FROM warehouses
WHERE (lower(location_city) LIKE '%sialkot%'
       OR lower(location->>'city') LIKE '%sialkot%'
       OR lower(location->>'description') LIKE '%sialkot%'
       OR lower(location->>'address') LIKE '%sialkot%')
ORDER BY created_at DESC
LIMIT 20;

-- 4) Silos in Sialkot-area warehouses (this is what the Silos page lists)
SELECT s.id, s.name, s.silo_id, s.warehouse_id, s.status, s.is_active,
       s.origin_order_id, s.origin_device_serial, s.created_at
FROM silos s
LEFT JOIN warehouses w ON w.id = s.warehouse_id
WHERE (lower(w.location_city) LIKE '%sialkot%'
       OR lower(w.location->>'city') LIKE '%sialkot%'
       OR lower(w.location->>'description') LIKE '%sialkot%'
       OR lower(s.name) LIKE '%abc123%'
       OR lower(s.name) LIKE '%sialkot%')
ORDER BY s.created_at DESC
LIMIT 20;

-- 5) Installations — is the installation actually marked completed?
--    This is what fires the provisioning trigger.
SELECT i.id, i.order_id, i.status, i.admin_signed_off_at, i.admin_signed_off_by,
       i.completed_at, i.updated_at
FROM hardware_order_installations i
ORDER BY i.updated_at DESC
LIMIT 20;
