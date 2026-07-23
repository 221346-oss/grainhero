import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "super_admin" | "admin" | "manager" | "technician" | "buyer" | "pending";
// NOTE: "pending" remains in the enum for historic rows only. New users default to "admin".

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;

    const roles = (data ?? []).map((r) => r.role as AppRole);
    // Priority: any real role wins over legacy "pending"; fall back to "admin"
    // so new / unassigned users land on the Admin dashboard by default.
    const order: AppRole[] = ["super_admin", "admin", "manager", "technician", "buyer", "pending"];
    const primary = order.find((r) => roles.includes(r)) ?? "admin";

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, name, email, business_type, admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    return { role: primary, roles, userId: context.userId, profile };
  });