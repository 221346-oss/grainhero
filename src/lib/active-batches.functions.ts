import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getActiveBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    // Get all stored batches from grain batches section that are currently in observation
    // This includes all batches that have been stored and are being monitored
    const { data: activeBatches } = await context.supabase
      .from("grain_batches")
      .select(
        `
        id,
        batch_id,
        grain_type,
        variety,
        quantity_kg,
        status,
        created_at,
        intake_date,
        intake_kg,
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
      `,
      )
      .eq("admin_id", adminId)
      // Include stored batches and all batches under observation
      .in("status", [
        "stored",
        "intake",
        "processing",
        "treatment",
        "pending_qc",
        "qc_submitted",
        "qc_passed",
        "ready",
      ] as never)
      .order("created_at", { ascending: false });

    return {
      batches: activeBatches || [],
    };
  });

export type ActiveBatchesData = Awaited<ReturnType<typeof getActiveBatches>>;
