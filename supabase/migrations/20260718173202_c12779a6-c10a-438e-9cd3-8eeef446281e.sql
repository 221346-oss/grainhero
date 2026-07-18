
-- ============================================================
-- Track A: Sync locks & idempotency
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mobile_sync_locks (
  endpoint text PRIMARY KEY,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid,
  idempotency_key text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_sync_locks TO authenticated;
GRANT ALL ON public.mobile_sync_locks TO service_role;
ALTER TABLE public.mobile_sync_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins read sync locks" ON public.mobile_sync_locks
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super_admins manage sync locks" ON public.mobile_sync_locks
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

ALTER TABLE public.mobile_sync_runs
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS mobile_sync_runs_idem_key
  ON public.mobile_sync_runs(endpoint, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- Phase 28: Mobile field bundles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mobile_field_bundles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle jsonb NOT NULL DEFAULT '{}'::jsonb,
  etag text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  bundle_bytes integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_field_bundles TO authenticated;
GRANT ALL ON public.mobile_field_bundles TO service_role;
ALTER TABLE public.mobile_field_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own bundle" ON public.mobile_field_bundles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "users write own bundle" ON public.mobile_field_bundles
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

ALTER TABLE public.mobile_field_settings
  ADD COLUMN IF NOT EXISTS bundle_ttl_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS bundle_max_incidents integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS bundle_max_tasks integer NOT NULL DEFAULT 100;

-- ============================================================
-- Phase 29: Buyer commerce shell
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text NOT NULL DEFAULT 'usd',
  subtotal_cents integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_carts TO authenticated;
GRANT ALL ON public.buyer_carts TO service_role;
ALTER TABLE public.buyer_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer manages own cart" ON public.buyer_carts
  FOR ALL TO authenticated USING (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER buyer_carts_set_updated_at BEFORE UPDATE ON public.buyer_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.buyer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  recipient text NOT NULL,
  phone text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text,
  postal text,
  country text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_addresses TO authenticated;
GRANT ALL ON public.buyer_addresses TO service_role;
ALTER TABLE public.buyer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer manages own addresses" ON public.buyer_addresses
  FOR ALL TO authenticated USING (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER buyer_addresses_set_updated_at BEFORE UPDATE ON public.buyer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS buyer_addresses_buyer_idx ON public.buyer_addresses(buyer_id);

CREATE TABLE IF NOT EXISTS public.buyer_saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_pm_id text NOT NULL,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, stripe_pm_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_saved_payment_methods TO authenticated;
GRANT ALL ON public.buyer_saved_payment_methods TO service_role;
ALTER TABLE public.buyer_saved_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer manages own pms" ON public.buyer_saved_payment_methods
  FOR ALL TO authenticated USING (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (buyer_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER buyer_pms_set_updated_at BEFORE UPDATE ON public.buyer_saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mobile_commerce_settings
  ADD COLUMN IF NOT EXISTS cart_ttl_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS cart_max_items integer NOT NULL DEFAULT 20;
