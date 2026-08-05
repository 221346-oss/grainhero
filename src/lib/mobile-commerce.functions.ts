import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stripeForm, stripeFetch } from "./stripe-api.server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 27 — Mobile-initiated Stripe PaymentIntent flow. Config-driven:
 * min/max, currency, allowed payment methods and platform fee all come from
 * `mobile_commerce_settings`. No hardcoded pricing.
 */

async function getCommerceRow(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("mobile_commerce_settings").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("commerce_disabled");
  return data as {
    checkout_enabled: boolean;
    allowed_payment_methods: string[];
    min_order_cents: number;
    max_order_cents: number;
    platform_fee_bps: number;
    currency_default: string;
    stripe_publishable_key_override: string | null;
  };
}

export const createMobilePaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({
    order_id: z.string().uuid(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const cfg = await getCommerceRow(context.supabase);
    if (!cfg.checkout_enabled) throw new Error("checkout_disabled");

    const { data: orderRaw, error: orderErr } = await context.supabase
      .from("buyer_orders")
      .select("id, admin_id, buyer_id, subtotal, currency, status, stripe_payment_intent")
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!orderRaw) throw new Error("order_not_found");
    const order = orderRaw as unknown as { id: string; admin_id: string; buyer_id: string; subtotal: number; currency: string | null; status: string; stripe_payment_intent: string | null };
    if (order.buyer_id !== context.userId) throw new Error("Forbidden");

    const totalCents = Math.round(Number(order.subtotal ?? 0) * 100);
    if (totalCents < cfg.min_order_cents) throw new Error(`amount_below_min:${cfg.min_order_cents}`);
    if (totalCents > cfg.max_order_cents) throw new Error(`amount_above_max:${cfg.max_order_cents}`);

    const currency = (order.currency ?? cfg.currency_default).toLowerCase();
    const feeCents = Math.floor((totalCents * cfg.platform_fee_bps) / 10000);

    const params: Record<string, string | number> = {
      amount: totalCents,
      currency,
      "automatic_payment_methods[enabled]": "true",
      "metadata[order_id]": order.id,
      "metadata[channel]": "mobile",
      "metadata[buyer_id]": context.userId,
    };
    const pi = await stripeFetch("/payment_intents", stripeForm(params)) as unknown as { id: string; client_secret: string; status: string };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("buyer_payment_intents").insert({
      order_id: order.id,
      stripe_pi_id: pi.id,
      amount_cents: totalCents,
      currency,
      status: pi.status,
      platform_fee_cents: feeCents,
      channel: "mobile",
      raw: pi as never,
      created_by: context.userId,
    } as never);
    await supabaseAdmin.from("buyer_orders").update({
      stripe_payment_intent: pi.id,
      payment_channel: "mobile",
    } as never).eq("id", order.id);

    return {
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
      publishable_key: cfg.stripe_publishable_key_override ?? process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      amount_cents: totalCents,
      currency,
      allowed_payment_methods: cfg.allowed_payment_methods,
    };
  });

export const confirmMobileOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({
    order_id: z.string().uuid(),
    payment_intent_id: z.string().min(1),
  }).parse(v))
  .handler(async ({ data, context }) => {
    // Idempotent client-side sync. Webhook remains the source of truth.
    const pi = await stripeFetch(`/payment_intents/${data.payment_intent_id}`, null, "GET") as unknown as { status: string; id: string };
    if (pi.status !== "succeeded") return { ok: false, status: pi.status };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orderRaw } = await supabaseAdmin.from("buyer_orders")
      .select("id, buyer_id, status, admin_id").eq("id", data.order_id).maybeSingle();
    const order = orderRaw as unknown as { id: string; buyer_id: string; status: string; admin_id: string } | null;
    if (!order || order.buyer_id !== context.userId) throw new Error("Forbidden");

    if (order.status !== "paid") {
      await supabaseAdmin.from("buyer_orders").update({ status: "paid", paid_at: new Date().toISOString() } as never).eq("id", data.order_id);
      await supabaseAdmin.from("buyer_order_events").insert({
        order_id: data.order_id,
        admin_id: order.admin_id,
        from_state: order.status ?? null,
        to_state: "paid",
        note: "Mobile checkout confirmed",
      } as never);
    }
    await supabaseAdmin.from("buyer_payment_intents")
      .update({ status: "succeeded", raw: pi as never, updated_at: new Date().toISOString() } as never)
      .eq("stripe_pi_id", data.payment_intent_id);
    return { ok: true };
  });