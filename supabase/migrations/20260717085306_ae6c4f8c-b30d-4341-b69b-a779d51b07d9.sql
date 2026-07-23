-- 1. profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. insurance commission
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0;

-- 3. installations
CREATE TABLE IF NOT EXISTS public.hardware_order_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  installer_name text,
  installer_phone text,
  installer_photo_url text,
  installer_company text,
  city text,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  scheduled_visit_at timestamptz,
  origin_address text,
  origin_lat numeric(10,6),
  origin_lng numeric(10,6),
  destination_address text,
  destination_lat numeric(10,6),
  destination_lng numeric(10,6),
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_installations TO authenticated;
GRANT ALL ON public.hardware_order_installations TO service_role;
ALTER TABLE public.hardware_order_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin manages installations"
ON public.hardware_order_installations FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "tenant reads own installations"
ON public.hardware_order_installations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hardware_orders ho
    WHERE ho.id = hardware_order_installations.order_id
      AND ho.admin_id = public.get_tenant_admin_id(auth.uid())
  )
);

CREATE TRIGGER trg_installations_updated_at
BEFORE UPDATE ON public.hardware_order_installations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. devices
CREATE TABLE IF NOT EXISTS public.hardware_order_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  serial text NOT NULL,
  model text,
  status text NOT NULL DEFAULT 'shipped',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, serial)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_devices TO authenticated;
GRANT ALL ON public.hardware_order_devices TO service_role;
ALTER TABLE public.hardware_order_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin manages devices"
ON public.hardware_order_devices FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "tenant reads own devices"
ON public.hardware_order_devices FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hardware_orders ho
    WHERE ho.id = hardware_order_devices.order_id
      AND ho.admin_id = public.get_tenant_admin_id(auth.uid())
  )
);

CREATE TRIGGER trg_devices_updated_at
BEFORE UPDATE ON public.hardware_order_devices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. visit events
CREATE TABLE IF NOT EXISTS public.hardware_order_visit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.hardware_orders(id) ON DELETE CASCADE,
  note text NOT NULL,
  photo_url text,
  event_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_order_visit_events TO authenticated;
GRANT ALL ON public.hardware_order_visit_events TO service_role;
ALTER TABLE public.hardware_order_visit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin manages visit events"
ON public.hardware_order_visit_events FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "tenant reads own visit events"
ON public.hardware_order_visit_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hardware_orders ho
    WHERE ho.id = hardware_order_visit_events.order_id
      AND ho.admin_id = public.get_tenant_admin_id(auth.uid())
  )
);