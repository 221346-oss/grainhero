-- =========================================================================
-- Phase 20 slice 1: Analytics warehouse foundation (corrected for real schema)
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- Dimensions
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics.dim_calendar (
  day date PRIMARY KEY,
  year int NOT NULL,
  quarter int NOT NULL,
  month int NOT NULL,
  week int NOT NULL,
  day_of_week int NOT NULL,
  is_weekend boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics.dim_tenant (
  admin_id uuid PRIMARY KEY,
  name text,
  plan text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS analytics.dim_plan (
  plan_id text PRIMARY KEY,
  currency text,
  annual_price_cents bigint,
  is_active boolean
);

-- -------------------------------------------------------------------------
-- Fact tables (amounts stored as cents)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics.fact_orders (
  order_id uuid PRIMARY KEY,
  buyer_id uuid,
  seller_admin_id uuid,
  listing_id uuid,
  batch_id uuid,
  status text,
  gross_cents bigint NOT NULL DEFAULT 0,
  refund_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  quantity_kg numeric,
  placed_at timestamptz,
  paid_at timestamptz,
  delivered_at timestamptz,
  delay_hours numeric,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fact_orders_seller_idx ON analytics.fact_orders(seller_admin_id);
CREATE INDEX IF NOT EXISTS fact_orders_buyer_idx  ON analytics.fact_orders(buyer_id);
CREATE INDEX IF NOT EXISTS fact_orders_placed_idx ON analytics.fact_orders(placed_at);

CREATE TABLE IF NOT EXISTS analytics.fact_shipments (
  shipment_id uuid PRIMARY KEY,
  order_id uuid,
  seller_admin_id uuid,
  courier_key text,
  status text,
  actual_hours numeric,
  expected_hours numeric,
  on_time boolean,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fact_shipments_seller_idx ON analytics.fact_shipments(seller_admin_id);
CREATE INDEX IF NOT EXISTS fact_shipments_courier_idx ON analytics.fact_shipments(courier_key);
CREATE INDEX IF NOT EXISTS fact_shipments_dispatched_idx ON analytics.fact_shipments(dispatched_at);

CREATE TABLE IF NOT EXISTS analytics.fact_telemetry_daily (
  silo_id uuid NOT NULL,
  admin_id uuid,
  day date NOT NULL,
  avg_temp numeric,
  max_temp numeric,
  avg_humidity numeric,
  max_humidity numeric,
  reading_count int NOT NULL DEFAULT 0,
  alert_count int NOT NULL DEFAULT 0,
  spoilage_risk_score numeric,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (silo_id, day)
);
CREATE INDEX IF NOT EXISTS fact_telemetry_admin_idx ON analytics.fact_telemetry_daily(admin_id, day);

CREATE TABLE IF NOT EXISTS analytics.fact_finance_daily (
  day date NOT NULL,
  admin_id uuid,
  currency text NOT NULL DEFAULT 'USD',
  gross_cents bigint NOT NULL DEFAULT 0,
  refunds_cents bigint NOT NULL DEFAULT 0,
  payouts_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, admin_id, currency)
);
CREATE INDEX IF NOT EXISTS fact_finance_admin_idx ON analytics.fact_finance_daily(admin_id, day);

CREATE TABLE IF NOT EXISTS analytics.fact_insurance (
  policy_id uuid PRIMARY KEY,
  admin_id uuid,
  product_id uuid,
  provider_name text,
  premium_cents bigint NOT NULL DEFAULT 0,
  payout_cents bigint NOT NULL DEFAULT 0,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  claim_count int NOT NULL DEFAULT 0,
  avg_decision_hours numeric,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fact_insurance_admin_idx ON analytics.fact_insurance(admin_id);

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO service_role;

-- -------------------------------------------------------------------------
-- Governance tables (public)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metric_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  sql_template text NOT NULL,
  unit text,
  format text,
  allowed_roles text[] NOT NULL DEFAULT ARRAY['super_admin']::text[],
  default_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  chart_hint text NOT NULL DEFAULT 'kpi',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metric_registry TO authenticated;
GRANT ALL ON public.metric_registry TO service_role;
ALTER TABLE public.metric_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics readable by allowed roles"
  ON public.metric_registry FOR SELECT TO authenticated
  USING (
    active AND (
      public.get_my_role(auth.uid())::text = ANY(allowed_roles)
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "super admins manage metric registry"
  ON public.metric_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER metric_registry_touch
  BEFORE UPDATE ON public.metric_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_key text NOT NULL,
  owner_id uuid,
  role_scope text NOT NULL DEFAULT 'super_admin',
  position int NOT NULL DEFAULT 0,
  metric_key text NOT NULL REFERENCES public.metric_registry(key) ON DELETE CASCADE,
  chart_type text NOT NULL DEFAULT 'kpi',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  size text NOT NULL DEFAULT 'md',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_widgets_lookup_idx
  ON public.dashboard_widgets(dashboard_key, owner_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_widgets TO authenticated;
GRANT ALL ON public.dashboard_widgets TO service_role;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "widgets: read own or defaults for my role"
  ON public.dashboard_widgets FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      owner_id IS NULL
      AND (role_scope = public.get_my_role(auth.uid())::text
           OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "widgets: manage own personal layouts"
  ON public.dashboard_widgets FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "widgets: super admins manage defaults"
  ON public.dashboard_widgets FOR ALL TO authenticated
  USING (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id IS NULL AND public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER dashboard_widgets_touch
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.analytics_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_upserted bigint,
  error text
);
GRANT SELECT ON public.analytics_refresh_log TO authenticated;
GRANT ALL ON public.analytics_refresh_log TO service_role;
ALTER TABLE public.analytics_refresh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refresh log: super admins only"
  ON public.analytics_refresh_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- -------------------------------------------------------------------------
-- run_metric: whitelisted SQL execution with role scope + timeout
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_metric(_key text, _filters jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
SET statement_timeout = '5s'
AS $$
DECLARE
  _row public.metric_registry%ROWTYPE;
  _role text;
  _tenant uuid;
  _sql text;
  _params jsonb;
  _result jsonb;
BEGIN
  SELECT * INTO _row FROM public.metric_registry WHERE key = _key AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'metric % not found', _key USING ERRCODE = 'no_data_found';
  END IF;

  _role := public.get_my_role(auth.uid())::text;
  IF NOT (_role = ANY(_row.allowed_roles) OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  _tenant := public.get_tenant_admin_id(auth.uid());

  _params := coalesce(_row.default_filters, '{}'::jsonb) || coalesce(_filters, '{}'::jsonb)
             || jsonb_build_object(
                  'caller_role', _role,
                  'caller_user_id', auth.uid(),
                  'caller_tenant_id', _tenant
                );

  _sql := 'SELECT to_jsonb(t) FROM (' || _row.sql_template || ') t';
  EXECUTE _sql INTO _result USING _params;
  RETURN coalesce(_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.run_metric(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.run_metric(text, jsonb) TO authenticated;

-- -------------------------------------------------------------------------
-- Refresh helpers (SECURITY DEFINER; invoked by cron route in slice 2)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.refresh_dim_calendar()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = analytics, public AS $$
  INSERT INTO analytics.dim_calendar(day, year, quarter, month, week, day_of_week, is_weekend)
  SELECT d::date,
         extract(year from d)::int,
         extract(quarter from d)::int,
         extract(month from d)::int,
         extract(week from d)::int,
         extract(isodow from d)::int,
         extract(isodow from d) IN (6,7)
  FROM generate_series((current_date - interval '2 years')::date,
                       (current_date + interval '1 year')::date,
                       interval '1 day') d
  ON CONFLICT (day) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION analytics.refresh_dimensions()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = analytics, public AS $$
  INSERT INTO analytics.dim_tenant(admin_id, name, plan, created_at)
    SELECT p.id, p.name, p.subscription_plan, p.created_at
    FROM public.profiles p
    WHERE p.admin_id IS NULL OR p.admin_id = p.id
  ON CONFLICT (admin_id) DO UPDATE SET
    name = EXCLUDED.name, plan = EXCLUDED.plan;

  INSERT INTO analytics.dim_plan(plan_id, currency, annual_price_cents, is_active)
    SELECT plan_id, currency, coalesce(annual_price_cents, 0), is_active FROM public.plan_prices
  ON CONFLICT (plan_id) DO UPDATE SET
    currency = EXCLUDED.currency,
    annual_price_cents = EXCLUDED.annual_price_cents,
    is_active = EXCLUDED.is_active;
$$;

CREATE OR REPLACE FUNCTION analytics.refresh_fact_orders()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = analytics, public AS $$
DECLARE _n bigint;
BEGIN
  INSERT INTO analytics.fact_orders AS f
    (order_id, buyer_id, seller_admin_id, listing_id, batch_id, status,
     gross_cents, refund_cents, net_cents, currency, quantity_kg,
     placed_at, paid_at, delivered_at, delay_hours, refreshed_at)
  SELECT
    o.id,
    o.buyer_id,
    o.admin_id,
    o.listing_id,
    o.batch_id,
    o.status::text,
    (coalesce(o.subtotal, 0) * 100)::bigint,
    (coalesce((SELECT sum(r.amount) FROM public.buyer_refunds r WHERE r.order_id = o.id), 0) * 100)::bigint,
    ((coalesce(o.subtotal, 0)
      - coalesce((SELECT sum(r.amount) FROM public.buyer_refunds r WHERE r.order_id = o.id), 0)) * 100)::bigint,
    coalesce(o.currency, 'USD'),
    o.quantity_kg,
    o.created_at,
    o.paid_at,
    o.delivered_at,
    CASE WHEN o.delivered_at IS NOT NULL AND o.paid_at IS NOT NULL
         THEN extract(epoch from (o.delivered_at - o.paid_at))/3600.0 END,
    now()
  FROM public.buyer_orders o
  ON CONFLICT (order_id) DO UPDATE SET
    status = EXCLUDED.status,
    gross_cents = EXCLUDED.gross_cents,
    refund_cents = EXCLUDED.refund_cents,
    net_cents = EXCLUDED.net_cents,
    delivered_at = EXCLUDED.delivered_at,
    paid_at = EXCLUDED.paid_at,
    delay_hours = EXCLUDED.delay_hours,
    refreshed_at = now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_fact_shipments()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = analytics, public AS $$
DECLARE _n bigint;
BEGIN
  INSERT INTO analytics.fact_shipments AS f
    (shipment_id, order_id, seller_admin_id, courier_key, status,
     actual_hours, expected_hours, on_time, dispatched_at, delivered_at, refreshed_at)
  SELECT
    s.id,
    s.order_id,
    s.admin_id,
    s.courier_key,
    s.status::text,
    CASE WHEN s.delivered_at IS NOT NULL AND s.dispatched_at IS NOT NULL
         THEN extract(epoch from (s.delivered_at - s.dispatched_at))/3600.0 END,
    CASE WHEN s.expected_delivery_at IS NOT NULL AND s.dispatched_at IS NOT NULL
         THEN extract(epoch from (s.expected_delivery_at - s.dispatched_at))/3600.0 END,
    CASE WHEN s.delivered_at IS NOT NULL AND s.expected_delivery_at IS NOT NULL
         THEN s.delivered_at <= s.expected_delivery_at END,
    s.dispatched_at,
    s.delivered_at,
    now()
  FROM public.buyer_shipments s
  ON CONFLICT (shipment_id) DO UPDATE SET
    status = EXCLUDED.status,
    actual_hours = EXCLUDED.actual_hours,
    expected_hours = EXCLUDED.expected_hours,
    on_time = EXCLUDED.on_time,
    delivered_at = EXCLUDED.delivered_at,
    refreshed_at = now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_fact_finance_daily()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = analytics, public AS $$
DECLARE _n bigint;
BEGIN
  DELETE FROM analytics.fact_finance_daily WHERE day >= (current_date - interval '90 days')::date;
  INSERT INTO analytics.fact_finance_daily(day, admin_id, currency, gross_cents, refunds_cents, payouts_cents, net_cents)
  SELECT
    date_trunc('day', e.occurred_at)::date,
    e.seller_id,
    coalesce(e.currency, 'USD'),
    (sum(CASE WHEN e.direction = 'credit' AND e.entry_type IN ('sale','revenue') THEN e.amount ELSE 0 END) * 100)::bigint,
    (sum(CASE WHEN e.direction = 'debit'  AND e.entry_type = 'refund'  THEN e.amount ELSE 0 END) * 100)::bigint,
    (sum(CASE WHEN e.direction = 'debit'  AND e.entry_type = 'payout'  THEN e.amount ELSE 0 END) * 100)::bigint,
    (sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE -e.amount END) * 100)::bigint
  FROM public.finance_ledger_entries e
  WHERE e.occurred_at >= (current_date - interval '90 days')
  GROUP BY 1, 2, 3;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_fact_insurance()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = analytics, public AS $$
DECLARE _n bigint;
BEGIN
  INSERT INTO analytics.fact_insurance AS f
    (policy_id, admin_id, product_id, provider_name, premium_cents, payout_cents,
     status, start_date, end_date, claim_count, avg_decision_hours, refreshed_at)
  SELECT
    p.id,
    p.admin_id,
    p.product_id,
    p.provider_name,
    (coalesce(p.premium_amount, 0) * 100)::bigint,
    (coalesce((SELECT sum(c.amount_approved) FROM public.insurance_claims c WHERE c.policy_id = p.id), 0) * 100)::bigint,
    p.status,
    p.start_date::timestamptz,
    p.end_date::timestamptz,
    (SELECT count(*) FROM public.insurance_claims c WHERE c.policy_id = p.id),
    (SELECT avg(extract(epoch from (c.decided_at - c.filed_date::timestamptz))/3600.0)
       FROM public.insurance_claims c
       WHERE c.policy_id = p.id AND c.decided_at IS NOT NULL AND c.filed_date IS NOT NULL),
    now()
  FROM public.insurance_policies p
  ON CONFLICT (policy_id) DO UPDATE SET
    premium_cents = EXCLUDED.premium_cents,
    payout_cents = EXCLUDED.payout_cents,
    status = EXCLUDED.status,
    end_date = EXCLUDED.end_date,
    claim_count = EXCLUDED.claim_count,
    avg_decision_hours = EXCLUDED.avg_decision_hours,
    refreshed_at = now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_fact_telemetry_daily()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = analytics, public AS $$
DECLARE _n bigint;
BEGIN
  DELETE FROM analytics.fact_telemetry_daily WHERE day >= (current_date - interval '14 days')::date;
  INSERT INTO analytics.fact_telemetry_daily(silo_id, admin_id, day, avg_temp, max_temp, avg_humidity, max_humidity, reading_count, alert_count, spoilage_risk_score)
  SELECT
    r.silo_id,
    s.admin_id,
    date_trunc('day', r.ingested_at)::date,
    avg(r.ambient_temperature),
    max(r.ambient_temperature),
    avg(r.humidity_value),
    max(r.humidity_value),
    count(*),
    (SELECT count(*) FROM public.grain_alerts a
      WHERE a.silo_id = r.silo_id
        AND a.created_at >= date_trunc('day', r.ingested_at)
        AND a.created_at <  date_trunc('day', r.ingested_at) + interval '1 day'),
    LEAST(100, GREATEST(0, (coalesce(avg(r.ambient_temperature),0) - 20) * 3
                        + (coalesce(avg(r.humidity_value),0) - 50) * 1.5))
  FROM public.sensor_readings r
  LEFT JOIN public.silos s ON s.id = r.silo_id
  WHERE r.ingested_at >= (current_date - interval '14 days')
    AND r.silo_id IS NOT NULL
  GROUP BY r.silo_id, s.admin_id, date_trunc('day', r.ingested_at);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

-- Seed calendar immediately
SELECT analytics.refresh_dim_calendar();