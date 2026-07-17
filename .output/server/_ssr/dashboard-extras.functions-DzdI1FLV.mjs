import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-extras.functions-DzdI1FLV.js
var getDashboardExtras_createServerFn_handler = createServerRpc({
	id: "9039be0cf3aa5605e260b0a029dc1f7c1519925b3d71fbf487063178cdd2f981",
	name: "getDashboardExtras",
	filename: "src/lib/dashboard-extras.functions.ts"
}, (opts) => getDashboardExtras.__executeServer(opts));
var getDashboardExtras = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getDashboardExtras_createServerFn_handler, async ({ context }) => {
	const [batchesRes, alertsRes, profilesRes, actuatorsRes, silosRes] = await Promise.all([
		context.supabase.from("grain_batches").select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, purchase_price_per_kg, revenue, profit").order("created_at", { ascending: false }).limit(5),
		context.supabase.from("grain_alerts").select("id, alert_id, title, message, priority, status, alert_type, triggered_at").order("triggered_at", {
			ascending: false,
			nullsFirst: false
		}).limit(5),
		context.supabase.from("profiles").select("id, name, email, updated_at").order("updated_at", {
			ascending: false,
			nullsFirst: false
		}).limit(5),
		context.supabase.from("actuators").select("id, name, actuator_type, status, is_on, power_level, silo_id, silos:silo_id(name)").limit(6),
		context.supabase.from("silos").select("id, silo_id, name, capacity_kg, current_occupancy_kg, status, current_batch:grain_batches!fk_silos_current_batch(id, grain_type)").order("created_at", { ascending: false }).limit(8)
	]);
	const batches = batchesRes.data ?? [];
	const revenue = batches.filter((b) => b.status === "dispatched").reduce((s, b) => s + Number(b.revenue ?? Number(b.purchase_price_per_kg ?? 0) * Number(b.quantity_kg ?? 0)), 0);
	return {
		recentBatches: batches,
		recentAlerts: alertsRes.data ?? [],
		team: profilesRes.data ?? [],
		actuators: actuatorsRes.data ?? [],
		silos: silosRes.data ?? [],
		revenue
	};
});
//#endregion
export { getDashboardExtras_createServerFn_handler };
