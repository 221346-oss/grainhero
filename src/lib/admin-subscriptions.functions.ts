import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import pricingData from "@/lib/pricing-data";

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) body.append(k, String(v));
  return body;
}

async function stripeFetch(path: string, body: URLSearchParams | null, method: "GET" | "POST" | "DELETE" = "POST") {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ?? undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super_admin only");
}

async function loadSub(supabase: any, subscriptionId: string) {
  const { data, error } = await supabase.from("subscriptions").select("*").eq("id", subscriptionId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Subscription not found");
  return data;
}

export const adminChangeUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string(), planId: z.enum(["basic", "intermediate", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    const plan = pricingData.find((p: { id: string }) => p.id === data.planId);
    if (!plan) throw new Error("Unknown plan");

    if (sub.stripe_subscription_id) {
      const stripeSub = await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, null, "GET");
      const itemId = stripeSub.items?.data?.[0]?.id;
      if (itemId) {
        const currency = String(plan.currency ?? "usd").toLowerCase();
        await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, form({
          "items[0][id]": itemId,
          "items[0][price_data][currency]": currency,
          "items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
          "items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
          "items[0][price_data][recurring][interval]": plan.interval ?? "month",
          proration_behavior: "create_prorations",
          cancel_at_period_end: "false",
          "metadata[plan_id]": plan.id,
        }));
      }
    }
    // Mirror to DB so the UI reflects immediately even without a webhook round-trip.
    await context.supabase.from("subscriptions").update({
      plan_name: plan.name,
      price_per_month: Number(plan.price),
      currency: plan.currency ?? "PKR",
    }).eq("id", data.subscriptionId);
    return { ok: true };
  });

export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string(), immediate: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (sub.stripe_subscription_id) {
      if (data.immediate) {
        await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, null, "DELETE");
      } else {
        await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, form({ cancel_at_period_end: "true" }));
      }
    }
    await context.supabase.from("subscriptions").update({
      status: data.immediate ? "cancelled" : sub.status,
      cancel_at_period_end: !data.immediate,
      cancellation_date: data.immediate ? new Date().toISOString() : sub.cancellation_date,
    }).eq("id", data.subscriptionId);
    return { ok: true };
  });

export const adminResumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (sub.stripe_subscription_id) {
      await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, form({ cancel_at_period_end: "false" }));
    }
    await context.supabase.from("subscriptions").update({ cancel_at_period_end: false }).eq("id", data.subscriptionId);
    return { ok: true };
  });