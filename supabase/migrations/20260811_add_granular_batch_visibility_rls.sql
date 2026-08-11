-- Add granular RLS policies for batch visibility
-- Ensures technicians only see batches they're assigned to AND in warehouses they're assigned to
-- Ensures managers only see batches in their assigned warehouses

-- Drop existing generic policy for grain_batches (we'll replace it with more specific ones)
DROP POLICY IF EXISTS "Tenant access batches" ON public.grain_batches;

-- Policy 1: Admins and super_admins see all batches (already checked via role in app layer, but RLS reinforces)
CREATE POLICY "Admin access all batches" ON public.grain_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policy 2: Managers see batches in their assigned warehouses
CREATE POLICY "Manager access warehouse batches" ON public.grain_batches
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager')
    AND warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE manager_id = auth.uid()
    )
  );

-- Policy 3: Technicians see batches they're assigned to AND are in warehouses they're assigned to
CREATE POLICY "Technician access assigned batches" ON public.grain_batches
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician_id = auth.uid()
    AND silo_id IN (
      SELECT id FROM public.silos 
      WHERE warehouse_id IN (
        SELECT id FROM public.warehouses 
        WHERE technician_ids @> ARRAY[auth.uid()]::uuid[]
      )
    )
  );

-- Policy 4: Tenant admins see their own batches (original behavior)
CREATE POLICY "Tenant admin access own batches" ON public.grain_batches
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));
