import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-insights.functions-BR61WsUz.js
var getSpoilageInsight_createServerFn_handler = createServerRpc({
	id: "7189c5f79d9925067abb88ead3cf25d99a7dd5237c7d9729752630e38f7746d3",
	name: "getSpoilageInsight",
	filename: "src/lib/ai-insights.functions.ts"
}, (opts) => getSpoilageInsight.__executeServer(opts));
var getSpoilageInsight = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ siloId: stringType().uuid() }).parse(d)).handler(getSpoilageInsight_createServerFn_handler, async ({ data, context }) => {
	const apiKey = processModule.env.LOVABLE_API_KEY;
	if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
	const { data: silo } = await context.supabase.from("silos").select("id, silo_id, name, capacity_kg, current_occupancy_kg, current_batch:grain_batches!fk_silos_current_batch(id, batch_id, grain_type, moisture_content, quantity_kg)").eq("id", data.siloId).single();
	if (!silo) throw new Error("Silo not found");
	const { data: readings } = await context.supabase.from("sensor_readings").select("reading_timestamp, temperature_value, humidity_value, moisture_value, co2_value, voc_value, anomaly_detected, condensation_risk").eq("silo_id", data.siloId).order("reading_timestamp", { ascending: false }).limit(48);
	const recent = readings ?? [];
	if (recent.length === 0) return {
		insight: "No recent sensor readings for this silo. Ensure at least one sensor is online and reporting.",
		risk_level: "unknown",
		recommendations: [],
		model: "none"
	};
	const summary = {
		silo: {
			id: silo.silo_id,
			name: silo.name,
			capacity_kg: silo.capacity_kg,
			occupancy_kg: silo.current_occupancy_kg
		},
		current_batch: silo.current_batch,
		readings_count: recent.length,
		window: {
			from: recent[recent.length - 1]?.reading_timestamp,
			to: recent[0]?.reading_timestamp
		},
		averages: {
			temperature: avg(recent.map((r) => Number(r.temperature_value ?? 0))),
			humidity: avg(recent.map((r) => Number(r.humidity_value ?? 0))),
			moisture: avg(recent.map((r) => Number(r.moisture_value ?? 0))),
			co2: avg(recent.map((r) => Number(r.co2_value ?? 0))),
			voc: avg(recent.map((r) => Number(r.voc_value ?? 0)))
		},
		anomalies: recent.filter((r) => r.anomaly_detected).length,
		condensation_events: recent.filter((r) => r.condensation_risk).length
	};
	const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Lovable-API-Key": apiKey
		},
		body: JSON.stringify({
			model: "google/gemini-3-flash-preview",
			messages: [{
				role: "system",
				content: "You are a grain-storage agronomist AI. Given recent silo telemetry, produce a concise JSON risk assessment. Output STRICT JSON with keys: risk_level (one of: low, moderate, high, critical), insight (2-3 sentence plain-english explanation), recommendations (array of 3-5 short action items)."
			}, {
				role: "user",
				content: `Silo telemetry summary:\n${JSON.stringify(summary, null, 2)}\n\nReturn only JSON.`
			}],
			response_format: { type: "json_object" }
		})
	});
	if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
	if (res.status === 402) throw new Error("AI credits exhausted. Please top up in the workspace billing.");
	if (!res.ok) throw new Error(`AI Gateway error ${res.status}`);
	const content = (await res.json()).choices?.[0]?.message?.content ?? "{}";
	let parsed = {};
	try {
		parsed = JSON.parse(content);
	} catch {
		parsed = { insight: content };
	}
	return {
		insight: parsed.insight ?? "No insight generated.",
		risk_level: parsed.risk_level ?? "unknown",
		recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
		summary,
		model: "google/gemini-3-flash-preview"
	};
});
function avg(nums) {
	const valid = nums.filter((n) => Number.isFinite(n) && n !== 0);
	if (valid.length === 0) return 0;
	return Number((valid.reduce((s, n) => s + n, 0) / valid.length).toFixed(2));
}
//#endregion
export { getSpoilageInsight_createServerFn_handler };
