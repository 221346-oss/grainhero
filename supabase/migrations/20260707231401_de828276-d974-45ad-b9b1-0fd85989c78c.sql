
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON public.profiles(stripe_customer_id);
