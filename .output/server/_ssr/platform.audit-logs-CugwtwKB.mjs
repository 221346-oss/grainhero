import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.audit-logs-CugwtwKB.js
var getAudit_createServerFn_handler = createServerRpc({
	id: "18a3b9203256bebdd8ed40e10b9dde511b9fc2eba30199d6fd960e16899c903f",
	name: "getAudit",
	filename: "src/routes/_authenticated/platform.audit-logs.tsx"
}, (opts) => getAudit.__executeServer(opts));
var getAudit = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getAudit_createServerFn_handler, async ({ context }) => {
	const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");
	const [{ data: activity }, { data: security }] = await Promise.all([context.supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100), context.supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(100)]);
	return {
		activity: activity ?? [],
		security: security ?? []
	};
});
//#endregion
export { getAudit_createServerFn_handler };
