import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { computeQuote, loadCommerceConfig, nextOrderNumber } from "@/lib/mobile-checkout.server";
import { stripeFetch, stripeForm } from "@/lib/stripe-api.server";

const bodySchema = z.object({
  address_id: z.string().uuid(),
  payment_method: z.enum(["card", "cod"]),
  idempotency_key: z.string().min(8).max(128),
});

type CheckoutOrder = {
  order_id: string;
  order_number: string;
  admin_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  client_secret?: string;
  payment_intent_id?: string;
};

export const Route = createFileRoute("/api/public/v1/commerce/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;

        let body: z.infer<typeof bodySchema>;
        try { body = bodySchema.parse(await request.json()); }
        catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }

        const endpoint = "commerce-checkout";
        const requestHash = createHash("sha256")
          .update(JSON.stringify({ u: ctx.userId, b: body })).digest("hex");

        // Idempotency short-circuit
        const { data: prior } = await ctx.supabase.from("mobile_idempotency_keys")
          .select("response, request_hash")
          .eq("key", body.idempotency_key).eq("user_id", ctx.userId).eq("endpoint", endpoint)
          .maybeSingle();
        if (prior) {
          const p = prior as { response: unknown; request_hash: string };
          if (p.request_hash !== requestHash) {
            return Response.json({ error: "idempotency_conflict" }, { status: 409 });
          }
          return Response.json({ data: p.response, meta: { version: "v1", replayed: true } });
        }

        // Load cart
        const { data: cartRow, error: cartErr } = await ctx.supabase.from("buyer_carts")
          .select("items, currency").eq("buyer_id", ctx.userId).maybeSingle();
        if (cartErr) return Response.json({ error: cartErr.message }, { status: 500 });
        const cart = cartRow as { items: unknown; currency: string } | null;
        const items = (cart?.items as Array<{ listing_id: string; quantity_kg: number; unit_price_cents: number }>) ?? [];
        if (items.length === 0) return Response.json({ error: "cart_empty" }, { status: 400 });

        const cfg = await loadCommerceConfig(ctx.supabase);
        if (!cfg.checkout_enabled) return Response.json({ error: "checkout_disabled" }, { status: 403 });
        if (!cfg.allowed_payment_methods.includes(body.payment_method)) {
          return Response.json({ error: "payment_method_not_allowed" }, { status: 403 });
        }

        let quote;
        try { quote = await computeQuote(ctx.supabase, items, body.address_id, ctx.userId); }
        catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }

        if (quote.total_cents < cfg.min_order_cents) return Response.json({ error: "below_min" }, { status: 400 });
        if (body.payment_method === "cod" && cfg.cod_max_cents > 0 && quote.total_cents > cfg.cod_max_cents) {
          return Response.json({ error: "cod_limit_exceeded" }, { status: 400 });
        }

        // Load shipping address snapshot
        const { data: addr } = await ctx.supabase.from("buyer_addresses")
          .select("*").eq("id", body.address_id).maybeSingle();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve buyer_id: buyer_orders.buyer_id references public.buyers(id) via buyer_accounts.user_id.
        // Auto-provision a buyer + account for the mobile auth user on first checkout.
        const { data: acctRaw } = await supabaseAdmin.from("buyer_accounts")
          .select("buyer_id").eq("user_id", ctx.userId).maybeSingle();
        let buyerId = (acctRaw as { buyer_id: string } | null)?.buyer_id;
        if (!buyerId) {
          const firstAdmin = quote.lines[0].admin_id;
          const contactName = (addr as { recipient?: string } | null)?.recipient ?? "Mobile buyer";
          const displayName = contactName;
          const { data: buyerRow, error: bErr } = await supabaseAdmin.from("buyers")
            .insert({ admin_id: firstAdmin, name: displayName, contact_name: contactName } as never)
            .select("id").single();
          if (bErr || !buyerRow) return Response.json({ error: `buyer_create_failed:${bErr?.message ?? "unknown"}` }, { status: 500 });
          buyerId = (buyerRow as { id: string }).id;
          await supabaseAdmin.from("buyer_accounts").insert({
            user_id: ctx.userId, buyer_id: buyerId,
          } as never);
        }

        const created: CheckoutOrder[] = [];

        // One order per line (buyer_orders is single-listing)
        for (const line of quote.lines) {
          const orderNumber = nextOrderNumber();
          const subtotal = (line.subtotal_cents / 100).toFixed(4);
          const unitPrice = (line.unit_price_cents / 100).toFixed(4);

          const { data: insertedRaw, error: insErr } = await supabaseAdmin.from("buyer_orders")
            .insert({
              admin_id: line.admin_id, buyer_id: buyerId,
              listing_id: line.listing_id, batch_id: line.batch_id,
              order_number: orderNumber,
              quantity_kg: line.quantity_kg,
              unit_price: unitPrice, subtotal,
              currency: quote.currency,
              status: body.payment_method === "cod" ? "confirmed" : "pending",
              placed_by: ctx.userId,
              shipping_address: addr as never,
              channel: "mobile",
            } as never)
            .select("id, order_number, status")
            .single();
          if (insErr || !insertedRaw) {
            console.error("[commerce-checkout] order_insert_failed", insErr);
            return Response.json({ error: `order_insert_failed:${insErr?.message ?? "unknown"}` }, { status: 500 });
          }
          const inserted = insertedRaw as unknown as { id: string; order_number: string; status: string };

          await supabaseAdmin.from("buyer_order_events").insert({
            order_id: inserted.id, admin_id: line.admin_id,
            actor_user_id: ctx.userId,
            from_state: null, to_state: inserted.status,
            note: body.payment_method === "cod" ? "COD checkout placed" : "Mobile checkout placed",
            meta: { channel: "mobile", quote: {
              subtotal_cents: line.subtotal_cents,
              unit_price_cents: line.unit_price_cents,
              quantity_kg: line.quantity_kg,
            } } as never,
          } as never);

          const orderTotalCents = line.subtotal_cents; // per-line PI; fee/tax aggregated on first PI below
          const order: CheckoutOrder = {
            order_id: inserted.id, order_number: inserted.order_number,
            admin_id: line.admin_id, amount_cents: orderTotalCents,
            currency: quote.currency, status: inserted.status,
          };

          if (body.payment_method === "card") {
            const pi = await stripeFetch("/payment_intents", stripeForm({
              amount: orderTotalCents, currency: quote.currency.toLowerCase(),
              "automatic_payment_methods[enabled]": "true",
              "metadata[order_id]": inserted.id,
              "metadata[channel]": "mobile",
              "metadata[buyer_id]": ctx.userId,
            })) as unknown as { id: string; client_secret: string; status: string };
            const feeCents = Math.floor((orderTotalCents * cfg.platform_fee_bps) / 10000);
            await supabaseAdmin.from("buyer_payment_intents").insert({
              order_id: inserted.id, stripe_pi_id: pi.id,
              amount_cents: orderTotalCents, currency: quote.currency.toLowerCase(),
              status: pi.status, platform_fee_cents: feeCents,
              channel: "mobile", raw: pi as never, created_by: ctx.userId,
            } as never);
            await supabaseAdmin.from("buyer_orders").update({
              stripe_payment_intent: pi.id, payment_channel: "mobile",
            } as never).eq("id", inserted.id);
            order.client_secret = pi.client_secret;
            order.payment_intent_id = pi.id;
          }
          created.push(order);
        }

        // Clear cart on success
        await supabaseAdmin.from("buyer_carts").delete().eq("buyer_id", ctx.userId);

        const responseBody = {
          orders: created,
          quote: {
            subtotal_cents: quote.subtotal_cents,
            tax_cents: quote.tax_cents,
            platform_fee_cents: quote.platform_fee_cents,
            total_cents: quote.total_cents,
            currency: quote.currency,
          },
          payment_method: body.payment_method,
        };

        await supabaseAdmin.from("mobile_idempotency_keys").insert({
          key: body.idempotency_key, user_id: ctx.userId, endpoint,
          request_hash: requestHash, response: responseBody as never,
        } as never);

        return Response.json({ data: responseBody, meta: { version: "v1" } });
      },
    },
  },
});