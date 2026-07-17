import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-no-admin.functions-DUhUY5xV.js
var getPlatformMetrics_createServerFn_handler = createServerRpc({
	id: "b026013b7cc822ae3d1ef4293c7e33ae8e749d31691fa9168c0ebd9d43ffbcff",
	name: "getPlatformMetrics",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => getPlatformMetrics.__executeServer(opts));
var getPlatformMetrics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformMetrics_createServerFn_handler, async ({ context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const [profiles, roles, batches, silos, alerts, subs, logs] = await Promise.all([
		context.supabase.from("profiles").select("id, admin_id, created_at, business_type, blocked", { count: "exact" }),
		context.supabase.from("user_roles").select("role, user_id"),
		context.supabase.from("grain_batches").select("id", {
			count: "exact",
			head: true
		}),
		context.supabase.from("silos").select("id", {
			count: "exact",
			head: true
		}),
		context.supabase.from("grain_alerts").select("id, priority", { count: "exact" }),
		context.supabase.from("subscriptions").select("id, status, plan_name, monthly_price"),
		context.supabase.from("activity_logs").select("id, severity", { count: "exact" })
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
	id: "25f30cf84b271040f09acca59d0cc1fd12995ea0b9a84e00fe25137a4e664718",
	name: "listAllUsers",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => listAllUsers.__executeServer(opts));
var listAllUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listAllUsers_createServerFn_handler, async ({ context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const { data: profiles } = await context.supabase.from("profiles").select("id, name, email, admin_id, business_type, blocked, email_verified, created_at, last_login").order("created_at", { ascending: false }).limit(500);
	const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
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
	id: "b3f064562e45be494aa7db9cdb62d3515512cf903275fb4cbea16428ca7ae8a4",
	name: "listAllTenants",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => listAllTenants.__executeServer(opts));
var listAllTenants = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listAllTenants_createServerFn_handler, async ({ context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const { data: admins } = await context.supabase.from("profiles").select("id, name, email, business_type, created_at, blocked, subscription_plan").is("admin_id", null).order("created_at", { ascending: false }).limit(500);
	const ids = (admins ?? []).map((a) => a.id);
	const [{ data: teamCounts }, { data: batchCounts }] = await Promise.all([context.supabase.from("profiles").select("admin_id").in("admin_id", ids), context.supabase.from("grain_batches").select("admin_id").in("admin_id", ids)]);
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
	id: "3236c0268227674414afc1dbd4ece9d09bc59beacbfc8fead48dcf8042fc1471",
	name: "toggleUserBlocked",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => toggleUserBlocked.__executeServer(opts));
var toggleUserBlocked = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(toggleUserBlocked_createServerFn_handler, async ({ data, context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	if (data.id === context.userId) throw new Error("Cannot block yourself");
	const { error } = await context.supabase.from("profiles").update({ blocked: data.blocked }).eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var getPlatformLogs_createServerFn_handler = createServerRpc({
	id: "96a7f7f07a1e29d3184a8668245da2d9059dd9222ee39248a53ae62f7416a5f8",
	name: "getPlatformLogs",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => getPlatformLogs.__executeServer(opts));
var getPlatformLogs = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d = {}) => d).handler(getPlatformLogs_createServerFn_handler, async ({ data, context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	let q = context.supabase.from("activity_logs").select("id, admin_id, user_id, user_name, user_role, action, category, entity_type, entity_ref, description, severity, created_at").order("created_at", { ascending: false }).limit(data.limit ?? 200);
	if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
	const { data: rows, error } = await q;
	if (error) throw error;
	return rows ?? [];
});
var getPlatformOverviewWidgets_createServerFn_handler = createServerRpc({
	id: "1253c6f59a9a5145f096a09d76279ae74ae0838026d4c09e99d66569cdceb45d",
	name: "getPlatformOverviewWidgets",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => getPlatformOverviewWidgets.__executeServer(opts));
var getPlatformOverviewWidgets = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformOverviewWidgets_createServerFn_handler, async ({ context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const [signupsRes, alertsRes, seriesRes, subsRes, pipelineRes] = await Promise.all([
		context.supabase.from("profiles").select("id, name, email, business_type, subscription_plan, created_at").order("created_at", { ascending: false }).limit(10),
		context.supabase.from("grain_alerts").select("id, admin_id, alert_type, priority, message, created_at").in("priority", ["critical", "high"]).order("created_at", { ascending: false }).limit(10),
		context.supabase.from("profiles").select("created_at").gte("created_at", (/* @__PURE__ */ new Date(Date.now() - 720 * 60 * 60 * 1e3)).toISOString()),
		context.supabase.from("subscriptions").select("id, status, monthly_price, plan_name, created_at, cancelled_at"),
		context.supabase.from("hubspot_sync_log").select("id, action, status, hubspot_object_type, created_at").order("created_at", { ascending: false }).limit(50)
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
var getAllSubscriptions_createServerFn_handler = createServerRpc({
	id: "f678a0f976ce5c311cbc32284024ec3fdf4f7021f96ce7a94407fc1dc23877c5",
	name: "getAllSubscriptions",
	filename: "src/lib/platform-no-admin.functions.ts"
}, (opts) => getAllSubscriptions.__executeServer(opts));
var getAllSubscriptions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getAllSubscriptions_createServerFn_handler, async ({ context }) => {
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const { data: subscriptions, error: subError } = await context.supabase.from("subscriptions").select("id, admin_id, plan_name, plan_description, status, monthly_price, currency, next_payment_date, start_date, end_date, billing_cycle, created_at").order("created_at", { ascending: false }).limit(500);
	if (subError) throw subError;
	const adminIds = (subscriptions ?? []).map((s) => s.admin_id).filter(Boolean);
	const { data: profiles } = await context.supabase.from("profiles").select("id, name, email, business_type").in("id", adminIds);
	const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
	return (subscriptions ?? []).map((s) => {
		const profile = profileMap.get(s.admin_id);
		return {
			...s,
			user_name: profile?.name ?? "Unknown",
			user_email: profile?.email ?? "N/A",
			business_type: profile?.business_type ?? "N/A"
		};
	});
});
//#endregion
export { getAllSubscriptions_createServerFn_handler, getPlatformLogs_createServerFn_handler, getPlatformMetrics_createServerFn_handler, getPlatformOverviewWidgets_createServerFn_handler, listAllTenants_createServerFn_handler, listAllUsers_createServerFn_handler, toggleUserBlocked_createServerFn_handler };
