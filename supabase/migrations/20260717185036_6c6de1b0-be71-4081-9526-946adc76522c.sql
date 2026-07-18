
-- sensor_readings extensions
ALTER TABLE public.sensor_readings
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS quality_flag text NOT NULL DEFAULT 'ok';

-- plan gate for alert rules
ALTER TABLE public.plan_thresholds
  ADD COLUMN IF NOT EXISTS max_active_alert_rules integer;

-- sensor_thresholds
CREATE TABLE IF NOT EXISTS public.sensor_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  silo_id uuid NOT NULL,
  metric text NOT NULL,
  min_value numeric,
  max_value numeric,
  critical_min numeric,
  critical_max numeric,
  hysteresis numeric NOT NULL DEFAULT 0,
  window_seconds integer NOT NULL DEFAULT 300,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (silo_id, metric)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensor_thresholds TO authenticated;
GRANT ALL ON public.sensor_thresholds TO service_role;
ALTER TABLE public.sensor_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensor_thresholds tenant read"
  ON public.sensor_thresholds FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "sensor_thresholds tenant write"
  ON public.sensor_thresholds FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_sensor_thresholds_updated
  BEFORE UPDATE ON public.sensor_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- actuator_commands
CREATE TABLE IF NOT EXISTS public.actuator_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  actuator_id uuid NOT NULL,
  issued_by uuid,
  command text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamptz,
  ack_at timestamptz,
  error text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_actuator_commands_actuator ON public.actuator_commands (actuator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actuator_commands_status ON public.actuator_commands (status) WHERE status IN ('queued','sent');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actuator_commands TO authenticated;
GRANT ALL ON public.actuator_commands TO service_role;
ALTER TABLE public.actuator_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actuator_commands tenant read"
  ON public.actuator_commands FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "actuator_commands tenant write"
  ON public.actuator_commands FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_actuator_commands_updated
  BEFORE UPDATE ON public.actuator_commands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- device_heartbeats
CREATE TABLE IF NOT EXISTS public.device_heartbeats (
  device_id uuid PRIMARY KEY,
  admin_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  battery numeric,
  rssi numeric,
  status text NOT NULL DEFAULT 'online',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_heartbeats TO authenticated;
GRANT ALL ON public.device_heartbeats TO service_role;
ALTER TABLE public.device_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_heartbeats tenant read"
  ON public.device_heartbeats FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "device_heartbeats service write"
  ON public.device_heartbeats FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE TRIGGER trg_device_heartbeats_updated
  BEFORE UPDATE ON public.device_heartbeats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
