import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/dispatch-sla-sweep")({
  server: { handlers: {
    POST: async ({ request }) => {
      const cronSecret = process.env.CRON_SECRET;
      const auth = request.headers.get("authorization") ?? "";
      if (cronSecret && auth !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabaseAdmin as any;
      const settings = await loadMarketplaceSettings(sb);
      const now = Date.now();
      const cutoff = new Date(now - settings.dispatch.slaHours.inTransit * 3_600_000).toISOString();
      const { data: overdue } = await sb.from("buyer_shipments")
        .select("id, order_id, dispatched_at, status")
        .in("status", ["in_transit","out_for_delivery"])
        .lt("dispatched_at", cutoff)
        .limit(200);
      let flagged = 0;
      for (const s of ((overdue ?? []) as Array<{ id: string; order_id: string }>)) {
        await sb.from("buyer_shipments").update({ status: "exception" } as never).eq("id", s.id);
        await sb.from("buyer_shipment_events").insert({
          shipment_id: s.id, code: "sla_exception",
          label: "SLA exceeded — flagged for review", source: "system",
        } as never);
        try {
          const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
          await sendBuyerOrderEmail(sb, s.order_id, "exception");
        } catch (e) {
          console.warn("[sla-sweep] email failed:", (e as Error).message);
        }
        flagged++;
      }
      return Response.json({ ok: true, flagged });
    },
  } },
});