
-- 0. Clear stale admin_id on hardware_orders that no longer point to any profile
UPDATE public.hardware_orders ho
SET admin_id = NULL
WHERE ho.admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ho.admin_id);

-- 1. Backfill admin_id on hardware_orders by matching customer_email
UPDATE public.hardware_orders ho
SET admin_id = p.id
FROM public.profiles p
WHERE ho.admin_id IS NULL
  AND ho.customer_email IS NOT NULL
  AND lower(ho.customer_email) = lower(p.email);

-- 2. Trigger: auto-link admin_id on future inserts/updates
CREATE OR REPLACE FUNCTION public.hardware_orders_link_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_id IS NULL AND NEW.customer_email IS NOT NULL THEN
    SELECT id INTO NEW.admin_id
    FROM public.profiles
    WHERE lower(email) = lower(NEW.customer_email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hardware_orders_link_admin ON public.hardware_orders;
CREATE TRIGGER trg_hardware_orders_link_admin
BEFORE INSERT OR UPDATE OF customer_email, admin_id
ON public.hardware_orders
FOR EACH ROW EXECUTE FUNCTION public.hardware_orders_link_admin();

-- 3. Create subscription rows for admins whose order is paid but no subscription exists
INSERT INTO public.subscriptions (
  admin_id, plan_name, plan_description, status, billing_cycle,
  price_per_month, currency, start_date, end_date, next_payment_date,
  auto_renew, max_users, max_devices, max_storage_gb, max_batches
)
SELECT DISTINCT ON (ho.admin_id)
  ho.admin_id,
  (CASE lower(ho.plan_name)
     WHEN 'starter' THEN 'Grain Starter'
     WHEN 'basic' THEN 'Grain Starter'
     WHEN 'growth' THEN 'Grain Professional'
     WHEN 'intermediate' THEN 'Grain Professional'
     WHEN 'professional' THEN 'Grain Professional'
     WHEN 'scale' THEN 'Grain Enterprise'
     WHEN 'enterprise' THEN 'Grain Enterprise'
     WHEN 'pro' THEN 'Grain Enterprise'
     ELSE 'Custom'
   END)::public.plan_name,
  'Auto-created from install order',
  'active'::public.subscription_status,
  'monthly'::public.billing_cycle,
  COALESCE(pt.price_cents::numeric / 100.0, 99),
  COALESCE(pt.currency, ho.currency, 'USD'),
  ho.created_at,
  ho.created_at + interval '30 days',
  ho.created_at + interval '30 days',
  true,
  COALESCE(pt.max_users, 10),
  COALESCE(pt.max_actuators, 10),
  50,
  COALESCE(pt.max_batches, 100)
FROM public.hardware_orders ho
LEFT JOIN public.plan_thresholds pt ON lower(pt.name) = lower(ho.plan_name)
WHERE ho.admin_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ho.admin_id)
  AND ho.status IN ('new','approved','tech_assigned','installed','live')
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.admin_id = ho.admin_id)
ORDER BY ho.admin_id, ho.created_at DESC;

-- 4. Give those profiles plan access
UPDATE public.profiles p
SET has_access = 'full',
    subscription_plan = lower(replace(s.plan_name::text, 'Grain ', ''))
FROM public.subscriptions s
WHERE s.admin_id = p.id
  AND s.status = 'active'
  AND (p.has_access IS NULL OR p.has_access = 'none');
