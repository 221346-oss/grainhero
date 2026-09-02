import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDispatchReadyBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    // Get dispatch ready batches with buyer order details
    const { data: dispatchReadyBatches } = await context.supabase
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
        farmer_name,
        assigned_technician_id,
        silo_id,
        risk_score,
        moisture_content,
        protein_content,
        fat_content,
        purchase_price_per_kg,
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
      .in("status", ["ready", "stored", "qc_passed"] as never)
      .order("created_at", { ascending: false });

    return {
      batches: dispatchReadyBatches || [],
    };
  });

export type DispatchReadyBatchesData = Awaited<ReturnType<typeof getDispatchReadyBatches>>;
