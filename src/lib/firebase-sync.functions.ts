import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

interface FirebaseLive {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  tvoc_ppb?: number;    // GH1 legacy field name
  moisture?: number;
  fan_state?: number;
  lid_state?: number;
  battery?: number;
  signal?: number;
  ts?: number;
  timestamp?: number;   // GH1 legacy field name
  timestamp_unix?: number;
}

/**
 * Manual sync trigger (admin+). Pulls current /devices snapshot from Firebase
 * and inserts one sensor_readings row per device that has a matching
 * sensor_devices record for the caller's tenant.
 */
export const syncFirebaseSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const isAdmin = (await getEffectiveRole(supabase, userId)) === "admin";
    const isSuper = (await getEffectiveRole(supabase, userId)) === "super_admin";
    if (!isAdmin && !isSuper) {
      return { synced: 0, skipped: 0, error: "Forbidden" };
    }

    // fetchAllDevicePayloads reads BOTH /devices/{id}/live (GH2) AND
    // /sensor_data/{id}/latest (GH1 legacy) — no firmware update needed.
    const { fetchAllDevicePayloads } = await import("./firebase-admin.server");
    const snap = await fetchAllDevicePayloads();
    const deviceIds = Object.keys(snap);
    if (deviceIds.length === 0) return { synced: 0, skipped: 0 };

    // Resolve firebase device keys → local sensor_devices rows (device_code match)
    const { data: devices } = await supabase
      .from("sensor_devices")
      .select("id, device_id, silo_id, warehouse_id, admin_id")
      .in("device_id", deviceIds);

    let synced = 0;
    let skipped = 0;
    for (const dev of devices ?? []) {
      // snap is now a flat payload map — no .live nesting needed
      const live = snap[dev.device_id] as FirebaseLive | undefined;
      if (!live) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("sensor_readings").insert({
        device_id: dev.id,
        admin_id: dev.admin_id,
        silo_id: dev.silo_id,
        warehouse_id: dev.warehouse_id,
        temperature_value: live.temperature ?? null,
        humidity_value: live.humidity ?? null,
        co2_value: live.co2 ?? null,
        voc_value: live.voc ?? live.tvoc_ppb ?? null,
        moisture_value: live.moisture ?? null,
        fan_state: live.fan_state === 1 ? 1 : 0,
        lid_state: live.lid_state === 1 ? 1 : 0,
        battery_level: live.battery ?? null,
        signal_strength: live.signal ?? null,
        raw_payload: live as unknown as never,
        reading_timestamp: live.ts ? new Date(live.ts).toISOString() : new Date().toISOString(),
      });
      if (error) skipped++;
      else synced++;
    }
    return { synced, skipped, total: deviceIds.length };
  });

// ─── getLatestFirebaseReadings ────────────────────────────────────────────────
// Called by src/hooks/use-firebase-sensor.ts via /api/firebase/live-sensors.
// Returns a map of deviceId → { temperature, humidity, tvoc_ppb, timestamp }
// for all devices found in either Firebase RTDB tree.
export const getLatestFirebaseReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { fetchAllDevicePayloads } = await import("./firebase-admin.server");
    try {
      const snap = await fetchAllDevicePayloads();
      const result: Record<string, {
        temperature: number | null;
        humidity: number | null;
        tvoc_ppb: number | null;
        timestamp: string | null;
      }> = {};

      for (const [deviceId, payload] of Object.entries(snap)) {
        const p = payload as FirebaseLive;
        // Resolve timestamp — GH1 may send seconds, GH2 sends ms
        let ts = p.ts ?? p.timestamp ?? p.timestamp_unix ?? null;
        if (typeof ts === "number" && ts < 2_000_000_000) ts = ts * 1000;
        result[deviceId] = {
          temperature: typeof p.temperature === "number" ? p.temperature : null,
          humidity:    typeof p.humidity    === "number" ? p.humidity    : null,
          tvoc_ppb:    typeof p.voc         === "number" ? p.voc
                     : typeof p.tvoc_ppb   === "number" ? p.tvoc_ppb    : null,
          timestamp: ts !== null ? new Date(ts).toISOString() : null,
        };
      }
      return { success: true, devices: result };
    } catch (err) {
      console.error("[getLatestFirebaseReadings] error:", err);
      return { success: false, devices: {} };
    }
  });

// ─── getDeviceLiveTelemetry ───────────────────────────────────────────────────
// Replaces GH1 firebaseRealtimeService.readTelemetry(deviceId).
// Called by GH1 routes/iot.js and routes/aiSpoilage.js for single-device reads.
// GH2 callers use this server function instead of the GH1 REST endpoint.
export const getDeviceLiveTelemetry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => {
    if (typeof d !== "object" || d === null || typeof (d as { device_id?: unknown }).device_id !== "string") {
      throw new Error("device_id required");
    }
    return d as { device_id: string };
  })
  .handler(async ({ data }) => {
    const { fetchLivePayload } = await import("./firebase-admin.server");
    try {
      const payload = await fetchLivePayload(data.device_id);
      // Cast through JSON-serializable primitive record to satisfy TanStack's serializable validator.
      return { ok: true, payload: (payload ?? null) as Record<string, string | number | boolean | null> | null };
    } catch (err) {
      console.error("[getDeviceLiveTelemetry] error:", err);
      return { ok: false, payload: null };
    }
  });