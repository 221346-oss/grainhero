ALTER TABLE public.plan_thresholds ADD COLUMN IF NOT EXISTS max_warehouses integer NOT NULL DEFAULT 1;
UPDATE public.plan_thresholds SET max_warehouses = 1 WHERE plan_id = 'starter';
UPDATE public.plan_thresholds SET max_warehouses = 3 WHERE plan_id = 'growth';
UPDATE public.plan_thresholds SET max_warehouses = 10 WHERE plan_id = 'scale';
UPDATE public.plan_thresholds SET max_warehouses = 9999 WHERE plan_id = 'enterprise';