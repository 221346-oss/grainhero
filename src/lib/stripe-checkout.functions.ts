import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import pricingData from "@/lib/pricing-data";
import { stripeFetch, stripeForm } from "@/lib/stripe-api.server";

const checkoutInput = z.object({
  planId: z.enum(["basic", "intermediate", "pro"]),
  iotQuantity: z.number().int().min(0).max(50).default(1),
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(180),
  }),
  install: z.object({
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(4).max(40),
    preferredDate: z.string().trim().max(40).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    businessName: z.string().trim().max(200).optional().nullable(),
    taxId: z.string().trim().max(80).optional().nullable(),
  }),
});

/**
 * Creates a Stripe Checkout session for the selected plan.
 * Uses inline `price_data` so we don't need to pre-create Products/Prices.
 * Returns the Checkout URL to redirect the browser to.
 */
export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((d) => checkoutInput.parse(d))
  .handler(async ({ data }) => {
    const plan = pricingData.find((p: { id: string }) => p.id === data.planId);
    if (!plan) throw new Error("Unknown plan");

    const currency = String(plan.currency ?? "usd").toLowerCase();
    const origin = process.env.APP_ORIGIN || "https://grainheroo.lovable.app";
    const customerEmail = data.customer.email.trim().toLowerCase();
    const customerName = data.customer.name.trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Link immediately when the email already belongs to a user; otherwise the
    // post-payment signup/login flow claims the paid order by matching email.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, stripe_customer_id")
      .ilike("email", customerEmail)
      .maybeSingle();

    let customerId: string | null = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
    const existingUserId = (profile as { id?: string } | null)?.id ?? null;
    if (!customerId) {
      const created = await stripeFetch(
        "/customers",
        stripeForm({
          email: customerEmail,
          name: customerName,
          "metadata[user_id]": existingUserId ?? undefined,
        }),
      );
      customerId = created.id as string;
      if (existingUserId) {
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", existingUserId);
      }
    }

    // Create a pending hardware/install order draft so the webhook can fulfill
    // it and notify super-admins after payment succeeds.
    const iotUnit = Number(plan.iotCharge ?? 7000);
    const iotTotal = data.iotQuantity * iotUnit;
    let orderId: string | null = null;
    try {
      const { data: order, error } = await supabaseAdmin
        .from("hardware_orders" as never)
        .insert({
          admin_id: existingUserId,
          customer_name: customerName,
          customer_email: customerEmail,
          stripe_customer_id: customerId,
          plan_id: plan.id,
          plan_name: plan.name,
          hardware_quantity: data.iotQuantity,
          hardware_unit_price: iotUnit,
          hardware_total: iotTotal,
          currency: "PKR",
          install_address: data.install.address,
          install_city: data.install.city,
          install_country: data.install.country,
          contact_phone: data.install.phone,
          preferred_install_date: data.install.preferredDate || null,
          notes: data.install.notes || null,
          business_name: data.install.businessName || null,
          tax_id: data.install.taxId || null,
          status: "pending_payment",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      orderId = (order as { id: string }).id;
    } catch (e) {
      console.error("could not create hardware order draft", e);
      throw new Error("Could not create install order. Please try again.");
    }

    // Build line items: recurring subscription + optional one-time IoT setup
    const params = stripeForm({
      mode: "subscription",
      customer: customerId ?? undefined,
      client_reference_id: orderId ?? undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?plan=${plan.id}&canceled=1`,
      "metadata[user_id]": existingUserId ?? undefined,
      "metadata[customer_email]": customerEmail,
      "metadata[customer_name]": customerName,
      "metadata[plan_id]": plan.id,
      "metadata[iot_quantity]": String(data.iotQuantity),
      "metadata[hardware_order_id]": orderId ?? "",
      allow_promotion_codes: "true",
      "subscription_data[metadata][user_id]": existingUserId ?? undefined,
      "subscription_data[metadata][customer_email]": customerEmail,
      "subscription_data[metadata][hardware_order_id]": orderId ?? "",
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
    // Stash the session id on the order so the webhook can look it up.
    if (orderId) {
      try {
        await supabaseAdmin
          .from("hardware_orders" as never)
          .update({ stripe_session_id: session.id } as never)
          .eq("id", orderId);
      } catch (e) {
        console.warn("could not stash session id on order", e);
      }
    }
    return { url: session.url as string, id: session.id as string };
  });

const checkoutSummaryInput = z.object({ sessionId: z.string().trim().min(5).max(200) });

export const getCheckoutSessionSummary = createServerFn({ method: "GET" })
  .inputValidator((d) => checkoutSummaryInput.parse(d))
  .handler(async ({ data }) => {
    const session = await stripeFetch(`/checkout/sessions/${encodeURIComponent(data.sessionId)}`, null, "GET") as {
      id: string;
      status?: string;
      payment_status?: string;
      customer?: string;
      customer_details?: { email?: string; name?: string };
      metadata?: Record<string, string>;
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("plan_name, customer_name, customer_email, hardware_quantity")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    const row = (order as Record<string, unknown> | null) ?? {};
    return {
      id: session.id,
      paid: session.payment_status === "paid" || session.status === "complete",
      email: String(row.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? ""),
      name: String(row.customer_name ?? session.customer_details?.name ?? session.metadata?.customer_name ?? ""),
      planName: String(row.plan_name ?? session.metadata?.plan_id ?? ""),
      hardwareQuantity: Number(row.hardware_quantity ?? session.metadata?.iot_quantity ?? 0),
    };
  });

const claimInput = z.object({ sessionId: z.string().trim().min(5).max(200).optional() });

export const claimPaidCheckoutForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => claimInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id,email,name,stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const email = ((profile as { email?: string } | null)?.email ?? (context.claims?.email as string | undefined) ?? "").toLowerCase();
    if (!email) return { claimed: 0 };

    let orderQuery = supabaseAdmin
      .from("hardware_orders" as never)
      .select("*")
      .or(`admin_id.eq.${context.userId},and(admin_id.is.null,customer_email.ilike.${email})`)
      .order("created_at", { ascending: false });
    if (data.sessionId) orderQuery = orderQuery.eq("stripe_session_id", data.sessionId);
    const { data: ordersRaw } = await orderQuery;
    const orders = (ordersRaw ?? []) as Array<Record<string, unknown>>;
    if (orders.length === 0) return { claimed: 0 };

    const first = orders[0];
    await supabaseAdmin
      .from("hardware_orders" as never)
      .update({ admin_id: context.userId } as never)
      .is("admin_id", null)
      .ilike("customer_email", email);

    const stripeCustomerId = String(first.stripe_customer_id ?? "");
    if (stripeCustomerId) {
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: stripeCustomerId, admin_id: context.userId } as never).eq("id", context.userId);
    } else {
      await supabaseAdmin.from("profiles").update({ admin_id: context.userId } as never).eq("id", context.userId);
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" } as never);

    const stripeSubscriptionId = String(first.stripe_subscription_id ?? "");
    const planId = String(first.plan_id ?? "basic");
    const planNameMap: Record<string, string> = {
      basic: "Grain Starter",
      intermediate: "Grain Professional",
      pro: "Grain Enterprise",
    };
    const planLimits: Record<string, { users: number; devices: number; storage: number; batches: number }> = {
      basic: { users: 5, devices: 3, storage: 10, batches: 100 },
      intermediate: { users: 10, devices: 6, storage: 50, batches: 500 },
      pro: { users: 999999, devices: 15, storage: 999999, batches: 999999 },
    };
    const limits = planLimits[planId] ?? planLimits.basic;
    if (stripeSubscriptionId) {
      let stripeStatus = "active";
      let currentPeriodEnd: number | null = null;
      let unitAmount = 0;
      let currency = "pkr";
      let interval = "month";
      try {
        const sub = await stripeFetch(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, null, "GET") as {
          status?: string;
          current_period_end?: number;
          items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string; recurring?: { interval?: string } } }> };
        };
        stripeStatus = sub.status ?? stripeStatus;
        currentPeriodEnd = sub.current_period_end ?? null;
        const price = sub.items?.data?.[0]?.price;
        unitAmount = Number(price?.unit_amount ?? 0);
        currency = price?.currency ?? currency;
        interval = price?.recurring?.interval ?? interval;
      } catch (e) {
        console.warn("could not fetch subscription during claim", e);
      }
      const validStatuses = new Set(["active", "inactive", "cancelled", "expired", "trial"]);
      const status = validStatuses.has(stripeStatus) ? stripeStatus : "active";
      const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";
      await supabaseAdmin.from("subscriptions").upsert(
        {
          admin_id: context.userId,
          plan_name: (planNameMap[planId] ?? "Custom") as never,
          plan_description: `Stripe subscription (${planId})`,
          status: status as never,
          auto_renew: true,
          start_date: new Date().toISOString(),
          end_date: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          next_payment_date: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          price_per_month: unitAmount ? unitAmount / 100 : Number((pricingData.find((p: { id: string }) => p.id === planId) as { price?: number } | undefined)?.price ?? 0),
          currency: currency.toUpperCase(),
          billing_cycle: billingCycle as never,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId || null,
          max_users: limits.users,
          max_devices: limits.devices,
          max_storage_gb: limits.storage,
          max_batches: limits.batches,
        } as never,
        { onConflict: "stripe_subscription_id" },
      );
    }

    return { claimed: orders.length };
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
      stripeForm({ customer: customerId, return_url: `${origin}/subscription` }),
    );
    return { url: session.url as string };
  });