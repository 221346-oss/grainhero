/**
 * Cron: mark devices with no heartbeat >5 min as offline and expire stale actuator commands.
 * Called by pg_cron with the Supabase anon key in `apikey` header.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/heartbeat-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();

        // Devices going offline this run: those still marked online but stale
        const { data: goingOffline } = await supabaseAdmin
          .from("device_heartbeats")
          .select("device_id, admin_id")
          .lt("last_seen_at", cutoff)
          .eq("status", "online");

        await supabaseAdmin
          .from("device_heartbeats")
          .update({ status: "offline" } as never)
          .lt("last_seen_at", cutoff)
          .eq("status", "online");

        // Emit one notification per newly-offline device
        if (goingOffline && goingOffline.length) {
          const { emitNotification } = await import("@/lib/notify");
          for (const d of goingOffline as Array<{ device_id: string; admin_id: string }>) {
            await emitNotification(supabaseAdmin, {
              recipientId: d.admin_id, tenantAdminId: d.admin_id,
              category: "device", severity: "warning",
              title: "Device offline",
              body: "A sensor stopped reporting for over 5 minutes.",
              link: "/sensors", entityType: "sensor_device", entityId: d.device_id,
            });
          }
        }

        const { expireStaleCommands } = await import("@/lib/actuators.functions");
        const { expired } = await expireStaleCommands();

        return Response.json({ ok: true, offline: goingOffline?.length ?? 0, expired });
      },
    },
  },
});
