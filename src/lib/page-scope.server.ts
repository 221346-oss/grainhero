import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveRole } from "./rbac.server";
import type { AppRole } from "./roles.functions";

export type PageScope =
  | { scope: "platform"; adminId: null; role: AppRole }
  | { scope: "tenant"; adminId: string; role: AppRole };

/**
 * Decide which lens a shared page should render for the current user.
 * - super_admin → platform (aggregate across all tenants, read-only).
 * - super_admin impersonating → tenant (as the impersonated admin).
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

  // Platform pages (/platform/*) always show platform scope for super_admins
  // regardless of impersonation - impersonation only affects tenant pages
  if (role === "super_admin") {
    // Check for active impersonation session
    const { data: impersonationSession } = await supabase
      .from("activity_logs")
      .select("entity_ref")
      .eq("user_id", userId)
      .eq("category", "impersonation")
      .eq("action", "active_session")
      .single();

    if (impersonationSession) {
      // When impersonating, return tenant scope for the impersonated user
      return { scope: "tenant", adminId: impersonationSession.entity_ref, role: "admin" };
    }
    // Not impersonating, return platform scope
    return { scope: "platform", adminId: null, role };
  }

  // For non-super-admins, resolve their tenant scope
  const { data, error } = await supabase
    .from("profiles")
    .select("id, admin_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const adminId = (data?.admin_id ?? data?.id ?? userId) as string;
  return { scope: "tenant", adminId, role };
}
