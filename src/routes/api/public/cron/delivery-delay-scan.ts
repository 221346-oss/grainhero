import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 17 — Delivery delay scan.
 * Flags active shipment_assignments whose planned_delivery_at + grace has passed
 * as `exception` and inserts a notification for the seller tenant + super-admins.
 */
export const Route = createFileRoute("/api/public/cron/delivery-delay-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (cronSecret && auth !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;
        const settings = await loadMarketplaceSettings(sb);
        const graceMs = settings.logistics.deliveryDelayGraceMinutes * 60_000;
        const cutoff = new Date(Date.now() - graceMs).toISOString();

        const { data: rows } = await sb.from("shipment_assignments")
          .select("id, shipment_id, planned_delivery_at, status, buyer_shipments(id, order_id, admin_id)")
          .in("status", ["planned", "in_transit"])
          .lt("planned_delivery_at", cutoff)
          .limit(200);

        let flagged = 0;
        for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
          await sb.from("shipment_assignments").update({ status: "exception" }).eq("id", row.id);
          const ship = (row as any).buyer_shipments as { id: string; order_id: string; admin_id: string } | null;
          if (ship) {
            await sb.from("buyer_shipment_events").insert({
              shipment_id: ship.id, code: "delivery_delayed",
              label: "Delivery window exceeded — flagged as exception",
              source: "system",
            });
            await sb.from("notifications").insert({
              admin_id: ship.admin_id,
              category: "logistics",
              severity: "warning",
              title: "Shipment delivery delayed",
              body: `Shipment ${ship.id.slice(0, 8)} has exceeded its planned delivery window.`,
              link: `/platform/logistics/command-center`,
            });
          }
          flagged++;
        }

        return Response.json({ ok: true, flagged });
      },
    },
  },
});