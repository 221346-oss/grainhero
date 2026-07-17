//#region node_modules/.nitro/vite/services/ssr/assets/rbac.server-BDKrrmZN.js
/**
* Single source of truth for "what is this user's effective role?".
* Backed by public.get_my_role() which returns the highest-priority role
* in one round-trip. Replaces scattered has_role() loops.
*/
async function getEffectiveRole(supabase, userId) {
	const { data, error } = await supabase.rpc("get_my_role", { _user_id: userId });
	if (error) throw error;
	return data ?? "admin";
}
/** True when the user is a platform super admin. */
async function isSuperAdmin(supabase, userId) {
	return await getEffectiveRole(supabase, userId) === "super_admin";
}
//#endregion
export { getEffectiveRole, isSuperAdmin };
