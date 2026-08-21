/**
 * Development-only payment bypass
 * Allows testing the complete order flow without Stripe CLI or webhooks
 *
 * SECURITY: Only works in development mode, not in production
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const isDev = process.env.NODE_ENV === "development";

/**
 * DEV ONLY: Simulate a successful Stripe payment for testing
 * This mimics what the Stripe webhook would do after checkout.session.completed
 */
export const devSimulatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isDev) {
      throw new Error("This endpoint is only available in development mode");
    }

    // Import admin client to bypass RLS for dev testing
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch the order using admin client (bypasses RLS)
    const { data: order, error } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("*")
      .eq("id", data.orderId)
      .eq("admin_id", context.userId)
      .maybeSingle();

    if (error || !order) {
      throw new Error("Order not found or you don't have permission");
    }

    const orderStatus = String((order as any).status ?? "");

    // Only allow simulating payment for approved or pending_payment orders
    if (orderStatus !== "approved" && orderStatus !== "pending_payment") {
      throw new Error(`Cannot simulate payment for order with status: ${orderStatus}`);
    }

    // Update order status to simulate successful payment (using admin client to bypass RLS)
    // This mimics what the Stripe webhook does
    const { error: updateError } = await supabaseAdmin
      .from("hardware_orders" as never)
      .update({
        status: "paid",
        stripe_payment_intent: `pi_dev_simulated_${Date.now()}`,
      } as never)
      .eq("id", data.orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Notify the user
    try {
      const { emitNotification } = await import("@/lib/notify");

      await emitNotification(supabaseAdmin, {
        recipientId: context.userId,
        tenantAdminId: context.userId,
        category: "install",
        severity: "success",
        title: "Payment confirmed (DEV)",
        body: "Your silo order payment has been processed. A technician will be assigned soon.",
        link: "/orders",
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    } catch (e) {
      console.warn("[devSimulatePayment] notification failed:", (e as Error).message);
    }

    return {
      success: true,
      message: "Payment simulated successfully. Order status updated to 'paid'.",
      devNote: "This is a development-only bypass. In production, Stripe webhooks handle this.",
    };
  });
