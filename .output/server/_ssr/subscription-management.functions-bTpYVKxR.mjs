import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { o as objectType, r as enumType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { n as pricingData } from "./pricing-data-BA_Y9Elr.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/subscription-management.functions-bTpYVKxR.js
var STRIPE_API = "https://api.stripe.com/v1";
function form(params) {
	const body = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== void 0 && v !== null) body.append(k, String(v));
	return body;
}
async function stripeFetch(path, body, method = "POST") {
	const key = processModule.env.STRIPE_SECRET_KEY;
	if (!key) throw new Error("Stripe not configured");
	const res = await fetch(`${STRIPE_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: body ?? void 0
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
	return JSON.parse(text);
}
async function getMyStripeSubscription(supabase, userId) {
	const { data: sub } = await supabase.from("subscriptions").select("*").eq("admin_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
	if (!sub) throw new Error("No subscription found");
	if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
	return sub;
}
var changeMyPlan_createServerFn_handler = createServerRpc({
	id: "6e6312feb9d61f98bb5aaf29081b9f0b41fe9d1bb49ca41394ec8b4cf7a911b7",
	name: "changeMyPlan",
	filename: "src/lib/subscription-management.functions.ts"
}, (opts) => changeMyPlan.__executeServer(opts));
var changeMyPlan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ planId: enumType([
	"basic",
	"intermediate",
	"pro"
]) }).parse(d)).handler(changeMyPlan_createServerFn_handler, async ({ data, context }) => {
	const plan = pricingData.find((p) => p.id === data.planId);
	if (!plan) throw new Error("Unknown plan");
	const sub = await getMyStripeSubscription(context.supabase, context.userId);
	const itemId = (await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, null, "GET")).items?.data?.[0]?.id;
	if (!itemId) throw new Error("Stripe subscription item missing");
	const params = form({
		"items[0][id]": itemId,
		"items[0][price_data][currency]": String(plan.currency ?? "usd").toLowerCase(),
		"items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
		"items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
		"items[0][price_data][recurring][interval]": plan.interval ?? "month",
		proration_behavior: "create_prorations",
		cancel_at_period_end: "false",
		"metadata[plan_id]": plan.id
	});
	await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, params);
	return { ok: true };
});
var cancelAtPeriodEnd_createServerFn_handler = createServerRpc({
	id: "971b65ef500cb962af48476c71dccd6a376b3d16d36ae10779453452608f23ca",
	name: "cancelAtPeriodEnd",
	filename: "src/lib/subscription-management.functions.ts"
}, (opts) => cancelAtPeriodEnd.__executeServer(opts));
var cancelAtPeriodEnd = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(cancelAtPeriodEnd_createServerFn_handler, async ({ context }) => {
	await stripeFetch(`/subscriptions/${(await getMyStripeSubscription(context.supabase, context.userId)).stripe_subscription_id}`, form({ cancel_at_period_end: "true" }));
	return { ok: true };
});
var resumeSubscription_createServerFn_handler = createServerRpc({
	id: "4d44e7923c7f7699a67c5a96e944b77c3545c68353d4721aa67ff5e552fe4eed",
	name: "resumeSubscription",
	filename: "src/lib/subscription-management.functions.ts"
}, (opts) => resumeSubscription.__executeServer(opts));
var resumeSubscription = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(resumeSubscription_createServerFn_handler, async ({ context }) => {
	await stripeFetch(`/subscriptions/${(await getMyStripeSubscription(context.supabase, context.userId)).stripe_subscription_id}`, form({ cancel_at_period_end: "false" }));
	return { ok: true };
});
//#endregion
export { cancelAtPeriodEnd_createServerFn_handler, changeMyPlan_createServerFn_handler, resumeSubscription_createServerFn_handler };
