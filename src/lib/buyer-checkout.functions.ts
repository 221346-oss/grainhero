/**
 * Phase 12 — Stripe Checkout session for buyer orders (mode=payment).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stripeFetch, stripeForm } from "@/lib/stripe-api.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const startBuyerCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    orderId: z.string().uuid(),
    origin: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: account } = await sb.from("buyer_accounts")
      .select("id").eq("user_id", context.userId).maybeSingle();
    if (!account) throw new Error("Buyer account required");

    const { data: order } = await sb.from("buyer_orders")
      .select("id, order_number, subtotal, currency, status, quantity_kg, grain_listings(title)")
      .eq("id", data.orderId).eq("buyer_account_id", (account as Row).id).maybeSingle();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (o.status !== "pending" && o.status !== "confirmed" && o.status !== "invoiced") {
      throw new Error("Order not payable");
    }

    const email = (context.claims as { email?: string })?.email ?? "";
    const currency = String(o.currency ?? "usd").toLowerCase();
    const productName = `${(o as Row).grain_listings?.title ?? "Grain order"} (${o.order_number})`;
    const unitAmount = Math.round(Number(o.subtotal) * 100);

    const body = stripeForm({
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][unit_amount]": unitAmount,
      "line_items[0][price_data][product_data][name]": productName,
      customer_email: email || undefined,
      success_url: `${data.origin}/buyer/orders/${o.id}?checkout=success`,
      cancel_url: `${data.origin}/buyer/orders/${o.id}?checkout=cancel`,
      "metadata[buyer_order_id]": o.id,
      "metadata[order_number]": o.order_number,
      "metadata[buyer_user_id]": context.userId,
    });
    const session = await stripeFetch("/checkout/sessions", body);

    await sb.from("buyer_orders").update({
      stripe_session_id: session.id,
      checkout_url: session.url,
    } as never).eq("id", o.id);

    return { url: session.url as string };
  });