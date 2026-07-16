import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Super-admin only: start viewing the app as the given tenant admin. */
export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ targetAdminId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    const { writeImpersonationCookie } = await import("./impersonation.server");
    const { supabase, userId } = context;
    if (!(await isSuperAdmin(supabase, userId))) throw new Error("Forbidden");
    const { data: target, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", data.targetAdminId)
      .maybeSingle();
    if (error) throw error;
    if (!target) throw new Error("Tenant not found");
    writeImpersonationCookie(target.id);
    return { adminId: target.id, tenantName: target.name ?? target.email ?? target.id };
  });

export const stopImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { writeImpersonationCookie } = await import("./impersonation.server");
    writeImpersonationCookie(null);
    return { ok: true };
  });

/** Returns current impersonation target, or null. */
export const getImpersonation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    const { readImpersonationCookie } = await import("./impersonation.server");
    const { supabase, userId } = context;
    if (!(await isSuperAdmin(supabase, userId))) return null;
    const adminId = readImpersonationCookie();
    if (!adminId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", adminId)
      .maybeSingle();
    if (!data) return null;
    return { adminId: data.id, tenantName: data.name ?? data.email ?? data.id };
  });