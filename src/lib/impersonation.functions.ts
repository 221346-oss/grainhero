import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { adminId: string }) => d)
  .handler(async ({ data, context }) => {
    console.log("Starting impersonation for userId:", context.userId, "adminId:", data.adminId);

    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin"
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    // Verify the target user exists and is an admin
    const { data: targetUser } = await context.supabase
      .from("profiles")
      .select("id, name, email, business_type")
      .eq("id", data.adminId)
      .single();

    if (!targetUser) throw new Error("Target user not found");

    // Check if target user has admin role
    const { data: hasAdminRole } = await context.supabase.rpc("has_role", {
      _user_id: data.adminId,
      _role: "admin"
    });

    if (!hasAdminRole) throw new Error("Target user is not an admin");

    // Return the verified admin info — state is stored client-side
    return {
      success: true,
      adminName: targetUser.name || targetUser.email,
      adminId: targetUser.id,
      adminEmail: targetUser.email,
      businessType: targetUser.business_type,
    };
  });

export const stopImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    console.log("Stopping impersonation for userId:", context.userId);

    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin"
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    // State is cleared client-side — nothing to do server-side
    return { success: true };
  });