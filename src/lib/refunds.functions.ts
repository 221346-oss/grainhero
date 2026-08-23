/**
 * Phase 14 — Refunds & cancellations.
 * - Sellers/super-admins can trigger a Stripe refund on a paid order.
 * - Buyers can request a cancellation on a pending/unpaid order.
 * - Reason codes come from platform_settings.marketplace.refunds.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function stripeRefund(paymentIntentId: string, amountCents?: number, reason?: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  const params = new URLSearchParams();
  params.set("payment_intent", paymentIntentId);
  if (amountCents && amountCents > 0) params.set("amount", String(amountCents));
  if (reason && ["duplicate", "fraudulent", "requested_by_customer"].includes(reason)) {
    params.set("reason", reason);
  }
  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stripe refund failed [${res.status}]: ${txt}`);
  }
  return (await res.json()) as { id: string; status: string };
}

export const initiateRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        amount: z.number().positive().optional(),
        reasonKey: z.string().min(1),
        disputeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.refunds.allowSellerInitiated) throw new Error("Refunds disabled");
    const reason = settings.refunds.reasonCodes.find((r) => r.key === data.reasonKey);
    if (!reason) throw new Error("Unknown refund reason");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, buyer_id, status, subtotal, currency, stripe_payment_intent")
      .eq("id", data.orderId)
      .single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (!o.stripe_payment_intent) throw new Error("No Stripe payment on this order");

    const amount = data.amount ?? Number(o.subtotal);
    const refund = await stripeRefund(
      o.stripe_payment_intent as string,
      Math.round(amount * 100),
      data.reasonKey,
    );

    const { data: rec, error } = await sb
      .from("buyer_refunds")
      .insert({
        order_id: o.id,
        admin_id: o.admin_id,
        dispute_id: data.disputeId ?? null,
        amount,
        currency: o.currency,
        reason_key: data.reasonKey,
        stripe_refund_id: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    await sb
      .from("buyer_orders")
      .update({
        refund_status: refund.status,
        status: amount >= Number(o.subtotal) ? "refunded" : o.status,
      } as never)
      .eq("id", o.id);
    await sb.from("buyer_order_events").insert({
      order_id: o.id,
      admin_id: o.admin_id,
      from_state: o.status,
      to_state: amount >= Number(o.subtotal) ? "refunded" : o.status,
      actor_user_id: context.userId,
      note: `Refund ${refund.status} (${o.currency} ${amount}) — ${reason.label}`,
    } as never);
    await logActivity({
      actorId: context.userId,
      tenantAdminId: o.admin_id as string,
      action: "order.refunded",
      targetType: "buyer_order",
      targetId: o.id,
      meta: { amount, reason: data.reasonKey, stripeRefundId: refund.id },
    });
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, o.id as string, "refundIssued");
    } catch {
      /* email best-effort */
    }
    return { ok: true, refundId: (rec as Row).id as string, status: refund.status };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, status, buyer_id")
      .eq("id", data.orderId)
      .single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (!["pending", "confirmed", "invoiced"].includes(o.status)) {
      throw new Error("Order can no longer be cancelled — request a refund instead");
    }
    await sb
      .from("buyer_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason ?? null,
      } as never)
      .eq("id", o.id);
    await sb.from("buyer_order_events").insert({
      order_id: o.id,
      admin_id: o.admin_id,
      from_state: o.status,
      to_state: "cancelled",
      actor_user_id: context.userId,
      note: data.reason ?? "Cancelled",
    } as never);
    await logActivity({
      actorId: context.userId,
      tenantAdminId: o.admin_id as string,
      action: "order.cancelled",
      targetType: "buyer_order",
      targetId: o.id,
      meta: { reason: data.reason },
    });
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, o.id as string, "orderCancelled");
    } catch {
      /* email best-effort */
    }
    return { ok: true };
  });

export const listRefunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any)
      .from("buyer_refunds")
      .select("*, buyer_orders(order_number, currency, subtotal)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return { refunds: (rows ?? []) as Row[] };
  });
