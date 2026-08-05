ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS max_silos integer,
  ADD COLUMN IF NOT EXISTS max_warehouses integer,
  ADD COLUMN IF NOT EXISTS max_sensors integer,
  ADD COLUMN IF NOT EXISTS max_actuators integer,
  ADD COLUMN IF NOT EXISTS price numeric;

UPDATE public.subscriptions SET price = COALESCE(price, price_per_month);

ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'pending_approval';