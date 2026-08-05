/**
 * ai-inference.functions.ts
 * ─────────────────────────
 * Pure backend utility that calls either:
 *   1. The remote HuggingFace ML API  (GRAINHERO_ML_API_URL)  → preferred
 *   2. A local Python subprocess      (src/ml/smartbin_predict.py) → fallback
 *
 * This file has NO Tanstack `createServerFn` wrapper so it can be safely
 * imported by background cron jobs AND by the authenticated server function
 * in ml-pipeline.functions.ts without duplicating logic.
 */

import { spawn } from "child_process";
import path from "path";

export type SpoilagePredictionResult = {
  risk_class: "low" | "moderate" | "high" | "critical";
  risk_score: number;          // 0–100
  confidence: number;          // 0–1
  factors: string[];
  source: "api" | "python_local";
  trustworthy: boolean;
};

export type MLInferenceInput = {
  grain_type: string;
  temperature: number;
  humidity: number;
  moisture: number;
  voc: number | null;
  co2?: number | null;
  storage_days: number;
  // Optional rolling time-series window inputs
  window?: Array<Record<string, number>>;
  features?: number[];
  // Optional enriched fields used by the HuggingFace API
  dew_point?: number;
  airflow?: number;
  temperature_history?: number[];
  humidity_history?: number[];
  moisture_history?: number[];
};

/**
 * Optional request-log context. Both call sites (the manual "Run AI
 * Prediction" button and the Firebase sync cron) pass their own Supabase
 * client — this utility stays import-safe for cron jobs by never importing
 * a client itself. Omit to skip logging (e.g. a caller that doesn't have a
 * tenant to attribute the request to).
 */
export type MLLogContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  adminId?: string | null;
  siloId?: string | null;
  deviceId?: string | null;
  triggeredBy: "manual" | "cron";
};

async function logInferenceRequest(
  log: MLLogContext | undefined,
  outcome: { success: boolean; source: SpoilagePredictionResult["source"] | "cascade_failed"; result: SpoilagePredictionResult | null; error: string | null; startedAt: number },
) {
  if (!log) return;
  try {
    await log.supabase.from("ml_inference_requests").insert({
      admin_id: log.adminId ?? null,
      silo_id: log.siloId ?? null,
      device_id: log.deviceId ?? null,
      source: outcome.source === "cascade_failed" ? "cascade_failed" : outcome.source,
      success: outcome.success,
      risk_class: outcome.result?.risk_class ?? null,
      risk_score: outcome.result?.risk_score ?? null,
      confidence: outcome.result?.confidence ?? null,
      latency_ms: Math.round(Date.now() - outcome.startedAt),
      error_message: outcome.error,
      triggered_by: log.triggeredBy,
    });
  } catch (e) {
    console.warn("[ML] failed to write inference request log:", (e as Error).message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelToRiskClass(label: string): "low" | "moderate" | "high" | "critical" {
  const l = label.toLowerCase();
  if (l.includes("critical") || l.includes("spoiled")) return "critical";
  if (l.includes("high") || l.includes("risky")) return "high";
  if (l.includes("moderate") || l.includes("medium")) return "moderate";
  return "low";
}

function scoreFromRiskClass(cls: "low" | "moderate" | "high" | "critical"): number {
  return { low: 10, moderate: 45, high: 70, critical: 90 }[cls];
}

// ─── Primary: HuggingFace remote API ─────────────────────────────────────────

async function callHuggingFaceAPI(data: MLInferenceInput): Promise<SpoilagePredictionResult | null> {
  const mlUrl = process.env.GRAINHERO_ML_API_URL;
  if (!mlUrl) return null;

  const payload = {
    grain_type: data.grain_type.toLowerCase(),
    Temperature: data.temperature,
    Humidity: data.humidity,
    Storage_Days: data.storage_days,
    Grain_Moisture: data.moisture,
    Airflow: data.airflow ?? 0,
    Dew_Point: data.dew_point ?? 15,
    Ambient_Light: 0,
    Pest_Presence: data.voc == null ? 0 : Math.min(1, Math.max(0, data.voc / 1000)),
    Rainfall: 0,
    window: data.window,
    features: data.features,
    temperature_history: data.temperature_history ?? [],
    humidity_history: data.humidity_history ?? [],
    moisture_history: data.moisture_history ?? [],
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${mlUrl.replace(/\/$/, "")}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn(`[ML API] HTTP ${res.status} on attempt ${attempt}`);
        continue;
      }
      const raw = (await res.json()) as Record<string, unknown>;
      if (raw.error === "sensor_fault") {
        return {
          risk_class: "low",
          risk_score: 0,
          confidence: 0,
          factors: ["ML rejected input as sensor_fault"],
          source: "api",
          trustworthy: false,
        };
      }
      const score = Math.max(0, Math.min(100, Math.round(Number(raw.risk_score ?? raw.riskScore ?? 0))));
      const confidence = Math.max(0, Math.min(1, Number(raw.confidence ?? 0)));
      const labelFromRaw = String(raw.risk_class ?? raw.prediction ?? raw.predicted_class ?? "");
      const riskClass = labelFromRaw ? labelToRiskClass(labelFromRaw) : labelToRiskClass(
        score >= 80 ? "critical" : score >= 60 ? "high" : score >= 30 ? "moderate" : "low"
      );
      return {
        risk_class: riskClass,
        risk_score: score || scoreFromRiskClass(riskClass),
        confidence,
        factors: Array.isArray(raw.primary_risk_factors)
          ? raw.primary_risk_factors.map(String)
          : Array.isArray(raw.factors)
          ? raw.factors.map(String)
          : [],
        source: "api",
        trustworthy: raw.trustworthy !== false && confidence > 0,
      };
    } catch (err) {
      console.warn(`[ML API] Attempt ${attempt} error:`, (err as Error).message);
    }
  }
  return null;
}

// ─── Fallback: Local Python subprocess ───────────────────────────────────────

async function callLocalPython(data: MLInferenceInput): Promise<SpoilagePredictionResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "src/ml/smartbin_predict.py");
    const pythonProcess = spawn("python3", [
      scriptPath,
      JSON.stringify({
        temperature: data.temperature,
        humidity: data.humidity,
        grain_moisture: data.moisture,
        storage_days: data.storage_days,
        grain_type: data.grain_type,
        pest_presence: data.voc == null ? 0 : Math.min(1, Math.max(0, data.voc / 1000)),
      }),
    ]);

    let outputData = "";
    let errorData = "";
    pythonProcess.stdout.on("data", (chunk: Buffer) => { outputData += chunk.toString(); });
    pythonProcess.stderr.on("data", (chunk: Buffer) => { errorData += chunk.toString(); });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python ML failed (exit ${code}): ${errorData}`));
      }
      try {
        const jsonStart = outputData.indexOf("{");
        const jsonEnd = outputData.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in Python output");
        const raw = JSON.parse(outputData.slice(jsonStart, jsonEnd + 1)) as {
          prediction?: string;
          confidence?: number;
          factors?: string[];
          error?: string;
        };
        if (raw.error) throw new Error(raw.error);
        const label = String(raw.prediction ?? "Unknown").toLowerCase();
        const riskClass = labelToRiskClass(label);
        resolve({
          risk_class: riskClass,
          risk_score: scoreFromRiskClass(riskClass),
          confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0) / 100)),
          factors: raw.factors ?? [],
          source: "python_local",
          trustworthy: true,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ─── Main export: unified inference function ──────────────────────────────────

/**
 * runMLInference
 * Tries the HuggingFace remote API first (Box 1 of the ML cascade).
 * Falls back to the local Python subprocess if the API is unreachable.
 * Returns null if BOTH methods fail (caller should apply a safety guardrail).
 */
export async function runMLInference(data: MLInferenceInput, log?: MLLogContext): Promise<SpoilagePredictionResult | null> {
  const startedAt = Date.now();

  // Box 1: Remote API
  try {
    const apiResult = await callHuggingFaceAPI(data);
    if (apiResult) {
      await logInferenceRequest(log, { success: true, source: "api", result: apiResult, error: null, startedAt });
      return apiResult;
    }
  } catch (err) {
    console.warn("[ML] HuggingFace API failed:", (err as Error).message);
  }

  // Box 2: Local Python fallback
  try {
    const pythonResult = await callLocalPython(data);
    await logInferenceRequest(log, { success: true, source: "python_local", result: pythonResult, error: null, startedAt });
    return pythonResult;
  } catch (err) {
    console.warn("[ML] Local Python fallback also failed:", (err as Error).message);
    await logInferenceRequest(log, {
      success: false, source: "cascade_failed", result: null,
      error: (err as Error).message.slice(0, 500), startedAt,
    });
  }

  return null;
}
