import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "super_admin" | "admin" | "manager" | "technician" | "pending";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;

    const roles = (data ?? []).map((r) => r.role as AppRole);
    // priority order
    const order: AppRole[] = ["super_admin", "admin", "manager", "technician", "pending"];
    const primary = order.find((r) => roles.includes(r)) ?? "pending";

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, name, email, business_type, admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    return { role: primary, roles, userId: context.userId, profile };
  });