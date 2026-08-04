import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getQcPendingBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles").select("id, admin_id").eq("id", context.userId).maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    // Get QC pending batches with technician details
    const { data: qcPendingBatches } = await context.supabase
      .from("grain_batches")
      .select(`
        id,
        batch_id,
        grain_type,
        variety,
        quantity_kg,
        status,
        created_at,
        intake_date,
        farmer_name,
        assigned_technician_id,
        silo_id,
        risk_score,
        moisture_content,
        protein_content,
        fat_content,
        silos (
          name,
          silo_id
        ),
        assigned_technician:profiles!grain_batches_assigned_technician_id_fkey (
          name,
          email
        )
      `)
      .eq("admin_id", adminId)
      .in("status", ["pending_qc", "qc_submitted", "qc_failed"] as never)
      .order("created_at", { ascending: false });

    return {
      batches: qcPendingBatches || []
    };
  });

export type QcPendingBatchesData = Awaited<ReturnType<typeof getQcPendingBatches>>;