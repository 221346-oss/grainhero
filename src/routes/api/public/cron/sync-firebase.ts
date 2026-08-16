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
 *
 * ML: uses the shared runMLInference utility (ai-inference.functions.ts)
 * which tries HuggingFace API first, falls back to local Python.
 * Includes Fumigation Interlock — no fan commands when silo.fumigation_active.
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
          .is("deleted_at", null)
          .order("intake_date", { ascending: true, nullsFirst: false });

        // Oldest batch per silo wins (FIFO — the oldest grain still in a
        // pooled silo is the one storage-duration risk should track).
        const activeBatchMap = new Map();
        for (const b of batches ?? []) {
          if (b.silo_id && !activeBatchMap.has(b.silo_id)) activeBatchMap.set(b.silo_id, b);
        }

        // --- Proactive HuggingFace Warm-up ---
        // Fire a non-blocking ping to keep the ML container warm.
        const mlUrl = process.env.GRAINHERO_ML_API_URL;
        if (mlUrl) {
          fetch(`${mlUrl.replace(/\/$/, "")}/health`, { method: "GET" })
            .catch(e => console.warn("[ML Warmup] Failed to ping HuggingFace:", e.message));
        }

        // Shared ML utility — tries HuggingFace API then local Python fallback
        const { runMLInference } = await import("@/lib/ai-inference.functions");

        let synced = 0;
        const now = new Date();
        
        // 1. Process all devices (known + newly auto-registered)
        for (const dev of devices) {
          // snap is a unified map keyed by device_id → flat payload.
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
          
          let mlRiskClass: string | null = null;
          let mlRiskScore: number | null = null;
          let mlConfidence: number | null = null;
          let batchId: string | null = null;

          // Silo-based, not batch-based: under the intake-only model a silo
          // can have many batches (or none, once fully dispatched) — ML
          // inference must still run off live sensor data either way.
          // `batch` is now just a best-effort grain-type/storage-age hint
          // when one silo happens to have exactly one matching batch, not a
          // requirement for inference to run.
          const batch = activeBatchMap.get(dev.silo_id);
          if (temp != null && hum != null) {
            batchId = batch?.id ?? null;
            const storageDays = batch?.intake_date ?
              Math.floor((now.getTime() - new Date(batch.intake_date).getTime()) / (1000 * 3600 * 24)) : 0;

            // GH1 parity: throttle ML auto-trigger to once per 60 seconds per device
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
                const mlRes = await runMLInference({
                  grain_type: batch?.grain_type || "wheat",
                  temperature: temp,
                  humidity: hum,
                  moisture: moist ?? 12,
                  voc,
                  co2,
                  storage_days: storageDays,
                }, {
                  supabase: supabaseAdmin,
                  adminId: dev.admin_id,
                  siloId: dev.silo_id,
                  deviceId: dev.id,
                  triggeredBy: "cron",
                });

                if (mlRes) {
                  mlRiskClass = mlRes.risk_class;
                  mlRiskScore = mlRes.risk_score;
                  mlConfidence = mlRes.confidence;

                  // AUTO-ACTUATION with Fumigation Interlock
                  const { data: siloRow } = await supabaseAdmin
                    .from("silos")
                    .select("fumigation_active")
                    .eq("id", dev.silo_id)
                    .maybeSingle();
                  const fumigationActive = !!(siloRow as any)?.fumigation_active;

                  const cls = mlRes.risk_class;
                  if ((cls === "high" || cls === "critical" || cls === "moderate") && !fumigationActive) {
                    const fanSpeed = cls === "critical" ? 100 : cls === "high" ? 80 : 60;
                    await writeFirebaseControl(dev.device_id, {
                      ml_requested_fan: true,
                      target_fan_speed: fanSpeed,
                      ml_decision: cls,
                      led2: false,
                      led3: cls === "moderate" || cls === "high",
                      led4: cls === "critical"
                    });
                  } else if (cls === "low" || fumigationActive) {
                    await writeFirebaseControl(dev.device_id, {
                      ml_requested_fan: false,
                      target_fan_speed: 0,
                      ml_decision: fumigationActive ? "fumigation_lock" : "safe",
                      led2: !fumigationActive,
                      led3: false,
                      led4: false
                    });
                  }
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

            // 2. Threshold Alerts (GH1 Parity)
            if (dev.silo_id && (temp != null || hum != null)) {
              const alertsToCreate = [];
              let tempThreshold = 35;
              let tempPriority = "high";
              if (batch?.grain_type?.toLowerCase() === "wheat") {
                tempThreshold = 20;
                tempPriority = temp != null && temp > 25 ? "high" : "medium";
              }
              if (temp != null && temp > tempThreshold) {
                alertsToCreate.push({
                  alert_id: `TEMP-${Date.now()}`,
                  admin_id: dev.admin_id,
                  source: "system",
                  silo_id: dev.silo_id,
                  warehouse_id: dev.warehouse_id,
                  batch_id: batchId,
                  title: tempPriority === "high" ? "High Temperature Warning" : "Elevated Temperature Warning",
                  message: `Temperature reached ${temp.toFixed(1)}°C`,
                  priority: tempPriority,
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

        // Trend-Based Alerts (Phase 1.5)
        const siloIds = Array.from(deviceMap.values()).map(d => d.silo_id).filter(Boolean);
        if (siloIds.length > 0) {
          const { data: recentReadings } = await supabaseAdmin.from("sensor_readings")
            .select("silo_id, temperature_value, humidity_value, reading_timestamp")
            .in("silo_id", siloIds)
            .order("reading_timestamp", { ascending: false })
            .limit(100);

          const readingsBySilo = new Map<string, any[]>();
          for (const r of recentReadings || []) {
             if (!readingsBySilo.has(r.silo_id)) readingsBySilo.set(r.silo_id, []);
             readingsBySilo.get(r.silo_id)!.push(r);
          }

          const trendAlertsToCreate = [];
          for (const [siloId, readings] of readingsBySilo.entries()) {
             // We need at least a few readings to establish a trend
             if (readings.length < 5) continue;
             const latest = readings[0];
             const oldest = readings[readings.length - 1];
             if (latest.temperature_value == null || oldest.temperature_value == null || latest.humidity_value == null || oldest.humidity_value == null) continue;

             const tempDelta = latest.temperature_value - oldest.temperature_value;
             const humDelta = latest.humidity_value - oldest.humidity_value;
             
             // If temp rises by > 1.5C and humidity by > 3% over this short window, flag it
             if (tempDelta > 1.5 && humDelta > 3) {
                const device = Array.from(deviceMap.values()).find(d => d.silo_id === siloId);
                if (device) {
                    // Deduplicate: Max 1 trend alert per 4 hours per silo
                    const cutoff = new Date(now.getTime() - 4 * 3600 * 1000).toISOString();
                    const { data: recentTrend } = await supabaseAdmin.from("grain_alerts")
                       .select("id")
                       .eq("silo_id", siloId)
                       .eq("title", "WORSENING Trend Detected")
                       .gte("triggered_at", cutoff)
                       .limit(1)
                       .maybeSingle();

                    if (!recentTrend) {
                       trendAlertsToCreate.push({
                          alert_id: `TREND-${siloId}-${Date.now()}`,
                          admin_id: device.admin_id,
                          source: "ai",
                          silo_id: siloId,
                          warehouse_id: device.warehouse_id,
                          title: "WORSENING Trend Detected",
                          message: `Both temperature (+${tempDelta.toFixed(1)}°C) and humidity (+${humDelta.toFixed(1)}%) have risen steadily over the last window. Early intervention recommended.`,
                          priority: "high",
                          status: "pending",
                          triggered_at: now.toISOString(),
                       });
                    }
                }
             }
          }
          if (trendAlertsToCreate.length > 0) {
             await supabaseAdmin.from("grain_alerts").insert(trendAlertsToCreate as never);
          }
        }

        // Offline Detection — mark devices that have not pinged in 15 minutes.
        const offlineThreshold = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const { data: goingOffline } = await supabaseAdmin.from("sensor_devices")
          .select("id, admin_id, silo_id, warehouse_id")
          .lt("last_heartbeat", offlineThreshold)
          .eq("status", "active");

        if (goingOffline && goingOffline.length > 0) {
          const offlineAlerts = goingOffline.map((d: any) => ({
            alert_id: `OFFLINE-${d.id}-${Date.now()}`,
            admin_id: d.admin_id,
            source: "system",
            silo_id: d.silo_id,
            warehouse_id: d.warehouse_id,
            title: "Sensor Offline",
            message: `Sensor device has not pinged in 15 minutes.`,
            priority: "high",
            status: "pending",
            triggered_at: now.toISOString(),
          }));
          await supabaseAdmin.from("grain_alerts").insert(offlineAlerts as never);
          
          await supabaseAdmin.from("sensor_devices")
            .update({ status: "offline", connection_status: "offline" })
            .in("id", goingOffline.map((d: any) => d.id));
        }

        return Response.json({ synced, total: deviceIds.length });
      },
    },
  },
});
