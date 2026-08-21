import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import pricingData from "@/lib/pricing-data";
import { requireAppOrigin } from "@/lib/app-url";

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
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
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
    const origin = requireAppOrigin();
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
            install_lat: data.install.lat ?? null,
            install_lng: data.install.lng ?? null,
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

const siloAddonInput = z.object({
  install: z.object({
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().max(120).optional().nullable(),
    country: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(4).max(40),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

/**
 * One-time IoT/silo add-on purchase for an already-onboarded tenant admin
 * who hit their plan's silo limit. Unlike createStripeCheckoutSession (the
 * signup flow, mode "subscription"), this is authenticated and charges only
 * the one-time hardware fee — it must NOT create a second recurring
 * subscription for an existing customer, since the webhook's fulfillment
 * step re-syncs `profiles.subscription_plan` from the session's plan_id
 * metadata (see stripe webhook handler); we pass the tenant's *current*
 * plan back so that sync is a harmless no-op instead of wiping it.
 */
export const createSiloAddonCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => siloAddonInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profileRow } = await context.supabase
      .from("profiles")
      .select("id, email, name, stripe_customer_id, subscription_plan")
      .eq("id", context.userId)
      .maybeSingle();
    const profile = profileRow as {
      email?: string | null; name?: string | null; stripe_customer_id?: string | null; subscription_plan?: string | null;
    } | null;

    const planId = profile?.subscription_plan ?? "basic";
    const plan = pricingData.find((p: { id: string }) => p.id === planId) ?? pricingData[0];
    const email = (profile?.email ?? "").trim().toLowerCase();
    const name = (profile?.name ?? "").trim() || email;

    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId && email) {
      const created = await stripeFetch(
        "/customers",
        stripeForm({ email, name, "metadata[user_id]": context.userId }),
      );
      customerId = created.id as string;
      await context.supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", context.userId);
    }

    const iotUnit = Number(plan.iotCharge ?? 7000);
    const { data: order, error } = await context.supabase
      .from("hardware_orders" as never)
      .insert({
        admin_id: context.userId,
        customer_name: name,
        customer_email: email,
        stripe_customer_id: customerId,
        plan_id: plan.id,
        plan_name: plan.name,
        hardware_quantity: 1,
        hardware_unit_price: iotUnit,
        hardware_total: iotUnit,
        currency: "PKR",
        install_address: data.install.address,
        install_city: data.install.city ?? null,
        install_country: data.install.country,
        contact_phone: data.install.phone,
        notes: data.install.notes || "Additional silo/IoT device request — plan silo limit reached.",
        status: "pending_payment",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const orderId = (order as { id: string }).id;

    const origin = requireAppOrigin();
    const currency = String(plan.currency ?? "PKR").toLowerCase();
    const params = stripeForm({
      mode: "payment",
      customer: customerId ?? undefined,
      client_reference_id: orderId,
      success_url: `${origin}/orders?silo_payment=success`,
      cancel_url: `${origin}/orders?silo_payment=cancelled`,
      "metadata[user_id]": context.userId,
      "metadata[customer_email]": email,
      "metadata[plan_id]": plan.id,
      "metadata[hardware_order_id]": orderId,
      "metadata[addon]": "true",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][product_data][name]": "Additional silo / IoT sensor",
      "line_items[0][price_data][product_data][description]": "One-time hardware + install fee for one additional silo beyond your plan's included limit.",
      "line_items[0][price_data][unit_amount]": String(Math.round(iotUnit * 100)),
    });

    let session: { url: string; id: string };
    try {
      session = await stripeFetch("/checkout/sessions", params) as { url: string; id: string };
    } catch (e) {
      // Roll back the draft order if Stripe rejects the session, so it
      // doesn't linger forever in "pending_payment".
      await context.supabase.from("hardware_orders" as never).delete().eq("id", orderId);
      throw e;
    }
    await context.supabase.from("hardware_orders" as never).update({ stripe_session_id: session.id } as never).eq("id", orderId);
    return { url: session.url, id: session.id };
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

    // Promote only orders that have a Stripe session (i.e. actual payments),
    // NOT draft silo requests (status=new, no stripe_session_id).
    try {
      // These are the ONLY orders genuinely newly-claimed by this call —
      // `orders` above also includes every order already claimed on a
      // previous call (matched via admin_id.eq.userId), so notifying over
      // the whole `orders` list re-fires "new order placed" on every login,
      // not just on an actual new order. Notify strictly over this subset.
      const pendingOrders = orders.filter((o) => String(o.status ?? "") === "pending_payment" && o.stripe_session_id);
      const pendingIds = pendingOrders.map((o) => String(o.id ?? "")).filter(Boolean);
      if (pendingIds.length > 0) {
        await supabaseAdmin
          .from("hardware_orders" as never)
          .update({ status: "new" } as never)
          .in("id", pendingIds);
      }
      const { emitToSuperAdmins } = await import("@/lib/notify");
      for (const o of pendingOrders) {
        await emitToSuperAdmins(supabaseAdmin, {
          category: "order",
          severity: "info",
          title: "New install order placed",
          body: `Order for plan ${String(o.plan_id ?? o.plan_name ?? "?")} · ${Number(o.hardware_quantity ?? 0)} unit(s) by ${email}.`,
          link: `/platform/orders/${String(o.id ?? "")}`,
          entityType: "hardware_order",
          entityId: String(o.id ?? ""),
          metadata: { plan_id: o.plan_id ?? null, hardware_quantity: o.hardware_quantity ?? null },
        });
      }
    } catch (e) {
      console.warn("[claim] super-admin notify failed:", (e as Error).message);
    }

    const stripeCustomerId = String(first.stripe_customer_id ?? "");
    const stripeSubscriptionId = String(first.stripe_subscription_id ?? "");
    const planId = String(first.plan_id ?? "basic");
    // Set subscription_plan on the profile immediately — this is the field
    // plan-gate.ts reads for every feature/limit check. Don't wait on the
    // Stripe webhook (customer.subscription.created) to do it: locally, and
    // in any environment where the webhook can't reach us yet, that event
    // may never arrive, leaving the account stuck on the default "starter"
    // gate even though the `subscriptions` row below says the paid plan.
    await supabaseAdmin
      .from("profiles")
      .update({
        ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        admin_id: context.userId,
        subscription_plan: planId,
        has_access: "full",
      } as never)
      .eq("id", context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" } as never);

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
      const { error: subUpsertError } = await supabaseAdmin.from("subscriptions").upsert(
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
      if (subUpsertError) console.error("[claim] subscriptions upsert failed:", subUpsertError.message);
    } else {
      // Webhook hasn't fired yet — upsert by admin_id so the success page
      // sees subscriptionActive = true immediately.
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("admin_id", context.userId)
        .maybeSingle();

      if (existingSub) {
        const { error: subUpdateError } = await supabaseAdmin.from("subscriptions").update({
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
        if (subUpdateError) console.error("[claim] subscriptions update failed:", subUpdateError.message);
      } else {
        const { error: subInsertError } = await supabaseAdmin.from("subscriptions").insert({
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
        if (subInsertError) console.error("[claim] subscriptions insert failed:", subInsertError.message);
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
    const origin = requireAppOrigin();
    const session = await stripeFetch(
      "/billing_portal/sessions",
      stripeForm({ customer: customerId, return_url: `${origin}/subscription` }),
    );
    return { url: session.url as string };
  });

// ── Draft silo request (no Stripe — super-admin approval required first) ─────

const siloDraftInput = z.object({
  address:  z.string().trim().min(3).max(300),
  city:     z.string().trim().max(120).optional().nullable(),
  country:  z.string().trim().min(1).max(120),
  phone:    z.string().trim().regex(/^\+92\d{10}$/, "Phone must be in format +92XXXXXXXXXX (11 digits total)"),
  notes:    z.string().trim().max(1000).optional().nullable(),
});

/**
 * Creates a hardware order with status "new" — no Stripe session, no payment.
 * The super-admin reviews it on /platform/silo-requests and approves it.
 * Once approved, the admin sees a "Proceed to payment" CTA on /orders that
 * calls createSiloAddonCheckoutSession with the existing orderId.
 */
export const createSiloDraftRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => siloDraftInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profileRow } = await context.supabase
      .from("profiles")
      .select("id, email, name, subscription_plan")
      .eq("id", context.userId)
      .maybeSingle();
    const profile = profileRow as {
      id?: string; email?: string | null; name?: string | null; subscription_plan?: string | null;
    } | null;

    const planId   = profile?.subscription_plan ?? "basic";
    const planMeta = pricingData.find((p: { id: string }) => p.id === planId) ?? pricingData[0];
    const email    = (profile?.email ?? "").trim().toLowerCase();
    const name     = (profile?.name ?? "").trim() || email;
    const iotUnit  = Number(planMeta.iotCharge ?? 7000);

    const { data: order, error } = await context.supabase
      .from("hardware_orders" as never)
      .insert({
        admin_id:           context.userId,
        customer_name:      name,
        customer_email:     email,
        plan_id:            planMeta.id,
        plan_name:          planMeta.name,
        hardware_quantity:  1,
        hardware_unit_price: iotUnit,
        hardware_total:     iotUnit,
        currency:           "PKR",
        install_address:    data.address,
        install_city:       data.city ?? null,
        install_country:    data.country,
        contact_phone:      data.phone,
        notes:              data.notes || null,
        status:             "new",          // awaiting super-admin approval
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const orderId = (order as { id: string }).id;

    // Notify every super-admin so they don't miss it.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { emitToSuperAdmins } = await import("@/lib/notify");
      await emitToSuperAdmins(supabaseAdmin, {
        category:   "install",
        severity:   "info",
        title:      "New silo request awaiting approval",
        body:       `${name} (${email}) submitted a silo install request for ${data.city ?? data.country}.`,
        link:       "/platform/silo-requests",
        entityType: "hardware_order",
        entityId:   orderId,
      });
    } catch (e) {
      console.warn("[siloDraft] notify super-admins failed:", (e as Error).message);
    }

    return { orderId };
  });

// ── Pay an already-approved silo order ───────────────────────────────────────

const approvedOrderPayInput = z.object({ orderId: z.string().uuid() });

/**
 * Creates a Stripe one-time checkout session for an existing hardware order
 * that was previously approved by the super-admin (status === "approved").
 * Unlike createSiloAddonCheckoutSession this does NOT insert a new order row;
 * it just attaches a Stripe session to the existing one and returns the URL.
 */
export const payApprovedSiloOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => approvedOrderPayInput.parse(d))
  .handler(async ({ data, context }) => {
    // Fetch the order — must belong to the current user and be approved.
    const { data: orderRow, error: fetchErr } = await context.supabase
      .from("hardware_orders" as never)
      .select("*")
      .eq("id", data.orderId)
      .eq("admin_id", context.userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    const order = orderRow as Record<string, unknown> | null;
    if (!order) throw new Error("Order not found");
    // Only accept 'approved' (first payment attempt) or 'pending_payment' (retry).
    // 'new' = draft silo request awaiting super-admin review — must NOT be paid directly.
    const payableStatuses = new Set(["approved", "pending_payment"]);
    if (!payableStatuses.has(String(order.status))) {
      if (String(order.status) === "new") {
        throw new Error("Your silo request is still awaiting approval. You can only pay after a super-admin approves it.");
      }
      throw new Error(`Cannot pay for an order with status "${order.status}".`);
    }

    // Get or create Stripe customer.
    const { data: profileRow } = await context.supabase
      .from("profiles")
      .select("id, email, name, stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const profile = profileRow as {
      id?: string; email?: string | null; name?: string | null; stripe_customer_id?: string | null;
    } | null;
    const email = (profile?.email ?? String(order.customer_email ?? "")).trim().toLowerCase();
    const name  = (profile?.name  ?? String(order.customer_name  ?? "")).trim() || email;

    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");

    // Always create a fresh customer to avoid "No such customer" errors when switching Stripe accounts
    let customerId: string | null = null;
    if (email) {
      try {
        const created = await stripeFetch(
          "/customers",
          stripeForm({ email, name, "metadata[user_id]": context.userId }),
        );
        customerId = created.id as string;
        // Use context.supabase — user owns their own profile row
        await context.supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", context.userId);
      } catch (e) {
        // If customer creation fails, proceed without customer ID
        console.warn("[payApprovedSiloOrder] Could not create Stripe customer:", e);
        customerId = null;
      }
    }

    const iotUnit   = Number(order.hardware_total ?? order.hardware_unit_price ?? 7000);
    const currency  = String(order.currency ?? "PKR").toLowerCase();
    const origin    = requireAppOrigin();

    const params = stripeForm({
      mode:                     "payment",
      customer:                 customerId ?? undefined,
      client_reference_id:      data.orderId,
      success_url:              `${origin}/orders?silo_payment=success`,
      cancel_url:               `${origin}/orders?silo_payment=cancelled`,
      "metadata[user_id]":      context.userId,
      "metadata[hardware_order_id]": data.orderId,
      "metadata[addon]":        "true",
      "line_items[0][quantity]":                               "1",
      "line_items[0][price_data][currency]":                   currency,
      "line_items[0][price_data][product_data][name]":         "Additional silo / IoT sensor",
      "line_items[0][price_data][product_data][description]":  "One-time hardware + install fee for one additional silo.",
      "line_items[0][price_data][unit_amount]":                String(Math.round(iotUnit * 100)),
    });

    const session = await stripeFetch("/checkout/sessions", params) as { url: string; id: string };

    // Stash session id and advance to pending_payment — use context.supabase (user owns this order).
    // NOTE: We update to pending_payment here, then webhook will update to "paid"
    // If webhook fails, this leaves order in pending_payment state (customer can retry)
    const { error: sessionError } = await context.supabase
      .from("hardware_orders" as never)
      .update({ 
        stripe_session_id: session.id, 
        status: "pending_payment" 
      } as never)
      .eq("id", data.orderId);

    if (sessionError) {
      throw new Error(`Failed to save checkout session: ${sessionError.message}`);
    }

    console.log(`[payApprovedSiloOrder] Session created: ${session.id}, order moved to pending_payment`);

    return { url: session.url as string };
  });


// ── Check Stripe session and update order if payment succeeded ────────────────

const checkSessionInput = z.object({ orderId: z.string().uuid() });

/**
 * Polls Stripe to check if checkout.session was paid.
 * If yes, updates order status to "paid".
 * Used as fallback if webhook hasn't fired yet.
 */
export const checkAndUpdatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripeFetch } = await import("@/lib/stripe-api.server");

    // Get the order
    const { data: orderRow } = await context.supabase
      .from("hardware_orders" as never)
      .select("id, status, stripe_session_id, admin_id")
      .eq("id", data.orderId)
      .eq("admin_id", context.userId)
      .maybeSingle();
    const order = orderRow as {
      id: string;
      status: string;
      stripe_session_id: string | null;
      admin_id: string;
    } | null;

    if (!order || !order.stripe_session_id) {
      throw new Error("Order not found or no session ID");
    }

    // Check session status on Stripe
    const session = await stripeFetch(`/checkout/sessions/${order.stripe_session_id}`, null, "GET");
    const sessionData = session as {
      id: string;
      payment_status: string;
      status: string;
      payment_intent?: string;
      customer?: string;
    };

    // If payment succeeded, update order status
    if (sessionData.payment_status === "paid" || sessionData.status === "complete") {
      const { error } = await supabaseAdmin
        .from("hardware_orders" as never)
        .update({
          status: "paid",
          stripe_payment_intent: sessionData.payment_intent ?? null,
          stripe_customer_id: sessionData.customer ?? null,
        } as never)
        .eq("id", data.orderId);

      if (error) {
        throw new Error(`Could not update order: ${error.message}`);
      }

      return {
        success: true,
        status: "paid",
        message: "Payment confirmed and order updated to paid status",
      };
    }

    return {
      success: false,
      status: sessionData.payment_status,
      message: `Payment status: ${sessionData.payment_status}`,
    };
  });
