import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import pricingData from "@/lib/pricing-data";

const checkoutInput = z.object({
  planId: z.enum(["basic", "intermediate", "pro"]),
  iotQuantity: z.number().int().min(0).max(50).default(1),
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(180),
  }),
  install: z.object({
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().max(120).optional().nullable(),
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
    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");
    // Try to load supabaseAdmin — if SUPABASE_SERVICE_ROLE_KEY is missing
    // (project not fully wired to Cloud), the Proxy throws on first access.
    // Degrade gracefully so the buyer can still reach Stripe; the webhook +
    // post-payment claim flow will attach the order to the user later.
    type AdminClient = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];
    let admin: AdminClient | null = null;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      // Touch the proxy to force the key check up-front.
      void mod.supabaseAdmin.auth;
      admin = mod.supabaseAdmin;
    } catch (e) {
      console.warn("[checkout] supabaseAdmin unavailable, running guest-only flow:", (e as Error).message);
      admin = null;
    }

    // Link immediately when the email already belongs to a user; otherwise the
    // post-payment signup/login flow claims the paid order by matching email.
    let profile: { id?: string; stripe_customer_id?: string } | null = null;
    if (admin) {
      try {
        const { data: p } = await admin
          .from("profiles")
          .select("id, email, name, stripe_customer_id")
          .ilike("email", customerEmail)
          .maybeSingle();
        profile = (p as { id?: string; stripe_customer_id?: string } | null) ?? null;
      } catch (e) {
        console.warn("[checkout] profile lookup failed:", (e as Error).message);
      }
    }
    let customerId: string | null = profile?.stripe_customer_id ?? null;
    const existingUserId = profile?.id ?? null;
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
      if (existingUserId && admin) {
        try {
          await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", existingUserId);
        } catch (e) { console.warn("[checkout] profile update failed:", (e as Error).message); }
      }
    }

    // Create a pending hardware/install order draft so the webhook can fulfill
    // it and notify super-admins after payment succeeds.
    const iotUnit = Number(plan.iotCharge ?? 7000);
    const iotTotal = data.iotQuantity * iotUnit;
    let orderId: string | null = null;
    if (admin) {
      try {
        const { data: order, error } = await admin
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
        console.warn("[checkout] could not create hardware order draft (continuing):", (e as Error).message);
      }
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

    // IoT one-time charge strategy:
    // Stripe subscription mode does NOT support mixing one-time line_items
    // with recurring ones in older API versions. We try the clean way first
    // (separate line item with no [recurring] = one-time on first invoice).
    // If Stripe rejects it (400), we fall back to bundling IoT cost into the
    // subscription unit_amount so the total is still correct.
    const iotStripeTotal = data.iotQuantity > 0 && plan.iotCharge
      ? Math.round(Number(plan.iotCharge) * data.iotQuantity * 100)
      : 0;
    const subscriptionUnitAmount = Math.round(Number(plan.price) * 100);

    // Try with separate IoT line item first
    if (iotStripeTotal > 0) {
      params.append("line_items[1][quantity]", "1");
      params.append("line_items[1][price_data][currency]", currency);
      params.append("line_items[1][price_data][product_data][name]", `IoT Sensor Setup × ${data.iotQuantity}`);
      params.append("line_items[1][price_data][product_data][description]", `One-time hardware installation for ${data.iotQuantity} sensor(s)`);
      params.append("line_items[1][price_data][unit_amount]", String(iotStripeTotal));
      // No [recurring] = treated as one-time on first invoice
    }

    let session: { url: string; id: string };
    try {
      session = await stripeFetch("/checkout/sessions", params) as { url: string; id: string };
    } catch (e) {
      // Stripe rejected mixed line items — bundle IoT into subscription amount
      console.warn("[checkout] separate IoT line item rejected, bundling into subscription:", (e as Error).message);

      const fallbackParams = stripeForm({
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
        "metadata[iot_bundled]": "true",
        allow_promotion_codes: "true",
        "subscription_data[metadata][user_id]": existingUserId ?? undefined,
        "subscription_data[metadata][customer_email]": customerEmail,
        "subscription_data[metadata][hardware_order_id]": orderId ?? "",
        "subscription_data[metadata][plan_id]": plan.id,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][product_data][name]": `GrainHero ${plan.name} + IoT Setup`,
        "line_items[0][price_data][product_data][description]":
          `${plan.description} · Includes ${data.iotQuantity} sensor installation(s) (Rs. ${(data.iotQuantity * Number(plan.iotCharge)).toLocaleString()} one-time)`,
        "line_items[0][price_data][unit_amount]": String(subscriptionUnitAmount + iotStripeTotal),
        "line_items[0][price_data][recurring][interval]": plan.interval ?? "month",
      });
      session = await stripeFetch("/checkout/sessions", fallbackParams) as { url: string; id: string };
    }
    // Stash the session id on the order so the webhook can look it up.
    if (orderId && admin) {
      try {
        await admin
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
    const { stripeFetch } = await import("@/lib/stripe-api.server");
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
    const { stripeFetch } = await import("@/lib/stripe-api.server");
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
    const planPrice = Number((pricingData.find((p: { id: string }) => p.id === planId) as { price?: number } | undefined)?.price ?? 0);

    // Always upsert a subscription record so the success page can detect
    // subscriptionActive immediately — even before the Stripe webhook fires.
    // If we already have a stripeSubscriptionId we fetch live status from Stripe,
    // otherwise we fall back to plan defaults and let the webhook update later.
    let stripeStatus = "active";
    let currentPeriodEnd: number | null = null;
    let unitAmount = planPrice;
    let currency = "pkr";
    let interval = "month";

    if (stripeSubscriptionId) {
      try {
        const sub = await stripeFetch(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, null, "GET") as {
          status?: string;
          current_period_end?: number;
          items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string; recurring?: { interval?: string } } }> };
        };
        stripeStatus = sub.status ?? stripeStatus;
        currentPeriodEnd = sub.current_period_end ?? null;
        const price = sub.items?.data?.[0]?.price;
        if (price?.unit_amount) unitAmount = Number(price.unit_amount) / 100;
        if (price?.currency) currency = price.currency;
        if (price?.recurring?.interval) interval = price.recurring.interval;
      } catch (e) {
        console.warn("could not fetch subscription during claim, using plan defaults:", (e as Error).message);
      }
    }

    const validStatuses = new Set(["active", "inactive", "cancelled", "expired", "trial"]);
    const status = validStatuses.has(stripeStatus) ? stripeStatus : "active";
    const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";

    // Use stripe_subscription_id as conflict key when available,
    // otherwise fall back to admin_id so we still upsert a single row.
    if (stripeSubscriptionId) {
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
          price_per_month: unitAmount,
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
    } else {
      // Webhook hasn't fired yet — upsert by admin_id so the success page
      // sees subscriptionActive = true immediately.
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("admin_id", context.userId)
        .maybeSingle();

      if (existingSub) {
        await supabaseAdmin.from("subscriptions").update({
          plan_name: (planNameMap[planId] ?? "Custom") as never,
          status: "active" as never,
          auto_renew: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          price_per_month: planPrice,
          currency: "PKR",
          billing_cycle: "monthly" as never,
          stripe_customer_id: stripeCustomerId || null,
          max_users: limits.users,
          max_devices: limits.devices,
          max_storage_gb: limits.storage,
          max_batches: limits.batches,
        } as never).eq("admin_id", context.userId);
      } else {
        await supabaseAdmin.from("subscriptions").insert({
          admin_id: context.userId,
          plan_name: (planNameMap[planId] ?? "Custom") as never,
          plan_description: `Stripe subscription (${planId})`,
          status: "active" as never,
          auto_renew: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          price_per_month: planPrice,
          currency: "PKR",
          billing_cycle: "monthly" as never,
          stripe_customer_id: stripeCustomerId || null,
          max_users: limits.users,
          max_devices: limits.devices,
          max_storage_gb: limits.storage,
          max_batches: limits.batches,
        } as never);
      }
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
    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");
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