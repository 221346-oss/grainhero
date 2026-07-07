import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface FirebaseLive {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  moisture?: number;
  fan_state?: number;
  lid_state?: number;
  battery?: number;
  signal?: number;
  ts?: number;
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

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) {
      return { synced: 0, skipped: 0, error: "Forbidden" };
    }

    const { fetchFirebaseDevices } = await import("./firebase-admin.server");
    const snap = await fetchFirebaseDevices<{ live?: FirebaseLive }>("devices");
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
      const live = snap[dev.device_id]?.live;
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
        voc_value: live.voc ?? null,
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