-- Fix: user_roles only exposed a user's own role row (or to super_admin),
-- with no tenant-wide visibility — unlike profiles, which already has
-- "View tenant profiles". This made every invited team member's role display
-- as "pending" in Team Management regardless of their real assigned role,
-- since listTeamMembers queries user_roles with the caller's own RLS session.
CREATE POLICY "View tenant roles" ON public.user_roles
  FOR SELECT TO authenticated USING (
    public.get_tenant_admin_id(auth.uid()) = public.get_tenant_admin_id(user_id)
  );
