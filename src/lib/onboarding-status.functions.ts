import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the signed-in user's onboarding progress so the post-payment welcome
 * screen can guide them through the remaining steps (email confirmation,
 * subscription activation, latest install order status).
 */
export const getMyOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const email = (claims?.email as string | undefined) ?? null;
    // Supabase encodes confirmation as either email_confirmed_at OR the
    // presence of "email" in the identities/aud claims. The safest read is the
    // profiles table's own copy plus the JWT's email_verified flag.
    const emailVerified = Boolean(
      (claims as { email_verified?: boolean } | null)?.email_verified,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, business_type")
      .eq("id", userId)
      .maybeSingle();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status, end_date")
      .eq("admin_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestOrderRaw } = await supabase
      .from("hardware_orders" as never)
      .select("id, status, plan_name, hardware_quantity, hardware_total, currency, created_at, technician_name, preferred_install_date")
      .eq("admin_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: pendingOrdersRaw } = await supabase
      .from("hardware_orders" as never)
      .select("id, plan_id, plan_name, hardware_quantity, created_at")
      .eq("admin_id", userId)
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false });

    const subRow = (sub as { status?: string | null } | null) ?? null;
    const subActive = subRow?.status === "active" || subRow?.status === "trialing";

    return {
      email,
      emailVerified,
      profile: profile ?? null,
      subscription: (sub as unknown as Record<string, string | number | null> | null) ?? null,
      subscriptionActive: subActive,
      latestOrder: (latestOrderRaw as Record<string, string | number | null> | null) ?? null,
      pendingOrders: (pendingOrdersRaw ?? []) as Record<string, string | number | null>[],
    };
  });