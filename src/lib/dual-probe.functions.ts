/**
 * dual-probe.functions.ts
 * ───────────────────────
 * Server functions for Dual Probe Monitoring (ambient vs core sensors).
 * Provides comparison data, health status, and anomaly detection 
 * for deep silo installations.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type ProbeType = "ambient" | "core";

const zSensorTypes = z.enum(["temperature", "humidity", "co2", "voc", "moisture"]);

// ─── UTILS ───────────────────────────────────────────────────────────────────

function calculateStats(values: number[]) {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
  return { count: values.length, min, max, avg, std_dev: Math.sqrt(variance) };
}

// ─── FUNCTIONS ───────────────────────────────────────────────────────────────

/**
 * submitDualProbeReading
 * Submits a new dual probe reading (ambient or core) and checks for
 * significant differences between the two probes.
 */
export const submitDualProbeReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    deviceId: z.string().uuid(),
    probeType: z.enum(["ambient", "core"]),
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    co2: z.number().optional(),
    voc: z.number().optional(),
    moisture: z.number().optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Verify device
    const { data: device, error: devErr } = await supabase
      .from("sensor_devices")
      .select("id, silo_id, admin_id, warehouse_id")
      .eq("id", data.deviceId)
      .single();

    if (devErr || !device) throw new Error("Sensor device not found");

    // Get active batch
    const { data: batch } = await supabase
      .from("grain_batches")
      .select("id")
      .eq("silo_id", device.silo_id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    // Insert reading
    const { data: reading, error: insertErr } = await supabaseAdmin
      .from("sensor_readings")
      .insert({
        device_id: device.id,
        admin_id: device.admin_id,
        silo_id: device.silo_id,
        warehouse_id: device.warehouse_id,
        batch_id: batch?.id,
        probe_type: data.probeType,
        temperature_value: data.temperature,
        humidity_value: data.humidity,
        co2_value: data.co2,
        voc_value: data.voc,
        moisture_value: data.moisture,
        reading_timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw new Error("Failed to insert reading: " + insertErr.message);

    // If core reading, check for significant deviations from recent ambient readings
    if (data.probeType === "core") {
      const { data: ambientReading } = await supabaseAdmin
        .from("sensor_readings")
        .select("temperature_value, humidity_value, co2_value, voc_value, moisture_value")
        .eq("device_id", device.id)
        .eq("probe_type", "ambient")
        .gte("reading_timestamp", new Date(Date.now() - 30 * 60_000).toISOString())
        .order("reading_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ambientReading) {
        const diffs = [];
        const checkDiff = (type: string, coreVal?: number, ambientVal?: number | null, threshold = 20, isTemp = false) => {
          if (coreVal !== undefined && ambientVal != null) {
            const diff = Math.abs(coreVal - ambientVal);
            const pct = ambientVal === 0 ? 0 : (diff / ambientVal) * 100;
            if (diff > (isTemp ? 5 : threshold) || pct > 20) {
              diffs.push(`${type}: core=${coreVal}, ambient=${ambientVal}`);
            }
          }
        };

        checkDiff("temperature", data.temperature, ambientReading.temperature_value, 5, true);
        checkDiff("humidity", data.humidity, ambientReading.humidity_value, 20);
        checkDiff("moisture", data.moisture, ambientReading.moisture_value, 20);

        if (diffs.length > 0) {
          await supabaseAdmin.from("grain_alerts").insert({
            alert_id: `DUAL-${Date.now()}`,
            admin_id: device.admin_id,
            silo_id: device.silo_id,
            warehouse_id: device.warehouse_id,
            batch_id: batch?.id,
            title: "SIGNIFICANT AMBIENT-CORE DIFFERENCE",
            message: `Significant differences detected between ambient and core probes: ${diffs.join(", ")}`,
            priority: "high",
            source: "sensor",
            alert_type: "in-app",
            status: "pending",
          });
        }
      }
    }

    return { success: true, readingId: reading.id };
  });

/**
 * getDualProbeComparison
 * Analyzes differences between ambient and core probes for a given device/silo over time.
 */
export const getDualProbeComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    siloId: z.string().uuid(),
    hoursBack: z.number().default(24),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.hoursBack * 3600_000).toISOString();

    const { data: readings, error } = await supabase
      .from("sensor_readings")
      .select("probe_type, temperature_value, humidity_value, moisture_value")
      .eq("silo_id", data.siloId)
      .gte("reading_timestamp", since);

    if (error) throw new Error(error.message);

    const ambient = readings.filter(r => r.probe_type === "ambient" || r.probe_type == null); // Default to ambient
    const core = readings.filter(r => r.probe_type === "core");

    const tAmbient = ambient.map(r => r.temperature_value).filter((v): v is number => v != null);
    const tCore = core.map(r => r.temperature_value).filter((v): v is number => v != null);

    const ambientAvgTemp = tAmbient.length ? tAmbient.reduce((a, b) => a + b, 0) / tAmbient.length : 0;
    const coreAvgTemp = tCore.length ? tCore.reduce((a, b) => a + b, 0) / tCore.length : 0;
    const tempGradient = coreAvgTemp - ambientAvgTemp;

    return {
      success: true,
      data_quality: {
        ambient_readings: ambient.length,
        core_readings: core.length,
      },
      stats: {
        temperature: {
          ambient: calculateStats(tAmbient),
          core: calculateStats(tCore),
        },
        humidity: {
          ambient: calculateStats(ambient.map(r => r.humidity_value).filter((v): v is number => v != null)),
          core: calculateStats(core.map(r => r.humidity_value).filter((v): v is number => v != null)),
        }
      },
      insights: {
        temperature_gradient: tempGradient,
        significance: Math.abs(tempGradient) > 5 ? "critical" : Math.abs(tempGradient) > 2 ? "warning" : "normal",
      }
    };
  });
