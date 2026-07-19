
-- Phase 26.5 + 27 schema

-- A1: mobile_sync_runs
CREATE TABLE IF NOT EXISTS public.mobile_sync_runs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  actor_user_id uuid null,
  status text not null check (status in ('ok','error')),
  duration_ms integer,
  row_count integer,
  error_message text,
  request_meta jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_mobile_sync_runs_endpoint_started ON public.mobile_sync_runs(endpoint, started_at desc);
GRANT SELECT, INSERT ON public.mobile_sync_runs TO authenticated;
GRANT ALL ON public.mobile_sync_runs TO service_role;
ALTER TABLE public.mobile_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_runs super admins read" ON public.mobile_sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- A3: platform_settings_audit
CREATE TABLE IF NOT EXISTS public.platform_settings_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null,
  settings_key text not null,
  action text not null default 'update',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_platform_settings_audit_key_created ON public.platform_settings_audit(settings_key, created_at desc);
GRANT SELECT, INSERT ON public.platform_settings_audit TO authenticated;
GRANT ALL ON public.platform_settings_audit TO service_role;
ALTER TABLE public.platform_settings_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings audit super admins read" ON public.platform_settings_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "settings audit super admins write" ON public.platform_settings_audit FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- B1: mobile_commerce_settings singleton
CREATE TABLE IF NOT EXISTS public.mobile_commerce_settings (
  id uuid primary key default gen_random_uuid(),
  checkout_enabled boolean not null default true,
  allowed_payment_methods jsonb not null default '["card"]'::jsonb,
  min_order_cents integer not null default 100,
  max_order_cents integer not null default 100000000,
  platform_fee_bps integer not null default 0,
  currency_default text not null default 'usd',
  terms_url text,
  refund_policy_url text,
  stripe_publishable_key_override text,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);
INSERT INTO public.mobile_commerce_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.mobile_commerce_settings TO anon, authenticated;
GRANT ALL ON public.mobile_commerce_settings TO service_role;
ALTER TABLE public.mobile_commerce_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commerce settings public read" ON public.mobile_commerce_settings FOR SELECT TO anon, authenticated USING (true);

-- B1: buyer_payment_intents
CREATE TABLE IF NOT EXISTS public.buyer_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid null references public.buyer_orders(id) on delete set null,
  stripe_pi_id text not null unique,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'requires_payment_method',
  platform_fee_cents integer not null default 0,
  channel text not null default 'mobile',
  raw jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_bpi_order ON public.buyer_payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_bpi_status ON public.buyer_payment_intents(status);
GRANT SELECT, INSERT, UPDATE ON public.buyer_payment_intents TO authenticated;
GRANT ALL ON public.buyer_payment_intents TO service_role;
ALTER TABLE public.buyer_payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bpi buyer read" ON public.buyer_payment_intents FOR SELECT TO authenticated USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (SELECT 1 FROM public.buyer_orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.admin_id = auth.uid()))
);
CREATE POLICY "bpi buyer insert" ON public.buyer_payment_intents FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Add payment_channel to buyer_orders if missing
ALTER TABLE public.buyer_orders ADD COLUMN IF NOT EXISTS payment_channel text not null default 'web';
