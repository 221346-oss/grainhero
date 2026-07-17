import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType, s as recordType, u as unknownType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-audit.functions-CKHtmFpR.js
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
var listNotifications = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(listNotifInput, d)).handler(createSsrRpc("f32e1af4e8791768e34838fc2f3f11dfd1d082c92c0b31ac076a2a2faef3306c"));
var markNotificationRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(objectType({ id: stringType().uuid() }), d)).handler(createSsrRpc("92cbe571c5ea6aadb5dacc1a39e2dc8936b27b4ac33c8cab14079c74e44e339b"));
var markAllNotificationsRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("45d7da08eacd7beaabb5af9a31040e99ae6ae84fa857276e7014006b7b31b65e"));
var deleteNotification = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(objectType({ id: stringType().uuid() }), d)).handler(createSsrRpc("181870b9ec76614834b0c56ce03a12512b90bbf48fe6858e19a835b128619b25"));
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
var listActivityLogs = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(listLogsInput, d)).handler(createSsrRpc("5c27654896c05af0788da446a6ba571fd6aa8fe5e0b75c4aaa0cde6360c88cbe"));
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
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(createLogInput, d)).handler(createSsrRpc("383ca1e7f7d8063b08da47a5776d41635b11d9e372e8085490ecbf9a29fab771"));
//#endregion
export { markNotificationRead as a, markAllNotificationsRead as i, listActivityLogs as n, listNotifications as r, deleteNotification as t };
