-- Wipe all app data and users for a clean re-start
-- Disable FK/trigger enforcement during wipe
SET session_replication_role = replica;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('metric_registry','plan_prices','plan_thresholds','tax_rules','carriers','insurance_carriers','insurance_products','mobile_deep_link_routes')
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- Delete every auth user (cascades into profiles etc. via handle_new_user linkage)
DELETE FROM auth.users;

SET session_replication_role = DEFAULT;