/**
 * Phase 2 — Session verification helpers (server-only).
 *
 * Import ONLY from server-function handlers, other *.server.ts files, or
 * server route handlers. The `.server.ts` extension makes this module
 * unreachable from client bundles.
 *
 * `context.userId` on the requireSupabaseAuth middleware is the sub claim
 * from the bearer token. That is fine for RLS-scoped reads but must not be
 * trusted for privileged writes (role/plan/subscription changes) without
 * re-validating the JWT with the Auth server. `getVerifiedUser()` does
 * that round-trip and throws a 401 Response if the token has been revoked,
 * rotated, or tampered with since it was minted.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type VerifiedUser = {
  id: string;
  email: string | null;
};

export async function getVerifiedUser(supabase: SupabaseClient<Database>): Promise<VerifiedUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Verify identity AND that the caller holds one of the given roles.
 * Uses the RLS-scoped client (has_role runs SECURITY DEFINER) so it does
 * not require the admin client.
 */
export async function requireRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  roles: Array<Database["public"]["Enums"]["app_role"]>,
): Promise<void> {
  for (const role of roles) {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: role,
    });
    if (data) return;
  }
  throw new Response("Forbidden", { status: 403 });
}
