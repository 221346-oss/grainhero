-- Phase 1: normalize plan_thresholds with buyer cap and standard feature toggles
ALTER TABLE public.plan_thresholds
  ADD COLUMN IF NOT EXISTS max_buyers integer NOT NULL DEFAULT 9999;

UPDATE public.plan_thresholds SET max_buyers = 20  WHERE plan_id = 'starter'   AND max_buyers = 9999;
UPDATE public.plan_thresholds SET max_buyers = 100 WHERE plan_id = 'growth'    AND max_buyers = 9999;
UPDATE public.plan_thresholds SET max_buyers = 500 WHERE plan_id = 'scale'     AND max_buyers = 9999;

-- Ensure standard boolean feature toggles exist in the features jsonb (non-destructive merge)
UPDATE public.plan_thresholds SET features = features
  || jsonb_build_object(
       'exports',   COALESCE((features->>'exports')::boolean,   plan_id <> 'starter'),
       'alerts_sms',COALESCE((features->>'alerts_sms')::boolean,plan_id IN ('scale','enterprise')),
       'api',       COALESCE((features->>'api')::boolean,       plan_id IN ('scale','enterprise')),
       'insurance', COALESCE((features->>'insurance')::boolean, plan_id <> 'starter'),
       'sso',       COALESCE((features->>'sso')::boolean,       plan_id = 'enterprise')
     );