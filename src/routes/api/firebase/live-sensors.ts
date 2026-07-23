import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/firebase/live-sensors
 *
 * Consumed by `src/hooks/use-firebase-sensor.ts`.
 * Returns:
 *   { success: true, devices: { [deviceId]: { temperature, humidity, tvoc_ppb, timestamp } } }
 *
 * Auth: requires valid Supabase session cookie (same as all authenticated routes).
 */
export const Route = createFileRoute("/api/firebase/live-sensors")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Validate Supabase session
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");

        if (!token) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        // Verify the token is a valid Supabase JWT
        const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !user) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        try {
          // fetchAllDevicePayloads reads BOTH /devices/{id}/live (GH2) AND
          // /sensor_data/{id}/latest (GH1 legacy) — matches GH1 getLatestReadings().
          const { fetchAllDevicePayloads } = await import("@/lib/firebase-admin.server");
          const snap = await fetchAllDevicePayloads();

          type DeviceReading = {
            temperature: number | null;
            humidity: number | null;
            tvoc_ppb: number | null;
            timestamp: string | null;
          };

          const devices: Record<string, DeviceReading> = {};

          for (const [deviceId, payload] of Object.entries(snap)) {
            const p = payload as Record<string, unknown>;

            // Resolve timestamp — GH1 Arduino may write seconds, GH2 writes ms
            let ts = (p.ts ?? p.timestamp ?? p.timestamp_unix) as number | null ?? null;
            if (typeof ts === "number" && ts < 2_000_000_000) ts = ts * 1000;

            devices[deviceId] = {
              temperature: typeof p.temperature === "number" ? p.temperature : null,
              humidity:    typeof p.humidity    === "number" ? p.humidity    : null,
              // Handle both GH1 legacy field name tvoc_ppb and GH2 field name voc
              tvoc_ppb:    typeof p.tvoc_ppb === "number" ? p.tvoc_ppb
                         : typeof p.voc     === "number" ? p.voc
                         : null,
              timestamp: ts !== null ? new Date(ts as number).toISOString() : null,
            };
          }

          return new Response(
            JSON.stringify({ success: true, devices }),
            { headers: { "content-type": "application/json" } },
          );
        } catch (err) {
          console.error("[live-sensors] Firebase read error:", err);
          return new Response(
            JSON.stringify({ success: false, devices: {}, error: (err as Error).message }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
