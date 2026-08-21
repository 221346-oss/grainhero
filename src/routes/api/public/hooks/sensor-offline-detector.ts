import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sensor-offline-detector")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Mark sensors whose last_heartbeat is older than 5 minutes as offline
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: stale, error: findErr } = await supabaseAdmin
          .from("sensor_devices")
          .select("id, admin_id, device_id, device_name, silo_id, warehouse_id")
          .eq("status", "active")
          .lt("last_heartbeat", cutoff);

        if (findErr) {
          console.error("sensor-offline find error:", findErr);
          return new Response(JSON.stringify({ ok: false, error: findErr.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const staleIds = (stale ?? []).map((s) => s.id);
        let updated = 0;
        let alertsCreated = 0;

        if (staleIds.length > 0) {
          const { error: upErr } = await supabaseAdmin
            .from("sensor_devices")
            .update({ status: "offline", updated_at: new Date().toISOString() })
            .in("id", staleIds);
          if (upErr) console.error("sensor-offline update error:", upErr);
          else updated = staleIds.length;

          // Emit one grain_alerts row per stale sensor
          const rows = (stale ?? []).map((s) => ({
            alert_id: `SENSOR-OFFLINE-${s.id}-${Date.now()}`,
            admin_id: s.admin_id,
            device_id: s.id,
            silo_id: s.silo_id,
            warehouse_id: s.warehouse_id,
            alert_type: "system",
            priority: "high" as const,
            source: "sensor-offline-detector",
            title: `Sensor ${s.device_name ?? s.device_id} offline`,
            message: `Device ${s.device_id} has not sent a heartbeat in over 5 minutes`,
            status: "pending" as const,
          }));

          if (rows.length > 0) {
            const { error: insErr } = await supabaseAdmin.from("grain_alerts").insert(rows);
            if (insErr) console.error("sensor-offline alert insert error:", insErr);
            else alertsCreated = rows.length;
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            offlined: updated,
            alertsCreated,
            at: new Date().toISOString(),
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
