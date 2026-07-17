import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.health-BNzWGPmT.js
var getHealth_createServerFn_handler = createServerRpc({
	id: "ed71cb63a3da22fbef9065183b002bd4e5cb8d015b9cee3453aecabd8e8984f8",
	name: "getHealth",
	filename: "src/routes/_authenticated/platform.health.tsx"
}, (opts) => getHealth.__executeServer(opts));
var getHealth = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getHealth_createServerFn_handler, async ({ context }) => {
	const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");
	const now = Date.now();
	const day = 1440 * 60 * 1e3;
	const [{ count: eventsToday }, { count: events7d }, { count: events30d }, { count: activeUsers }, { count: totalUsers }] = await Promise.all([
		context.supabase.from("security_events").select("id", {
			count: "exact",
			head: true
		}).gte("created_at", (/* @__PURE__ */ new Date(now - day)).toISOString()),
		context.supabase.from("security_events").select("id", {
			count: "exact",
			head: true
		}).gte("created_at", (/* @__PURE__ */ new Date(now - 7 * day)).toISOString()),
		context.supabase.from("security_events").select("id", {
			count: "exact",
			head: true
		}).gte("created_at", (/* @__PURE__ */ new Date(now - 30 * day)).toISOString()),
		context.supabase.from("profiles").select("id", {
			count: "exact",
			head: true
		}).gte("last_login", (/* @__PURE__ */ new Date(now - 30 * day)).toISOString()),
		context.supabase.from("profiles").select("id", {
			count: "exact",
			head: true
		})
	]);
	const { data: recentEvents } = await context.supabase.from("security_events").select("id, event, created_at, meta").order("created_at", { ascending: false }).limit(10);
	return {
		services: {
			api: "healthy",
			database: "healthy",
			realtime: "healthy"
		},
		metrics: {
			errorsToday: eventsToday ?? 0,
			errors7d: events7d ?? 0,
			errors30d: events30d ?? 0,
			activeUsers: activeUsers ?? 0,
			totalUsers: totalUsers ?? 0,
			uptimePct: 99.95
		},
		recentEvents: recentEvents ?? []
	};
});
//#endregion
export { getHealth_createServerFn_handler };
