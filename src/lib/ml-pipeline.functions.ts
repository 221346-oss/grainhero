/**
 * ml-pipeline.functions.ts
 * ─────────────────────────
 * Authenticated Tanstack Start Server Function.
 * Exposed to the React frontend (e.g., "Run AI Prediction" button on Silos page).
 *
 * Internally delegates all inference work to the shared utility in
 * ai-inference.functions.ts — no logic duplication.
 *
 * ML cascade (matches legacy aiSpoilageService.js):
 *   Box 1 → HuggingFace remote API  (GRAINHERO_ML_API_URL)
 *   Box 2 → local Python subprocess
 *   Box 3a → stale Supabase prediction (< 30 min old)
 *   Box 3b → rule-based safety guardrail (honest refusal)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeFirebaseControl } from "./actuator-bridge.server";
import { runMLInference, type MLInferenceInput } from "./ai-inference.functions";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskClass = "low" | "moderate" | "high" | "critical";

type PredictionResult = {
  riskScore: number;
  riskClass: RiskClass;
  confidence: number;
  source: "ensemble" | "stale" | "safety_guardrail";
  trustworthy: boolean;
  factors: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampRisk(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function riskClassFromScore(score: number): RiskClass {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

function computeEMADelta(history: number[]): number | null {
  if (history.length < 2) return null;
  const recent = history.slice(-5);
  const alpha = 0.4;
  let ema = recent[0];
  for (let i = 1; i < recent.length; i++) ema = alpha * recent[i] + (1 - alpha) * ema;
  return Number((ema - recent[0]).toFixed(3));
}

function calculateDewPoint(temperature: number, humidity: number) {
  const a = 17.27, b = 237.7;
  const alpha = (a * temperature) / (b + temperature) + Math.log(humidity / 100);
  return Math.round(((b * alpha) / (a - alpha)) * 100) / 100;
}

function calculateTrend(history: number[]) {
  if (history.length < 10) return "stable";
  const recent = history.slice(-5);
  const older = history.slice(-10, -5);
  const ra = recent.reduce((s, v) => s + v, 0) / recent.length;
  const oa = older.reduce((s, v) => s + v, 0) / older.length;
  const change = oa === 0 ? 0 : (ra - oa) / oa;
  if (change > 0.1) return "increasing";
  if (change < -0.1) return "decreasing";
  return "stable";
}

function calculateStorageDuration(intakeDateStr: string | null) {
  if (!intakeDateStr) return 0;
  const refDate = new Date(intakeDateStr);
  if (Number.isNaN(refDate.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - refDate.getTime()) / 86_400_000));
}

/** Safety guardrail: rule-based scoring when ML is unavailable (Box 3b) */
function buildSafetyGuardrail(
  temperature: number,
  humidity: number,
  moisture: number,
  voc: number | null,
  reason: string,
): PredictionResult {
  let score = 0;
  if (temperature >= 40) score = Math.max(score, 90);
  else if (temperature >= 35) score = Math.max(score, 70);
  else if (temperature >= 30) score = Math.max(score, 45);
  if (humidity >= 85) score = Math.max(score, 90);
  else if (humidity >= 75) score = Math.max(score, 70);
  else if (humidity >= 65) score = Math.max(score, 45);
  if (moisture >= 20) score = Math.max(score, 90);
  else if (moisture >= 18) score = Math.max(score, 70);
  else if (moisture >= 15) score = Math.max(score, 45);
  if (voc !== null) {
    if (voc >= 1000) score = Math.max(score, 90);
    else if (voc >= 600) score = Math.max(score, 70);
    else if (voc >= 300) score = Math.max(score, 45);
  }
  const riskScore = clampRisk(score);
  return {
    riskScore,
    riskClass: riskClassFromScore(riskScore),
    confidence: 0,
    source: "safety_guardrail",
    trustworthy: false,
    factors: [reason, ...(temperature >= 35 ? ["temperature ≥ 35°C"] : []), ...(humidity >= 75 ? ["humidity ≥ 75%"] : []), ...(moisture >= 15 ? ["grain moisture ≥ 15%"] : [])],
  };
}

// ─── Server Function (frontend-callable) ─────────────────────────────────────

export const runMLPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siloId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Silo + current batch
    const { data: silo, error: siloError } = await supabase
      .from("silos")
      .select("id, silo_id, name, admin_id, warehouse_id")
      .eq("id", data.siloId)
      .single();
    if (siloError || !silo) throw new Error("Silo not found");

    // Predictions are silo-based, not batch-based: a pooled silo can hold
    // several batches (or none, once fully dispatched) under the intake-only
    // model, so there's no single "the batch" to require. Batches here are
    // only a best-effort hint for grain type / storage age — the oldest one
    // still holding stock (FIFO), since that's the grain most at risk of
    // prolonged storage. Sensor readings (queried by silo_id below) are the
    // real, always-available silo-level signal.
    const { data: batchRows } = await (supabase as any)
      .from("grain_batches")
      .select("id, batch_id, grain_type, moisture_content, intake_date, quantity_kg, dispatched_quantity_kg, remaining_kg")
      .eq("silo_id", data.siloId)
      .order("intake_date", { ascending: true, nullsFirst: false });
    type BatchRow = { id: string; batch_id: string; grain_type: string; moisture_content: number | null; intake_date: string; quantity_kg: number; dispatched_quantity_kg: number | null; remaining_kg: number | null };
    const batch = ((batchRows ?? []) as BatchRow[])
      .find((b) => (b.remaining_kg ?? Math.max(0, Number(b.quantity_kg ?? 0) - Number(b.dispatched_quantity_kg ?? 0))) > 0)
      ?? null;

    // 2. Sensor device (for Firebase actuation)
    const { data: device } = await supabase
      .from("sensor_devices")
      .select("id, device_id")
      .eq("silo_id", data.siloId)
      .limit(1)
      .maybeSingle();

    // 3. Latest 20 readings for history + EMA
    const { data: readings, error: readingsError } = await supabase
      .from("sensor_readings")
      .select("temperature_value, humidity_value, moisture_value, voc_value, co2_value, airflow, fan_state, fan_duty_cycle, fan_rpm, reading_timestamp")
      .eq("silo_id", data.siloId)
      .order("reading_timestamp", { ascending: false })
      .limit(20);

    if (readingsError || !readings || readings.length === 0) {
      throw new Error("No sensor readings found for silo");
    }

    const latestReading = readings[0];
    const temperature = toNumberOrNull(latestReading.temperature_value);
    const humidity = toNumberOrNull(latestReading.humidity_value);
    if (temperature === null || humidity === null) {
      throw new Error("Temperature and humidity readings are required for ML prediction");
    }

    const tempHistory = readings.map((r) => toNumberOrNull(r.temperature_value)).filter((v): v is number => v !== null).reverse();
    const humHistory = readings.map((r) => toNumberOrNull(r.humidity_value)).filter((v): v is number => v !== null).reverse();
    const grainType = String(batch?.grain_type || "rice").toLowerCase();
    // Live sensor reading takes priority — it's the real current silo
    // condition. Batch moisture-at-intake is only a fallback for silos
    // whose sensor doesn't report moisture.
    const grainMoisture = toNumberOrNull(latestReading.moisture_value) ?? toNumberOrNull(batch?.moisture_content) ?? 13;
    const co2 = toNumberOrNull(latestReading.co2_value);
    const voc = toNumberOrNull(latestReading.voc_value);

    // 4. Build inference input (prepareFeatures equivalent)
    const inferenceInput: MLInferenceInput = {
      grain_type: grainType,
      temperature,
      humidity,
      moisture: grainMoisture,
      voc,
      co2,
      storage_days: batch ? calculateStorageDuration(batch.intake_date) : 0,
      dew_point: calculateDewPoint(temperature, humidity),
      airflow: toNumberOrNull(latestReading.airflow) ?? 0,
      temperature_history: tempHistory,
      humidity_history: humHistory,
      moisture_history: readings.map((r) => toNumberOrNull(r.moisture_value)).filter((v): v is number => v !== null).reverse(),
    };

    // 5. ML Cascade
    let prediction: PredictionResult;
    let fallbackReason: string | null = null;

    // Box 1 + Box 2 via shared utility
    try {
      const mlResult = await runMLInference(inferenceInput, {
        supabase,
        adminId: silo.admin_id,
        siloId: data.siloId,
        deviceId: device?.id ?? null,
        triggeredBy: "manual",
      });
      if (mlResult && mlResult.trustworthy) {
        prediction = {
          riskScore: mlResult.risk_score,
          riskClass: mlResult.risk_class,
          confidence: mlResult.confidence,
          source: "ensemble",
          trustworthy: true,
          factors: mlResult.factors,
        };
      } else {
        fallbackReason = mlResult?.factors[0] ?? "ML service returned untrustworthy result";

        // Box 3a: Stale lookup
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60_000).toISOString();
        const { data: stale } = await (supabase as any)
          .from("spoilage_predictions")
          .select("*")
          .eq("silo_id", data.siloId)
          .gte("created_at", thirtyMinsAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stale && (stale.factors as any)?.source?.startsWith("ensemble")) {
          prediction = {
            riskScore: clampRisk(Number(stale.risk_score ?? 0)),
            riskClass: (stale.risk_class as RiskClass) ?? "low",
            confidence: 0,
            source: "stale",
            trustworthy: false,
            factors: ["Using cached prediction from last 30 minutes"],
          };
        } else {
          // Box 3b: Safety guardrail (honest refusal)
          prediction = buildSafetyGuardrail(temperature, humidity, grainMoisture, voc, fallbackReason);
        }
      }
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : "ML service failed";
      prediction = buildSafetyGuardrail(temperature, humidity, grainMoisture, voc, fallbackReason);
    }

    // 6. Persist prediction to Supabase
    const { data: predictionRecord, error: insertError } = await (supabase as any)
      .from("spoilage_predictions")
      .insert({
        silo_id: data.siloId,
        batch_id: batch?.id ?? null,
        prediction_timestamp: new Date().toISOString(),
        temperature,
        humidity,
        moisture: grainMoisture,
        voc,
        co2,
        storage_days: inferenceInput.storage_days,
        risk_score: prediction.riskScore,
        risk_class: prediction.riskClass,
        confidence: prediction.confidence,
        factors: {
          source: prediction.source,
          trustworthy: prediction.trustworthy,
          reasons: prediction.factors,
          features: { ...inferenceInput, delta_temp: computeEMADelta(tempHistory), delta_rh: computeEMADelta(humHistory), temperature_trend: calculateTrend(tempHistory), humidity_trend: calculateTrend(humHistory) },
        },
      })
      .select("id")
      .single();

    if (insertError) console.error("[ML] Failed to save prediction:", insertError);

    // 7. Alert if safety guardrail was triggered
    if (prediction.source === "safety_guardrail") {
      await (supabase as any).from("grain_alerts").insert({
        alert_id: `ML-REVIEW-${Date.now()}`,
        admin_id: silo.admin_id,
        warehouse_id: silo.warehouse_id,
        silo_id: data.siloId,
        batch_id: batch?.id ?? null,
        title: "Human review required for spoilage prediction",
        message: `ML unavailable. Safety guardrail classified this silo as ${prediction.riskClass} risk.`,
        alert_type: "in-app",
        priority: prediction.riskClass === "critical" ? "critical" : prediction.riskClass === "high" ? "high" : "medium",
        source: "ai",
        status: "pending",
        trigger_conditions: { fallback_reason: fallbackReason, factors: prediction.factors, temperature, humidity, moisture: grainMoisture, voc, co2 },
        ai_context: { prediction_id: predictionRecord?.id ?? null, backup_strategy: "human_review_and_safety_guardrail" },
        created_by: userId,
      });
    }

    // 8. MQTT Actuator Command with Fumigation Interlock
    const shouldActuate = prediction.riskScore >= 30 || humidity >= 70 || (voc !== null && voc > 400);
    if (device?.device_id && shouldActuate) {
      let fanOn = false, pwm = 0;
      let led2 = false, led3 = false, led4 = false;

      if (prediction.riskClass === "critical" || prediction.riskScore >= 80) { fanOn = true; pwm = 100; led4 = true; }
      else if (prediction.riskClass === "high" || prediction.riskScore >= 60) { fanOn = true; pwm = 80; led3 = true; }
      else if (prediction.riskClass === "moderate" || prediction.riskScore >= 30 || humidity >= 70 || (voc !== null && voc > 400)) { fanOn = true; pwm = 60; led3 = true; }
      else { led2 = true; }

      // === FUMIGATION INTERLOCK — block all fan ON commands if fumigation is active ===
      const fumigationActive = (silo as any).fumigation_active === true;
      if (fumigationActive && fanOn) {
        console.log(`⚠️ Fumigation active for silo ${silo.silo_id} — overriding AI fan ON command`);
        fanOn = false;
        pwm = 0;
      }

      try {
        await writeFirebaseControl(device.device_id, {
          ml_requested_fan: fanOn,
          target_fan_speed: pwm,
          ml_decision: prediction.source === "safety_guardrail" ? `guardrail_${prediction.riskClass}` : prediction.riskClass,
          led2,
          led3,
          led4,
        });
      } catch (actuatorErr) {
        console.error("[ML] Failed to send actuator command:", actuatorErr);
      }
    }

    return {
      success: true,
      riskScore: prediction.riskScore,
      riskLevel: prediction.riskClass,
      predictionSource: prediction.source,
      humanReviewRequired: prediction.source === "safety_guardrail",
      predictionId: predictionRecord?.id ?? null,
      factors: prediction.factors,
    };
  });
