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
                client_reference_id?: string;
                metadata?: Record<string, string>;
                amount_total?: number;
                currency?: string;
              };
              const userId = s.client_reference_id ?? s.metadata?.user_id;
              const planId = s.metadata?.plan_id ?? null;
              if (userId && s.customer) {
                await supabaseAdmin
                  .from("profiles")
                  .update({ stripe_customer_id: s.customer })
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
              await supabaseAdmin.from("subscriptions").upsert(
                {
                  admin_id: adminId,
                  plan_id: sub.metadata?.plan_id ?? "unknown",
                  plan_name: sub.metadata?.plan_id ?? "Subscription",
                  status: sub.status,
                  auto_renew: !(sub.cancel_at_period_end ?? false),
                  next_payment_date: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000).toISOString()
                    : null,
                  price_per_month: price ? Number(price.unit_amount) / 100 : 0,
                  currency: (price?.currency ?? "usd").toUpperCase(),
                  billing_cycle: price?.recurring?.interval ?? "month",
                  external_subscription_id: sub.id,
                } as never,
                { onConflict: "external_subscription_id" },
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
                .eq("external_subscription_id", sub.id);
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