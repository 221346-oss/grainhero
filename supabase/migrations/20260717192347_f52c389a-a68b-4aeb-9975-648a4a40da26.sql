
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'buyer' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'buyer';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.buyer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  company_name text,
  contact_phone text,
  default_shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_accounts TO authenticated;
GRANT ALL ON public.buyer_accounts TO service_role;
ALTER TABLE public.buyer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba self select" ON public.buyer_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ba self insert" ON public.buyer_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ba self update" ON public.buyer_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ba super admin" ON public.buyer_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS trg_buyer_accounts_updated ON public.buyer_accounts;
CREATE TRIGGER trg_buyer_accounts_updated BEFORE UPDATE ON public.buyer_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.buyer_orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_account_id uuid REFERENCES public.buyer_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_buyer_orders_buyer_account ON public.buyer_orders(buyer_account_id);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_stripe_session ON public.buyer_orders(stripe_session_id);

CREATE POLICY "bo buyer self read" ON public.buyer_orders FOR SELECT TO authenticated
  USING (buyer_account_id IN (SELECT id FROM public.buyer_accounts WHERE user_id = auth.uid()));
CREATE POLICY "bo buyer self insert" ON public.buyer_orders FOR INSERT TO authenticated
  WITH CHECK (channel = 'portal' AND buyer_account_id IN (SELECT id FROM public.buyer_accounts WHERE user_id = auth.uid()));
CREATE POLICY "bo buyer self update" ON public.buyer_orders FOR UPDATE TO authenticated
  USING (buyer_account_id IN (SELECT id FROM public.buyer_accounts WHERE user_id = auth.uid()))
  WITH CHECK (buyer_account_id IN (SELECT id FROM public.buyer_accounts WHERE user_id = auth.uid()));

ALTER TABLE public.grain_listings
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS available_from date;
UPDATE public.grain_listings SET slug = concat('listing-', substr(id::text, 1, 8)) WHERE slug IS NULL;

DROP VIEW IF EXISTS public.public_listings_v;
CREATE VIEW public.public_listings_v WITH (security_invoker = true) AS
SELECT l.id, l.slug, l.title, l.description, l.price_per_kg, l.available_kg,
       l.min_order_kg, l.available_from, l.cover_image_url, l.currency, l.created_at,
       b.grain_type, b.grade, b.variety,
       w.location AS warehouse_location, w.name AS warehouse_name
FROM public.grain_listings l
LEFT JOIN public.grain_batches b ON b.id = l.batch_id
LEFT JOIN public.warehouses w ON w.id = b.warehouse_id
WHERE l.status = 'active' AND l.visibility = 'public';
GRANT SELECT ON public.public_listings_v TO anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grain_listings' AND policyname='grain_listings public read') THEN
    CREATE POLICY "grain_listings public read" ON public.grain_listings FOR SELECT TO anon, authenticated
      USING (status = 'active' AND visibility = 'public');
  END IF;
END $$;

GRANT SELECT ON public.grain_listings TO anon;
GRANT SELECT ON public.grain_batches TO anon;
GRANT SELECT ON public.warehouses TO anon;
