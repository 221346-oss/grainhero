/**
 * Public HTTP bridge for IoT devices / MQTT / Firebase relay.
 * Body: { deviceId, adminId?, readings: [{ metric, value, recordedAt?, raw? }] }
 * Auth: HMAC-SHA256 over raw body using DEVICE_BRIDGE_SECRET, header x-signature.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const BODY = z.object({
  deviceId: z.string().uuid(),
  readings: z.array(z.object({
    metric: z.enum(["temperature", "humidity", "moisture", "co2", "o2"]),
    value: z.number().finite(),
    recordedAt: z.string().datetime().optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(50),
  battery: z.number().optional(),
  rssi: z.number().optional(),
});

function verify(rawBody: string, signature: string | null): boolean {
  const secret = process.env.DEVICE_BRIDGE_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verify(raw, request.headers.get("x-signature"))) {
          return new Response("invalid signature", { status: 401 });
        }
        let parsed;
        try { parsed = BODY.parse(JSON.parse(raw)); }
        catch (e) { return Response.json({ error: "invalid body", detail: String(e) }, { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: dev } = await supabaseAdmin
          .from("sensor_devices").select("id, admin_id, silo_id").eq("id", parsed.deviceId).maybeSingle();
        if (!dev) return Response.json({ error: "device not found" }, { status: 404 });

        const { writeReadingAndEvaluate } = await import("@/lib/telemetry.functions");
        const alerts: string[] = [];
        for (const r of parsed.readings) {
          const res = await writeReadingAndEvaluate(supabaseAdmin, {
            adminId: (dev as { admin_id: string }).admin_id,
            siloId: (dev as { silo_id: string }).silo_id,
            sensorDeviceId: (dev as { id: string }).id,
            metric: r.metric, value: r.value,
            source: "http",
            raw: r.raw, recordedAt: r.recordedAt,
          });
          if (res.alertId) alerts.push(res.alertId);
        }
        // Update heartbeat details
        await supabaseAdmin.from("device_heartbeats").upsert({
          device_id: (dev as { id: string }).id,
          admin_id: (dev as { admin_id: string }).admin_id,
          last_seen_at: new Date().toISOString(),
          battery: parsed.battery ?? null,
          rssi: parsed.rssi ?? null,
          status: "online",
        });
        return Response.json({ ok: true, ingested: parsed.readings.length, alerts });
      },
    },
  },
});
