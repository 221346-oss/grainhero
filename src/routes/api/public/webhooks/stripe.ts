import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook. Verifies the signature with STRIPE_WEBHOOK_SECRET,
 * then upserts subscription state and logs security_events.
 * URL: /api/public/webhooks/stripe
 */
export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log("🔍 [STRIPE WEBHOOK] Received webhook request");
        
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        console.log("🔍 [STRIPE WEBHOOK] Webhook secret configured:", !!secret);
        
        if (!secret) {
          // Return 200 so Stripe does not disable the endpoint while the secret is being configured.
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — acknowledging without processing");
          return new Response("secret_not_configured", { status: 200 });
        }

        const sigHeader = request.headers.get("stripe-signature");
        console.log("🔍 [STRIPE WEBHOOK] Signature header present:", !!sigHeader);
        
        if (!sigHeader) return new Response("missing signature", { status: 400 });

        const rawBody = await request.text();

        // Parse Stripe signature header: t=timestamp,v1=hash,v1=hash,...
        const parts = Object.fromEntries(
          sigHeader.split(",").map((kv) => {
            const [k, ...rest] = kv.split("=");
            return [k, rest.join("=")];
          }),
        );
        const t = parts["t"];
        const v1 = parts["v1"];
        if (!t || !v1) return new Response("bad signature", { status: 400 });

        // Reject skew > 5 min
        const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
        if (!Number.isFinite(skew) || skew > 300) {
          return new Response("signature expired", { status: 400 });
        }

        // Compute HMAC-SHA256 with Web Crypto
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const mac = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(`${t}.${rawBody}`),
        );
        const expected = Array.from(new Uint8Array(mac))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Timing-safe compare
        if (expected.length !== v1.length) return new Response("bad signature", { status: 400 });
        let diff = 0;
        for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
        if (diff !== 0) return new Response("bad signature", { status: 400 });

        const event = JSON.parse(rawBody) as {
          id: string;
          type: string;
          data: { object: Record<string, unknown> };
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { stripeEventAlreadyProcessed, syncSubscriptionFromStripe } = await import(
          "@/lib/billing-sync.server"
        );

        // Idempotency — Stripe retries deliver the same event id.
        if (event.id) {
          const seen = await stripeEventAlreadyProcessed(supabaseAdmin, event.id, event.type);
          if (seen) return new Response("duplicate", { status: 200 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              console.log("🔍 [STRIPE WEBHOOK] Processing checkout.session.completed");
              
              const s = event.data.object as {
                customer?: string;
                subscription?: string;
                payment_intent?: string;
                client_reference_id?: string;
                metadata?: Record<string, string>;
                amount_total?: number;
                currency?: string;
              };
              
              console.log("🔍 [STRIPE WEBHOOK] Session metadata:", s.metadata);
              console.log("🔍 [STRIPE WEBHOOK] Client reference ID:", s.client_reference_id);
              
              let userId = s.metadata?.user_id ?? null;
              console.log("🔍 [STRIPE WEBHOOK] User ID from metadata:", userId);
              if (!userId && s.metadata?.customer_email) {
                const { data: profByEmail } = await supabaseAdmin
                  .from("profiles")
                  .select("id")
                  .ilike("email", s.metadata.customer_email.trim())
                  .maybeSingle();
                userId = (profByEmail as { id?: string } | null)?.id ?? null;
              }
              const planId = s.metadata?.plan_id ?? null;
              const hardwareOrderId = s.metadata?.hardware_order_id ?? s.client_reference_id ?? null;
              const buyerOrderId = s.metadata?.buyer_order_id ?? null;
              const planChangeRequestId = s.metadata?.plan_change_request_id ?? null;

              console.log("🔍 [STRIPE WEBHOOK] Extracted IDs:");
              console.log("  - planId:", planId);
              console.log("  - hardwareOrderId:", hardwareOrderId);
              console.log("  - buyerOrderId:", buyerOrderId);

              // Prorated plan change (upgrade / cycle upsize) confirmed by Stripe.
              if (planChangeRequestId) {
                const { data: req } = await supabaseAdmin
                  .from("tenant_plan_change_requests")
                  .select("id, tenant_admin_id, requested_plan, current_plan, direction, billing_cycle, status")
                  .eq("id", planChangeRequestId)
                  .maybeSingle();
                const r = req as {
                  id: string; tenant_admin_id: string; requested_plan: string;
                  current_plan: string | null; direction: string | null;
                  billing_cycle: string | null; status: string;
                } | null;
                if (r && r.status !== "approved") {
                  const cycleDays = r.billing_cycle === "yearly" ? 365 : 30;
                  const nextEnd = new Date(Date.now() + cycleDays * 86400_000).toISOString();
                  await supabaseAdmin
                    .from("profiles")
                    .update({
                      subscription_plan: r.requested_plan,
                      billing_cycle: r.billing_cycle ?? "monthly",
                      current_period_end: nextEnd,
                    } as never)
                    .eq("id", r.tenant_admin_id);
                  await supabaseAdmin
                    .from("tenant_plan_change_requests")
                    .update({ status: "approved", decided_at: new Date().toISOString() } as never)
                    .eq("id", r.id);
                  try {
                    const { emitNotification, emitToSuperAdmins } = await import("@/lib/notify");
                    await emitNotification(supabaseAdmin, {
                      recipientId: r.tenant_admin_id, tenantAdminId: r.tenant_admin_id,
                      category: "plan", severity: "success",
                      title: "Plan upgraded",
                      body: `Your plan is now ${r.requested_plan} (${r.billing_cycle ?? "monthly"}).`,
                      link: "/plan-management",
                      entityType: "plan_change_request", entityId: r.id,
                    });
                    await emitToSuperAdmins(supabaseAdmin, {
                      category: "plan", severity: "info",
                      title: "Plan upgrade paid",
                      body: `${r.current_plan ?? "?"} → ${r.requested_plan} (${r.billing_cycle ?? "monthly"}) confirmed via Stripe.`,
                      link: "/platform/plans",
                      entityType: "plan_change_request", entityId: r.id,
                    });
                  } catch (e) {
                    console.warn("[stripe-webhook] plan-change notify failed:", (e as Error).message);
                  }
                }
              }

              // Phase 12 — Buyer marketplace order paid via Stripe Checkout.
              if (buyerOrderId) {
                const { data: bo } = await supabaseAdmin
                  .from("buyer_orders")
                  .select("id, admin_id, status, subtotal, currency, order_number, batch_id")
                  .eq("id", buyerOrderId).maybeSingle();
                const bor = bo as Record<string, unknown> | null;
                if (bor && bor.status !== "paid" && bor.status !== "completed") {
                  await supabaseAdmin.from("buyer_orders").update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    stripe_payment_intent: s.payment_intent ?? null,
                  } as never).eq("id", buyerOrderId);
                  await supabaseAdmin.from("buyer_order_events").insert({
                    order_id: buyerOrderId,
                    admin_id: bor.admin_id,
                    from_state: bor.status,
                    to_state: "paid",
                    actor_user_id: null,
                    note: "Stripe checkout completed",
                  } as never);
                  try {
                    const { emitToSuperAdmins } = await import("@/lib/notify");
                    await emitToSuperAdmins(supabaseAdmin, {
                      category: "billing",
                      severity: "info",
                      title: "Marketplace order paid",
                      body: `Buyer order ${bor.order_number} was paid (${bor.currency} ${bor.subtotal}).`,
                      link: `/sales`,
                      entityType: "buyer_order",
                      entityId: buyerOrderId,
                    });
                  } catch (e) {
                    console.warn("[stripe-webhook] buyer notify failed:", (e as Error).message);
                  }
                  try {
                    const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
                    await sendBuyerOrderEmail(supabaseAdmin, buyerOrderId, "paymentSucceeded");
                  } catch (e) {
                    console.warn("[stripe-webhook] buyer paid email failed:", (e as Error).message);
                  }
                }
              }

              // Note: the buyer confirmation/activation email is intentionally NOT
              // sent here — product decision. sendCheckoutConfirmationEmail in
              // checkout-emails.functions.ts is kept for other transactional
              // sends; it's just not wired to fire at checkout completion.
              if (userId && s.customer) {
                await supabaseAdmin
                  .from("profiles")
                  .update({ stripe_customer_id: s.customer })
                  .eq("id", userId);
              }
              // Promote the purchaser to tenant admin
              if (userId) {
                await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
                await supabaseAdmin
                  .from("user_roles")
                  .insert({ user_id: userId, role: "admin" } as never);
                await supabaseAdmin
                  .from("profiles")
                  .update({ admin_id: userId } as never)
                  .eq("id", userId);
              }
              if (userId) {
                await supabaseAdmin.from("security_events").insert({
                  user_id: userId,
                  tenant_id: userId,
                  event: "billing.checkout_completed",
                  meta: { plan_id: planId, subscription: s.subscription ?? null } as never,
                });
              }

              // Fulfil the pending hardware/install order and notify super admins.
              if (hardwareOrderId) {
                console.log("🔍 [STRIPE WEBHOOK] Processing hardware order:", hardwareOrderId);
                
                const updateResult = await supabaseAdmin
                  .from("hardware_orders" as never)
                  .update({
                    status: "new",
                    stripe_customer_id: s.customer ?? null,
                    stripe_subscription_id: s.subscription ?? null,
                    stripe_payment_intent: s.payment_intent ?? null,
                    ...(userId ? { admin_id: userId } : {}),
                  } as never)
                  .eq("id", hardwareOrderId);

                console.log("🔍 [STRIPE WEBHOOK] Hardware order update result:", updateResult);
                
                if (updateResult.error) {
                  console.error("❌ [STRIPE WEBHOOK] Hardware order update failed:", updateResult.error);
                } else {
                  console.log("✅ [STRIPE WEBHOOK] Hardware order updated successfully to status: new (paid)");
                }

                // Ensure the buyer has an active subscription row so revenue analytics
                // pick this up immediately, without waiting for customer.subscription.created.
                if (userId) {
                  const planNameMap: Record<string, string> = {
                    starter: "Grain Starter",
                    basic: "Grain Starter",
                    growth: "Grain Professional",
                    intermediate: "Grain Professional",
                    professional: "Grain Professional",
                    scale: "Grain Enterprise",
                    enterprise: "Grain Enterprise",
                    pro: "Grain Enterprise",
                  };
                  const planKey = String(planId ?? "").toLowerCase();
                  const planName = planNameMap[planKey] ?? "Custom";
                  const amount = typeof s.amount_total === "number" ? s.amount_total / 100 : 0;
                  const { data: existingSub } = await supabaseAdmin
                    .from("subscriptions")
                    .select("id")
                    .eq("admin_id", userId)
                    .maybeSingle();
                  if (!existingSub) {
                    await supabaseAdmin.from("subscriptions").insert({
                      admin_id: userId,
                      plan_name: planName as never,
                      plan_description: "Auto-created on checkout",
                      status: "active" as never,
                      billing_cycle: "monthly" as never,
                      price_per_month: amount || 99,
                      currency: (s.currency ?? "usd").toUpperCase(),
                      start_date: new Date().toISOString(),
                      end_date: new Date(Date.now() + 30 * 86400_000).toISOString(),
                      next_payment_date: new Date(Date.now() + 30 * 86400_000).toISOString(),
                      auto_renew: true,
                      stripe_subscription_id: s.subscription ?? null,
                      stripe_customer_id: s.customer ?? null,
                    } as never);
                  }
                  await supabaseAdmin
                    .from("profiles")
                    .update({
                      has_access: "full",
                      subscription_plan: planKey || null,
                    } as never)
                    .eq("id", userId);
                }

                // In-app notification for every super admin.
                {
                  const { emitToSuperAdmins } = await import("@/lib/notify");
                  await emitToSuperAdmins(supabaseAdmin, {
                    category: "order",
                    severity: "info",
                    title: "New install order placed",
                    body: `A new install order was placed for plan ${planId ?? "?"}.`,
                    link: `/platform/orders/${hardwareOrderId}`,
                    entityType: "hardware_order",
                    entityId: hardwareOrderId,
                    metadata: { plan_id: planId },
                  });
                }

                // Email SUPPORT_EMAIL via Resend gateway or direct API.
                try {
                  const gatewayKey = process.env.LOVABLE_API_KEY;
                  const resendKey = process.env.RESEND_API_KEY;
                  const to = process.env.SUPPORT_EMAIL;
                  const configFrom = process.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
                  if (resendKey && to) {
                    const { data: order } = await supabaseAdmin
                      .from("hardware_orders" as never)
                      .select("id,plan_name,hardware_quantity,hardware_total,install_address,install_city,install_country,contact_phone,preferred_install_date,notes")
                      .eq("id", hardwareOrderId)
                      .maybeSingle();
                    const o = (order as Record<string, unknown> | null) ?? {};
                    const subject = `New install order — ${o.plan_name ?? planId ?? "GrainHero"}`;
                    const html = `<h2>New install order</h2>
<p><b>Order:</b> ${o.id ?? hardwareOrderId}</p>
<p><b>Plan:</b> ${o.plan_name ?? planId ?? "-"}</p>
<p><b>Hardware units:</b> ${o.hardware_quantity ?? 0} × Rs. 7,000 = Rs. ${Number(o.hardware_total ?? 0).toLocaleString()}</p>
<p><b>Install address:</b><br/>${o.install_address ?? "-"}<br/>${o.install_city ?? ""}, ${o.install_country ?? ""}</p>
<p><b>Contact phone:</b> ${o.contact_phone ?? "-"}</p>
<p><b>Preferred date:</b> ${o.preferred_install_date ?? "-"}</p>
<p><b>Notes:</b> ${o.notes ?? "-"}</p>
<p>Open the Platform → Orders console to assign a technician.</p>`;

                    const trySendWebhookEmail = async (fromAddress: string) => {
                      if (gatewayKey) {
                        try {
                          const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${gatewayKey}`,
                              "X-Connection-Api-Key": resendKey,
                            },
                            body: JSON.stringify({
                              from: fromAddress,
                              to: [to],
                              subject,
                              html,
                            }),
                          });
                          if (res.ok) return true;
                        } catch (e) {
                          console.warn("[webhook email] gateway send failed:", e);
                        }
                      }
                      try {
                        const res = await fetch("https://api.resend.com/emails", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${resendKey}`,
                          },
                          body: JSON.stringify({
                            from: fromAddress,
                            to: [to],
                            subject,
                            html,
                          }),
                        });
                        return res.ok;
                      } catch (e) {
                        console.warn("[webhook email] direct send failed:", e);
                        return false;
                      }
                    };

                    let ok = await trySendWebhookEmail(configFrom);
                    if (!ok && !configFrom.includes("resend.dev")) {
                      console.log("[webhook email] Retrying with sandbox onboarding@resend.dev sender");
                      await trySendWebhookEmail("GrainHero <onboarding@resend.dev>");
                    }
                  }
                } catch (e) {
                  console.warn("[order email] error:", e);
                }
              }
              break;
            }
            case "checkout.session.async_payment_failed":
            case "checkout.session.expired": {
              const s = event.data.object as {
                metadata?: Record<string, string>;
              };
              const buyerOrderId = s.metadata?.buyer_order_id ?? null;
              if (buyerOrderId) {
                const { data: bo } = await supabaseAdmin
                  .from("buyer_orders").select("id, admin_id, status, order_number")
                  .eq("id", buyerOrderId).maybeSingle();
                const bor = bo as Record<string, unknown> | null;
                if (bor && bor.status === "pending") {
                  await supabaseAdmin.from("buyer_order_events").insert({
                    order_id: buyerOrderId, admin_id: bor.admin_id,
                    from_state: "pending", to_state: "pending",
                    actor_user_id: null, note: `Payment ${event.type}`,
                  } as never);
                  try {
                    const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
                    await sendBuyerOrderEmail(supabaseAdmin, buyerOrderId, "paymentFailed");
                  } catch (e) {
                    console.warn("[stripe-webhook] failed-payment email:", (e as Error).message);
                  }
                }
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as {
                id: string;
                customer: string;
                status: string;
                current_period_end?: number;
                cancel_at_period_end?: boolean;
                metadata?: Record<string, string>;
                items?: { data: Array<{ price: { unit_amount: number; currency: string; recurring?: { interval: string } } }> };
              };
              const hardwareOrderId = sub.metadata?.hardware_order_id ?? null;
              if (hardwareOrderId) {
                await supabaseAdmin
                  .from("hardware_orders" as never)
                  .update({ stripe_subscription_id: sub.id, stripe_customer_id: sub.customer } as never)
                  .eq("id", hardwareOrderId);
              }
              try {
                const synced = await syncSubscriptionFromStripe(supabaseAdmin, sub.id);
                // Ensure purchaser has admin role (idempotent).
                await supabaseAdmin.from("user_roles").delete().eq("user_id", synced.adminId);
                await supabaseAdmin
                  .from("user_roles")
                  .insert({ user_id: synced.adminId, role: "admin" } as never);
                await supabaseAdmin
                  .from("profiles")
                  .update({ admin_id: synced.adminId } as never)
                  .eq("id", synced.adminId);
                await supabaseAdmin.from("security_events").insert({
                  user_id: synced.adminId,
                  tenant_id: synced.adminId,
                  event: `billing.${event.type}`,
                  meta: { status: sub.status, plan_id: synced.planId } as never,
                });
              } catch (e) {
                console.warn("[stripe-webhook] sub sync failed", (e as Error).message);
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as { id: string };
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "cancelled",
                  auto_renew: false,
                  cancellation_date: new Date().toISOString(),
                  canceled_at: new Date().toISOString(),
                } as never)
                .eq("stripe_subscription_id", sub.id);
              try {
                const { notifyPlatformEvent } = await import("@/lib/platform-notify.server");
                const { data: subRow } = await supabaseAdmin
                  .from("subscriptions")
                  .select("customer_id, plan_name")
                  .eq("stripe_subscription_id", sub.id)
                  .maybeSingle();
                await notifyPlatformEvent({
                  type: "churn",
                  customerId: (subRow as any)?.customer_id ?? sub.id,
                  plan: (subRow as any)?.plan_name ?? null,
                });
              } catch { /* webhook telemetry only */ }
              break;
            }
            case "invoice.payment_failed":
            case "invoice.paid": {
              const inv = event.data.object as {
                id?: string;
                customer?: string;
                amount_paid?: number;
                currency?: string;
                subscription?: string;
              };
              // Refresh the linked subscription so latest_invoice_id + period dates roll forward.
              if (inv.subscription) {
                try {
                  await syncSubscriptionFromStripe(supabaseAdmin, inv.subscription);
                } catch (e) {
                  console.warn("[stripe-webhook] invoice sync failed", (e as Error).message);
                }
              }
              const { data: prof } = await supabaseAdmin
                .from("profiles")
                .select("id, subscription_plan")
                .eq("stripe_customer_id", inv.customer ?? "")
                .maybeSingle();
              if (prof?.id) {
                await supabaseAdmin.from("security_events").insert({
                  user_id: prof.id,
                  tenant_id: prof.id,
                  event: `billing.${event.type}`,
                  meta: { amount: inv.amount_paid, currency: inv.currency } as never,
                });

                // Cross-check the amount actually charged against the
                // catalog price for the tenant's plan (same source of truth
                // computeMrr uses) — flag anything that doesn't line up as
                // its own event rather than burying it inside the routine
                // billing.* log above.
                if (event.type === "invoice.paid" && (prof as { subscription_plan?: string }).subscription_plan) {
                  try {
                    const { loadPlanPricing } = await import("@/lib/plan-pricing.server");
                    const planMap = await loadPlanPricing(supabaseAdmin);
                    const plan = planMap.get(String((prof as { subscription_plan?: string }).subscription_plan).toLowerCase());
                    const actual = typeof inv.amount_paid === "number" ? inv.amount_paid / 100 : 0;
                    if (plan && Math.abs(actual - plan.price_rs) > 1) {
                      await supabaseAdmin.from("security_events").insert({
                        user_id: prof.id,
                        tenant_id: prof.id,
                        event: "payment_mismatch",
                        meta: {
                          expected: plan.price_rs,
                          actual,
                          currency: inv.currency,
                          planId: plan.plan_id,
                        } as never,
                      });
                    }
                  } catch (e) {
                    console.warn("[stripe-webhook] payment mismatch check failed", (e as Error).message);
                  }
                }
              }
              if (event.type === "invoice.payment_failed") {
                try {
                  const { notifyPlatformEvent } = await import("@/lib/platform-notify.server");
                  await notifyPlatformEvent({
                    type: "stripe_payment_failed",
                    customerId: inv.customer ?? "unknown",
                    amount: inv.amount_paid,
                    currency: inv.currency,
                  });
                } catch { /* telemetry only */ }
              }
              break;
            }
            case "charge.refunded": {
              const ch = event.data.object as {
                payment_intent?: string;
                amount_refunded?: number;
                currency?: string;
              };
              if (ch.payment_intent) {
                const { data: order } = await supabaseAdmin
                  .from("buyer_orders")
                  .select("id, admin_id, status, subtotal")
                  .eq("stripe_payment_intent", ch.payment_intent)
                  .maybeSingle();
                if (order) {
                  const fully = (ch.amount_refunded ?? 0) / 100 >= Number(order.subtotal ?? 0) - 0.01;
                  await supabaseAdmin.from("buyer_orders").update({
                    refund_status: "succeeded",
                    status: fully ? "refunded" : order.status,
                  }).eq("id", order.id);
                  await supabaseAdmin.from("buyer_order_events").insert({
                    order_id: order.id, admin_id: order.admin_id,
                    from_state: order.status, to_state: fully ? "refunded" : order.status,
                    note: `Stripe refund confirmed (${(ch.amount_refunded ?? 0) / 100} ${ch.currency ?? ""})`,
                  });
                }
              }
              break;
            }
            case "payment_intent.succeeded":
            case "payment_intent.payment_failed": {
              const pi = event.data.object as {
                id: string; status: string; amount?: number; currency?: string;
                metadata?: Record<string, string>;
              };
              const orderId = pi.metadata?.order_id;
              if (orderId && pi.metadata?.channel === "mobile") {
                await supabaseAdmin.from("buyer_payment_intents")
                  .update({ status: pi.status, raw: pi as never, updated_at: new Date().toISOString() } as never)
                  .eq("stripe_pi_id", pi.id);
                const { data: order } = await supabaseAdmin.from("buyer_orders")
                  .select("id, admin_id, buyer_id, status, order_number").eq("id", orderId).maybeSingle();
                const o = order as { id: string; admin_id: string; buyer_id: string; status: string; order_number: string } | null;
                if (o) {
                  if (pi.status === "succeeded" && o.status !== "paid") {
                    await supabaseAdmin.from("buyer_orders")
                      .update({ status: "paid", paid_at: new Date().toISOString() } as never)
                      .eq("id", orderId);
                    await supabaseAdmin.from("buyer_order_events").insert({
                      order_id: orderId, admin_id: o.admin_id,
                      from_state: o.status ?? null, to_state: "paid",
                      note: "Mobile PaymentIntent succeeded",
                    } as never);
                    await supabaseAdmin.from("notifications").insert({
                      admin_id: o.admin_id, user_id: o.buyer_id,
                      title: "Payment received",
                      message: `Order ${o.order_number} is paid.`,
                      type: "success", category: "commerce",
                      entity_type: "buyer_order", entity_id: orderId,
                      action_url: `/orders/${orderId}`,
                    } as never);
                  } else if (pi.status === "requires_payment_method" || event.type === "payment_intent.payment_failed") {
                    await supabaseAdmin.from("buyer_order_events").insert({
                      order_id: orderId, admin_id: o.admin_id,
                      from_state: o.status, to_state: o.status,
                      note: "Mobile PaymentIntent failed",
                      meta: { pi_status: pi.status } as never,
                    } as never);
                    await supabaseAdmin.from("notifications").insert({
                      admin_id: o.admin_id, user_id: o.buyer_id,
                      title: "Payment failed",
                      message: `Payment for order ${o.order_number} did not go through.`,
                      type: "error", category: "commerce",
                      entity_type: "buyer_order", entity_id: orderId,
                      action_url: `/orders/${orderId}`,
                    } as never);
                  }
                }
              }
              break;
            }
            default:
              // Unhandled event types are OK — Stripe will not retry once we 2xx.
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error:", err);
          // Acknowledge with 200 so Stripe does not disable the endpoint after repeated retries.
          // The error is logged for investigation; Stripe events are idempotent and can be replayed
          // from the dashboard if needed.
          return new Response("handler_error_logged", { status: 200 });
        }

        return new Response("ok");
      },
    },
  },
});