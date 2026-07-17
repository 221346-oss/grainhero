CREATE TABLE public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'third_party' CHECK (type IN ('in_house','third_party')),
  webhook_secret text,
  tracking_url_template text,
  event_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_email text,
  contact_phone text,
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.carriers TO authenticated;
GRANT ALL ON public.carriers TO service_role;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carriers read" ON public.carriers FOR SELECT TO authenticated USING (active OR public.is_super_admin(auth.uid()));
CREATE POLICY "carriers super manage" ON public.carriers FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_carriers_upd BEFORE UPDATE ON public.carriers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  registration_no text NOT NULL,
  type text NOT NULL DEFAULT 'truck',
  capacity_kg numeric NOT NULL DEFAULT 0,
  fuel_type text DEFAULT 'diesel',
  avg_kmpl numeric DEFAULT 6,
  current_status text NOT NULL DEFAULT 'idle' CHECK (current_status IN ('idle','assigned','in_transit','maintenance')),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, registration_no)
);
GRANT SELECT ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO authenticated USING (active OR public.is_super_admin(auth.uid()));
CREATE POLICY "vehicles super manage" ON public.vehicles FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_vehicles_upd BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  license_no text,
  license_expiry date,
  rating numeric DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers read" ON public.drivers FOR SELECT TO authenticated USING (active OR public.is_super_admin(auth.uid()));
CREATE POLICY "drivers super manage" ON public.drivers FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_drivers_upd BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL UNIQUE REFERENCES public.buyer_shipments(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  driver_id uuid REFERENCES public.drivers(id),
  planned_pickup_at timestamptz,
  planned_delivery_at timestamptz,
  actual_pickup_at timestamptz,
  actual_delivery_at timestamptz,
  distance_km numeric,
  route_polyline text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','pickup_pending','in_transit','delivered','cancelled')),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_assignments TO authenticated;
GRANT ALL ON public.shipment_assignments TO service_role;
ALTER TABLE public.shipment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignment read" ON public.shipment_assignments FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buyer_shipments s
    JOIN public.buyer_orders o ON o.id = s.order_id
    LEFT JOIN public.buyer_accounts ba ON ba.id = o.buyer_account_id
    WHERE s.id = shipment_id AND (
      o.admin_id = public.get_tenant_admin_id(auth.uid())
      OR ba.user_id = auth.uid()
    )
  )
);
CREATE POLICY "assignment write" ON public.shipment_assignments FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.buyer_shipments s
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE s.id = shipment_id AND o.admin_id = public.get_tenant_admin_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.buyer_shipments s
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE s.id = shipment_id AND o.admin_id = public.get_tenant_admin_id(auth.uid())
    )
  );
CREATE TRIGGER trg_assign_upd BEFORE UPDATE ON public.shipment_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shipment_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.shipment_assignments(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  stop_type text NOT NULL DEFAULT 'dropoff' CHECK (stop_type IN ('pickup','dropoff','waypoint')),
  address text,
  lat numeric,
  lng numeric,
  eta timestamptz,
  arrived_at timestamptz,
  departed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_route_stops TO authenticated;
GRANT ALL ON public.shipment_route_stops TO service_role;
ALTER TABLE public.shipment_route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops read" ON public.shipment_route_stops FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.shipment_assignments a
    JOIN public.buyer_shipments s ON s.id = a.shipment_id
    JOIN public.buyer_orders o ON o.id = s.order_id
    LEFT JOIN public.buyer_accounts ba ON ba.id = o.buyer_account_id
    WHERE a.id = assignment_id AND (
      public.is_super_admin(auth.uid())
      OR o.admin_id = public.get_tenant_admin_id(auth.uid())
      OR ba.user_id = auth.uid()
    )
  )
);
CREATE POLICY "stops write" ON public.shipment_route_stops FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_assignments a
      JOIN public.buyer_shipments s ON s.id = a.shipment_id
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE a.id = assignment_id AND (
        public.is_super_admin(auth.uid())
        OR o.admin_id = public.get_tenant_admin_id(auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipment_assignments a
      JOIN public.buyer_shipments s ON s.id = a.shipment_id
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE a.id = assignment_id AND (
        public.is_super_admin(auth.uid())
        OR o.admin_id = public.get_tenant_admin_id(auth.uid())
      )
    )
  );
CREATE TRIGGER trg_stops_upd BEFORE UPDATE ON public.shipment_route_stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.logistics_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.shipment_assignments(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('fuel','driver_payout','toll','misc')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  incurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES public.profiles(id),
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_cost_entries TO authenticated;
GRANT ALL ON public.logistics_cost_entries TO service_role;
ALTER TABLE public.logistics_cost_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost access" ON public.logistics_cost_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_assignments a
      JOIN public.buyer_shipments s ON s.id = a.shipment_id
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE a.id = assignment_id AND (
        public.is_super_admin(auth.uid())
        OR o.admin_id = public.get_tenant_admin_id(auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipment_assignments a
      JOIN public.buyer_shipments s ON s.id = a.shipment_id
      JOIN public.buyer_orders o ON o.id = s.order_id
      WHERE a.id = assignment_id AND (
        public.is_super_admin(auth.uid())
        OR o.admin_id = public.get_tenant_admin_id(auth.uid())
      )
    )
  );
CREATE TRIGGER trg_cost_upd BEFORE UPDATE ON public.logistics_cost_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.carrier_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.buyer_shipments(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers(id),
  external_event_id text,
  event_code text,
  event_label text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  mapped_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, external_event_id)
);
GRANT SELECT ON public.carrier_tracking_events TO authenticated;
GRANT ALL ON public.carrier_tracking_events TO service_role;
ALTER TABLE public.carrier_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking events read" ON public.carrier_tracking_events FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buyer_shipments s
    JOIN public.buyer_orders o ON o.id = s.order_id
    LEFT JOIN public.buyer_accounts ba ON ba.id = o.buyer_account_id
    WHERE s.id = shipment_id AND (
      o.admin_id = public.get_tenant_admin_id(auth.uid())
      OR ba.user_id = auth.uid()
    )
  )
);
