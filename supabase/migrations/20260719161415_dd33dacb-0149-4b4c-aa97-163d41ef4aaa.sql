-- Super admins should not carry a tenant subscription_plan (they're not tenants).
UPDATE public.profiles p
SET subscription_plan = NULL, has_access = NULL
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'super_admin');

-- Also drop any auto-created subscription rows for super admins.
DELETE FROM public.subscriptions s
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = s.admin_id AND ur.role = 'super_admin');