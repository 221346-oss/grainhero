-- =========================================================================
-- GrainHero sample data seed
--
-- Run this in the Supabase Dashboard SQL editor (it runs as postgres and can
-- write to auth.users), or via: psql "$DATABASE_URL" -f supabase/seed_sample_data.sql
--
-- Idempotent: every insert uses fixed UUIDs + ON CONFLICT / NOT EXISTS guards,
-- so re-running is safe. All demo emails end in @grainhero-demo.test.
-- Demo password for every seeded account: GrainDemo123!
--
-- Cleanup: DELETE FROM auth.users WHERE email LIKE '%@grainhero-demo.test';
--          (profiles + all tenant data cascade from there), then
--          DELETE FROM public.waitlist_emails WHERE email LIKE '%@grainhero-demo.test';
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1. Auth users (trigger auto-creates profiles + pending role)
-- ---------------------------------------------------------------------
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'hamza@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Hamza Khan","business_type":"farm"}',
   now() - interval '28 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'sana@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Sana Malik","business_type":"mill"}',
   now() - interval '21 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'bilal@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Bilal Ahmed","business_type":"trader"}',
   now() - interval '14 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ayesha@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ayesha Raza"}',
   now() - interval '10 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'usman@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Usman Tariq"}',
   now() - interval '6 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'fatima@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Fatima Noor"}',
   now() - interval '3 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'ali@grainhero-demo.test', extensions.crypt('GrainDemo123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ali Hassan"}',
   now() - interval '1 day', now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@grainhero-demo.test'
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Profiles: stagger signup dates, mark verified, attach teams to tenants
-- ---------------------------------------------------------------------
UPDATE public.profiles SET
  business_type = v.business_type,
  subscription_plan = v.plan,
  email_verified = true,
  last_login = now() - (random() * interval '2 days'),
  created_at = v.created
FROM (VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'farm',   'professional', now() - interval '28 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, 'mill',   'enterprise',   now() - interval '21 days'),
  ('aaaaaaaa-0000-4000-8000-000000000003'::uuid, 'trader', 'basic',        now() - interval '14 days'),
  ('bbbbbbbb-0000-4000-8000-000000000001'::uuid, 'farm',   'basic',        now() - interval '10 days'),
  ('bbbbbbbb-0000-4000-8000-000000000002'::uuid, 'farm',   'basic',        now() - interval '6 days'),
  ('bbbbbbbb-0000-4000-8000-000000000003'::uuid, 'mill',   'basic',        now() - interval '3 days'),
  ('bbbbbbbb-0000-4000-8000-000000000004'::uuid, 'mill',   'basic',        now() - interval '1 day')
) AS v(id, business_type, plan, created)
WHERE profiles.id = v.id;

-- Team members belong to a tenant admin
UPDATE public.profiles SET admin_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  WHERE id IN ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002') AND admin_id IS NULL;
UPDATE public.profiles SET admin_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  WHERE id IN ('bbbbbbbb-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000004') AND admin_id IS NULL;

-- Roles (the signup trigger only grants 'pending')
INSERT INTO public.user_roles (user_id, role) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'admin'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'admin'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'manager'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'technician'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'manager'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'technician')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Subscriptions (feeds MRR / revenue widgets)
-- ---------------------------------------------------------------------
INSERT INTO public.subscriptions
  (id, admin_id, plan_name, price_per_month, currency, billing_cycle, start_date, end_date,
   status, payment_status, next_payment_date, max_users, max_devices, ai_features, created_at)
VALUES
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Grain Professional',
   45000, 'PKR', 'monthly', now() - interval '28 days', now() + interval '11 months',
   'active', 'paid', now() + interval '2 days', 15, 50, true, now() - interval '28 days'),
  ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'Grain Enterprise',
   95000, 'PKR', 'monthly', now() - interval '21 days', now() + interval '11 months',
   'active', 'paid', now() + interval '9 days', 50, 200, true, now() - interval '21 days'),
  ('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', 'Grain Starter',
   15000, 'PKR', 'monthly', now() - interval '14 days', now() + interval '16 days',
   'trial', 'pending', now() + interval '16 days', 5, 10, false, now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Warehouses & silos
-- ---------------------------------------------------------------------
INSERT INTO public.warehouses (id, warehouse_id, name, admin_id, location, total_capacity_kg, total_silos, created_by)
VALUES
  ('dddddddd-0000-4000-8000-000000000001', 'WH-DEMO-001', 'Green Valley Main Warehouse',
   'aaaaaaaa-0000-4000-8000-000000000001', '{"city":"Multan","country":"Pakistan","lat":30.1575,"lng":71.5249}', 500000, 2,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ('dddddddd-0000-4000-8000-000000000002', 'WH-DEMO-002', 'Indus Mills Storage Complex',
   'aaaaaaaa-0000-4000-8000-000000000002', '{"city":"Hyderabad","country":"Pakistan","lat":25.396,"lng":68.3578}', 1200000, 2,
   'aaaaaaaa-0000-4000-8000-000000000002'),
  ('dddddddd-0000-4000-8000-000000000003', 'WH-DEMO-003', 'Punjab AgriTraders Depot',
   'aaaaaaaa-0000-4000-8000-000000000003', '{"city":"Faisalabad","country":"Pakistan","lat":31.4504,"lng":73.135}', 300000, 1,
   'aaaaaaaa-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.silos (id, silo_id, name, admin_id, warehouse_id, capacity_kg, current_occupancy_kg, created_by)
VALUES
  ('eeeeeeee-0000-4000-8000-000000000001', 'SILO-DEMO-001', 'Silo A1 — Wheat',
   'aaaaaaaa-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 250000, 180000,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'SILO-DEMO-002', 'Silo A2 — Maize',
   'aaaaaaaa-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 250000, 95000,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'SILO-DEMO-003', 'Silo B1 — Rice',
   'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 600000, 420000,
   'aaaaaaaa-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'SILO-DEMO-004', 'Silo B2 — Wheat',
   'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 600000, 510000,
   'aaaaaaaa-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'SILO-DEMO-005', 'Silo C1 — Barley',
   'aaaaaaaa-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000003', 300000, 120000,
   'aaaaaaaa-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Sensor devices + 48h of readings every 2h
-- ---------------------------------------------------------------------
INSERT INTO public.sensor_devices
  (id, device_id, device_name, admin_id, warehouse_id, silo_id, device_type, category,
   sensor_types, status, connection_status, battery_level, signal_strength, last_heartbeat, created_by)
VALUES
  ('ffffffff-0000-4000-8000-000000000001', 'DEV-DEMO-001', 'EnviroSense A1',
   'aaaaaaaa-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001',
   'sensor', 'environmental', ARRAY['temperature','humidity','co2','moisture']::public.sensor_type[],
   'active', 'online', 87, -52, now() - interval '3 minutes', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'DEV-DEMO-002', 'EnviroSense A2',
   'aaaaaaaa-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002',
   'sensor', 'environmental', ARRAY['temperature','humidity','moisture']::public.sensor_type[],
   'active', 'online', 64, -61, now() - interval '4 minutes', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000003', 'DEV-DEMO-003', 'EnviroSense B1',
   'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000003',
   'sensor', 'environmental', ARRAY['temperature','humidity','co2','voc']::public.sensor_type[],
   'active', 'online', 91, -47, now() - interval '2 minutes', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('ffffffff-0000-4000-8000-000000000004', 'DEV-DEMO-004', 'EnviroSense B2',
   'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004',
   'sensor', 'environmental', ARRAY['temperature','humidity','co2']::public.sensor_type[],
   'active', 'offline', 12, -78, now() - interval '9 hours', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('ffffffff-0000-4000-8000-000000000005', 'DEV-DEMO-005', 'EnviroSense C1',
   'aaaaaaaa-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000005',
   'sensor', 'environmental', ARRAY['temperature','humidity','moisture']::public.sensor_type[],
   'active', 'online', 73, -58, now() - interval '5 minutes', 'aaaaaaaa-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Readings: silo B2 (device 4) trends hot/humid to justify the critical alert
INSERT INTO public.sensor_readings
  (device_id, admin_id, warehouse_id, silo_id, reading_timestamp,
   temperature_value, humidity_value, co2_value, moisture_value, ml_risk_class, ml_risk_score)
SELECT d.id, d.admin_id, d.warehouse_id, d.silo_id, ts,
       CASE WHEN d.id = 'ffffffff-0000-4000-8000-000000000004'
            THEN 30 + 8 * extract(epoch FROM (ts - (now() - interval '48 hours'))) / 172800 + random()
            ELSE 24 + random() * 4 END,
       CASE WHEN d.id = 'ffffffff-0000-4000-8000-000000000004'
            THEN 68 + random() * 8
            ELSE 55 + random() * 10 END,
       450 + random() * 350,
       11 + random() * 2.5,
       CASE WHEN d.id = 'ffffffff-0000-4000-8000-000000000004' THEN 'risky' ELSE 'safe' END,
       CASE WHEN d.id = 'ffffffff-0000-4000-8000-000000000004' THEN 62 + random() * 15 ELSE 5 + random() * 20 END
FROM public.sensor_devices d
CROSS JOIN generate_series(now() - interval '48 hours', now(), interval '2 hours') AS ts
WHERE d.device_id LIKE 'DEV-DEMO-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.sensor_readings r
    WHERE r.device_id = d.id AND r.admin_id = d.admin_id
  );

-- ---------------------------------------------------------------------
-- 6. Grain batches
-- ---------------------------------------------------------------------
INSERT INTO public.grain_batches
  (id, batch_id, admin_id, silo_id, warehouse_id, grain_type, variety, quantity_kg, moisture_content,
   status, harvest_date, intake_date, farmer_name, spoilage_label, risk_score,
   purchase_price_per_kg, total_purchase_value, sell_price_per_kg, dispatched_quantity_kg, revenue, profit, created_by)
VALUES
  ('11111111-0000-4000-8000-000000000001', 'GH-DEMO-B001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
   'Wheat', 'Faisalabad-2008', 180000, 12.1, 'stored', now()::date - 45, now() - interval '25 days',
   'Rashid Mahmood', 'Safe', 8, 95, 17100000, NULL, 0, 0, 0, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000002', 'GH-DEMO-B002', 'aaaaaaaa-0000-4000-8000-000000000001',
   'eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001',
   'Maize', 'Pioneer 30Y87', 95000, 13.4, 'stored', now()::date - 30, now() - interval '18 days',
   'Iqbal Cheema', 'Safe', 14, 72, 6840000, NULL, 0, 0, 0, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000003', 'GH-DEMO-B003', 'aaaaaaaa-0000-4000-8000-000000000002',
   'eeeeeeee-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002',
   'Rice', 'Super Basmati', 420000, 11.8, 'stored', now()::date - 60, now() - interval '20 days',
   'Ghulam Abbas', 'Safe', 11, 210, 88200000, NULL, 0, 0, 0, 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('11111111-0000-4000-8000-000000000004', 'GH-DEMO-B004', 'aaaaaaaa-0000-4000-8000-000000000002',
   'eeeeeeee-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000002',
   'Wheat', 'Punjab-2011', 510000, 14.6, 'stored', now()::date - 50, now() - interval '15 days',
   'Nadeem Akhtar', 'Risky', 68, 92, 46920000, NULL, 0, 0, 0, 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('11111111-0000-4000-8000-000000000005', 'GH-DEMO-B005', 'aaaaaaaa-0000-4000-8000-000000000003',
   'eeeeeeee-0000-4000-8000-000000000005', 'dddddddd-0000-4000-8000-000000000003',
   'Barley', 'Haider-93', 120000, 12.7, 'stored', now()::date - 35, now() - interval '10 days',
   'Shafiq Anwar', 'Safe', 12, 60, 7200000, NULL, 0, 0, 0, 'aaaaaaaa-0000-4000-8000-000000000003'),
  ('11111111-0000-4000-8000-000000000006', 'GH-DEMO-B006', 'aaaaaaaa-0000-4000-8000-000000000001',
   'eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
   'Wheat', 'Galaxy-2013', 60000, 11.9, 'sold', now()::date - 90, now() - interval '27 days',
   'Rashid Mahmood', 'Safe', 5, 90, 5400000, 118, 60000, 7080000, 1680000,
   'aaaaaaaa-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Alerts (feeds Health tile + system alerts widget)
-- ---------------------------------------------------------------------
INSERT INTO public.grain_alerts
  (id, alert_id, admin_id, warehouse_id, silo_id, batch_id, title, message,
   priority, source, sensor_type, status, triggered_at)
VALUES
  ('22222222-0000-4000-8000-000000000001', 'AL-DEMO-001', 'aaaaaaaa-0000-4000-8000-000000000002',
   'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004',
   'Critical temperature in Silo B2', 'Temperature reached 38.4°C — above the 35°C critical threshold. Spoilage risk is rising.',
   'critical', 'sensor', 'temperature', 'pending', now() - interval '3 hours'),
  ('22222222-0000-4000-8000-000000000002', 'AL-DEMO-002', 'aaaaaaaa-0000-4000-8000-000000000002',
   'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004',
   'High humidity in Silo B2', 'Humidity at 74% for the last 6 hours. Consider running ventilation.',
   'high', 'threshold', 'humidity', 'acknowledged', now() - interval '7 hours'),
  ('22222222-0000-4000-8000-000000000003', 'AL-DEMO-003', 'aaaaaaaa-0000-4000-8000-000000000002',
   'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', NULL,
   'Sensor offline: EnviroSense B2', 'Device DEV-DEMO-004 missed heartbeats for 9 hours. Battery at 12%.',
   'high', 'system', NULL, 'pending', now() - interval '8 hours'),
  ('22222222-0000-4000-8000-000000000004', 'AL-DEMO-004', 'aaaaaaaa-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002',
   'CO2 trending up in Silo A2', 'CO2 rose from 520 to 810 ppm over 24 hours. Monitor for early spoilage.',
   'medium', 'ai', 'co2', 'pending', now() - interval '1 day'),
  ('22222222-0000-4000-8000-000000000005', 'AL-DEMO-005', 'aaaaaaaa-0000-4000-8000-000000000003',
   'dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000005',
   'Inspection due for Silo C1', 'Scheduled inspection is overdue by 4 days.',
   'low', 'system', NULL, 'resolved', now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. Activity logs (Audit logs tile)
-- ---------------------------------------------------------------------
INSERT INTO public.activity_logs (id, admin_id, user_id, user_name, user_role, action, category, description, severity, created_at)
VALUES
  ('33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Hamza Khan', 'admin', 'batch.create', 'batch', 'Created batch GH-DEMO-B001 (Wheat, 180,000 kg)', 'info', now() - interval '25 days'),
  ('33333333-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
   'Ayesha Raza', 'manager', 'batch.dispatch', 'dispatch', 'Dispatched 60,000 kg of GH-DEMO-B006 to Chenab Flour Mills', 'info', now() - interval '5 days'),
  ('33333333-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002',
   'Sana Malik', 'admin', 'user.invite', 'system', 'Invited fatima@grainhero-demo.test as manager', 'info', now() - interval '3 days'),
  ('33333333-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004',
   'Ali Hassan', 'technician', 'device.maintenance', 'system', 'Replaced battery on DEV-DEMO-004', 'warning', now() - interval '9 hours'),
  ('33333333-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003',
   'Bilal Ahmed', 'admin', 'auth.login', 'system', 'Signed in from new device (Faisalabad, PK)', 'info', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. Buyers
-- ---------------------------------------------------------------------
INSERT INTO public.buyers (id, admin_id, name, company_name, buyer_type, contact_name, contact_email, contact_phone, city, status, rating)
VALUES
  ('44444444-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Chenab Flour Mills', 'Chenab Flour Mills (Pvt) Ltd', 'local_mill', 'Imran Bashir',
   'purchasing@chenabmills.test', '+92 300 1234567', 'Multan', 'active', 4.5),
  ('44444444-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002',
   'Karachi Grain Exports', 'KGE International', 'exporter', 'Sara Jamil',
   'sara@kge.test', '+92 321 7654321', 'Karachi', 'active', 4.2),
  ('44444444-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003',
   'Lahore Wholesale Grains', 'LWG Traders', 'wholesaler', 'Tahir Mehmood',
   'tahir@lwg.test', '+92 333 1112223', 'Lahore', 'paused', 3.8)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. Hardware install orders (Install orders tile)
-- ---------------------------------------------------------------------
INSERT INTO public.hardware_orders
  (id, admin_id, plan_name, hardware_quantity, hardware_unit_price, hardware_total, currency,
   install_city, install_country, contact_phone, business_name, status, scheduled_install_date, installed_at, created_at)
VALUES
  ('55555555-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Grain Professional',
   4, 7000, 28000, 'PKR', 'Multan', 'Pakistan', '+92 300 1112233', 'Green Valley Farms',
   'installed', now() - interval '20 days', now() - interval '18 days', now() - interval '26 days'),
  ('55555555-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'Grain Enterprise',
   8, 7000, 56000, 'PKR', 'Hyderabad', 'Pakistan', '+92 321 4455667', 'Indus Grain Mills',
   'installed', now() - interval '15 days', now() - interval '12 days', now() - interval '20 days'),
  ('55555555-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', 'Grain Starter',
   2, 7000, 14000, 'PKR', 'Faisalabad', 'Pakistan', '+92 333 9988776', 'Punjab AgriTraders',
   'tech_assigned', now() + interval '3 days', NULL, now() - interval '8 days'),
  ('55555555-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'Grain Professional',
   2, 7000, 14000, 'PKR', 'Multan', 'Pakistan', '+92 300 1112233', 'Green Valley Farms',
   'approved', NULL, NULL, now() - interval '4 days'),
  ('55555555-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000002', 'Grain Enterprise',
   3, 7000, 21000, 'PKR', 'Hyderabad', 'Pakistan', '+92 321 4455667', 'Indus Grain Mills',
   'new', NULL, NULL, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 11. Leads (waitlist) + pipeline (hubspot sync log)
-- ---------------------------------------------------------------------
INSERT INTO public.waitlist_emails (id, email, created_at)
VALUES
  ('66666666-0000-4000-8000-000000000001', 'lead1@grainhero-demo.test', now() - interval '9 days'),
  ('66666666-0000-4000-8000-000000000002', 'lead2@grainhero-demo.test', now() - interval '7 days'),
  ('66666666-0000-4000-8000-000000000003', 'lead3@grainhero-demo.test', now() - interval '5 days'),
  ('66666666-0000-4000-8000-000000000004', 'lead4@grainhero-demo.test', now() - interval '2 days'),
  ('66666666-0000-4000-8000-000000000005', 'lead5@grainhero-demo.test', now() - interval '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hubspot_sync_log (id, user_id, action, hubspot_object_type, status, created_at)
VALUES
  ('77777777-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'create', 'contact', 'success', now() - interval '27 days'),
  ('77777777-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'create', 'contact', 'success', now() - interval '20 days'),
  ('77777777-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'create', 'deal', 'success', now() - interval '19 days'),
  ('77777777-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000003', 'create', 'contact', 'success', now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000003', 'create', 'deal', 'failed', now() - interval '12 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. Notifications for tenant admins
-- ---------------------------------------------------------------------
INSERT INTO public.notifications (id, admin_id, user_id, title, message, type, category, created_at)
VALUES
  ('88888888-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002',
   'Critical alert in Silo B2', 'Temperature exceeded the critical threshold. Immediate action recommended.', 'error', 'spoilage', now() - interval '3 hours'),
  ('88888888-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Batch dispatched', 'GH-DEMO-B006 (60,000 kg wheat) was dispatched to Chenab Flour Mills.', 'success', 'dispatch', now() - interval '5 days'),
  ('88888888-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003',
   'Trial ending soon', 'Your Grain Starter trial ends in 16 days. Upgrade to keep monitoring.', 'warning', 'system', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Done. Quick sanity counts:
SELECT 'profiles' AS entity, count(*) FROM public.profiles WHERE email LIKE '%@grainhero-demo.test'
UNION ALL SELECT 'silos', count(*) FROM public.silos WHERE silo_id LIKE 'SILO-DEMO-%'
UNION ALL SELECT 'readings', count(*) FROM public.sensor_readings r JOIN public.sensor_devices d ON d.id = r.device_id WHERE d.device_id LIKE 'DEV-DEMO-%'
UNION ALL SELECT 'batches', count(*) FROM public.grain_batches WHERE batch_id LIKE 'GH-DEMO-%'
UNION ALL SELECT 'alerts', count(*) FROM public.grain_alerts WHERE alert_id LIKE 'AL-DEMO-%'
UNION ALL SELECT 'orders', count(*) FROM public.hardware_orders WHERE id::text LIKE '55555555%';
