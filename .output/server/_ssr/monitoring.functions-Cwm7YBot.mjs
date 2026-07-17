import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { c as stringType, n as booleanType, o as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/monitoring.functions-Cwm7YBot.js
async function role(supabase, userId) {
	return getEffectiveRole(supabase, userId);
}
function requireAny(r, allowed) {
	if (!allowed.includes(r)) throw new Error("Forbidden");
}
var getEnvironmentalOverview_createServerFn_handler = createServerRpc({
	id: "4c92e43a6b90255231e2f77d742ef2ccef782f0abd07ae0e8526908860bf7d65",
	name: "getEnvironmentalOverview",
	filename: "src/lib/monitoring.functions.ts"
}, (opts) => getEnvironmentalOverview.__executeServer(opts));
var getEnvironmentalOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getEnvironmentalOverview_createServerFn_handler, async ({ context }) => {
	requireAny(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const since = (/* @__PURE__ */ new Date(Date.now() - 24 * 3600 * 1e3)).toISOString();
	const { data: readings } = await context.supabase.from("sensor_readings").select("silo_id, warehouse_id, device_id, temperature_value, humidity_value, moisture_value, co2_value, voc_value, ambient_temperature, ambient_humidity, dew_point, condensation_risk, anomaly_detected, reading_timestamp").gte("reading_timestamp", since).order("reading_timestamp", { ascending: false }).limit(2e3);
	const rows = readings ?? [];
	const avg = (k) => rows.length ? rows.reduce((s, x) => s + Number(x[k] ?? 0), 0) / rows.length : 0;
	const min = (k) => rows.length ? Math.min(...rows.map((x) => Number(x[k] ?? Infinity))) : 0;
	const max = (k) => rows.length ? Math.max(...rows.map((x) => Number(x[k] ?? -Infinity))) : 0;
	const bySilo = /* @__PURE__ */ new Map();
	for (const r of rows) if (r.silo_id && !bySilo.has(r.silo_id)) bySilo.set(r.silo_id, r);
	const siloIds = Array.from(bySilo.keys());
	let silos = [];
	if (siloIds.length > 0) {
		const { data } = await context.supabase.from("silos").select("id, name, silo_id, warehouse_id, status").in("id", siloIds);
		silos = data ?? [];
	}
	const siloLatest = silos.map((s) => ({
		...s,
		latest: bySilo.get(s.id)
	}));
	const bins = {};
	for (let i = 23; i >= 0; i--) {
		const key = `${(/* @__PURE__ */ new Date(Date.now() - i * 3600 * 1e3)).toISOString().slice(0, 13)}:00`;
		bins[key] = {
			hour: key,
			temp: 0,
			hum: 0,
			moist: 0,
			count: 0
		};
	}
	for (const r of rows) {
		const key = `${r.reading_timestamp.slice(0, 13)}:00`;
		if (bins[key]) {
			bins[key].temp += Number(r.temperature_value ?? 0);
			bins[key].hum += Number(r.humidity_value ?? 0);
			bins[key].moist += Number(r.moisture_value ?? 0);
			bins[key].count += 1;
		}
	}
	const trend = Object.values(bins).map((b) => ({
		hour: b.hour.slice(11, 16),
		temp: b.count ? b.temp / b.count : 0,
		hum: b.count ? b.hum / b.count : 0,
		moist: b.count ? b.moist / b.count : 0
	}));
	return {
		samples: rows.length,
		env: {
			temp: {
				avg: avg("temperature_value"),
				min: min("temperature_value"),
				max: max("temperature_value")
			},
			hum: {
				avg: avg("humidity_value"),
				min: min("humidity_value"),
				max: max("humidity_value")
			},
			moist: {
				avg: avg("moisture_value"),
				min: min("moisture_value"),
				max: max("moisture_value")
			},
			co2: {
				avg: avg("co2_value"),
				max: max("co2_value")
			},
			voc: {
				avg: avg("voc_value"),
				max: max("voc_value")
			}
		},
		anomalies: rows.filter((x) => x.anomaly_detected).length,
		condensationRisk: rows.filter((x) => x.condensation_risk).length,
		trend,
		siloLatest
	};
});
var getIncidents_createServerFn_handler = createServerRpc({
	id: "7a37ae0a6f12b858c52dba22f342595fbbbe6a36c51a8bf36ec2fa4731890f4f",
	name: "getIncidents",
	filename: "src/lib/monitoring.functions.ts"
}, (opts) => getIncidents.__executeServer(opts));
var getIncidents = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getIncidents_createServerFn_handler, async ({ context }) => {
	requireAny(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const { data: alerts } = await context.supabase.from("grain_alerts").select("id, alert_id, title, message, priority, status, alert_type, sensor_type, silo_id, batch_id, warehouse_id, triggered_at, acknowledged_at, resolved_at, created_at").in("priority", ["critical", "high"]).order("triggered_at", { ascending: false }).limit(200);
	const list = alerts ?? [];
	const totals = {
		total: list.length,
		open: list.filter((x) => x.status === "open" || x.status === "active").length,
		resolved: list.filter((x) => x.status === "resolved").length,
		acknowledged: list.filter((x) => x.acknowledged_at && !x.resolved_at).length
	};
	const mtta = list.filter((x) => x.acknowledged_at && x.triggered_at);
	const mttr = list.filter((x) => x.resolved_at && x.triggered_at);
	const avgMinutes = (arr, a, b) => arr.length ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 6e4, 0) / arr.length : 0;
	return {
		incidents: list,
		totals,
		mtta: avgMinutes(mtta, "acknowledged_at", "triggered_at"),
		mttr: avgMinutes(mttr, "resolved_at", "triggered_at")
	};
});
var getPlatformIncidentsOverview_createServerFn_handler = createServerRpc({
	id: "d7de986c418601f81b50a89056ac6ba609e327d65ada6ae51c17d15776d22812",
	name: "getPlatformIncidentsOverview",
	filename: "src/lib/monitoring.functions.ts"
}, (opts) => getPlatformIncidentsOverview.__executeServer(opts));
var getPlatformIncidentsOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformIncidentsOverview_createServerFn_handler, async ({ context }) => {
	requireAny(await role(context.supabase, context.userId), ["super_admin"]);
	const { data: alerts, error } = await context.supabase.from("grain_alerts").select("id, priority, status, admin_id, triggered_at, acknowledged_at, resolved_at").order("triggered_at", { ascending: false }).limit(2e3);
	if (error) throw error;
	const list = alerts ?? [];
	const totals = {
		total: list.length,
		open: list.filter((x) => x.status === "open" || x.status === "active").length,
		resolved: list.filter((x) => x.status === "resolved").length,
		acknowledged: list.filter((x) => x.acknowledged_at && !x.resolved_at).length
	};
	const avgMin = (arr, a, b) => arr.length ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 6e4, 0) / arr.length : 0;
	const mtta = avgMin(list.filter((x) => x.acknowledged_at && x.triggered_at), "acknowledged_at", "triggered_at");
	const mttr = avgMin(list.filter((x) => x.resolved_at && x.triggered_at), "resolved_at", "triggered_at");
	const byTenant = /* @__PURE__ */ new Map();
	for (const a of list) {
		const key = a.admin_id ?? "unknown";
		const b = byTenant.get(key) ?? {
			total: 0,
			open: 0,
			critical: 0,
			lastTriggeredAt: null
		};
		b.total += 1;
		if (a.status === "open" || a.status === "active") b.open += 1;
		if (a.priority === "critical") b.critical += 1;
		if (a.triggered_at && (!b.lastTriggeredAt || a.triggered_at > b.lastTriggeredAt)) b.lastTriggeredAt = a.triggered_at;
		byTenant.set(key, b);
	}
	const ids = Array.from(byTenant.keys()).filter((k) => k !== "unknown");
	let profiles = [];
	if (ids.length > 0) {
		const { data } = await context.supabase.from("profiles").select("id, name, email").in("id", ids);
		profiles = data ?? [];
	}
	const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));
	return {
		totals,
		mtta,
		mttr,
		tenants: Array.from(byTenant.entries()).map(([adminId, b]) => ({
			adminId,
			tenantName: adminId === "unknown" ? "Unknown tenant" : nameOf.get(adminId) ?? adminId,
			...b
		})).sort((a, b) => b.open - a.open || b.critical - a.critical || b.total - a.total).slice(0, 25)
	};
});
var ackInput = objectType({
	id: stringType().uuid(),
	resolve: booleanType().optional()
});
var acknowledgeIncident_createServerFn_handler = createServerRpc({
	id: "1c2124078c28ebe0fc1d148084ebb9c6376581f94a7e873d0e2b3fdb99ddc70e",
	name: "acknowledgeIncident",
	filename: "src/lib/monitoring.functions.ts"
}, (opts) => acknowledgeIncident.__executeServer(opts));
var acknowledgeIncident = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => ackInput.parse(d)).handler(acknowledgeIncident_createServerFn_handler, async ({ data, context }) => {
	requireAny(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const patch = {
		acknowledged_at: (/* @__PURE__ */ new Date()).toISOString(),
		acknowledged_by: context.userId,
		status: "acknowledged"
	};
	if (data.resolve) {
		patch.resolved_at = (/* @__PURE__ */ new Date()).toISOString();
		patch.resolved_by = context.userId;
		patch.status = "resolved";
	}
	const { error } = await context.supabase.from("grain_alerts").update(patch).eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var getReportsData_createServerFn_handler = createServerRpc({
	id: "de89ab97da5f10332365e2fdcb41265285a468e6d3b1b0c972a3265a2f43dbb0",
	name: "getReportsData",
	filename: "src/lib/monitoring.functions.ts"
}, (opts) => getReportsData.__executeServer(opts));
var getReportsData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getReportsData_createServerFn_handler, async ({ context }) => {
	requireAny(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager"
	]);
	const [batches, alerts, invoices, silos] = await Promise.all([
		context.supabase.from("grain_batches").select("id, batch_id, grain_type, status, quantity_kg, revenue, profit, purchase_price_per_kg, sell_price_per_kg, spoilage_label, risk_score, intake_date, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(1e3),
		context.supabase.from("grain_alerts").select("id, priority, status, alert_type, created_at, resolved_at").order("created_at", { ascending: false }).limit(1e3),
		context.supabase.from("buyer_invoices").select("id, invoice_number, buyer_name, total_amount, amount_paid, payment_status, currency, created_at").order("created_at", { ascending: false }).limit(1e3),
		context.supabase.from("silos").select("id, name, capacity_kg, current_stock_kg, status").limit(500)
	]);
	return {
		batches: batches.data ?? [],
		alerts: alerts.data ?? [],
		invoices: invoices.data ?? [],
		silos: silos.data ?? []
	};
});
//#endregion
export { acknowledgeIncident_createServerFn_handler, getEnvironmentalOverview_createServerFn_handler, getIncidents_createServerFn_handler, getPlatformIncidentsOverview_createServerFn_handler, getReportsData_createServerFn_handler };
