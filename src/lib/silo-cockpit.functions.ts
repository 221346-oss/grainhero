/**
 * Phase 10 — Silo cockpit aggregation.
 * One round-trip for the /silos/$siloId page.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const getSiloCockpit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ siloId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    const [silo, latest, openAlerts, batches, sensors, actuators, thresholds, rules, heartbeats] =
      await Promise.all([
        sb.from("silos").select("*").eq("id", data.siloId).single(),
        sb
          .from("sensor_readings")
          .select(
            "temperature_value, humidity_value, moisture_value, co2_value, reading_timestamp, quality_flag",
          )
          .eq("silo_id", data.siloId)
          .order("reading_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("grain_alerts")
          .select("id, alert_type, severity, message, created_at, resolved_at, value, threshold")
          .eq("silo_id", data.siloId)
          .is("resolved_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        sb
          .from("grain_batches")
          .select(
            "id, batch_number, status, state_changed_at, net_weight_kg, grain_type, quality_grade",
          )
          .eq("silo_id", data.siloId)
          .in("status", ["intake", "stored", "processing", "treatment", "ready"])
          .order("state_changed_at", { ascending: false, nullsFirst: false })
          .limit(20),
        sb
          .from("sensor_devices")
          .select("id, name, sensor_type, status, last_reading_at")
          .eq("silo_id", data.siloId),
        sb
          .from("actuators")
          .select("id, name, actuator_type, status, is_online")
          .eq("silo_id", data.siloId),
        sb.from("sensor_thresholds").select("*").eq("silo_id", data.siloId),
        sb
          .from("automation_rules")
          .select(
            "id, trigger_metric, trigger_op, trigger_value, enabled, actuator_id, last_fired_at",
          )
          .eq("silo_id", data.siloId),
        sb.from("device_heartbeats").select("device_id, status, last_seen_at").in("device_id", []), // placeholder
      ]);

    if (silo.error || !silo.data) throw new Error("Silo not found");

    // Fetch heartbeats for this silo's devices
    const deviceIds = ((sensors.data ?? []) as Row[]).map((s) => s.id);
    let hbData: Row[] = [];
    if (deviceIds.length) {
      const { data: hb } = await sb
        .from("device_heartbeats")
        .select("device_id, status, last_seen_at")
        .in("device_id", deviceIds);
      hbData = (hb ?? []) as Row[];
    }
    void heartbeats;

    return {
      silo: silo.data as Row,
      latestReading: (latest.data as Row | null) ?? null,
      openAlerts: (openAlerts.data ?? []) as Row[],
      batches: (batches.data ?? []) as Row[],
      sensors: (sensors.data ?? []) as Row[],
      actuators: (actuators.data ?? []) as Row[],
      thresholds: (thresholds.data ?? []) as Row[],
      automationRules: (rules.data ?? []) as Row[],
      heartbeats: hbData,
    };
  });
