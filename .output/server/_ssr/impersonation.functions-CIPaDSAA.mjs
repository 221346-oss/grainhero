import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/impersonation.functions-CIPaDSAA.js
var startImpersonation_createServerFn_handler = createServerRpc({
	id: "5b1de10c308e266e3f23e21e073938fa6f09ebe5ca1220f58917040a6c56605b",
	name: "startImpersonation",
	filename: "src/lib/impersonation.functions.ts"
}, (opts) => startImpersonation.__executeServer(opts));
var startImpersonation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(startImpersonation_createServerFn_handler, async ({ data, context }) => {
	console.log("Starting impersonation for userId:", context.userId, "adminId:", data.adminId);
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	const { data: targetUser } = await context.supabase.from("profiles").select("id, name, email, business_type").eq("id", data.adminId).single();
	if (!targetUser) throw new Error("Target user not found");
	const { data: hasAdminRole } = await context.supabase.rpc("has_role", {
		_user_id: data.adminId,
		_role: "admin"
	});
	if (!hasAdminRole) throw new Error("Target user is not an admin");
	return {
		success: true,
		adminName: targetUser.name || targetUser.email,
		adminId: targetUser.id,
		adminEmail: targetUser.email,
		businessType: targetUser.business_type
	};
});
var stopImpersonation_createServerFn_handler = createServerRpc({
	id: "2ef214d2dc1ef62c296192dee38d880f1c348549a233c6bccd79c767c89ff98e",
	name: "stopImpersonation",
	filename: "src/lib/impersonation.functions.ts"
}, (opts) => stopImpersonation.__executeServer(opts));
var stopImpersonation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(stopImpersonation_createServerFn_handler, async ({ context }) => {
	console.log("Stopping impersonation for userId:", context.userId);
	const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "super_admin"
	});
	if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
	return { success: true };
});
//#endregion
export { startImpersonation_createServerFn_handler, stopImpersonation_createServerFn_handler };
