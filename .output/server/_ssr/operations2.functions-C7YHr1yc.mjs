import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/operations2.functions-C7YHr1yc.js
async function role(supabase, userId) {
	return getEffectiveRole(supabase, userId);
}
function req(r, allowed) {
	if (!allowed.includes(r)) throw new Error("Forbidden");
}
var getMaintenanceOverview_createServerFn_handler = createServerRpc({
	id: "18e1d22b3fba65d1055699856d4cbd9d96a856cf1d192e2d15db5463da40ab81",
	name: "getMaintenanceOverview",
	filename: "src/lib/operations2.functions.ts"
}, (opts) => getMaintenanceOverview.__executeServer(opts));
var getMaintenanceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMaintenanceOverview_createServerFn_handler, async ({ context }) => {
	req(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const { data: devices } = await context.supabase.from("sensor_devices").select("id, device_id, device_name, device_type, status, connection_status, battery_level, last_heartbeat, last_maintenance_date, next_maintenance_date, calibration_due_date, warranty_expiry, silo_id, warehouse_id, manufacturer, model, firmware_version").is("deleted_at", null).order("next_maintenance_date", {
		ascending: true,
		nullsFirst: false
	}).limit(500);
	const { data: actuators } = await context.supabase.from("actuators").select("id, actuator_id, name, actuator_type, status, last_maintenance_date, next_maintenance_date, silo_id").limit(500);
	const list = devices ?? [];
	const now = Date.now();
	const soon = now + 720 * 3600 * 1e3;
	const totals = {
		devices: list.length,
		actuators: (actuators ?? []).length,
		overdue: list.filter((d) => d.next_maintenance_date && new Date(d.next_maintenance_date).getTime() < now).length,
		dueSoon: list.filter((d) => {
			if (!d.next_maintenance_date) return false;
			const t = new Date(d.next_maintenance_date).getTime();
			return t >= now && t <= soon;
		}).length,
		lowBattery: list.filter((d) => d.battery_level != null && d.battery_level < 20).length,
		warrantyExpiring: list.filter((d) => d.warranty_expiry && new Date(d.warranty_expiry).getTime() <= soon).length
	};
	return {
		devices: list,
		actuators: actuators ?? [],
		totals
	};
});
var getPlatformMaintenanceOverview_createServerFn_handler = createServerRpc({
	id: "14a224dbf7ff1a071688a66334eea88b215e34881148b9a1eb567438f9311629",
	name: "getPlatformMaintenanceOverview",
	filename: "src/lib/operations2.functions.ts"
}, (opts) => getPlatformMaintenanceOverview.__executeServer(opts));
var getPlatformMaintenanceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformMaintenanceOverview_createServerFn_handler, async ({ context }) => {
	req(await role(context.supabase, context.userId), ["super_admin"]);
	const { data: devices, error } = await context.supabase.from("sensor_devices").select("id, admin_id, battery_level, next_maintenance_date").is("deleted_at", null).limit(5e3);
	if (error) throw error;
	const list = devices ?? [];
	const now = Date.now();
	const soon = now + 720 * 3600 * 1e3;
	const byTenant = /* @__PURE__ */ new Map();
	for (const d of list) {
		const key = d.admin_id ?? "unknown";
		const b = byTenant.get(key) ?? {
			devices: 0,
			overdue: 0,
			dueSoon: 0,
			lowBattery: 0
		};
		b.devices += 1;
		if (d.next_maintenance_date) {
			const t = new Date(d.next_maintenance_date).getTime();
			if (t < now) b.overdue += 1;
			else if (t <= soon) b.dueSoon += 1;
		}
		if (d.battery_level != null && d.battery_level < 20) b.lowBattery += 1;
		byTenant.set(key, b);
	}
	const ids = Array.from(byTenant.keys()).filter((k) => k !== "unknown");
	let profiles = [];
	if (ids.length > 0) {
		const { data } = await context.supabase.from("profiles").select("id, name, email").in("id", ids);
		profiles = data ?? [];
	}
	const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));
	const tenants = Array.from(byTenant.entries()).map(([adminId, b]) => ({
		adminId,
		tenantName: adminId === "unknown" ? "Unknown tenant" : nameOf.get(adminId) ?? adminId,
		...b
	})).sort((a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon || b.lowBattery - a.lowBattery).slice(0, 25);
	const totals = {
		devices: list.length,
		overdue: tenants.reduce((s, t) => s + t.overdue, 0) + Array.from(byTenant.values()).slice(25).reduce((s, t) => s + t.overdue, 0),
		dueSoon: Array.from(byTenant.values()).reduce((s, t) => s + t.dueSoon, 0),
		lowBattery: Array.from(byTenant.values()).reduce((s, t) => s + t.lowBattery, 0)
	};
	totals.overdue = Array.from(byTenant.values()).reduce((s, t) => s + t.overdue, 0);
	return {
		totals,
		tenants
	};
});
var maintInput = objectType({
	id: stringType().uuid(),
	kind: enumType(["device", "actuator"]),
	nextInDays: numberType().int().min(1).max(3650).default(180)
});
var markMaintenanceDone_createServerFn_handler = createServerRpc({
	id: "6ef1852e6fc3f048aa1331546d7bd49399be311d0877d6b095b725e493285644",
	name: "markMaintenanceDone",
	filename: "src/lib/operations2.functions.ts"
}, (opts) => markMaintenanceDone.__executeServer(opts));
var markMaintenanceDone = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => maintInput.parse(d)).handler(markMaintenanceDone_createServerFn_handler, async ({ data, context }) => {
	req(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const now = /* @__PURE__ */ new Date();
	const next = new Date(now.getTime() + data.nextInDays * 24 * 3600 * 1e3);
	const table = data.kind === "device" ? "sensor_devices" : "actuators";
	const { error } = await context.supabase.from(table).update({
		last_maintenance_date: now.toISOString(),
		next_maintenance_date: next.toISOString()
	}).eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var getDeviceHealth_createServerFn_handler = createServerRpc({
	id: "8a2e616c0cae24006c055ded15599b5b9aeb4eb692912d089912c3be9dba86fe",
	name: "getDeviceHealth",
	filename: "src/lib/operations2.functions.ts"
}, (opts) => getDeviceHealth.__executeServer(opts));
var getDeviceHealth = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getDeviceHealth_createServerFn_handler, async ({ context }) => {
	req(await role(context.supabase, context.userId), [
		"super_admin",
		"admin",
		"manager",
		"technician"
	]);
	const { data: devices } = await context.supabase.from("sensor_devices").select("id, device_id, device_name, device_type, status, connection_status, battery_level, signal_strength, last_heartbeat, expected_heartbeat_interval, silo_id, warehouse_id, firmware_version").is("deleted_at", null).limit(500);
	const list = devices ?? [];
	const now = Date.now();
	const online = list.filter((d) => {
		if (!d.last_heartbeat) return false;
		return now - new Date(d.last_heartbeat).getTime() <= (d.expected_heartbeat_interval ?? 300) * 1e3 * 3;
	});
	const offline = list.filter((d) => !online.includes(d));
	return {
		devices: list.map((d) => ({
			...d,
			online: online.includes(d),
			secondsSinceHeartbeat: d.last_heartbeat ? Math.round((now - new Date(d.last_heartbeat).getTime()) / 1e3) : null
		})),
		totals: {
			total: list.length,
			online: online.length,
			offline: offline.length,
			lowBattery: list.filter((d) => d.battery_level != null && d.battery_level < 20).length,
			weakSignal: list.filter((d) => d.signal_strength != null && d.signal_strength < -85).length
		}
	};
});
var getSecurityOverview_createServerFn_handler = createServerRpc({
	id: "67c98ecc966c1f9f24c4c4149a1e3dc908eae843a3429f91d47bcb9b8931b1b8",
	name: "getSecurityOverview",
	filename: "src/lib/operations2.functions.ts"
}, (opts) => getSecurityOverview.__executeServer(opts));
var getSecurityOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getSecurityOverview_createServerFn_handler, async ({ context }) => {
	req(await role(context.supabase, context.userId), ["super_admin", "admin"]);
	const [rolesRes, profilesRes, logsRes] = await Promise.all([
		context.supabase.from("user_roles").select("user_id, role").limit(1e3),
		context.supabase.from("profiles").select("id, name, email, blocked, last_login_at, admin_id, created_at").limit(1e3),
		context.supabase.from("activity_logs").select("id, action, entity_type, entity_id, actor_id, severity, message, metadata, created_at").in("severity", [
			"warning",
			"error",
			"critical"
		]).order("created_at", { ascending: false }).limit(200)
	]);
	const profiles = profilesRes.data ?? [];
	const roles = rolesRes.data ?? [];
	const logs = logsRes.data ?? [];
	const roleMap = /* @__PURE__ */ new Map();
	for (const rr of roles) {
		const arr = roleMap.get(rr.user_id) ?? [];
		arr.push(rr.role);
		roleMap.set(rr.user_id, arr);
	}
	const users = profiles.map((p) => ({
		...p,
		roles: roleMap.get(p.id) ?? []
	}));
	return {
		users,
		logs,
		totals: {
			users: users.length,
			blocked: users.filter((u) => u.blocked).length,
			admins: users.filter((u) => u.roles.includes("admin") || u.roles.includes("super_admin")).length,
			pending: users.filter((u) => u.roles.includes("pending") || u.roles.length === 0).length,
			recentIncidents: logs.length
		}
	};
});
//#endregion
export { getDeviceHealth_createServerFn_handler, getMaintenanceOverview_createServerFn_handler, getPlatformMaintenanceOverview_createServerFn_handler, getSecurityOverview_createServerFn_handler, markMaintenanceDone_createServerFn_handler };
