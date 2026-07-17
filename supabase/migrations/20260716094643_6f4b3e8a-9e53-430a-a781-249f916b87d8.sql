CREATE OR REPLACE FUNCTION public.get_my_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY array_position(
    ARRAY['super_admin','admin','manager','technician','pending']::public.app_role[],
    role
  )
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role(uuid) TO authenticated, service_role;