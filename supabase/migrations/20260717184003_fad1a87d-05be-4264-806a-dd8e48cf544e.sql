
-- Extend hardware_orders
ALTER TABLE public.hardware_orders
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS installed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

-- Extend installations
ALTER TABLE public.hardware_order_installations
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocker_note text;

DO $$ BEGIN
  ALTER TABLE public.hardware_order_installations
    ADD CONSTRAINT hardware_order_installations_status_check
    CHECK (status IN ('scheduled','en_route','onsite','completed','blocked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend visit events
ALTER TABLE public.hardware_order_visit_events
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location jsonb,
  ADD COLUMN IF NOT EXISTS event_type text;

DO $$ BEGIN
  ALTER TABLE public.hardware_order_visit_events
    ADD CONSTRAINT hardware_order_visit_events_event_type_check
    CHECK (event_type IS NULL OR event_type IN ('arrived','inspection','install','test','handover','issue'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend order devices
ALTER TABLE public.hardware_order_devices
  ADD COLUMN IF NOT EXISTS sensor_device_id uuid REFERENCES public.sensor_devices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commissioned_at timestamptz;

-- Status history
CREATE TABLE IF NOT EXISTS public.hardware_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hardware_order_status_history TO authenticated;
GRANT ALL ON public.hardware_order_status_history TO service_role;
ALTER TABLE public.hardware_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_history_super_admin_all" ON public.hardware_order_status_history
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "status_history_tenant_admin_own" ON public.hardware_order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hardware_orders o
    WHERE o.id = hardware_order_status_history.order_id
      AND o.admin_id = public.get_tenant_admin_id(auth.uid())
  ));

CREATE POLICY "status_history_technician_assigned" ON public.hardware_order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hardware_orders o
    WHERE o.id = hardware_order_status_history.order_id
      AND o.assigned_technician_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS hardware_order_status_history_order_idx
  ON public.hardware_order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hardware_orders_assigned_tech_idx
  ON public.hardware_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS hardware_order_installations_tech_idx
  ON public.hardware_order_installations(technician_id);
