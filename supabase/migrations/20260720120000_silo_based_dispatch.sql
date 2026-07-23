-- =========================================================================
-- Silo-based dispatch: trucks now dump into a silo (mixed grain) and
-- dispatch happens FROM the silo, not from a single batch. grain_batches
-- stays an INTAKE-only record; this new `dispatches` table tracks amount-out
-- per silo, decoupled from any single batch.
--
-- Existing grain_batches dispatch columns (dispatched_quantity_kg, revenue,
-- profit, dispatch_details, buyer_id, sell_price_per_kg, actual_dispatch_date)
-- are intentionally left untouched for backward compatibility with legacy
-- per-batch dispatch data. Cleanup is a separate future migration.
-- =========================================================================

CREATE TABLE public.dispatches (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  silo_id                UUID NOT NULL REFERENCES public.silos(id),
  buyer_id               UUID REFERENCES public.buyers(id),
  quantity_kg            NUMERIC NOT NULL CHECK (quantity_kg > 0),
  price_per_kg           NUMERIC NOT NULL CHECK (price_per_kg >= 0),
  avg_cost_at_dispatch   NUMERIC,
  revenue                NUMERIC DEFAULT 0,
  profit                 NUMERIC,
  dispatch_date          TIMESTAMPTZ DEFAULT now(),
  vehicle_number         VARCHAR(100),
  driver_name            VARCHAR(200),
  driver_contact         VARCHAR(100),
  destination            TEXT,
  notes                  TEXT,
  created_by             UUID NOT NULL REFERENCES public.profiles(id),
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dispatches_admin_id ON public.dispatches(admin_id);
CREATE INDEX idx_dispatches_silo_id  ON public.dispatches(silo_id, dispatch_date DESC);
CREATE INDEX idx_dispatches_buyer_id ON public.dispatches(buyer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access dispatches" ON public.dispatches
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_dispatches_updated BEFORE UPDATE ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
