import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOpenOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    // Get open buyer orders with buyer details
    const { data: openOrders } = await context.supabase
      .from("buyer_orders")
      .select(
        `
        id,
        order_number,
        status,
        total_amount,
        quantity_kg,
        grain_type,
        price_per_kg,
        delivery_deadline,
        created_at,
        updated_at,
        notes,
        buyer_id,
        buyers (
          id,
          name,
          email,
          company_name,
          phone
        )
      `,
      )
      .eq("admin_id", adminId)
      .in("status", ["pending", "confirmed", "in_progress"] as never)
      .order("created_at", { ascending: false });

    return {
      orders: openOrders || [],
    };
  });

export type OpenOrdersData = Awaited<ReturnType<typeof getOpenOrders>>;
