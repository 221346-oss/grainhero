
-- Phase 21: Warehouse refresh + starter metric registry

-- 1. Primary keys on fact tables (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fact_orders_pkey') THEN
    ALTER TABLE analytics.fact_orders ADD PRIMARY KEY (order_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fact_shipments_pkey') THEN
    ALTER TABLE analytics.fact_shipments ADD PRIMARY KEY (shipment_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fact_finance_daily_pkey') THEN
    ALTER TABLE analytics.fact_finance_daily ADD PRIMARY KEY (day, admin_id, currency);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fact_insurance_pkey') THEN
    ALTER TABLE analytics.fact_insurance ADD PRIMARY KEY (policy_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fact_telemetry_daily_pkey') THEN
    ALTER TABLE analytics.fact_telemetry_daily ADD PRIMARY KEY (silo_id, day);
  END IF;
END $$;

-- 2. Refresh functions
CREATE OR REPLACE FUNCTION analytics.refresh_orders() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE _n bigint; _start timestamptz := now(); _err text;
BEGIN
  BEGIN
    INSERT INTO analytics.fact_orders (order_id, buyer_id, seller_admin_id, listing_id, batch_id, status,
      gross_cents, refund_cents, net_cents, currency, quantity_kg, placed_at, paid_at, delivered_at, delay_hours, refreshed_at)
    SELECT o.id, o.buyer_id, o.admin_id, o.listing_id, o.batch_id, o.status,
      COALESCE((o.subtotal*100)::bigint,0),
      COALESCE((SELECT sum(r.amount*100)::bigint FROM buyer_refunds r WHERE r.order_id=o.id AND r.status='completed'),0),
      COALESCE((o.subtotal*100)::bigint,0) - COALESCE((SELECT sum(r.amount*100)::bigint FROM buyer_refunds r WHERE r.order_id=o.id AND r.status='completed'),0),
      COALESCE(o.currency,'USD'), COALESCE(o.quantity_kg,0), o.created_at, o.paid_at, o.delivered_at,
      CASE WHEN o.delivered_at IS NOT NULL AND o.expected_delivery_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (o.delivered_at - o.expected_delivery_date::timestamptz))/3600.0 END,
      now()
    FROM buyer_orders o
    ON CONFLICT (order_id) DO UPDATE SET
      status=EXCLUDED.status, gross_cents=EXCLUDED.gross_cents, refund_cents=EXCLUDED.refund_cents,
      net_cents=EXCLUDED.net_cents, paid_at=EXCLUDED.paid_at, delivered_at=EXCLUDED.delivered_at,
      delay_hours=EXCLUDED.delay_hours, refreshed_at=now();
    GET DIAGNOSTICS _n = ROW_COUNT;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted) VALUES ('fact_orders',_start,now(),_n);
    RETURN _n;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted,error) VALUES ('fact_orders',_start,now(),0,_err);
    RAISE;
  END;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_shipments() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE _n bigint; _start timestamptz := now(); _err text;
BEGIN
  BEGIN
    INSERT INTO analytics.fact_shipments (shipment_id, order_id, seller_admin_id, courier_key, status,
      actual_hours, expected_hours, on_time, dispatched_at, delivered_at, refreshed_at)
    SELECT s.id, s.order_id, s.admin_id, s.courier_key, s.status,
      CASE WHEN s.delivered_at IS NOT NULL AND s.dispatched_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (s.delivered_at - s.dispatched_at))/3600.0 END,
      CASE WHEN s.expected_delivery_at IS NOT NULL AND s.dispatched_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (s.expected_delivery_at - s.dispatched_at))/3600.0 END,
      CASE WHEN s.delivered_at IS NOT NULL AND s.expected_delivery_at IS NOT NULL
        THEN s.delivered_at <= s.expected_delivery_at END,
      s.dispatched_at, s.delivered_at, now()
    FROM buyer_shipments s
    ON CONFLICT (shipment_id) DO UPDATE SET
      status=EXCLUDED.status, actual_hours=EXCLUDED.actual_hours, expected_hours=EXCLUDED.expected_hours,
      on_time=EXCLUDED.on_time, delivered_at=EXCLUDED.delivered_at, refreshed_at=now();
    GET DIAGNOSTICS _n = ROW_COUNT;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted) VALUES ('fact_shipments',_start,now(),_n);
    RETURN _n;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted,error) VALUES ('fact_shipments',_start,now(),0,_err);
    RAISE;
  END;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_finance() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE _n bigint; _start timestamptz := now(); _err text;
BEGIN
  BEGIN
    DELETE FROM analytics.fact_finance_daily WHERE day >= (CURRENT_DATE - INTERVAL '90 days');
    INSERT INTO analytics.fact_finance_daily (day, admin_id, currency, gross_cents, refunds_cents, payouts_cents, net_cents, refreshed_at)
    SELECT DATE(o.paid_at) AS day, o.admin_id, COALESCE(o.currency,'USD'),
      SUM((o.subtotal*100)::bigint),
      COALESCE(SUM((SELECT sum(r.amount*100)::bigint FROM buyer_refunds r WHERE r.order_id=o.id AND r.status='completed')),0),
      0::bigint,
      SUM((o.subtotal*100)::bigint) - COALESCE(SUM((SELECT sum(r.amount*100)::bigint FROM buyer_refunds r WHERE r.order_id=o.id AND r.status='completed')),0),
      now()
    FROM buyer_orders o
    WHERE o.paid_at IS NOT NULL AND o.paid_at >= (CURRENT_DATE - INTERVAL '90 days')
    GROUP BY DATE(o.paid_at), o.admin_id, o.currency;
    GET DIAGNOSTICS _n = ROW_COUNT;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted) VALUES ('fact_finance_daily',_start,now(),_n);
    RETURN _n;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted,error) VALUES ('fact_finance_daily',_start,now(),0,_err);
    RAISE;
  END;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_insurance() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE _n bigint; _start timestamptz := now(); _err text;
BEGIN
  BEGIN
    INSERT INTO analytics.fact_insurance (policy_id, admin_id, product_id, provider_name, premium_cents,
      payout_cents, status, start_date, end_date, claim_count, avg_decision_hours, refreshed_at)
    SELECT p.id, p.admin_id, NULL::uuid, p.provider_name,
      COALESCE((p.premium_amount*100)::bigint,0),
      COALESCE((SELECT sum(c.amount_approved*100)::bigint FROM insurance_claims c WHERE c.policy_id=p.id AND c.status IN ('approved','paid')),0),
      p.status,
      p.start_date, p.end_date,
      COALESCE((SELECT count(*) FROM insurance_claims c WHERE c.policy_id=p.id)::int,0),
      (SELECT AVG(EXTRACT(EPOCH FROM (c.decided_at - c.filed_date))/3600.0)
         FROM insurance_claims c WHERE c.policy_id=p.id AND c.decided_at IS NOT NULL AND c.filed_date IS NOT NULL),
      now()
    FROM insurance_policies p
    ON CONFLICT (policy_id) DO UPDATE SET
      status=EXCLUDED.status, premium_cents=EXCLUDED.premium_cents, payout_cents=EXCLUDED.payout_cents,
      claim_count=EXCLUDED.claim_count, avg_decision_hours=EXCLUDED.avg_decision_hours, refreshed_at=now();
    GET DIAGNOSTICS _n = ROW_COUNT;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted) VALUES ('fact_insurance',_start,now(),_n);
    RETURN _n;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted,error) VALUES ('fact_insurance',_start,now(),0,_err);
    RAISE;
  END;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_telemetry() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE _n bigint; _start timestamptz := now(); _err text;
BEGIN
  BEGIN
    INSERT INTO analytics.fact_telemetry_daily (silo_id, admin_id, day, avg_temp, max_temp, avg_humidity, refreshed_at)
    SELECT sr.silo_id, sr.admin_id, DATE(sr.reading_timestamp),
      AVG(sr.temperature), MAX(sr.temperature), AVG(sr.humidity), now()
    FROM sensor_readings sr
    WHERE sr.silo_id IS NOT NULL AND sr.reading_timestamp >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY sr.silo_id, sr.admin_id, DATE(sr.reading_timestamp)
    ON CONFLICT (silo_id, day) DO UPDATE SET
      avg_temp=EXCLUDED.avg_temp, max_temp=EXCLUDED.max_temp, avg_humidity=EXCLUDED.avg_humidity, refreshed_at=now();
    GET DIAGNOSTICS _n = ROW_COUNT;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted) VALUES ('fact_telemetry_daily',_start,now(),_n);
    RETURN _n;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.analytics_refresh_log(fact_name,started_at,finished_at,rows_upserted,error) VALUES ('fact_telemetry_daily',_start,now(),0,_err);
    RAISE;
  END;
END $$;

CREATE OR REPLACE FUNCTION analytics.refresh_all() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,analytics AS $$
DECLARE r jsonb := '{}'::jsonb;
BEGIN
  BEGIN r := r || jsonb_build_object('orders', analytics.refresh_orders()); EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('orders_error', SQLERRM); END;
  BEGIN r := r || jsonb_build_object('shipments', analytics.refresh_shipments()); EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('shipments_error', SQLERRM); END;
  BEGIN r := r || jsonb_build_object('finance', analytics.refresh_finance()); EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('finance_error', SQLERRM); END;
  BEGIN r := r || jsonb_build_object('insurance', analytics.refresh_insurance()); EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('insurance_error', SQLERRM); END;
  BEGIN r := r || jsonb_build_object('telemetry', analytics.refresh_telemetry()); EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('telemetry_error', SQLERRM); END;
  RETURN r;
END $$;

GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_orders(), analytics.refresh_shipments(), analytics.refresh_finance(), analytics.refresh_insurance(), analytics.refresh_telemetry(), analytics.refresh_all() TO service_role;

-- 3. Starter metric registry
INSERT INTO public.metric_registry (key,label,description,sql_template,unit,format,allowed_roles,default_filters,chart_hint,active) VALUES
('platform_mrr','Monthly Recurring Revenue','Sum of active subscription monthly prices',
  'SELECT COALESCE(SUM(monthly_price),0)::numeric AS value FROM public.subscriptions WHERE status=''active''',
  'USD','currency',ARRAY['super_admin']::app_role[],'{}'::jsonb,'tile',true),
('platform_active_tenants','Active Tenants','Count of admin accounts with active subscription',
  'SELECT COUNT(DISTINCT admin_id)::numeric AS value FROM public.subscriptions WHERE status=''active''',
  NULL,'number',ARRAY['super_admin']::app_role[],'{}'::jsonb,'tile',true),
('orders_overdue_shipments','Overdue Shipments','Shipments delivered late or currently past expected delivery',
  'SELECT COUNT(*)::numeric AS value FROM analytics.fact_shipments WHERE on_time = false OR (delivered_at IS NULL AND expected_hours IS NOT NULL AND actual_hours IS NULL)',
  NULL,'number',ARRAY['super_admin','admin']::app_role[],'{}'::jsonb,'tile',true),
('insurance_loss_ratio_12m','Insurance Loss Ratio (12m)','Payouts divided by premiums, last 12 months',
  'SELECT to_char(date_trunc(''month'',start_date),''YYYY-MM'') AS month, ROUND(SUM(payout_cents)::numeric / NULLIF(SUM(premium_cents),0)::numeric, 3) AS ratio FROM analytics.fact_insurance WHERE start_date >= now() - interval ''12 months'' GROUP BY 1 ORDER BY 1',
  '%','ratio',ARRAY['super_admin']::app_role[],'{}'::jsonb,'line',true),
('silo_fill_pct','Silo Fill %','Latest fill percentage per silo for tenant',
  'SELECT name AS label, COALESCE(fill_percentage,0)::numeric AS value FROM public.silos WHERE admin_id = ($1->>''caller_tenant_id'')::uuid ORDER BY name',
  '%','percent',ARRAY['admin','manager']::app_role[],'{}'::jsonb,'bar',true),
('technician_sla_7d','Installation SLA (7d)','Percent of installations completed within scheduled window in the last 7 days',
  'SELECT ROUND(100.0 * SUM(CASE WHEN status=''completed'' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*),0), 1) AS value FROM public.hardware_order_installations WHERE created_at >= now() - interval ''7 days''',
  '%','percent',ARRAY['super_admin','admin']::app_role[],'{}'::jsonb,'tile',true),
('buyer_orders_in_flight','Orders in Flight','Buyer orders currently placed, paid, or dispatched',
  'SELECT COUNT(*)::numeric AS value FROM public.buyer_orders WHERE buyer_id = ($1->>''caller_user_id'')::uuid AND status IN (''placed'',''paid'',''dispatched'')',
  NULL,'number',ARRAY['buyer']::app_role[],'{}'::jsonb,'tile',true)
ON CONFLICT (key) DO NOTHING;

-- 4. Default widget per role
INSERT INTO public.dashboard_widgets (dashboard_key, role_scope, position, metric_key, chart_type, filters, size) VALUES
('role_default','super_admin',0,'platform_mrr','tile','{}'::jsonb,'sm'),
('role_default','super_admin',1,'platform_active_tenants','tile','{}'::jsonb,'sm'),
('role_default','super_admin',2,'orders_overdue_shipments','tile','{}'::jsonb,'sm'),
('role_default','super_admin',3,'insurance_loss_ratio_12m','line','{}'::jsonb,'lg'),
('role_default','admin',0,'orders_overdue_shipments','tile','{}'::jsonb,'sm'),
('role_default','admin',1,'silo_fill_pct','bar','{}'::jsonb,'lg'),
('role_default','manager',0,'silo_fill_pct','bar','{}'::jsonb,'lg'),
('role_default','buyer',0,'buyer_orders_in_flight','tile','{}'::jsonb,'sm')
ON CONFLICT DO NOTHING;
