import { createFileRoute } from "@tanstack/react-router";
import { writeFirebaseControl } from "@/lib/actuator-bridge.server";
import { appendToMLDataset } from "@/lib/ml-csv-logger.server";

/**
 * Cron endpoint: call every N minutes to pull sensor data from Firebase RTDB
 * and persist a sensor_readings row per device.
 * Auth: caller must send `apikey: <SUPABASE_PUBLISHABLE_KEY>` header.
 *
 * PATH COMPATIBILITY:
 *   GH2 path (new firmware): /devices/{deviceId}/live
 *   GH1 path (legacy ESP32):  /sensor_data/{deviceId}/latest
 *   Both trees are read and merged so no firmware update is required.
 */
export const Route = createFileRoute("/api/public/cron/sync-firebase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!anonKey) return new Response("SUPABASE_PUBLISHABLE_KEY missing", { status: 500 });

        const apikey = request.headers.get("apikey") ?? "";
        if (apikey !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        // fetchAllDevicePayloads reads BOTH /devices/{id}/live (GH2) AND
        // /sensor_data/{id}/latest (GH1 legacy) and returns a unified map.
        const { fetchAllDevicePayloads } = await import("@/lib/firebase-admin.server");
        let snap: Record<string, Record<string, unknown>>;
        try {
          snap = await fetchAllDevicePayloads();
        } catch (e) {
          return new Response(`Firebase error: ${(e as Error).message}`, { status: 502 });
        }
        const deviceIds = Object.keys(snap ?? {});
        if (deviceIds.length === 0) return Response.json({ synced: 0 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { autoRegisterDevice } = await import("@/lib/auto-register.server");

        const { data: knownDevices } = await supabaseAdmin
          .from("sensor_devices")
          .select("id, device_id, silo_id, warehouse_id, admin_id");

        // Build a lookup map by device_id for O(1) access
        type DeviceRow = { id: string; device_id: string; silo_id: string; warehouse_id: string | null; admin_id: string };
        const deviceMap = new Map<string, DeviceRow>();
        for (const d of knownDevices ?? []) deviceMap.set(d.device_id, d as DeviceRow);

        // Auto-register any Firebase device IDs that are not yet in sensor_devices.
        // Mirrors GH1 firebaseRealtimeService.js lines 38-82: on first contact,
        // create warehouse → silo → device so the reading is never silently dropped.
        for (const firebaseDeviceId of deviceIds) {
          if (!deviceMap.has(firebaseDeviceId)) {
            const registered = await autoRegisterDevice(firebaseDeviceId);
            if (registered) {
              deviceMap.set(registered.device_id, registered as DeviceRow);
            }
          }
        }

        // Final device list — known + any just-registered devices
        const devices = Array.from(deviceMap.values());

        const { data: batches } = await supabaseAdmin
          .from("grain_batches")
          .select("id, silo_id, grain_type, intake_date")
          .is("deleted_at", null);

        const activeBatchMap = new Map();
        for (const b of batches ?? []) {
          if (b.silo_id) activeBatchMap.set(b.silo_id, b);
        }

        const { runPythonMLInference } = await import("@/lib/ai-inference.functions");

        let synced = 0;
        const now = new Date();
        
        // 1. Process all devices (known + newly auto-registered)
        for (const dev of devices) {
          // snap is a unified map keyed by device_id → flat payload.
          // Populated from BOTH /devices/{id}/live (GH2) and
          // /sensor_data/{id}/latest (GH1 legacy) — see fetchAllDevicePayloads().
          const live = snap?.[dev.device_id];
          if (!live) continue;
          
          // Check multiple keys to support legacy GH1 Arduino payloads
          const g = (k1: string, k2?: string) => {
            if (typeof live[k1] === "number") return live[k1] as number;
            if (k2 && typeof live[k2] === "number") return live[k2] as number;
            return null;
          };
          
          const temp = g("temperature");
          const hum = g("humidity");
          const voc = g("voc", "tvoc_ppb");
          const co2 = g("co2");
          const ambientLight = g("light", "light_pct");
          const soilMoisture = g("soil_moisture_pct");
          
          let moist = g("moisture");
          if (moist === null && soilMoisture !== null) {
            moist = Math.round((25 - (soilMoisture / 100) * 17) * 10) / 10;
          }

          const pwmSpeedVal = g("pwm_speed", "pwm") ?? 0;
          const airflowVal = pwmSpeedVal / 100.0;
          const servoState = live.servo_state === 1 || live.lid_state === 1 ? 1 : 0;
          const fanState = live.fan_state === 1 || pwmSpeedVal > 0 ? 1 : 0;

          // Compute GH1 Pest Score
          let pestScore = 0.0;
          if (voc !== null) {
            if (voc > 1000) pestScore += 0.40;
            else if (voc > 500) pestScore += 0.30;
            else if (voc > 250) pestScore += 0.20;
            else if (voc > 100) pestScore += 0.08;
          }
          if (hum !== null) {
            if (hum > 80) pestScore += 0.25;
            else if (hum > 70) pestScore += 0.18;
            else if (hum > 65) pestScore += 0.10;
          }
          if (temp !== null) {
            if (temp > 35) pestScore += 0.18;
            else if (temp > 30) pestScore += 0.20;
            else if (temp > 25) pestScore += 0.12;
            else if (temp > 20) pestScore += 0.05;
          }
          if (moist !== null) {
            if (moist > 18) pestScore += 0.15;
            else if (moist > 15) pestScore += 0.12;
            else if (moist > 14) pestScore += 0.08;
            else if (moist > 13) pestScore += 0.03;
          }
          pestScore = Math.min(1.0, Math.max(0.0, pestScore));
          
          let mlRiskClass = null;
          let mlRiskScore = null;
          let mlConfidence = null;
          let batchId = null;

          const batch = activeBatchMap.get(dev.silo_id);
          if (batch && temp != null && hum != null) {
            batchId = batch.id;
            const storageDays = batch.intake_date ? 
              Math.floor((now.getTime() - new Date(batch.intake_date).getTime()) / (1000 * 3600 * 24)) : 0;

            // GH1 parity: throttle ML auto-trigger to once per 60 seconds per device
            // (firebaseRealtimeService.js lines 251-256 — lastMLTrigger[deviceId]).
            const mlThrottleCutoff = new Date(now.getTime() - 60_000).toISOString();
            const { data: recentMl } = await supabaseAdmin
              .from("sensor_readings")
              .select("id")
              .eq("device_id", dev.id)
              .not("ml_risk_class", "is", null)
              .gte("reading_timestamp", mlThrottleCutoff)
              .limit(1)
              .maybeSingle();
            
            try {
              if (recentMl) {
                // Skip ML inference + auto-actuation; reading insert still proceeds below.
              } else {
              const mlRes = await runPythonMLInference({
                temperature: temp,
                humidity: hum,
                moisture: moist ?? 12,
                voc: voc ?? 0,
                co2: co2 ?? 400,
                storage_days: storageDays,
                grain_type: batch.grain_type || "wheat"
              });
              mlRiskClass = mlRes.risk_class;
              mlRiskScore = mlRes.risk_score;
              mlConfidence = mlRes.confidence;

              // spoilage_predictions table not in schema — skip persisting predictions here.
              void mlRes.factors;

              // AUTO-ACTUATION (GH1 Parity)
              const cls = mlRiskClass?.toLowerCase();
              if (cls === "risky" || cls === "spoiled") {
                const fanSpeed = cls === "spoiled" ? 100 : 80;
                await writeFirebaseControl(dev.device_id, {
                  ml_requested_fan: true,
                  target_fan_speed: fanSpeed,
                  ml_decision: cls,
                  led2: false,
                  led3: cls === "risky",
                  led4: cls === "spoiled"
                });
              } else if (cls === "safe") {
                await writeFirebaseControl(dev.device_id, {
                  ml_requested_fan: false,
                  target_fan_speed: 0,
                  ml_decision: "safe",
                  led2: true,
                  led3: false,
                  led4: false
                });
              }
              }
            } catch (mlErr) {
              console.error("ML Inference error for device", dev.device_id, mlErr);
            }
          }

          // GH1 Unix Timestamp logic (seconds to ms)
          let readingTime = now.toISOString();
          const rawTsRaw = live.timestamp ?? live.timestamp_unix ?? live.ts;
          if (typeof rawTsRaw === "number") {
            const ms = rawTsRaw < 2000000000 ? rawTsRaw * 1000 : rawTsRaw;
            readingTime = new Date(ms).toISOString();
          }

          const { error } = await supabaseAdmin.from("sensor_readings").insert({
            device_id: dev.id,
            admin_id: dev.admin_id,
            silo_id: dev.silo_id,
            warehouse_id: dev.warehouse_id,
            batch_id: batchId,
            temperature_value: temp,
            humidity_value: hum,
            co2_value: co2,
            voc_value: voc,
            moisture_value: moist,
            ambient_light: ambientLight,
            ml_risk_class: mlRiskClass,
            ml_risk_score: mlRiskScore,
            ml_confidence: mlConfidence,
            fan_state: fanState,
            lid_state: servoState,
            battery_level: g("battery"),
            signal_strength: g("signal"),
            raw_payload: { ...live, pestScore } as never,
            reading_timestamp: readingTime,
          });

          if (!error) {
            synced++;
            // Heartbeat + reading count — mirrors GH1 updateHeartbeat() + incrementReadingCount().
            const { data: deviceRow } = await supabaseAdmin
              .from("sensor_devices")
              .select("data_stats, health_metrics")
              .eq("id", dev.id)
              .single();

            const stats = (deviceRow?.data_stats ?? {}) as {
              total_readings?: number;
              readings_today?: number;
              last_reading_date?: string;
            };
            const health = (deviceRow?.health_metrics ?? {}) as {
              uptime_percentage?: number;
              error_count?: number;
              last_error?: unknown;
            };

            await supabaseAdmin.from("sensor_devices").update({
              last_heartbeat: now.toISOString(),
              connection_status: "online",
              // GH2 offline cron sets status="offline"; restore on recovery (GH1 uses connection_status only)
              status: "active",
              health_metrics: {
                uptime_percentage: health.uptime_percentage ?? 100,
                error_count: health.error_count ?? 0,
                ...(health.last_error ? { last_error: health.last_error } : {}),
                last_heartbeat: now.toISOString(),
              } as never,
              data_stats: {
                total_readings: (stats.total_readings ?? 0) + 1,
                readings_today: (stats.readings_today ?? 0) + 1,
                last_reading_date: now.toISOString(),
              } as never,
            }).eq("id", dev.id);

            // CSV Storage (GH1 Parity)
            if (temp != null && hum != null && batch) {
               appendToMLDataset({
                  temperature: temp,
                  humidity: hum,
                  moisture: moist ?? 14,
                  storageDays: batch.intake_date ? Math.floor((now.getTime() - new Date(batch.intake_date).getTime()) / (1000 * 3600 * 24)) : 0,
                  airflow: airflowVal,
                  light: ambientLight ?? 0,
                  pestScore: pestScore,
                  grainType: batch.grain_type || "rice"
               });
            }

            // Silo conditions are updated automatically by the Supabase trigger
            // sync_sensor_to_silo_conditions which writes to current_conditions JSONB
            // whenever a sensor_readings row is inserted. No redundant UPDATE needed.

              // 2. Threshold Alerts (GH1 Parity)
            if (dev.silo_id && (temp != null || hum != null)) {
              const alertsToCreate = [];
              if (temp != null && temp > 35) {
                alertsToCreate.push({
                  alert_id: `TEMP-${Date.now()}`,
                  admin_id: dev.admin_id,
                  source: "system",
                  silo_id: dev.silo_id,
                  warehouse_id: dev.warehouse_id,
                  batch_id: batchId,
                  title: "High Temperature Warning",
                  message: `Temperature reached ${temp.toFixed(1)}°C`,
                  priority: "high",
                  status: "pending",
                  triggered_at: now.toISOString(),
                });
              }
              if (hum != null && hum > 14.5) {
                alertsToCreate.push({
                  alert_id: `HUM-${Date.now()}`,
                  admin_id: dev.admin_id,
                  source: "system",
                  silo_id: dev.silo_id,
                  warehouse_id: dev.warehouse_id,
                  batch_id: batchId,
                  title: "High Humidity Warning",
                  message: `Humidity reached ${hum.toFixed(1)}%`,
                  priority: "medium",
                  status: "pending",
                  triggered_at: now.toISOString(),
                });
              }
              // LDR Leakage / Tampering Detection (GH1 Parity)
              // Throttle: one leakage alert per 30 minutes per device
              // (firebaseRealtimeService.js lines 142-147).
              if (fanState === 0 && servoState === 0 && ambientLight != null && ambientLight > 5) {
                const leakCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
                const { data: recentLeak } = await supabaseAdmin
                  .from("grain_alerts")
                  .select("id")
                  .eq("device_id", dev.id)
                  .eq("title", "⚠️ Silo Light Leakage Detected")
                  .gte("triggered_at", leakCutoff)
                  .limit(1)
                  .maybeSingle();

                if (!recentLeak) {
                  alertsToCreate.push({
                    alert_id: `LEAK-${Date.now()}`,
                    admin_id: dev.admin_id,
                    source: "system",
                    silo_id: dev.silo_id,
                    warehouse_id: dev.warehouse_id,
                    batch_id: batchId,
                    title: "⚠️ Silo Light Leakage Detected",
                    message: `LDR sensor detected ${ambientLight.toFixed(1)}% light inside sealed silo (fan OFF, lid CLOSED). Possible structural breach, hole, or unauthorized opening.`,
                    priority: ambientLight > 30 ? "critical" : "high",
                    status: "pending",
                    triggered_at: now.toISOString(),
                  });
                }
              }

              if (alertsToCreate.length > 0) {
                await supabaseAdmin.from("grain_alerts").insert(alertsToCreate as never);
              }
            }

            // 3. Closed-Loop Actuator State Sync
            if (dev.silo_id) {
              const pwmVal = typeof live.pwm === "number" ? live.pwm : 0;
              const fanOn = live.fan_status === "running" || live.fan_state === 1 || pwmVal > 0;
              const pwm = pwmVal > 0 ? pwmVal : fanOn ? 100 : 0;
              
              await supabaseAdmin.from("actuators")
                .update({ is_on: !!fanOn, power_level: pwm })
                .eq("silo_id", dev.silo_id)
                .eq("actuator_type", "fan");
            }
          }
        }

        // Offline Detection — mark devices that have not pinged in 15 minutes.
        // Filters on status "active" (the correct enum value written by heartbeat above).
        // "offline" is a valid device_status enum value.
        const offlineThreshold = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        await supabaseAdmin.from("sensor_devices")
          .update({ status: "offline", connection_status: "offline" })
          .lt("last_ping_at", offlineThreshold)
          .eq("status", "active");

        return Response.json({ synced, total: deviceIds.length });
      },
    },
  },
});