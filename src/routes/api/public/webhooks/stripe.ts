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
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("webhook secret not configured", { status: 500 });

        const sigHeader = request.headers.get("stripe-signature");
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

        const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as {
                customer?: string;
                subscription?: string;
                payment_intent?: string;
                client_reference_id?: string;
                metadata?: Record<string, string>;
                amount_total?: number;
                currency?: string;
              };
              const userId = s.client_reference_id ?? s.metadata?.user_id;
              const planId = s.metadata?.plan_id ?? null;
              const hardwareOrderId = s.metadata?.hardware_order_id ?? null;
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
                await supabaseAdmin
                  .from("hardware_orders" as never)
                  .update({
                    status: "new",
                    stripe_payment_intent: s.payment_intent ?? null,
                  } as never)
                  .eq("id", hardwareOrderId);

                // In-app notification for every super admin.
                const { data: supers } = await supabaseAdmin
                  .from("user_roles")
                  .select("user_id")
                  .eq("role", "super_admin");
                const superIds = (supers ?? []).map((r: { user_id: string }) => r.user_id);
                if (superIds.length > 0) {
                  await supabaseAdmin.from("notifications").insert(
                    superIds.map((uid) => ({
                      user_id: uid,
                      tenant_id: uid,
                      type: "order.new",
                      subject: "New install order placed",
                      body: `A new install order was placed for plan ${planId ?? "?"}. Order id: ${hardwareOrderId}`,
                      is_read: false,
                    })) as never,
                  );
                }

                // Email SUPPORT_EMAIL via Resend gateway.
                try {
                  const gatewayKey = process.env.LOVABLE_API_KEY;
                  const resendKey = process.env.RESEND_API_KEY;
                  const to = process.env.SUPPORT_EMAIL;
                  const from = process.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
                  if (gatewayKey && resendKey && to) {
                    const { data: order } = await supabaseAdmin
                      .from("hardware_orders" as never)
                      .select("id,plan_name,hardware_quantity,hardware_total,install_address,install_city,install_country,contact_phone,preferred_install_date,notes")
                      .eq("id", hardwareOrderId)
                      .maybeSingle();
                    const o = (order as Record<string, unknown> | null) ?? {};
                    await fetch("https://connector-gateway.lovable.dev/resend/emails", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${gatewayKey}`,
                        "X-Connection-Api-Key": resendKey,
                      },
                      body: JSON.stringify({
                        from,
                        to: [to],
                        subject: `New install order — ${o.plan_name ?? planId ?? "GrainHero"}`,
                        html: `<h2>New install order</h2>
<p><b>Order:</b> ${o.id ?? hardwareOrderId}</p>
<p><b>Plan:</b> ${o.plan_name ?? planId ?? "-"}</p>
<p><b>Hardware units:</b> ${o.hardware_quantity ?? 0} × Rs. 7,000 = Rs. ${Number(o.hardware_total ?? 0).toLocaleString()}</p>
<p><b>Install address:</b><br/>${o.install_address ?? "-"}<br/>${o.install_city ?? ""}, ${o.install_country ?? ""}</p>
<p><b>Contact phone:</b> ${o.contact_phone ?? "-"}</p>
<p><b>Preferred date:</b> ${o.preferred_install_date ?? "-"}</p>
<p><b>Notes:</b> ${o.notes ?? "-"}</p>
<p>Open the Platform → Orders console to assign a technician.</p>`,
                      }),
                    }).catch((e) => console.warn("[order email] failed:", e));
                  }
                } catch (e) {
                  console.warn("[order email] error:", e);
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
              const { data: prof } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", sub.customer)
                .maybeSingle();
              const adminId = prof?.id ?? sub.metadata?.user_id ?? null;
              if (!adminId) break;
              const price = sub.items?.data[0]?.price;
              const planId = sub.metadata?.plan_id ?? "";
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
              const validStatuses = new Set(["active", "inactive", "cancelled", "expired", "trial"]);
              const status = validStatuses.has(sub.status) ? sub.status : "active";
              const interval = price?.recurring?.interval ?? "month";
              const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";
              // Ensure purchaser has admin role (idempotent)
              if (adminId) {
                await supabaseAdmin.from("user_roles").delete().eq("user_id", adminId);
                await supabaseAdmin
                  .from("user_roles")
                  .insert({ user_id: adminId, role: "admin" } as never);
                await supabaseAdmin
                  .from("profiles")
                  .update({ admin_id: adminId } as never)
                  .eq("id", adminId);
              }
              await supabaseAdmin.from("subscriptions").upsert(
                {
                  admin_id: adminId,
                  plan_name: (planNameMap[planId] ?? "Custom") as never,
                  plan_description: `Stripe subscription (${planId})`,
                  status: status as never,
                  auto_renew: !(sub.cancel_at_period_end ?? false),
                  start_date: new Date().toISOString(),
                  end_date: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000).toISOString()
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  next_payment_date: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000).toISOString()
                    : null,
                  price_per_month: price ? Number(price.unit_amount) / 100 : 0,
                  currency: (price?.currency ?? "usd").toUpperCase(),
                  billing_cycle: billingCycle as never,
                  stripe_subscription_id: sub.id,
                  stripe_customer_id: sub.customer,
                  max_users: limits.users,
                  max_devices: limits.devices,
                  max_storage_gb: limits.storage,
                  max_batches: limits.batches,
                } as never,
                { onConflict: "stripe_subscription_id" },
              );
              await supabaseAdmin.from("security_events").insert({
                user_id: adminId,
                tenant_id: adminId,
                event: `billing.${event.type}`,
                meta: { status: sub.status } as never,
              });
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
                } as never)
                .eq("stripe_subscription_id", sub.id);
              break;
            }
            case "invoice.payment_failed":
            case "invoice.paid": {
              const inv = event.data.object as { customer?: string; amount_paid?: number; currency?: string };
              const { data: prof } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", inv.customer ?? "")
                .maybeSingle();
              if (prof?.id) {
                await supabaseAdmin.from("security_events").insert({
                  user_id: prof.id,
                  tenant_id: prof.id,
                  event: `billing.${event.type}`,
                  meta: { amount: inv.amount_paid, currency: inv.currency } as never,
                });
              }
              break;
            }
            default:
              // Unhandled event types are OK — Stripe will not retry once we 2xx.
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error:", err);
          // Return 500 so Stripe retries
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});