import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOpenAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles").select("id, admin_id").eq("id", context.userId).maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    // Get open alerts with silo details
    const { data: openAlerts } = await context.supabase
      .from("grain_alerts")
      .select(`
        id,
        alert_id,
        title,
        description,
        priority,
        status,
        alert_type,
        triggered_at,
        acknowledged_at,
        resolved_at,
        silo_id,
        batch_id,
        assigned_to,
        silos (
          name,
          silo_id
        ),
        assigned_user:profiles!grain_alerts_assigned_to_fkey (
          name,
          email
        )
      `)
      .eq("admin_id", adminId)
      .in("status", ["pending", "acknowledged", "escalated"] as never)
      .order("triggered_at", { ascending: false, nullsFirst: false });

    return {
      alerts: openAlerts || []
    };
  });

export type OpenAlertsData = Awaited<ReturnType<typeof getOpenAlerts>>;