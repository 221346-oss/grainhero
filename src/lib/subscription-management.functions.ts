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
  return JSON.parse(text);
}

async function getMyStripeSubscription(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("admin_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) throw new Error("No subscription found");
  if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
  return sub;
}

export const changeMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ planId: z.enum(["basic", "intermediate", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const plan = pricingData.find((p: { id: string }) => p.id === data.planId);
    if (!plan) throw new Error("Unknown plan");
    const sub = await getMyStripeSubscription(context.supabase, context.userId);

    // Fetch the subscription to get the current item ID
    const stripeSub = await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, null, "GET");
    const itemId = stripeSub.items?.data?.[0]?.id;
    if (!itemId) throw new Error("Stripe subscription item missing");

    const currency = String(plan.currency ?? "usd").toLowerCase();
    const params = form({
      "items[0][id]": itemId,
      "items[0][price_data][currency]": currency,
      "items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
      "items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
      "items[0][price_data][recurring][interval]": plan.interval ?? "month",
      proration_behavior: "create_prorations",
      cancel_at_period_end: "false",
      "metadata[plan_id]": plan.id,
    });
    await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, params);
    return { ok: true };
  });

export const cancelAtPeriodEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sub = await getMyStripeSubscription(context.supabase, context.userId);
    await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, form({ cancel_at_period_end: "true" }));
    return { ok: true };
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sub = await getMyStripeSubscription(context.supabase, context.userId);
    await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, form({ cancel_at_period_end: "false" }));
    return { ok: true };
  });
