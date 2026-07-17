import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType, s as recordType, u as unknownType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-audit.functions-qTJUGIYz.js
function parseOrThrow(schema, data) {
	const r = schema.safeParse(data);
	if (r.success) return r.data;
	const msg = r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · ");
	throw new Error(msg);
}
var listNotifInput = objectType({
	filter: enumType([
		"all",
		"unread",
		"read"
	]).default("all"),
	limit: numberType().int().min(1).max(200).default(50)
});
var listNotifications_createServerFn_handler = createServerRpc({
	id: "f32e1af4e8791768e34838fc2f3f11dfd1d082c92c0b31ac076a2a2faef3306c",
	name: "listNotifications",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => listNotifications.__executeServer(opts));
var listNotifications = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(listNotifInput, d)).handler(listNotifications_createServerFn_handler, async ({ data, context }) => {
	const limit = data.limit ?? 50;
	let q = context.supabase.from("notifications").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(limit);
	if (data.filter === "unread") q = q.eq("read", false);
	if (data.filter === "read") q = q.eq("read", true);
	const { data: rows, error } = await q;
	if (error) throw error;
	const { count } = await context.supabase.from("notifications").select("id", {
		count: "exact",
		head: true
	}).eq("user_id", context.userId).eq("read", false);
	return {
		notifications: rows ?? [],
		unread_count: count ?? 0
	};
});
var markNotificationRead_createServerFn_handler = createServerRpc({
	id: "92cbe571c5ea6aadb5dacc1a39e2dc8936b27b4ac33c8cab14079c74e44e339b",
	name: "markNotificationRead",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => markNotificationRead.__executeServer(opts));
var markNotificationRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(objectType({ id: stringType().uuid() }), d)).handler(markNotificationRead_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("notifications").update({
		read: true,
		read_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.id).eq("user_id", context.userId);
	if (error) throw error;
	return { ok: true };
});
var markAllNotificationsRead_createServerFn_handler = createServerRpc({
	id: "45d7da08eacd7beaabb5af9a31040e99ae6ae84fa857276e7014006b7b31b65e",
	name: "markAllNotificationsRead",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => markAllNotificationsRead.__executeServer(opts));
var markAllNotificationsRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(markAllNotificationsRead_createServerFn_handler, async ({ context }) => {
	const { error } = await context.supabase.from("notifications").update({
		read: true,
		read_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("user_id", context.userId).eq("read", false);
	if (error) throw error;
	return { ok: true };
});
var deleteNotification_createServerFn_handler = createServerRpc({
	id: "181870b9ec76614834b0c56ce03a12512b90bbf48fe6858e19a835b128619b25",
	name: "deleteNotification",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => deleteNotification.__executeServer(opts));
var deleteNotification = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(objectType({ id: stringType().uuid() }), d)).handler(deleteNotification_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("notifications").delete().eq("id", data.id).eq("user_id", context.userId);
	if (error) throw error;
	return { ok: true };
});
var listLogsInput = objectType({
	page: numberType().int().min(1).default(1),
	limit: numberType().int().min(1).max(100).default(20),
	search: stringType().optional().nullable(),
	category: stringType().optional().nullable(),
	severity: stringType().optional().nullable(),
	from: stringType().optional().nullable(),
	to: stringType().optional().nullable(),
	entity_ref: stringType().optional().nullable()
});
var listActivityLogs_createServerFn_handler = createServerRpc({
	id: "5c27654896c05af0788da446a6ba571fd6aa8fe5e0b75c4aaa0cde6360c88cbe",
	name: "listActivityLogs",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => listActivityLogs.__executeServer(opts));
var listActivityLogs = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(listLogsInput, d)).handler(listActivityLogs_createServerFn_handler, async ({ data, context }) => {
	const page = data.page ?? 1;
	const limit = data.limit ?? 20;
	const from = (page - 1) * limit;
	const to = from + limit - 1;
	let q = context.supabase.from("activity_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
	if (data.category && data.category !== "all") q = q.eq("category", data.category);
	if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
	if (data.from) q = q.gte("created_at", data.from);
	if (data.to) q = q.lte("created_at", `${data.to}T23:59:59Z`);
	if (data.entity_ref) q = q.eq("entity_ref", data.entity_ref);
	if (data.search) q = q.or(`description.ilike.%${data.search}%,action.ilike.%${data.search}%,entity_ref.ilike.%${data.search}%`);
	const { data: rows, error, count } = await q.range(from, to);
	if (error) throw error;
	const { data: catRows } = await context.supabase.from("activity_logs").select("category");
	const categories = {};
	for (const r of catRows ?? []) {
		const k = r.category ?? "system";
		categories[k] = (categories[k] ?? 0) + 1;
	}
	const total = count ?? 0;
	return {
		logs: rows ?? [],
		pagination: {
			current_page: page,
			total_pages: Math.max(1, Math.ceil(total / limit)),
			total_items: total,
			items_per_page: limit
		},
		summary: { categories }
	};
});
var createLogInput = objectType({
	action: stringType().min(1).max(120),
	category: stringType().min(1).max(60).default("system"),
	description: stringType().min(1).max(2e3),
	entity_type: stringType().max(60).optional().nullable(),
	entity_id: stringType().max(120).optional().nullable(),
	entity_ref: stringType().max(120).optional().nullable(),
	severity: enumType([
		"info",
		"warning",
		"critical"
	]).default("info"),
	metadata: recordType(stringType(), unknownType()).optional().nullable()
});
var createActivityLog_createServerFn_handler = createServerRpc({
	id: "383ca1e7f7d8063b08da47a5776d41635b11d9e372e8085490ecbf9a29fab771",
	name: "createActivityLog",
	filename: "src/lib/notifications-audit.functions.ts"
}, (opts) => createActivityLog.__executeServer(opts));
var createActivityLog = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(createLogInput, d)).handler(createActivityLog_createServerFn_handler, async ({ data, context }) => {
	const { data: prof } = await context.supabase.from("profiles").select("id, name, admin_id").eq("id", context.userId).maybeSingle();
	const { data: roleRow } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
	const adminId = prof?.admin_id ?? context.userId;
	const { error } = await context.supabase.from("activity_logs").insert({
		admin_id: adminId,
		user_id: context.userId,
		user_name: prof?.name ?? null,
		user_role: roleRow?.role ?? null,
		action: data.action,
		category: data.category,
		description: data.description,
		entity_type: data.entity_type ?? null,
		entity_id: data.entity_id ?? null,
		entity_ref: data.entity_ref ?? null,
		severity: data.severity,
		metadata: data.metadata ?? {}
	});
	if (error) throw error;
	return { ok: true };
});
//#endregion
export { createActivityLog_createServerFn_handler, deleteNotification_createServerFn_handler, listActivityLogs_createServerFn_handler, listNotifications_createServerFn_handler, markAllNotificationsRead_createServerFn_handler, markNotificationRead_createServerFn_handler };
