-- Maintenance requests — Admin triggers a request for a device/silo sensor;
-- Super Admin views, assigns, and tracks it to completion. Manager and
-- Technician have no access to this table (enforced by RLS, not just UI).
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.sensor_devices(id) ON DELETE SET NULL,
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'acknowledged', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- View: the tenant admin who owns it, super_admin, or the technician it's
-- currently assigned to.
CREATE POLICY "Maintenance requests are visible to owner tenant, assignee, or super admin"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR assigned_technician_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Create: only an Admin, for their own tenant, as themselves.
CREATE POLICY "Only admins can request maintenance"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND admin_id = public.get_tenant_admin_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Update (assign/track/resolve): only super_admin.
CREATE POLICY "Only super admins manage maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_admin ON public.maintenance_requests (admin_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assignee ON public.maintenance_requests (assigned_technician_id);

CREATE TRIGGER trg_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
