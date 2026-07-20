import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";

export const Route = createFileRoute("/api/public/v1/commerce/orders/$orderId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const orderId = params.orderId;

        // Use admin client so we can return an explicit 403 (vs RLS-masked 404) when the caller isn't the owner.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: orderRaw, error } = await supabaseAdmin.from("buyer_orders")
          .select("*").eq("id", orderId).maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const order = orderRaw as unknown as { id: string; buyer_id: string; invoice_pdf_url: string | null } | null;
        if (!order) return Response.json({ error: "not_found" }, { status: 404 });

        const { data: acct } = await supabaseAdmin.from("buyer_accounts")
          .select("buyer_id").eq("user_id", ctx.userId).maybeSingle();
        const callerBuyerId = (acct as { buyer_id: string } | null)?.buyer_id ?? null;
        if (order.buyer_id !== callerBuyerId) return Response.json({ error: "forbidden" }, { status: 403 });

        const [{ data: events }, { data: shipments }, { data: payments }] = await Promise.all([
          supabaseAdmin.from("buyer_order_events")
            .select("from_state, to_state, note, meta, created_at, actor_user_id")
            .eq("order_id", orderId).order("created_at", { ascending: true }),
          supabaseAdmin.from("buyer_shipments")
            .select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
          supabaseAdmin.from("buyer_payment_intents")
            .select("stripe_pi_id, status, amount_cents, currency, platform_fee_cents, channel, updated_at")
            .eq("order_id", orderId).order("created_at", { ascending: false }),
        ]);

        return Response.json({
          data: {
            order,
            events: events ?? [],
            shipments: shipments ?? [],
            payments: payments ?? [],
            invoice_url: order.invoice_pdf_url ?? null,
          },
          meta: { version: "v1" },
        });
      },
    },
  },
});