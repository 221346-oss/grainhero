import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// LLM-based reasoning over recent sensor telemetry for a silo.
// Uses Lovable AI Gateway (google/gemini-3-flash-preview by default).
export const getSpoilageInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siloId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { data: silo } = await context.supabase
      .from("silos")
      .select(
        "id, silo_id, name, capacity_kg, current_occupancy_kg, current_batch:grain_batches!fk_silos_current_batch(id, batch_id, grain_type, moisture_content, quantity_kg)",
      )
      .eq("id", data.siloId)
      .single();
    if (!silo) throw new Error("Silo not found");

    const { data: readings } = await context.supabase
      .from("sensor_readings")
      .select(
        "reading_timestamp, temperature_value, humidity_value, moisture_value, co2_value, voc_value, anomaly_detected, condensation_risk",
      )
      .eq("silo_id", data.siloId)
      .order("reading_timestamp", { ascending: false })
      .limit(48);

    const recent = readings ?? [];
    if (recent.length === 0) {
      return {
        insight:
          "No recent sensor readings for this silo. Ensure at least one sensor is online and reporting.",
        risk_level: "unknown" as const,
        recommendations: [],
        model: "none",
      };
    }

    const summary = {
      silo: {
        id: silo.silo_id,
        name: silo.name,
        capacity_kg: silo.capacity_kg,
        occupancy_kg: silo.current_occupancy_kg,
      },
      current_batch: silo.current_batch,
      readings_count: recent.length,
      window: {
        from: recent[recent.length - 1]?.reading_timestamp,
        to: recent[0]?.reading_timestamp,
      },
      averages: {
        temperature: avg(recent.map((r) => Number(r.temperature_value ?? 0))),
        humidity: avg(recent.map((r) => Number(r.humidity_value ?? 0))),
        moisture: avg(recent.map((r) => Number(r.moisture_value ?? 0))),
        co2: avg(recent.map((r) => Number(r.co2_value ?? 0))),
        voc: avg(recent.map((r) => Number(r.voc_value ?? 0))),
      },
      anomalies: recent.filter((r) => r.anomaly_detected).length,
      condensation_events: recent.filter((r) => r.condensation_risk).length,
    };

    const system =
      "You are a grain-storage agronomist AI. Given recent silo telemetry, produce a concise JSON risk assessment. " +
      "Output STRICT JSON with keys: risk_level (one of: low, moderate, high, critical), insight (2-3 sentence plain-english explanation), recommendations (array of 3-5 short action items).";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Silo telemetry summary:\n${JSON.stringify(summary, null, 2)}\n\nReturn only JSON.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please top up in the workspace billing.");
    if (!res.ok) throw new Error(`AI Gateway error ${res.status}`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { risk_level?: string; insight?: string; recommendations?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { insight: content };
    }

    return {
      insight: parsed.insight ?? "No insight generated.",
      risk_level: (parsed.risk_level ?? "unknown") as
        | "low"
        | "moderate"
        | "high"
        | "critical"
        | "unknown",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      summary,
      model: "google/gemini-3-flash-preview",
    };
  });

function avg(nums: number[]) {
  const valid = nums.filter((n) => Number.isFinite(n) && n !== 0);
  if (valid.length === 0) return 0;
  return Number((valid.reduce((s, n) => s + n, 0) / valid.length).toFixed(2));
}
