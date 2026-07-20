-- Multi-Warehouse Support, Technician Assignment, and Enhanced Reporting

ALTER TABLE public.hardware_orders
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_location text,
  ADD COLUMN IF NOT EXISTS warehouse_city text;
CREATE INDEX IF NOT EXISTS idx_hardware_orders_warehouse ON public.hardware_orders(warehouse_id);

-- Technician-Warehouse Assignments
CREATE TABLE IF NOT EXISTS public.technician_warehouse_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  is_primary boolean DEFAULT false,
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(technician_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_tech_assignments_tech ON public.technician_warehouse_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_assignments_warehouse ON public.technician_warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_tech_assignments_city ON public.technician_warehouse_assignments(city);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_warehouse_assignments TO authenticated;
GRANT ALL ON public.technician_warehouse_assignments TO service_role;
ALTER TABLE public.technician_warehouse_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin manages tech assignments" ON public.technician_warehouse_assignments;
CREATE POLICY "super_admin manages tech assignments"
  ON public.technician_warehouse_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin sees own warehouse tech assignments" ON public.technician_warehouse_assignments;
CREATE POLICY "admin sees own warehouse tech assignments"
  ON public.technician_warehouse_assignments FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()));
DROP TRIGGER IF EXISTS trg_tech_assignments_updated ON public.technician_warehouse_assignments;
CREATE TRIGGER trg_tech_assignments_updated
  BEFORE UPDATE ON public.technician_warehouse_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Technician availability on profiles
DO $$ BEGIN
  CREATE TYPE public.technician_status AS ENUM ('available', 'busy', 'offline', 'on_leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS technician_status public.technician_status DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS current_job_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS service_areas text[];
CREATE INDEX IF NOT EXISTS idx_profiles_tech_status ON public.profiles(technician_status) WHERE technician_status IS NOT NULL;

-- Customer feedback
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  technician_rating integer CHECK (technician_rating >= 1 AND technician_rating <= 5),
  installation_quality integer CHECK (installation_quality >= 1 AND installation_quality <= 5),
  timeliness_rating integer CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comments text,
  would_recommend boolean,
  issues_encountered text[],
  follow_up_required boolean DEFAULT false,
  follow_up_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_admin ON public.customer_feedback(admin_id);
CREATE INDEX IF NOT EXISTS idx_feedback_technician ON public.customer_feedback(technician_id);
CREATE INDEX IF NOT EXISTS idx_feedback_warehouse ON public.customer_feedback(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.customer_feedback(overall_rating DESC);
GRANT SELECT, INSERT, UPDATE ON public.customer_feedback TO authenticated;
GRANT ALL ON public.customer_feedback TO service_role;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin sees own feedback" ON public.customer_feedback;
CREATE POLICY "admin sees own feedback"
  ON public.customer_feedback FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "admin submits own feedback" ON public.customer_feedback;
CREATE POLICY "admin submits own feedback"
  ON public.customer_feedback FOR INSERT TO authenticated
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));
DROP POLICY IF EXISTS "super_admin manages feedback" ON public.customer_feedback;
CREATE POLICY "super_admin manages feedback"
  ON public.customer_feedback FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS trg_feedback_updated ON public.customer_feedback;
CREATE TRIGGER trg_feedback_updated
  BEFORE UPDATE ON public.customer_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Warehouse metrics
CREATE TABLE IF NOT EXISTS public.warehouse_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_capacity_kg numeric(12,2) NOT NULL DEFAULT 0,
  occupied_capacity_kg numeric(12,2) NOT NULL DEFAULT 0,
  utilization_percent numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_capacity_kg > 0 THEN (occupied_capacity_kg / total_capacity_kg * 100) ELSE 0 END
  ) STORED,
  quality_incidents_count integer DEFAULT 0,
  temperature_violations_count integer DEFAULT 0,
  humidity_violations_count integer DEFAULT 0,
  spoilage_incidents_count integer DEFAULT 0,
  total_batches_stored integer DEFAULT 0,
  total_batches_dispatched integer DEFAULT 0,
  active_silos_count integer DEFAULT 0,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_metrics_warehouse ON public.warehouse_metrics(warehouse_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_metrics_admin ON public.warehouse_metrics(admin_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_metrics_utilization ON public.warehouse_metrics(utilization_percent DESC);
GRANT SELECT, INSERT, UPDATE ON public.warehouse_metrics TO authenticated;
GRANT ALL ON public.warehouse_metrics TO service_role;
ALTER TABLE public.warehouse_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant sees own warehouse metrics" ON public.warehouse_metrics;
CREATE POLICY "tenant sees own warehouse metrics"
  ON public.warehouse_metrics FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "system can write warehouse metrics" ON public.warehouse_metrics;
CREATE POLICY "system can write warehouse metrics"
  ON public.warehouse_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR admin_id = public.get_tenant_admin_id(auth.uid()));
DROP TRIGGER IF EXISTS trg_warehouse_metrics_updated ON public.warehouse_metrics;
CREATE TRIGGER trg_warehouse_metrics_updated
  BEFORE UPDATE ON public.warehouse_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plan usage counters
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_usage_silos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_usage_users integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_usage_sensors integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_usage_actuators integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_limits_notified_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_plan_usage ON public.profiles(subscription_plan, plan_usage_silos);

-- Installations linkage
ALTER TABLE public.hardware_order_installations
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
CREATE INDEX IF NOT EXISTS idx_installations_technician ON public.hardware_order_installations(technician_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.increment_technician_jobs(tech_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET current_job_count = COALESCE(current_job_count, 0) + 1,
      technician_status = CASE 
        WHEN COALESCE(current_job_count, 0) + 1 >= COALESCE(max_concurrent_jobs, 3) THEN 'busy'::public.technician_status
        ELSE technician_status END
  WHERE id = tech_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_technician_jobs(tech_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET current_job_count = GREATEST(COALESCE(current_job_count, 0) - 1, 0),
      technician_status = CASE 
        WHEN GREATEST(COALESCE(current_job_count, 0) - 1, 0) < COALESCE(max_concurrent_jobs, 3) 
             AND technician_status = 'busy'::public.technician_status 
        THEN 'available'::public.technician_status
        ELSE technician_status END
  WHERE id = tech_id;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_warehouse_count(admin_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.warehouses
  WHERE admin_id = admin_user_id AND deleted_at IS NULL AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_available_technicians_for_warehouse(warehouse_uuid uuid)
RETURNS TABLE (technician_id uuid, name text, email text, phone text,
  status public.technician_status, current_jobs integer, max_jobs integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT p.id, p.name, p.email, p.phone, p.technician_status,
    p.current_job_count, p.max_concurrent_jobs
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  INNER JOIN public.technician_warehouse_assignments twa ON twa.technician_id = p.id
  WHERE ur.role = 'technician'
    AND twa.warehouse_id = warehouse_uuid
    AND COALESCE(p.status, 'active') = 'active'
    AND COALESCE(p.blocked, false) = false
    AND (p.technician_status = 'available' OR p.current_job_count < p.max_concurrent_jobs)
  ORDER BY p.current_job_count ASC, p.name ASC;
$$;

CREATE OR REPLACE FUNCTION public.check_plan_limit_exceeded(admin_user_id uuid, resource_type text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan text; v_current_usage integer; v_max_allowed integer;
BEGIN
  SELECT COALESCE(subscription_plan, 'starter') INTO v_plan FROM public.profiles WHERE id = admin_user_id;
  CASE resource_type
    WHEN 'silos' THEN SELECT COALESCE(plan_usage_silos, 0) INTO v_current_usage FROM public.profiles WHERE id = admin_user_id;
    WHEN 'users' THEN SELECT COALESCE(plan_usage_users, 0) INTO v_current_usage FROM public.profiles WHERE id = admin_user_id;
    WHEN 'sensors' THEN SELECT COALESCE(plan_usage_sensors, 0) INTO v_current_usage FROM public.profiles WHERE id = admin_user_id;
    WHEN 'actuators' THEN SELECT COALESCE(plan_usage_actuators, 0) INTO v_current_usage FROM public.profiles WHERE id = admin_user_id;
    ELSE RETURN false;
  END CASE;
  CASE resource_type
    WHEN 'silos' THEN SELECT COALESCE(max_silos, 0) INTO v_max_allowed FROM public.plan_thresholds WHERE plan_id = v_plan;
    WHEN 'users' THEN SELECT COALESCE(max_users, 0) INTO v_max_allowed FROM public.plan_thresholds WHERE plan_id = v_plan;
    WHEN 'sensors' THEN SELECT COALESCE(max_sensors, 0) INTO v_max_allowed FROM public.plan_thresholds WHERE plan_id = v_plan;
    WHEN 'actuators' THEN SELECT COALESCE(max_actuators, 0) INTO v_max_allowed FROM public.plan_thresholds WHERE plan_id = v_plan;
    ELSE RETURN false;
  END CASE;
  RETURN v_current_usage >= v_max_allowed;
END; $$;

-- Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_warehouse_assignments;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_feedback;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_metrics;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- Reporting views
CREATE OR REPLACE VIEW public.technician_performance_v AS
SELECT p.id as technician_id, p.name as technician_name, p.email as technician_email,
  p.technician_status, p.current_job_count,
  COUNT(DISTINCT hoi.id) as total_installations,
  COUNT(DISTINCT CASE WHEN hoi.status = 'completed' THEN hoi.id END) as completed_installations,
  AVG(cf.technician_rating) as avg_technician_rating,
  AVG(cf.overall_rating) as avg_overall_rating,
  COUNT(DISTINCT twa.warehouse_id) as assigned_warehouses,
  array_agg(DISTINCT twa.city) FILTER (WHERE twa.city IS NOT NULL) as service_cities
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'technician'
LEFT JOIN public.hardware_order_installations hoi ON hoi.technician_id = p.id
LEFT JOIN public.customer_feedback cf ON cf.technician_id = p.id
LEFT JOIN public.technician_warehouse_assignments twa ON twa.technician_id = p.id
WHERE COALESCE(p.status,'active') = 'active' AND COALESCE(p.blocked,false) = false
GROUP BY p.id, p.name, p.email, p.technician_status, p.current_job_count;
GRANT SELECT ON public.technician_performance_v TO authenticated;

CREATE OR REPLACE VIEW public.warehouse_operations_summary_v AS
SELECT w.id as warehouse_id, w.name as warehouse_name, w.warehouse_id as warehouse_code,
  w.admin_id, w.location->>'description' as location_desc,
  w.total_silos, w.total_capacity_kg, w.status,
  COUNT(DISTINCT s.id) as active_silos,
  COUNT(DISTINCT gb.id) as active_batches,
  SUM(s.current_occupancy_kg) as total_occupied_kg,
  CASE WHEN w.total_capacity_kg > 0 THEN (SUM(s.current_occupancy_kg) / w.total_capacity_kg * 100) ELSE 0 END as utilization_percent,
  COUNT(DISTINCT ga.id) FILTER (WHERE ga.created_at >= NOW() - INTERVAL '30 days') as recent_alerts,
  MAX(wm.quality_incidents_count) as quality_incidents,
  MAX(wm.temperature_violations_count) as temp_violations
FROM public.warehouses w
LEFT JOIN public.silos s ON s.warehouse_id = w.id AND s.deleted_at IS NULL AND s.is_active = true
LEFT JOIN public.grain_batches gb ON gb.warehouse_id = w.id AND gb.status = 'stored'
LEFT JOIN public.grain_alerts ga ON ga.warehouse_id = w.id AND ga.status != 'resolved'
LEFT JOIN public.warehouse_metrics wm ON wm.warehouse_id = w.id AND wm.metric_date = CURRENT_DATE
WHERE w.deleted_at IS NULL AND w.is_active = true
GROUP BY w.id, w.name, w.warehouse_id, w.admin_id, w.location, w.total_silos, w.total_capacity_kg, w.status;
GRANT SELECT ON public.warehouse_operations_summary_v TO authenticated;