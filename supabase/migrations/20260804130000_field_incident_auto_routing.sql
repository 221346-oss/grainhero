-- Auto-routed Field Incidents (Technician->Manager, Manager->Admin, Admin->SuperAdmin).
-- No new table: reuses grain_alerts (source='field_incident', recipient_id) exactly like
-- the existing manually-picked field incident feature. Routing metadata (creator's role,
-- escalation eligibility, reassignment trail) is stored in the existing custom_fields jsonb
-- column, so no grain_alerts schema change is needed either.

-- Bug found while wiring the technician->manager picker: user_roles only had a SELECT
-- policy for "your own row or super_admin" (20260707180839...:129-130). Any non-super-admin
-- caller reading a teammate's role (e.g. listTeamMembers' user_roles.in(...) query, and this
-- feature's "is the chosen recipient actually a manager?" check) silently got zero rows back
-- for anyone but themselves. Fix: same tenant-scoping pattern already used for profiles
-- ("View tenant profiles", same migration:137-139).
CREATE POLICY "View tenant roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.get_tenant_admin_id(auth.uid()) = public.get_tenant_admin_id(user_id));
