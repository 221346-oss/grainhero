import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.functions-CI0Buohk.js
async function assertSuperAdmin(supabase, userId) {
	if (await getEffectiveRole(supabase, userId) !== "super_admin") throw new Error("Forbidden");
}
var getPlatformMetrics_createServerFn_handler = createServerRpc({
	id: "7d9d5b75b82531caa7b80613a9755229fd69476e7ec98d571e99476a0df20996",
	name: "getPlatformMetrics",
	filename: "src/lib/platform.functions.ts"
}, (opts) => getPlatformMetrics.__executeServer(opts));
var getPlatformMetrics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformMetrics_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const supabaseAdmin = context.supabase;
	const [profiles, roles, batches, silos, alerts, subs, logs] = await Promise.all([
		supabaseAdmin.from("profiles").select("id, admin_id, created_at, business_type, blocked", { count: "exact" }),
		supabaseAdmin.from("user_roles").select("role, user_id"),
		supabaseAdmin.from("grain_batches").select("id", {
			count: "exact",
			head: true
		}),
		supabaseAdmin.from("silos").select("id", {
			count: "exact",
			head: true
		}),
		supabaseAdmin.from("grain_alerts").select("id, priority", { count: "exact" }),
		supabaseAdmin.from("subscriptions").select("id, status, plan_name, monthly_price"),
		supabaseAdmin.from("activity_logs").select("id, severity", { count: "exact" })
	]);
	const tenants = new Set((profiles.data ?? []).filter((p) => !p.admin_id).map((p) => p.id));
	const criticalAlerts = (alerts.data ?? []).filter((a) => a.priority === "critical").length;
	const activeSubs = (subs.data ?? []).filter((s) => s.status === "active");
	const mrr = activeSubs.reduce((s, x) => s + (Number(x.monthly_price) || 0), 0);
	const roleDist = {};
	for (const r of roles.data ?? []) roleDist[r.role] = (roleDist[r.role] ?? 0) + 1;
	return {
		totalUsers: profiles.count ?? 0,
		totalTenants: tenants.size,
		totalBatches: batches.count ?? 0,
		totalSilos: silos.count ?? 0,
		totalAlerts: alerts.count ?? 0,
		criticalAlerts,
		totalLogs: logs.count ?? 0,
		activeSubscriptions: activeSubs.length,
		mrr,
		roleDistribution: roleDist,
		blockedUsers: (profiles.data ?? []).filter((p) => p.blocked).length
	};
});
var listAllUsers_createServerFn_handler = createServerRpc({
	id: "98d5be8fe9a2de824161af034a13240b244ab5e6404a7e4dad599e6cc29c0d56",
	name: "listAllUsers",
	filename: "src/lib/platform.functions.ts"
}, (opts) => listAllUsers.__executeServer(opts));
var listAllUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listAllUsers_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: profiles } = await supabaseAdmin.from("profiles").select("id, name, email, admin_id, business_type, blocked, email_verified, created_at, last_login").order("created_at", { ascending: false }).limit(500);
	const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
	const order = [
		"super_admin",
		"admin",
		"manager",
		"technician",
		"pending"
	];
	const rmap = /* @__PURE__ */ new Map();
	for (const r of roles ?? []) {
		const cur = rmap.get(r.user_id);
		if (!cur || order.indexOf(r.role) < order.indexOf(cur)) rmap.set(r.user_id, r.role);
	}
	return (profiles ?? []).map((p) => ({
		...p,
		role: rmap.get(p.id) ?? "pending"
	}));
});
var listAllTenants_createServerFn_handler = createServerRpc({
	id: "194d25263da9e3c207149529c9cb5ae79a2453b1d7884c869f33ac470ed8e050",
	name: "listAllTenants",
	filename: "src/lib/platform.functions.ts"
}, (opts) => listAllTenants.__executeServer(opts));
var listAllTenants = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listAllTenants_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: admins } = await supabaseAdmin.from("profiles").select("id, name, email, business_type, created_at, blocked, subscription_plan").is("admin_id", null).order("created_at", { ascending: false }).limit(500);
	const ids = (admins ?? []).map((a) => a.id);
	const [{ data: teamCounts }, { data: batchCounts }] = await Promise.all([supabaseAdmin.from("profiles").select("admin_id").in("admin_id", ids), supabaseAdmin.from("grain_batches").select("admin_id").in("admin_id", ids)]);
	const teamMap = /* @__PURE__ */ new Map();
	for (const r of teamCounts ?? []) if (r.admin_id) teamMap.set(r.admin_id, (teamMap.get(r.admin_id) ?? 0) + 1);
	const batchMap = /* @__PURE__ */ new Map();
	for (const r of batchCounts ?? []) if (r.admin_id) batchMap.set(r.admin_id, (batchMap.get(r.admin_id) ?? 0) + 1);
	return (admins ?? []).map((a) => ({
		...a,
		team_size: (teamMap.get(a.id) ?? 0) + 1,
		batch_count: batchMap.get(a.id) ?? 0
	}));
});
var toggleUserBlocked_createServerFn_handler = createServerRpc({
	id: "bdc913768aaa89f28ab88ca6ce2259b438166731ceefc958c922781a7c666687",
	name: "toggleUserBlocked",
	filename: "src/lib/platform.functions.ts"
}, (opts) => toggleUserBlocked.__executeServer(opts));
var toggleUserBlocked = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(toggleUserBlocked_createServerFn_handler, async ({ data, context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	if (data.id === context.userId) throw new Error("Cannot block yourself");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.from("profiles").update({ blocked: data.blocked }).eq("id", data.id);
	if (error) throw error;
	try {
		const { notifyPlatformEvent } = await import("./platform-notify.server-D3yHIDtc.mjs");
		const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", data.id).maybeSingle();
		await notifyPlatformEvent({
			type: data.blocked ? "user_blocked" : "user_unblocked",
			userId: data.id,
			email: prof?.email ?? null,
			by: context.userId
		});
	} catch {}
	return { ok: true };
});
var getPlatformLogs_createServerFn_handler = createServerRpc({
	id: "fd201edd96e7f39cd3cfd52c7148c38a62a6929c14c343a89549dd657394eb52",
	name: "getPlatformLogs",
	filename: "src/lib/platform.functions.ts"
}, (opts) => getPlatformLogs.__executeServer(opts));
var getPlatformLogs = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d = {}) => d).handler(getPlatformLogs_createServerFn_handler, async ({ data, context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	let q = supabaseAdmin.from("activity_logs").select("id, admin_id, user_id, user_name, user_role, action, category, entity_type, entity_ref, description, severity, created_at").order("created_at", { ascending: false }).limit(data.limit ?? 200);
	if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
	const { data: rows, error } = await q;
	if (error) throw error;
	return rows ?? [];
});
var getPlatformOverviewWidgets_createServerFn_handler = createServerRpc({
	id: "012258d378541291265a1e519078def84e60dea73a164aee3646b7c36be4d5db",
	name: "getPlatformOverviewWidgets",
	filename: "src/lib/platform.functions.ts"
}, (opts) => getPlatformOverviewWidgets.__executeServer(opts));
var getPlatformOverviewWidgets = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformOverviewWidgets_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const supabaseAdmin = context.supabase;
	const [signupsRes, alertsRes, seriesRes, subsRes, pipelineRes] = await Promise.all([
		supabaseAdmin.from("profiles").select("id, name, email, business_type, subscription_plan, created_at").order("created_at", { ascending: false }).limit(10),
		supabaseAdmin.from("grain_alerts").select("id, admin_id, alert_type, priority, message, created_at").in("priority", ["critical", "high"]).order("created_at", { ascending: false }).limit(10),
		supabaseAdmin.from("profiles").select("created_at").gte("created_at", (/* @__PURE__ */ new Date(Date.now() - 720 * 60 * 60 * 1e3)).toISOString()),
		supabaseAdmin.from("subscriptions").select("id, status, monthly_price, plan_name, created_at, cancelled_at"),
		supabaseAdmin.from("hubspot_sync_log").select("id, action, status, hubspot_object_type, created_at").order("created_at", { ascending: false }).limit(50)
	]);
	const buckets = {};
	for (let i = 29; i >= 0; i--) {
		const d = /* @__PURE__ */ new Date();
		d.setDate(d.getDate() - i);
		buckets[d.toISOString().slice(0, 10)] = 0;
	}
	for (const p of seriesRes.data ?? []) {
		const key = String(p.created_at ?? "").slice(0, 10);
		if (key in buckets) buckets[key] += 1;
	}
	const signupsSeries = Object.entries(buckets).map(([date, count]) => ({
		date,
		count
	}));
	const signupsTotal = signupsSeries.reduce((s, p) => s + p.count, 0);
	const last7 = signupsSeries.slice(-7).reduce((s, p) => s + p.count, 0);
	const prev7 = signupsSeries.slice(-14, -7).reduce((s, p) => s + p.count, 0);
	const wowDelta = prev7 === 0 ? last7 > 0 ? 100 : 0 : Math.round((last7 - prev7) / prev7 * 100);
	const subs = subsRes.data ?? [];
	const activeSubs = subs.filter((s) => s.status === "active");
	const churnedSubs = subs.filter((s) => s.status === "cancelled" || s.status === "canceled" || s.cancelled_at);
	const mrr = activeSubs.reduce((s, x) => s + (Number(x.monthly_price) || 0), 0);
	const pipeline = {};
	for (const r of pipelineRes.data ?? []) {
		const k = String(r.status ?? "unknown");
		pipeline[k] = (pipeline[k] ?? 0) + 1;
	}
	return {
		recentSignups: signupsRes.data ?? [],
		systemAlerts: alertsRes.data ?? [],
		signupsSeries,
		signupsTotal,
		wowDelta,
		revenue: {
			mrr,
			activeSubs: activeSubs.length,
			churnedSubs: churnedSubs.length
		},
		pipeline
	};
});
//#endregion
export { getPlatformLogs_createServerFn_handler, getPlatformMetrics_createServerFn_handler, getPlatformOverviewWidgets_createServerFn_handler, listAllTenants_createServerFn_handler, listAllUsers_createServerFn_handler, toggleUserBlocked_createServerFn_handler };
