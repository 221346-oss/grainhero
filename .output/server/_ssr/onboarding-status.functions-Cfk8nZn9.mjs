import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-status.functions-Cfk8nZn9.js
/**
* Returns the signed-in user's onboarding progress so the post-payment welcome
* screen can guide them through the remaining steps (email confirmation,
* subscription activation, latest install order status).
*/
var getMyOnboardingStatus_createServerFn_handler = createServerRpc({
	id: "55bc33533dabdc2a2fe0081aaa5f75740b171876e872c010ca64af9a4859df10",
	name: "getMyOnboardingStatus",
	filename: "src/lib/onboarding-status.functions.ts"
}, (opts) => getMyOnboardingStatus.__executeServer(opts));
var getMyOnboardingStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMyOnboardingStatus_createServerFn_handler, async ({ context }) => {
	const { supabase, userId, claims } = context;
	const email = claims?.email ?? null;
	const emailVerified = Boolean(claims?.email_verified);
	const { data: profile } = await supabase.from("profiles").select("id, name, email, business_type").eq("id", userId).maybeSingle();
	const { data: sub } = await supabase.from("subscriptions").select("id, plan_name, status, end_date").eq("admin_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
	const { data: latestOrderRaw } = await supabase.from("hardware_orders").select("id, status, plan_name, hardware_quantity, hardware_total, currency, created_at, technician_name, preferred_install_date").eq("admin_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
	const { data: pendingOrdersRaw } = await supabase.from("hardware_orders").select("id, plan_id, plan_name, hardware_quantity, created_at").eq("admin_id", userId).eq("status", "pending_payment").order("created_at", { ascending: false });
	const subRow = sub ?? null;
	const subActive = subRow?.status === "active" || subRow?.status === "trialing";
	return {
		email,
		emailVerified,
		profile: profile ?? null,
		subscription: sub ?? null,
		subscriptionActive: subActive,
		latestOrder: latestOrderRaw ?? null,
		pendingOrders: pendingOrdersRaw ?? []
	};
});
//#endregion
export { getMyOnboardingStatus_createServerFn_handler };
