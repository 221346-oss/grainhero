-- DEBUG: Check silos in the database
-- Run this in Supabase SQL Editor to see if silos exist and have proper admin_id

-- Count all silos
SELECT COUNT(*) as total_silos FROM public.silos;

-- Check silos without admin_id (should be 0)
SELECT COUNT(*) as silos_without_admin FROM public.silos WHERE admin_id IS NULL;

-- Show first 10 silos with details
SELECT 
  id,
  name,
  admin_id,
  warehouse_id,
  status,
  is_active,
  origin_device_serial,
  origin_order_id,
  created_at
FROM public.silos
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are silos but warehouse doesn't exist
SELECT 
  s.id,
  s.name,
  s.admin_id,
  s.warehouse_id,
  w.id as warehouse_exists
FROM public.silos s
LEFT JOIN public.warehouses w ON w.id = s.warehouse_id
WHERE w.id IS NULL
LIMIT 10;

-- Check if warehouses exist
SELECT COUNT(*) as total_warehouses FROM public.warehouses;

-- Show first 10 warehouses
SELECT 
  id,
  name,
  admin_id,
  status,
  is_active,
  created_at
FROM public.warehouses
ORDER BY created_at DESC
LIMIT 10;

-- Check hardware orders and their status
SELECT 
  id,
  admin_id,
  status,
  installed_at,
  created_at
FROM public.hardware_orders
ORDER BY created_at DESC
LIMIT 10;

-- Check hardware_order_installations
SELECT 
  id,
  order_id,
  status,
  admin_signed_off_at,
  created_at
FROM public.hardware_order_installations
ORDER BY created_at DESC
LIMIT 10;
