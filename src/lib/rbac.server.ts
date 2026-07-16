import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "./roles.functions";

/**
 * Single source of truth for "what is this user's effective role?".
 * Backed by public.get_my_role() which returns the highest-priority role
 * in one round-trip. Replaces scattered has_role() loops.
 */
export async function getEffectiveRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole> {
  const { data, error } = await supabase.rpc("get_my_role", { _user_id: userId });
  if (error) throw error;
  return ((data as AppRole | null) ?? "admin");
}

/** Throws Forbidden if the user's effective role is not in `allowed`. */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  allowed: AppRole[],
): Promise<AppRole> {
  const role = await getEffectiveRole(supabase, userId);
  if (!allowed.includes(role)) throw new Error("Forbidden");
  return role;
}

/** True when the user is a platform super admin. */
export async function isSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const role = await getEffectiveRole(supabase, userId);
  return role === "super_admin";
}