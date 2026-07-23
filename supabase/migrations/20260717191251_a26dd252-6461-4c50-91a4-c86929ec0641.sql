
-- Phase 11: buyer marketplace, orders, and invoice-order linkage.

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('draft','active','paused','sold_out','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_visibility AS ENUM ('private','buyer_network','public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.buyer_order_status AS ENUM (
    'pending','confirmed','invoiced','paid','dispatched','completed','cancelled','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ grain_listings ============
CREATE TABLE IF NOT EXISTS public.grain_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  batch_id uuid NOT NULL UNIQUE REFERENCES public.grain_batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_per_kg numeric(12,2) NOT NULL CHECK (price_per_kg >= 0),
  currency text NOT NULL DEFAULT 'USD',
  available_kg numeric(12,2) NOT NULL CHECK (available_kg >= 0),
  min_order_kg numeric(12,2) NOT NULL DEFAULT 100 CHECK (min_order_kg >= 0),
  visibility public.listing_visibility NOT NULL DEFAULT 'buyer_network',
  status public.listing_status NOT NULL DEFAULT 'draft',
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grain_listings TO authenticated;
GRANT ALL ON public.grain_listings TO service_role;
ALTER TABLE public.grain_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grain_listings tenant read" ON public.grain_listings
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "grain_listings tenant write" ON public.grain_listings
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE TRIGGER trg_grain_listings_updated
  BEFORE UPDATE ON public.grain_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_grain_listings_admin ON public.grain_listings(admin_id, status);

-- ============ buyer_orders ============
CREATE TABLE IF NOT EXISTS public.buyer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE RESTRICT,
  listing_id uuid NOT NULL REFERENCES public.grain_listings(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.grain_batches(id),
  order_number text NOT NULL UNIQUE,
  quantity_kg numeric(12,2) NOT NULL CHECK (quantity_kg > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(14,2) NOT NULL CHECK (subtotal >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status public.buyer_order_status NOT NULL DEFAULT 'pending',
  expected_delivery_date date,
  notes text,
  placed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_orders TO authenticated;
GRANT ALL ON public.buyer_orders TO service_role;
ALTER TABLE public.buyer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_orders tenant read" ON public.buyer_orders
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "buyer_orders tenant write" ON public.buyer_orders
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE TRIGGER trg_buyer_orders_updated
  BEFORE UPDATE ON public.buyer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_buyer_orders_admin_status ON public.buyer_orders(admin_id, status);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_buyer ON public.buyer_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_listing ON public.buyer_orders(listing_id);

-- ============ buyer_order_events (audit) ============
CREATE TABLE IF NOT EXISTS public.buyer_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  from_state public.buyer_order_status,
  to_state public.buyer_order_status NOT NULL,
  actor_user_id uuid,
  note text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.buyer_order_events TO authenticated;
GRANT ALL ON public.buyer_order_events TO service_role;
ALTER TABLE public.buyer_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_order_events tenant read" ON public.buyer_order_events
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "buyer_order_events tenant insert" ON public.buyer_order_events
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_buyer_order_events_order ON public.buyer_order_events(order_id, created_at DESC);

-- ============ buyer_invoices extension ============
ALTER TABLE public.buyer_invoices
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.buyer_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_via text;

CREATE INDEX IF NOT EXISTS idx_buyer_invoices_order ON public.buyer_invoices(order_id);

-- ============ Realtime ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grain_listings;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_orders;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_invoices;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
