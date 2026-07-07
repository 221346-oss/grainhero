import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint: call every N minutes to pull /devices from Firebase RTDB
 * and persist a sensor_readings row per device.
 * Auth: caller must send `Authorization: Bearer <CRON_SECRET>`.
 */
export const Route = createFileRoute("/api/public/cron/sync-firebase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const dbUrl = process.env.FIREBASE_DATABASE_URL;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!dbUrl) return new Response("FIREBASE_DATABASE_URL missing", { status: 500 });
        if (!anonKey) return new Response("SUPABASE_PUBLISHABLE_KEY missing", { status: 500 });

        const apikey = request.headers.get("apikey") ?? "";
        if (apikey !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const fbAuth = process.env.FIREBASE_DATABASE_SECRET;
        const url = `${dbUrl.replace(/\/$/, "")}/devices.json${fbAuth ? `?auth=${encodeURIComponent(fbAuth)}` : ""}`;
        const fbRes = await fetch(url);
        if (!fbRes.ok) return new Response(`Firebase ${fbRes.status}`, { status: 502 });
        const snap = (await fbRes.json()) as Record<string, { live?: Record<string, unknown> }> | null;
        const deviceIds = Object.keys(snap ?? {});
        if (deviceIds.length === 0) return Response.json({ synced: 0 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: devices } = await supabaseAdmin
          .from("sensor_devices")
          .select("id, device_id, silo_id, warehouse_id, admin_id")
          .in("device_id", deviceIds);

        let synced = 0;
        for (const dev of devices ?? []) {
          const live = snap?.[dev.device_id]?.live;
          if (!live) continue;
          const g = (k: string) => (typeof live[k] === "number" ? (live[k] as number) : null);
          const { error } = await supabaseAdmin.from("sensor_readings").insert({
            device_id: dev.id,
            admin_id: dev.admin_id,
            silo_id: dev.silo_id,
            warehouse_id: dev.warehouse_id,
            temperature_value: g("temperature"),
            humidity_value: g("humidity"),
            co2_value: g("co2"),
            voc_value: g("voc"),
            moisture_value: g("moisture"),
            fan_state: live.fan_state === 1 ? 1 : 0,
            lid_state: live.lid_state === 1 ? 1 : 0,
            battery_level: g("battery"),
            signal_strength: g("signal"),
            raw_payload: live as never,
            reading_timestamp:
              typeof live.ts === "number"
                ? new Date(live.ts).toISOString()
                : new Date().toISOString(),
          });
          if (!error) synced++;
        }

        return Response.json({ synced, total: deviceIds.length });
      },
    },
  },
});