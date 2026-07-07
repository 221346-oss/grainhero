import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import pricingData from "@/lib/pricing-data";

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.append(k, String(v));
  }
  return body;
}

async function stripeFetch(path: string, body: URLSearchParams | null, method: "GET" | "POST" = "POST") {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ?? undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[stripe ${res.status}] ${path}: ${text}`);
    throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

const checkoutInput = z.object({
  planId: z.enum(["basic", "intermediate", "pro"]),
  iotQuantity: z.number().int().min(0).max(50).default(1),
});

/**
 * Creates a Stripe Checkout session for the selected plan.
 * Uses inline `price_data` so we don't need to pre-create Products/Prices.
 * Returns the Checkout URL to redirect the browser to.
 */
export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkoutInput.parse(d))
  .handler(async ({ data, context }) => {
    const plan = pricingData.find((p: { id: string }) => p.id === data.planId);
    if (!plan) throw new Error("Unknown plan");

    const currency = String(plan.currency ?? "usd").toLowerCase();
    const origin = process.env.APP_ORIGIN || "https://grainheroo.lovable.app";

    // Resolve or create a Stripe customer keyed by user email
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, name, stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();

    let customerId: string | null = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
    if (!customerId && profile?.email) {
      const created = await stripeFetch(
        "/customers",
        form({ email: profile.email, name: profile.name ?? undefined, "metadata[user_id]": context.userId }),
      );
      customerId = created.id as string;
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", context.userId);
      } catch (e) {
        console.warn("could not persist stripe_customer_id", e);
      }
    }

    // Build line items: recurring subscription + optional one-time IoT setup
    const params = form({
      mode: "subscription",
      customer: customerId ?? undefined,
      client_reference_id: context.userId,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?plan=${plan.id}&canceled=1`,
      "metadata[user_id]": context.userId,
      "metadata[plan_id]": plan.id,
      "metadata[iot_quantity]": String(data.iotQuantity),
      allow_promotion_codes: "true",
      "subscription_data[metadata][user_id]": context.userId,
      "subscription_data[metadata][plan_id]": plan.id,

      // line item 0 — recurring subscription
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
      "line_items[0][price_data][product_data][description]": plan.description,
      "line_items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
      "line_items[0][price_data][recurring][interval]": plan.interval ?? "month",
    });

    if (data.iotQuantity > 0 && plan.iotCharge) {
      params.append("line_items[1][quantity]", String(data.iotQuantity));
      params.append("line_items[1][price_data][currency]", currency);
      params.append("line_items[1][price_data][product_data][name]", "IoT Sensor Setup (one-time)");
      params.append("line_items[1][price_data][unit_amount]", String(Math.round(Number(plan.iotCharge) * 100)));
    }

    const session = await stripeFetch("/checkout/sessions", params);
    return { url: session.url as string, id: session.id as string };
  });

/**
 * Opens a Stripe Customer Portal session so the tenant admin can manage
 * payment methods, invoices, and cancel/upgrade the subscription.
 */
export const createStripeBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) throw new Error("No Stripe customer on file");
    const origin = process.env.APP_ORIGIN || "https://grainheroo.lovable.app";
    const session = await stripeFetch(
      "/billing_portal/sessions",
      form({ customer: customerId, return_url: `${origin}/subscription` }),
    );
    return { url: session.url as string };
  });