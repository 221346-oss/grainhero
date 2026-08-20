/**
 * One-time fix: recount active jobs for the current technician.
 * Called from the technician dashboard on load to correct stale job counts.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const recountMyActiveJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Count active installs assigned to this technician
    const { count: activeCount } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id", { count: "exact", head: true })
      .eq("technician_id", context.userId)
      .in("status", ["scheduled", "en_route", "onsite", "installing", "installed"]);

    // Also count orders assigned to this technician that are NOT completed/cancelled/refunded
    const { data: assignedOrders } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id")
      .eq("assigned_technician_id", context.userId)
      .not("status", "in", "(completed,cancelled,refunded)");

    // Find which of those orders already have an install row (already counted above)
    const assignedOrderIds = (assignedOrders ?? []).map((o: any) => o.id as string);
    let extraOrderCount = 0;
    if (assignedOrderIds.length > 0) {
      const { data: existingInstalls } = await supabaseAdmin
        .from("hardware_order_installations" as never)
        .select("order_id")
        .in("order_id", assignedOrderIds);
      const installOrderIds = new Set((existingInstalls ?? []).map((i: any) => i.order_id as string));
      extraOrderCount = assignedOrderIds.filter((id: string) => !installOrderIds.has(id)).length;
    }

    const totalActive = (activeCount ?? 0) + extraOrderCount;

    // Update the profile
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ current_job_count: totalActive, updated_at: new Date().toISOString() } as never)
      .eq("id", context.userId);

    if (error) throw new Error(`Failed to recount: ${error.message}`);

    return { current_job_count: totalActive };
  });
