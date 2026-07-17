-- 1. Stripe event idempotency ledger
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stripe_events TO authenticated;
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read stripe events"
  ON public.stripe_events FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 2. Subscriptions lifecycle fields
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS latest_invoice_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- 3. Hardware unit cost for profit math (default Rs. 4,000 per unit)
ALTER TABLE public.hardware_orders
  ADD COLUMN IF NOT EXISTS hardware_unit_cost numeric NOT NULL DEFAULT 4000;
UPDATE public.hardware_orders SET hardware_unit_cost = 4000 WHERE hardware_unit_cost IS NULL;