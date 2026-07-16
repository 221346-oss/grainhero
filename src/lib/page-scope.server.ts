import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveRole } from "./rbac.server";
import type { AppRole } from "./roles.functions";
import { readImpersonationCookie } from "./impersonation.functions";

export type PageScope =
  | { scope: "platform"; adminId: null; role: AppRole }
  | { scope: "tenant"; adminId: string; role: AppRole; impersonating?: boolean };

/**
 * Decide which lens a shared page should render for the current user.
 * - super_admin → platform (aggregate across all tenants, read-only).
 * - everyone else → tenant, filtered by their tenant's admin_id.
 *
 * Tenant admin_id resolution: profiles.admin_id when present, else the
 * user's own id (they ARE the tenant admin). Mirrors get_tenant_admin_id().
 */
export async function resolvePageScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<PageScope> {
  const role = await getEffectiveRole(supabase, userId);
  if (role === "super_admin") {
    // Impersonation: super_admin viewing the app as a tenant admin.
    const targetAdminId = readImpersonationCookie();
    if (targetAdminId) {
      return { scope: "tenant", adminId: targetAdminId, role, impersonating: true };
    }
    return { scope: "platform", adminId: null, role };
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, admin_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const adminId = (data?.admin_id ?? data?.id ?? userId) as string;
  return { scope: "tenant", adminId, role };
}