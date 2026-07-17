import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/roles.functions-C_Z-YFnd.js
var getMyRole_createServerFn_handler = createServerRpc({
	id: "c0adc3062374bc86ae16e3547a5bb9beef089d6374a4cb215de592c0f0ada109",
	name: "getMyRole",
	filename: "src/lib/roles.functions.ts"
}, (opts) => getMyRole.__executeServer(opts));
var getMyRole = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMyRole_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (error) throw error;
	const roles = (data ?? []).map((r) => r.role);
	const primary = [
		"super_admin",
		"admin",
		"manager",
		"technician",
		"pending"
	].find((r) => roles.includes(r)) ?? "admin";
	const { data: profile } = await context.supabase.from("profiles").select("id, name, email, business_type, admin_id").eq("id", context.userId).maybeSingle();
	return {
		role: primary,
		roles,
		userId: context.userId,
		profile
	};
});
//#endregion
export { getMyRole_createServerFn_handler };
