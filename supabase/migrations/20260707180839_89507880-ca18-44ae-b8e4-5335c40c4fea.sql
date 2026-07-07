
-- =========================================================================
-- EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role            AS ENUM ('super_admin','admin','manager','technician','pending');
CREATE TYPE public.user_status         AS ENUM ('active','inactive','deleted');
CREATE TYPE public.device_status       AS ENUM ('active','offline','error','maintenance');
CREATE TYPE public.grain_type          AS ENUM ('Wheat','Rice','Maize','Corn','Barley','Sorghum');
CREATE TYPE public.batch_status        AS ENUM ('stored','dispatched','sold','damaged','expired','on_hold','processing');
CREATE TYPE public.spoilage_label      AS ENUM ('Safe','Risky','Spoiled');
CREATE TYPE public.alert_priority      AS ENUM ('low','medium','high','critical');
CREATE TYPE public.alert_status        AS ENUM ('pending','acknowledged','resolved','escalated');
CREATE TYPE public.subscription_status AS ENUM ('active','inactive','cancelled','expired','trial');
CREATE TYPE public.payment_status      AS ENUM ('pending','paid','failed','refunded','cancelled');
CREATE TYPE public.billing_cycle       AS ENUM ('monthly','yearly','quarterly');
CREATE TYPE public.buyer_status        AS ENUM ('active','paused','inactive');
CREATE TYPE public.buyer_type          AS ENUM ('local_mill','exporter','wholesaler','retailer','government');
CREATE TYPE public.sensor_type         AS ENUM ('temperature','humidity','co2','voc','moisture','light','pressure','ph');
CREATE TYPE public.actuator_type       AS ENUM ('fan','vent','heater','cooler','alarm','light');
CREATE TYPE public.power_source        AS ENUM ('solar','battery','direct','hybrid');
CREATE TYPE public.notification_cat    AS ENUM ('batch','spoilage','dispatch','payment','insurance','invoice','system');
CREATE TYPE public.plan_name           AS ENUM ('Grain Starter','Grain Professional','Grain Enterprise','Grain Enterprise Plus','Custom');

-- =========================================================================
-- SHARED updated_at TRIGGER FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- TABLE: profiles  (mirrors auth.users; NO password/2FA/reset here)
-- =========================================================================
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL DEFAULT '',
  email                 VARCHAR(255),
  phone                 VARCHAR(50),
  avatar                TEXT,

  admin_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id          UUID,

  status                public.user_status DEFAULT 'active',
  blocked               BOOLEAN DEFAULT FALSE,

  subscription_plan     VARCHAR(50) DEFAULT 'basic',
  has_access            VARCHAR(50) DEFAULT 'none',
  customer_id           VARCHAR(255),
  price_id              VARCHAR(255),

  business_type         VARCHAR(50) DEFAULT 'farm',
  address               JSONB,
  location              JSONB,

  email_verified        BOOLEAN DEFAULT FALSE,
  last_login            TIMESTAMPTZ,

  invitation_token      TEXT,
  invitation_expires    TIMESTAMPTZ,
  invitation_role       VARCHAR(50),
  invited_by            UUID REFERENCES public.profiles(id),

  preferences           JSONB DEFAULT '{"language":"en","timezone":"UTC","notifications":{"email":true,"sms":false,"push":true}}'::jsonb,
  fcm_tokens            JSONB DEFAULT '[]'::jsonb,

  employee_id           VARCHAR(100) UNIQUE,
  department            VARCHAR(100),
  shift_pattern         VARCHAR(20) DEFAULT 'day',
  certification_level   VARCHAR(20) DEFAULT 'basic',

  first_login           BOOLEAN DEFAULT TRUE,

  created_by            UUID REFERENCES public.profiles(id),
  updated_by            UUID REFERENCES public.profiles(id),
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profiles_admin_id ON public.profiles(admin_id);
CREATE INDEX idx_profiles_status   ON public.profiles(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: user_roles + has_role() (separate table — SECURITY REQUIREMENT)
-- =========================================================================
CREATE TABLE public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  granted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Tenant helper: returns the admin_id (tenant owner) for any user.
-- Admins/super_admins own their tenant → return their own id.
-- Managers/technicians → return their parent admin_id from profiles.
CREATE OR REPLACE FUNCTION public.get_tenant_admin_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.admin_id, p.id)
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- =========================================================================
-- Profile RLS (after has_role exists)
-- =========================================================================
CREATE POLICY "View own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "View tenant profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.get_tenant_admin_id(auth.uid()) = public.get_tenant_admin_id(id)
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admin manages tenant profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') AND public.get_tenant_admin_id(id) = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') AND public.get_tenant_admin_id(id) = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- =========================================================================
-- Auto-create profile + default 'pending' role on signup
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, business_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'business_type', 'farm')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- TABLE: warehouses
-- =========================================================================
CREATE TABLE public.warehouses (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id       VARCHAR(50) UNIQUE NOT NULL,
  name               VARCHAR(255) NOT NULL,
  admin_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location           JSONB,
  total_capacity_kg  NUMERIC DEFAULT 0,
  total_silos        INTEGER DEFAULT 0,
  status             public.device_status DEFAULT 'active',
  manager_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  technician_ids     UUID[],
  statistics         JSONB DEFAULT '{}'::jsonb,
  is_active          BOOLEAN DEFAULT TRUE,
  auto_alerts        BOOLEAN DEFAULT TRUE,
  notes              TEXT,
  tags               TEXT[],
  created_by         UUID NOT NULL REFERENCES public.profiles(id),
  updated_by         UUID REFERENCES public.profiles(id),
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_warehouses_admin_id ON public.warehouses(admin_id);
CREATE INDEX idx_warehouses_manager  ON public.warehouses(manager_id);
CREATE UNIQUE INDEX idx_warehouses_admin_name ON public.warehouses(admin_id, name) WHERE deleted_at IS NULL;

ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_warehouse
  FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access warehouses" ON public.warehouses
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: silos
-- =========================================================================
CREATE TABLE public.silos (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id                VARCHAR(50) UNIQUE NOT NULL,
  name                   VARCHAR(255) NOT NULL,
  admin_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id           UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  capacity_kg            NUMERIC NOT NULL,
  dimensions             JSONB,
  location               JSONB,
  status                 public.device_status DEFAULT 'active',
  current_occupancy_kg   NUMERIC DEFAULT 0,
  current_batch_id       UUID,
  batch_loaded_date      TIMESTAMPTZ,
  batch_dispatched_date  TIMESTAMPTZ,
  ventilation_system     JSONB DEFAULT '{}'::jsonb,
  temperature_control    JSONB DEFAULT '{}'::jsonb,
  sensors                JSONB DEFAULT '[]'::jsonb,
  current_conditions     JSONB DEFAULT '{}'::jsonb,
  thresholds             JSONB DEFAULT '{"temperature":{"min":10,"max":35,"critical_min":5,"critical_max":40},"humidity":{"min":40,"max":70,"critical_min":30,"critical_max":80},"co2":{"max":1000,"critical_max":5000},"moisture":{"max":14,"critical_max":18}}'::jsonb,
  last_inspection_date   DATE,
  next_inspection_date   DATE,
  last_cleaning_date     DATE,
  statistics             JSONB DEFAULT '{}'::jsonb,
  is_active              BOOLEAN DEFAULT TRUE,
  auto_alerts            BOOLEAN DEFAULT TRUE,
  notes                  TEXT,
  tags                   TEXT[],
  created_by             UUID NOT NULL REFERENCES public.profiles(id),
  updated_by             UUID REFERENCES public.profiles(id),
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_silos_admin_id     ON public.silos(admin_id);
CREATE INDEX idx_silos_warehouse_id ON public.silos(warehouse_id);
CREATE UNIQUE INDEX idx_silos_admin_warehouse_name ON public.silos(admin_id, warehouse_id, name) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.silos TO authenticated;
GRANT ALL ON public.silos TO service_role;
ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access silos" ON public.silos
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_silos_updated BEFORE UPDATE ON public.silos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: grain_batches
-- =========================================================================
CREATE TABLE public.grain_batches (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id                  VARCHAR(100) UNIQUE NOT NULL,
  qr_code                   VARCHAR(255) UNIQUE,
  admin_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  silo_id                   UUID NOT NULL REFERENCES public.silos(id),
  warehouse_id              UUID NOT NULL REFERENCES public.warehouses(id),
  grain_type                public.grain_type NOT NULL,
  variety                   VARCHAR(100),
  grade                     VARCHAR(20) DEFAULT 'Standard',
  quantity_kg               NUMERIC NOT NULL CHECK (quantity_kg >= 0),
  moisture_content          NUMERIC,
  protein_content           NUMERIC,
  test_weight               NUMERIC,
  status                    public.batch_status DEFAULT 'stored',
  harvest_date              DATE,
  intake_date               TIMESTAMPTZ DEFAULT now(),
  expected_dispatch_date    DATE,
  actual_dispatch_date      TIMESTAMPTZ,
  farmer_name               VARCHAR(255),
  farmer_contact            VARCHAR(100),
  source_location           TEXT,
  origin_coordinates        JSONB,
  spoilage_label            public.spoilage_label DEFAULT 'Safe',
  risk_score                NUMERIC DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  ai_prediction_confidence  NUMERIC CHECK (ai_prediction_confidence BETWEEN 0 AND 1),
  last_risk_assessment      TIMESTAMPTZ,
  intake_conditions         JSONB,
  insured                   BOOLEAN DEFAULT FALSE,
  insurance_policy_number   VARCHAR(100),
  insurance_value           NUMERIC,
  purchase_price_per_kg     NUMERIC,
  total_purchase_value      NUMERIC,
  sell_price_per_kg         NUMERIC,
  dispatched_quantity_kg    NUMERIC DEFAULT 0,
  revenue                   NUMERIC DEFAULT 0,
  profit                    NUMERIC DEFAULT 0,
  buyer_id                  UUID,
  dispatch_details          JSONB,
  quality_tests             JSONB DEFAULT '[]'::jsonb,
  sensor_summary            JSONB,
  spoilage_events           JSONB DEFAULT '[]'::jsonb,
  notes                     TEXT,
  tags                      TEXT[],
  created_by                UUID NOT NULL REFERENCES public.profiles(id),
  updated_by                UUID REFERENCES public.profiles(id),
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_grain_batches_admin_id   ON public.grain_batches(admin_id);
CREATE INDEX idx_grain_batches_silo_id    ON public.grain_batches(silo_id);
CREATE INDEX idx_grain_batches_status     ON public.grain_batches(status);
CREATE INDEX idx_grain_batches_grain_type ON public.grain_batches(grain_type);
CREATE INDEX idx_grain_batches_risk       ON public.grain_batches(risk_score DESC);
CREATE INDEX idx_grain_batches_intake     ON public.grain_batches(intake_date DESC);

ALTER TABLE public.silos ADD CONSTRAINT fk_silos_current_batch
  FOREIGN KEY (current_batch_id) REFERENCES public.grain_batches(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grain_batches TO authenticated;
GRANT ALL ON public.grain_batches TO service_role;
ALTER TABLE public.grain_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access batches" ON public.grain_batches
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_grain_batches_updated BEFORE UPDATE ON public.grain_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: subscriptions
-- =========================================================================
CREATE TABLE public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name              public.plan_name NOT NULL DEFAULT 'Grain Starter',
  plan_description       TEXT,
  price_per_month        NUMERIC NOT NULL DEFAULT 0,
  price_per_year         NUMERIC,
  currency               VARCHAR(10) DEFAULT 'USD',
  billing_cycle          public.billing_cycle DEFAULT 'monthly',
  discount_percentage    NUMERIC DEFAULT 0 CHECK (discount_percentage BETWEEN 0 AND 100),
  discount_amount        NUMERIC DEFAULT 0,
  promo_code             VARCHAR(100),
  start_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date               TIMESTAMPTZ NOT NULL,
  trial_end_date         TIMESTAMPTZ,
  status                 public.subscription_status DEFAULT 'active',
  payment_status         public.payment_status DEFAULT 'pending',
  last_payment_date      TIMESTAMPTZ,
  next_payment_date      TIMESTAMPTZ,
  payment_method         VARCHAR(100),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id     VARCHAR(255),
  stripe_price_id        VARCHAR(255),
  max_users              INTEGER DEFAULT 5,
  max_devices            INTEGER DEFAULT 10,
  max_storage_gb         NUMERIC DEFAULT 1,
  max_batches            INTEGER DEFAULT 100,
  ai_features            BOOLEAN DEFAULT FALSE,
  priority_support       BOOLEAN DEFAULT FALSE,
  custom_integrations    BOOLEAN DEFAULT FALSE,
  advanced_analytics     BOOLEAN DEFAULT FALSE,
  usage_users            INTEGER DEFAULT 0,
  usage_devices          INTEGER DEFAULT 0,
  usage_storage_gb       NUMERIC DEFAULT 0,
  usage_batches          INTEGER DEFAULT 0,
  auto_renew             BOOLEAN DEFAULT TRUE,
  cancellation_date      TIMESTAMPTZ,
  cancellation_reason    TEXT,
  notes                  TEXT,
  created_by             UUID REFERENCES public.profiles(id),
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_subscriptions_admin_id ON public.subscriptions(admin_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin owns subscription" ON public.subscriptions
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: invoices (SaaS billing to admin)
-- =========================================================================
CREATE TABLE public.invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id   UUID NOT NULL REFERENCES public.subscriptions(id),
  invoice_number    VARCHAR(100) UNIQUE,
  amount            NUMERIC NOT NULL DEFAULT 0,
  currency          VARCHAR(10) DEFAULT 'USD',
  status            public.payment_status DEFAULT 'pending',
  billing_date      TIMESTAMPTZ DEFAULT now(),
  due_date          TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  stripe_invoice_id VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_invoices_admin_id ON public.invoices(admin_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin owns invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: sensor_devices
-- =========================================================================
CREATE TABLE public.sensor_devices (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id                   VARCHAR(100) UNIQUE NOT NULL,
  device_name                 VARCHAR(255) NOT NULL,
  mac_address                 VARCHAR(50) UNIQUE,
  admin_id                    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id                UUID REFERENCES public.warehouses(id),
  silo_id                     UUID NOT NULL REFERENCES public.silos(id),
  model                       VARCHAR(100),
  manufacturer                VARCHAR(100),
  firmware_version            VARCHAR(50),
  hardware_version            VARCHAR(50),
  sensor_types                public.sensor_type[],
  device_type                 VARCHAR(20) NOT NULL CHECK (device_type IN ('sensor','actuator')),
  category                    VARCHAR(100) NOT NULL,
  capabilities                JSONB DEFAULT '{"fan":false,"servo":false,"pwm":false}'::jsonb,
  ml_requested_fan            BOOLEAN DEFAULT FALSE,
  human_requested_fan         BOOLEAN DEFAULT FALSE,
  target_fan_speed            NUMERIC DEFAULT 0 CHECK (target_fan_speed BETWEEN 0 AND 100),
  ml_decision                 VARCHAR(50) DEFAULT 'idle',
  status                      public.device_status DEFAULT 'active',
  is_enabled                  BOOLEAN DEFAULT TRUE,
  connection_status           VARCHAR(20) DEFAULT 'offline',
  power_source                public.power_source DEFAULT 'battery',
  battery_level               NUMERIC CHECK (battery_level BETWEEN 0 AND 100),
  signal_strength             NUMERIC CHECK (signal_strength BETWEEN -100 AND 0),
  ip_address                  VARCHAR(50),
  wifi_ssid                   VARCHAR(100),
  last_calibration_date       DATE,
  calibration_due_date        DATE,
  calibration_interval_days   INTEGER DEFAULT 90,
  data_transmission_interval  INTEGER DEFAULT 300,
  mqtt_topic                  VARCHAR(255),
  communication_protocol      VARCHAR(20) DEFAULT 'mqtt',
  last_heartbeat              TIMESTAMPTZ,
  expected_heartbeat_interval INTEGER DEFAULT 300,
  thresholds                  JSONB DEFAULT '{}'::jsonb,
  health_metrics              JSONB DEFAULT '{"uptime_percentage":100,"error_count":0}'::jsonb,
  data_stats                  JSONB DEFAULT '{"total_readings":0,"readings_today":0}'::jsonb,
  purchase_date               DATE,
  warranty_expiry             DATE,
  last_maintenance_date       DATE,
  next_maintenance_date       DATE,
  notes                       TEXT,
  tags                        TEXT[],
  created_by                  UUID NOT NULL REFERENCES public.profiles(id),
  updated_by                  UUID REFERENCES public.profiles(id),
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sensor_devices_admin_id ON public.sensor_devices(admin_id);
CREATE INDEX idx_sensor_devices_silo_id  ON public.sensor_devices(silo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensor_devices TO authenticated;
GRANT ALL ON public.sensor_devices TO service_role;
ALTER TABLE public.sensor_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access sensor_devices" ON public.sensor_devices
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_sensor_devices_updated BEFORE UPDATE ON public.sensor_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: sensor_readings
-- =========================================================================
CREATE TABLE public.sensor_readings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id            UUID REFERENCES public.sensor_devices(id),
  admin_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id         UUID REFERENCES public.warehouses(id),
  silo_id              UUID REFERENCES public.silos(id),
  batch_id             UUID REFERENCES public.grain_batches(id),
  reading_timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature_value    NUMERIC,
  temperature_unit     VARCHAR(20) DEFAULT 'celsius',
  humidity_value       NUMERIC CHECK (humidity_value BETWEEN 0 AND 100),
  co2_value            NUMERIC,
  voc_value            NUMERIC,
  moisture_value       NUMERIC CHECK (moisture_value BETWEEN 0 AND 100),
  light_value          NUMERIC,
  pressure_value       NUMERIC,
  ph_value             NUMERIC CHECK (ph_value BETWEEN 0 AND 14),
  ambient_temperature  NUMERIC,
  ambient_humidity     NUMERIC,
  ambient_light        NUMERIC,
  fan_state            SMALLINT DEFAULT 0 CHECK (fan_state IN (0,1)),
  fan_status           VARCHAR(20) DEFAULT 'unknown',
  lid_state            SMALLINT DEFAULT 0 CHECK (lid_state IN (0,1)),
  fan_duty_cycle       NUMERIC DEFAULT 0 CHECK (fan_duty_cycle BETWEEN 0 AND 100),
  fan_rpm              NUMERIC DEFAULT 0,
  fan_speed_factor     NUMERIC CHECK (fan_speed_factor BETWEEN 0 AND 1),
  dew_point            NUMERIC,
  dew_point_gap        NUMERIC,
  condensation_risk    BOOLEAN DEFAULT FALSE,
  airflow              NUMERIC,
  voc_baseline_24h     NUMERIC,
  voc_relative         NUMERIC,
  voc_relative_5min    NUMERIC,
  voc_relative_30min   NUMERIC,
  voc_rate_5min        NUMERIC,
  voc_rate_30min       NUMERIC,
  pest_presence_score  NUMERIC,
  pest_presence_flag   BOOLEAN DEFAULT FALSE,
  ml_risk_class        VARCHAR(20) DEFAULT 'unknown',
  ml_risk_score        NUMERIC,
  ml_confidence        NUMERIC,
  fan_recommendation   VARCHAR(20) DEFAULT 'unknown',
  battery_level        NUMERIC,
  signal_strength      NUMERIC,
  is_valid             BOOLEAN DEFAULT TRUE,
  confidence_score     NUMERIC DEFAULT 1 CHECK (confidence_score BETWEEN 0 AND 1),
  anomaly_detected     BOOLEAN DEFAULT FALSE,
  spoilage_label       VARCHAR(20) DEFAULT 'unknown',
  grain_type           VARCHAR(50),
  storage_days         INTEGER,
  raw_payload          JSONB,
  is_aggregated        BOOLEAN DEFAULT FALSE,
  aggregation_period   VARCHAR(20),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sensor_readings_device_time    ON public.sensor_readings(device_id, reading_timestamp DESC);
CREATE INDEX idx_sensor_readings_admin_time     ON public.sensor_readings(admin_id, reading_timestamp DESC);
CREATE INDEX idx_sensor_readings_silo_time      ON public.sensor_readings(silo_id, reading_timestamp DESC);
CREATE INDEX idx_sensor_readings_warehouse_time ON public.sensor_readings(warehouse_id, reading_timestamp DESC);
CREATE INDEX idx_sensor_readings_batch          ON public.sensor_readings(batch_id, reading_timestamp DESC);
CREATE INDEX idx_sensor_readings_timestamp      ON public.sensor_readings(reading_timestamp DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access sensor_readings" ON public.sensor_readings
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_sensor_readings_updated BEFORE UPDATE ON public.sensor_readings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: actuators
-- =========================================================================
CREATE TABLE public.actuators (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actuator_id          VARCHAR(100) UNIQUE NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  admin_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  silo_id              UUID NOT NULL REFERENCES public.silos(id),
  mac_address          VARCHAR(50) UNIQUE,
  actuator_type        public.actuator_type NOT NULL,
  model                VARCHAR(100),
  manufacturer         VARCHAR(100),
  status               VARCHAR(20) DEFAULT 'inactive'
                         CHECK (status IN ('active','inactive','maintenance','error','offline')),
  is_enabled           BOOLEAN DEFAULT TRUE,
  is_on                BOOLEAN DEFAULT FALSE,
  control_mode         VARCHAR(30) DEFAULT 'manual'
                         CHECK (control_mode IN ('manual','automatic','scheduled','ai_controlled')),
  power_level          NUMERIC DEFAULT 0 CHECK (power_level BETWEEN 0 AND 100),
  ml_requested_fan     BOOLEAN DEFAULT FALSE,
  human_requested_fan  BOOLEAN DEFAULT FALSE,
  target_fan_speed     NUMERIC DEFAULT 0 CHECK (target_fan_speed BETWEEN 0 AND 100),
  ml_decision          VARCHAR(50) DEFAULT 'idle',
  thresholds           JSONB DEFAULT '{}'::jsonb,
  ai_control           JSONB DEFAULT '{"enabled":false,"risk_score_threshold":70,"prediction_confidence_threshold":0.8}'::jsonb,
  schedule             JSONB DEFAULT '{"enabled":false}'::jsonb,
  safety_limits        JSONB DEFAULT '{"max_runtime_hours":24,"cooldown_period_minutes":5}'::jsonb,
  health_metrics       JSONB DEFAULT '{"uptime_percentage":100,"error_count":0,"total_operations":0,"total_runtime_hours":0}'::jsonb,
  performance_metrics  JSONB DEFAULT '{}'::jsonb,
  current_operation    JSONB,
  notes                TEXT,
  tags                 TEXT[],
  created_by           UUID NOT NULL REFERENCES public.profiles(id),
  updated_by           UUID REFERENCES public.profiles(id),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_actuators_admin_id ON public.actuators(admin_id);
CREATE INDEX idx_actuators_silo_id  ON public.actuators(silo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actuators TO authenticated;
GRANT ALL ON public.actuators TO service_role;
ALTER TABLE public.actuators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access actuators" ON public.actuators
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_actuators_updated BEFORE UPDATE ON public.actuators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: grain_alerts
-- =========================================================================
CREATE TABLE public.grain_alerts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id              VARCHAR(100) UNIQUE NOT NULL,
  admin_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id          UUID REFERENCES public.warehouses(id),
  silo_id               UUID REFERENCES public.silos(id),
  batch_id              UUID REFERENCES public.grain_batches(id),
  device_id             UUID REFERENCES public.sensor_devices(id),
  actuator_id           UUID REFERENCES public.actuators(id),
  title                 VARCHAR(200) NOT NULL,
  message               VARCHAR(1000) NOT NULL,
  alert_type            VARCHAR(20) DEFAULT 'in-app'
                          CHECK (alert_type IN ('SMS','voice','in-app','email','push')),
  priority              public.alert_priority NOT NULL,
  source                VARCHAR(30) NOT NULL
                          CHECK (source IN ('sensor','ai','manual','system','threshold','insurance','subscription','batch','payment','user')),
  sensor_type           public.sensor_type,
  trigger_conditions    JSONB,
  status                public.alert_status DEFAULT 'pending',
  triggered_at          TIMESTAMPTZ DEFAULT now(),
  acknowledged_at       TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  acknowledged_by       UUID REFERENCES public.profiles(id),
  resolved_by           UUID REFERENCES public.profiles(id),
  assigned_to           UUID REFERENCES public.profiles(id),
  escalation_level      INTEGER DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3),
  escalation_history    JSONB DEFAULT '[]'::jsonb,
  notifications_sent    JSONB DEFAULT '[]'::jsonb,
  actions_taken         JSONB DEFAULT '[]'::jsonb,
  ai_context            JSONB,
  environmental_context JSONB,
  related_alerts        JSONB DEFAULT '[]'::jsonb,
  resolution            JSONB,
  auto_resolve          BOOLEAN DEFAULT FALSE,
  auto_resolve_after    INTEGER DEFAULT 24,
  suppress_similar      BOOLEAN DEFAULT FALSE,
  suppression_period    INTEGER DEFAULT 60,
  tags                  TEXT[],
  custom_fields         JSONB,
  created_by            UUID REFERENCES public.profiles(id),
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_grain_alerts_admin    ON public.grain_alerts(admin_id, status, triggered_at DESC);
CREATE INDEX idx_grain_alerts_silo     ON public.grain_alerts(silo_id, status);
CREATE INDEX idx_grain_alerts_priority ON public.grain_alerts(priority, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grain_alerts TO authenticated;
GRANT ALL ON public.grain_alerts TO service_role;
ALTER TABLE public.grain_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access alerts" ON public.grain_alerts
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_grain_alerts_updated BEFORE UPDATE ON public.grain_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: buyers
-- =========================================================================
CREATE TABLE public.buyers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                    VARCHAR(255) NOT NULL,
  company_name            VARCHAR(255),
  buyer_type              public.buyer_type,
  contact_name            VARCHAR(255) NOT NULL,
  contact_email           VARCHAR(255),
  contact_phone           VARCHAR(100),
  contact_designation     VARCHAR(100),
  address                 TEXT,
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  country                 VARCHAR(100) DEFAULT 'Pakistan',
  status                  public.buyer_status DEFAULT 'active',
  rating                  NUMERIC DEFAULT 4 CHECK (rating BETWEEN 0 AND 5),
  notes                   TEXT,
  tags                    TEXT[],
  preferred_grain_types   public.grain_type[],
  preferred_payment_terms VARCHAR(100),
  last_interaction_at     TIMESTAMPTZ,
  last_order_at           TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_buyers_admin_id ON public.buyers(admin_id, status);

ALTER TABLE public.grain_batches ADD CONSTRAINT fk_grain_batches_buyer
  FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT ALL ON public.buyers TO service_role;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access buyers" ON public.buyers
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_buyers_updated BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: buyer_invoices
-- =========================================================================
CREATE TABLE public.buyer_invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number   VARCHAR(100) UNIQUE NOT NULL,
  buyer_id         UUID NOT NULL REFERENCES public.buyers(id),
  batch_id         UUID NOT NULL REFERENCES public.grain_batches(id),
  buyer_name       VARCHAR(255),
  buyer_company    VARCHAR(255),
  buyer_contact    JSONB,
  batch_ref        VARCHAR(100),
  items            JSONB DEFAULT '[]'::jsonb,
  subtotal         NUMERIC NOT NULL DEFAULT 0,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  currency         VARCHAR(10) DEFAULT 'PKR',
  payment_status   VARCHAR(20) DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid','paid','partial','overdue')),
  amount_paid      NUMERIC DEFAULT 0,
  payment_method   VARCHAR(50) CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','other')),
  due_date         DATE,
  paid_at          TIMESTAMPTZ,
  pdf_url          TEXT,
  notes            TEXT,
  emailed          BOOLEAN DEFAULT FALSE,
  emailed_at       TIMESTAMPTZ,
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_buyer_invoices_admin_id       ON public.buyer_invoices(admin_id, buyer_id);
CREATE INDEX idx_buyer_invoices_batch_id       ON public.buyer_invoices(batch_id);
CREATE INDEX idx_buyer_invoices_payment_status ON public.buyer_invoices(payment_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_invoices TO authenticated;
GRANT ALL ON public.buyer_invoices TO service_role;
ALTER TABLE public.buyer_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access buyer_invoices" ON public.buyer_invoices
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_buyer_invoices_updated BEFORE UPDATE ON public.buyer_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TABLE: buyer_payments
-- =========================================================================
CREATE TABLE public.buyer_payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id          UUID NOT NULL REFERENCES public.buyers(id),
  invoice_id        UUID REFERENCES public.buyer_invoices(id),
  batch_id          UUID REFERENCES public.grain_batches(id),
  amount            NUMERIC NOT NULL CHECK (amount >= 0),
  currency          VARCHAR(10) DEFAULT 'PKR',
  payment_method    VARCHAR(50) NOT NULL
                        CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','other')),
  payment_reference VARCHAR(255),
  payment_date      TIMESTAMPTZ DEFAULT now(),
  notes             TEXT,
  status            VARCHAR(20) DEFAULT 'completed'
                        CHECK (status IN ('completed','pending','cancelled')),
  recorded_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_buyer_payments_admin_id   ON public.buyer_payments(admin_id, buyer_id);
CREATE INDEX idx_buyer_payments_invoice_id ON public.buyer_payments(invoice_id);
CREATE INDEX idx_buyer_payments_date       ON public.buyer_payments(payment_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_payments TO authenticated;
GRANT ALL ON public.buyer_payments TO service_role;
ALTER TABLE public.buyer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access buyer_payments" ON public.buyer_payments
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_buyer_payments_updated BEFORE UPDATE ON public.buyer_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- REALTIME
-- =========================================================================
ALTER TABLE public.sensor_readings REPLICA IDENTITY FULL;
ALTER TABLE public.grain_alerts    REPLICA IDENTITY FULL;
ALTER TABLE public.grain_batches   REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grain_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grain_batches;
