import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-settings-insurance.functions-BJ7fJC-1.js
async function roleFlags(supabase, userId) {
	const r = await getEffectiveRole(supabase, userId);
	return {
		role: r,
		isSuper: r === "super_admin",
		isAdmin: r === "admin",
		isManager: r === "manager"
	};
}
var listTeamMembers_createServerFn_handler = createServerRpc({
	id: "bf892ef9b46bdd9412939f3cbd42379019d6141a7c60626b6fd07aea576d61d4",
	name: "listTeamMembers",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => listTeamMembers.__executeServer(opts));
var listTeamMembers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listTeamMembers_createServerFn_handler, async ({ context }) => {
	const { data: adminRow } = await context.supabase.from("profiles").select("admin_id, id").eq("id", context.userId).maybeSingle();
	const tenantId = adminRow?.admin_id ?? adminRow?.id ?? context.userId;
	const { data: profiles, error } = await context.supabase.from("profiles").select("id, name, email, phone, avatar, status, blocked, email_verified, department, employee_id, created_at, warehouse_id").or(`admin_id.eq.${tenantId},id.eq.${tenantId}`).order("created_at", { ascending: false });
	if (error) throw error;
	const ids = (profiles ?? []).map((p) => p.id);
	if (ids.length === 0) return [];
	const { data: roles } = await context.supabase.from("user_roles").select("user_id, role").in("user_id", ids);
	const roleMap = /* @__PURE__ */ new Map();
	const order = [
		"super_admin",
		"admin",
		"manager",
		"technician",
		"pending"
	];
	for (const r of roles ?? []) {
		const cur = roleMap.get(r.user_id);
		if (!cur || order.indexOf(r.role) < order.indexOf(cur)) roleMap.set(r.user_id, r.role);
	}
	return (profiles ?? []).map((p) => ({
		...p,
		role: roleMap.get(p.id) ?? "pending"
	}));
});
var inviteTeamMember_createServerFn_handler = createServerRpc({
	id: "ef22370ee284026323c6a31db9934f656c1aa1e666e2a7f1a8423eb6cf642db5",
	name: "inviteTeamMember",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => inviteTeamMember.__executeServer(opts));
var inviteTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(inviteTeamMember_createServerFn_handler, async ({ data, context }) => {
	const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
	if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");
	if (isManager && !isAdmin && !isSuper && data.role !== "technician") throw new Error("Managers can only invite technicians");
	if (isAdmin && !isSuper && data.role === "admin") throw new Error("Only super admins can invite admins");
	const tenantId = context.userId;
	const { data: tenantRow } = await context.supabase.from("profiles").select("admin_id, id").eq("id", context.userId).maybeSingle();
	const admin_id = tenantRow?.admin_id ?? tenantRow?.id ?? tenantId;
	if (!isSuper) {
		const { supabaseAdmin: sa } = await import("./client.server-Bw6iWMJ-.mjs");
		const { data: sub } = await sa.from("subscriptions").select("max_users, status").eq("admin_id", admin_id).in("status", ["active", "trial"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
		if (!sub) throw new Error("No active subscription. Purchase a plan first to invite staff.");
		const maxUsers = Number(sub.max_users ?? 0);
		const { count } = await sa.from("profiles").select("id", {
			count: "exact",
			head: true
		}).or(`admin_id.eq.${admin_id},id.eq.${admin_id}`);
		const current = count ?? 1;
		if (maxUsers > 0 && current >= maxUsers) throw new Error(`Staff limit reached (${current}/${maxUsers}). Upgrade your plan to add more members.`);
	}
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email.trim().toLowerCase(), { data: {
		name: data.name ?? "",
		invited_role: data.role,
		admin_id
	} });
	if (error) throw new Error(error.message);
	const uid = invited.user?.id;
	if (uid) {
		await supabaseAdmin.from("profiles").upsert({
			id: uid,
			email: data.email.trim().toLowerCase(),
			name: data.name ?? data.email.split("@")[0],
			admin_id,
			invited_by: context.userId,
			invitation_role: data.role
		}, { onConflict: "id" });
		await supabaseAdmin.from("user_roles").upsert({
			user_id: uid,
			role: data.role
		}, { onConflict: "user_id,role" });
	}
	return { ok: true };
});
var updateTeamMember_createServerFn_handler = createServerRpc({
	id: "af93174231cc5b2092143d617119a45364d7a502ddb645ca33bd0fdc4e45505f",
	name: "updateTeamMember",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => updateTeamMember.__executeServer(opts));
var updateTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(updateTeamMember_createServerFn_handler, async ({ data, context }) => {
	const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
	if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");
	const update = {};
	if (data.name !== void 0) update.name = data.name;
	if (data.phone !== void 0) update.phone = data.phone;
	if (data.blocked !== void 0) update.blocked = data.blocked;
	if (Object.keys(update).length) {
		const { error } = await context.supabase.from("profiles").update(update).eq("id", data.id);
		if (error) throw error;
	}
	if (data.role) {
		const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
		await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
		await supabaseAdmin.from("user_roles").insert({
			user_id: data.id,
			role: data.role
		});
	}
	return { ok: true };
});
var removeTeamMember_createServerFn_handler = createServerRpc({
	id: "e762cb76e6c320cbafd44bf444e572dd337f7d939cdf7857510d9c2f43b48ae5",
	name: "removeTeamMember",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => removeTeamMember.__executeServer(opts));
var removeTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(removeTeamMember_createServerFn_handler, async ({ data, context }) => {
	const { isSuper, isAdmin } = await roleFlags(context.supabase, context.userId);
	if (!isSuper && !isAdmin) throw new Error("Forbidden");
	if (data.id === context.userId) throw new Error("You cannot remove yourself");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var getMySettings_createServerFn_handler = createServerRpc({
	id: "51609d7b938c4518605449551942f9f3e0a17fd31ee48795d185e426c5354cc5",
	name: "getMySettings",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => getMySettings.__executeServer(opts));
var getMySettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMySettings_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("profiles").select("id, name, email, phone, avatar, business_type, address, location, preferences, department, employee_id, shift_pattern, certification_level").eq("id", context.userId).maybeSingle();
	if (error) throw error;
	return data;
});
var updateMySettings_createServerFn_handler = createServerRpc({
	id: "0778b6186cf85463455873c1f64d71ebcf4ae2a0dac631cfb546f5ec80e90663",
	name: "updateMySettings",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => updateMySettings.__executeServer(opts));
var updateMySettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(updateMySettings_createServerFn_handler, async ({ data, context }) => {
	const update = {};
	for (const k of [
		"name",
		"phone",
		"business_type",
		"avatar",
		"address",
		"location",
		"preferences"
	]) if (data[k] !== void 0) update[k] = data[k];
	const { error } = await context.supabase.from("profiles").update(update).eq("id", context.userId);
	if (error) throw error;
	return { ok: true };
});
async function tenantAdminId(supabase, userId) {
	const { data } = await supabase.from("profiles").select("admin_id, id").eq("id", userId).maybeSingle();
	return data?.admin_id ?? data?.id ?? userId;
}
var listPolicies_createServerFn_handler = createServerRpc({
	id: "938761e1f32d2678eba4cf4da4530c6bb15494b0af4d771a6a70993798d5bd92",
	name: "listPolicies",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => listPolicies.__executeServer(opts));
var listPolicies = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listPolicies_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("insurance_policies").select("*").order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
});
var upsertPolicy_createServerFn_handler = createServerRpc({
	id: "ecdc3fe21bb39ffcc78f14de9e3cdab4a201081348fffb03ab3df0f4d69be942",
	name: "upsertPolicy",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => upsertPolicy.__executeServer(opts));
var upsertPolicy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(upsertPolicy_createServerFn_handler, async ({ data, context }) => {
	const admin_id = await tenantAdminId(context.supabase, context.userId);
	const row = {
		policy_number: data.policy_number ?? `POL-${Date.now()}`,
		provider_name: data.provider_name ?? "",
		coverage_type: data.coverage_type ?? "comprehensive",
		coverage_amount: Number(data.coverage_amount ?? 0),
		premium_amount: Number(data.premium_amount ?? 0),
		deductible: Number(data.deductible ?? 0),
		status: data.status ?? "active",
		start_date: data.start_date ?? null,
		end_date: data.end_date ?? null,
		renewal_date: data.renewal_date ?? null,
		covered_batches: data.covered_batches ?? [],
		risk_factors: data.risk_factors ?? {},
		notes: data.notes ?? null,
		admin_id,
		created_by: context.userId
	};
	if (data.id) {
		const { error } = await context.supabase.from("insurance_policies").update(row).eq("id", data.id);
		if (error) throw error;
		return { id: data.id };
	}
	const { data: ins, error } = await context.supabase.from("insurance_policies").insert(row).select("id").single();
	if (error) throw error;
	return { id: ins.id };
});
var deletePolicy_createServerFn_handler = createServerRpc({
	id: "e0507d4a7cf892654ff26f984ab731de8b5a73aad2387676059737b6ba0adbe7",
	name: "deletePolicy",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => deletePolicy.__executeServer(opts));
var deletePolicy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(deletePolicy_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("insurance_policies").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var listClaims_createServerFn_handler = createServerRpc({
	id: "4a1f7e59c07e8ce484add358c9c33e35ac2ed7d6e16d00f1ab2789642f906d2e",
	name: "listClaims",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => listClaims.__executeServer(opts));
var listClaims = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listClaims_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("insurance_claims").select("*").order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
});
var upsertClaim_createServerFn_handler = createServerRpc({
	id: "d80473e6da80e5aee49e90d520c7c7926e16c38465c36dca8654620d23c6060b",
	name: "upsertClaim",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => upsertClaim.__executeServer(opts));
var upsertClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(upsertClaim_createServerFn_handler, async ({ data, context }) => {
	const admin_id = await tenantAdminId(context.supabase, context.userId);
	const row = {
		claim_number: data.claim_number ?? `CLM-${Date.now()}`,
		policy_id: data.policy_id ?? null,
		claim_type: data.claim_type ?? "spoilage",
		description: data.description ?? null,
		amount_claimed: Number(data.amount_claimed ?? 0),
		amount_approved: Number(data.amount_approved ?? 0),
		status: data.status ?? "filed",
		incident_date: data.incident_date ?? null,
		filed_date: data.filed_date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		approved_date: data.approved_date ?? null,
		batch_affected: data.batch_affected ?? {},
		photos: data.photos ?? [],
		notes: data.notes ?? null,
		admin_id,
		created_by: context.userId
	};
	if (data.id) {
		const { error } = await context.supabase.from("insurance_claims").update(row).eq("id", data.id);
		if (error) throw error;
		return { id: data.id };
	}
	const { data: ins, error } = await context.supabase.from("insurance_claims").insert(row).select("id").single();
	if (error) throw error;
	return { id: ins.id };
});
var deleteClaim_createServerFn_handler = createServerRpc({
	id: "15aa177184339f4dbb5ca446ad588a9af1a8a35a015a8728d3cf0218cd7e3c0d",
	name: "deleteClaim",
	filename: "src/lib/team-settings-insurance.functions.ts"
}, (opts) => deleteClaim.__executeServer(opts));
var deleteClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(deleteClaim_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("insurance_claims").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
//#endregion
export { deleteClaim_createServerFn_handler, deletePolicy_createServerFn_handler, getMySettings_createServerFn_handler, inviteTeamMember_createServerFn_handler, listClaims_createServerFn_handler, listPolicies_createServerFn_handler, listTeamMembers_createServerFn_handler, removeTeamMember_createServerFn_handler, updateMySettings_createServerFn_handler, updateTeamMember_createServerFn_handler, upsertClaim_createServerFn_handler, upsertPolicy_createServerFn_handler };
