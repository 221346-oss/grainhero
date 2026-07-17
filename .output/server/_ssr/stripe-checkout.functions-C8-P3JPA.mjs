import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { n as pricingData } from "./pricing-data-BA_Y9Elr.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/stripe-checkout.functions-C8-P3JPA.js
var checkoutInput = objectType({
	planId: enumType([
		"basic",
		"intermediate",
		"pro"
	]),
	iotQuantity: numberType().int().min(0).max(50).default(1),
	customer: objectType({
		name: stringType().trim().min(2).max(160),
		email: stringType().trim().email().max(180)
	}),
	install: objectType({
		address: stringType().trim().min(3).max(300),
		city: stringType().trim().max(120).optional().nullable(),
		country: stringType().trim().min(1).max(120),
		phone: stringType().trim().min(4).max(40),
		preferredDate: stringType().trim().max(40).optional().nullable(),
		notes: stringType().trim().max(1e3).optional().nullable(),
		businessName: stringType().trim().max(200).optional().nullable(),
		taxId: stringType().trim().max(80).optional().nullable()
	})
});
/**
* Creates a Stripe Checkout session for the selected plan.
* Uses inline `price_data` so we don't need to pre-create Products/Prices.
* Returns the Checkout URL to redirect the browser to.
*/
var createStripeCheckoutSession_createServerFn_handler = createServerRpc({
	id: "2e9ad4fa17edee905268042a3eff00b7e24b0140c9c57871343e81e09acc63a1",
	name: "createStripeCheckoutSession",
	filename: "src/lib/stripe-checkout.functions.ts"
}, (opts) => createStripeCheckoutSession.__executeServer(opts));
var createStripeCheckoutSession = createServerFn({ method: "POST" }).inputValidator((d) => checkoutInput.parse(d)).handler(createStripeCheckoutSession_createServerFn_handler, async ({ data }) => {
	const plan = pricingData.find((p) => p.id === data.planId);
	if (!plan) throw new Error("Unknown plan");
	const currency = String(plan.currency ?? "usd").toLowerCase();
	const origin = processModule.env.APP_ORIGIN || "https://grainheroo.lovable.app";
	const customerEmail = data.customer.email.trim().toLowerCase();
	const customerName = data.customer.name.trim();
	const { stripeFetch, stripeForm } = await import("./stripe-api.server-BzTLA6oy.mjs");
	let admin = null;
	try {
		const mod = await import("./client.server-Bw6iWMJ-.mjs");
		mod.supabaseAdmin.auth;
		admin = mod.supabaseAdmin;
	} catch (e) {
		console.warn("[checkout] supabaseAdmin unavailable, running guest-only flow:", e.message);
		admin = null;
	}
	let profile = null;
	if (admin) try {
		const { data: p } = await admin.from("profiles").select("id, email, name, stripe_customer_id").ilike("email", customerEmail).maybeSingle();
		profile = p ?? null;
	} catch (e) {
		console.warn("[checkout] profile lookup failed:", e.message);
	}
	let customerId = profile?.stripe_customer_id ?? null;
	const existingUserId = profile?.id ?? null;
	if (!customerId) {
		customerId = (await stripeFetch("/customers", stripeForm({
			email: customerEmail,
			name: customerName,
			"metadata[user_id]": existingUserId ?? void 0
		}))).id;
		if (existingUserId && admin) try {
			await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", existingUserId);
		} catch (e) {
			console.warn("[checkout] profile update failed:", e.message);
		}
	}
	const iotUnit = Number(plan.iotCharge ?? 7e3);
	const iotTotal = data.iotQuantity * iotUnit;
	let orderId = null;
	if (admin) try {
		const { data: order, error } = await admin.from("hardware_orders").insert({
			admin_id: existingUserId,
			customer_name: customerName,
			customer_email: customerEmail,
			stripe_customer_id: customerId,
			plan_id: plan.id,
			plan_name: plan.name,
			hardware_quantity: data.iotQuantity,
			hardware_unit_price: iotUnit,
			hardware_total: iotTotal,
			currency: "PKR",
			install_address: data.install.address,
			install_city: data.install.city,
			install_country: data.install.country,
			contact_phone: data.install.phone,
			preferred_install_date: data.install.preferredDate || null,
			notes: data.install.notes || null,
			business_name: data.install.businessName || null,
			tax_id: data.install.taxId || null,
			status: "pending_payment"
		}).select("id").single();
		if (error) throw error;
		orderId = order.id;
	} catch (e) {
		console.warn("[checkout] could not create hardware order draft (continuing):", e.message);
	}
	const params = stripeForm({
		mode: "subscription",
		customer: customerId ?? void 0,
		client_reference_id: orderId ?? void 0,
		success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/checkout?plan=${plan.id}&canceled=1`,
		"metadata[user_id]": existingUserId ?? void 0,
		"metadata[customer_email]": customerEmail,
		"metadata[customer_name]": customerName,
		"metadata[plan_id]": plan.id,
		"metadata[iot_quantity]": String(data.iotQuantity),
		"metadata[hardware_order_id]": orderId ?? "",
		allow_promotion_codes: "true",
		"subscription_data[metadata][user_id]": existingUserId ?? void 0,
		"subscription_data[metadata][customer_email]": customerEmail,
		"subscription_data[metadata][hardware_order_id]": orderId ?? "",
		"subscription_data[metadata][plan_id]": plan.id,
		"line_items[0][quantity]": "1",
		"line_items[0][price_data][currency]": currency,
		"line_items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
		"line_items[0][price_data][product_data][description]": plan.description,
		"line_items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
		"line_items[0][price_data][recurring][interval]": plan.interval ?? "month"
	});
	const iotStripeTotal = data.iotQuantity > 0 && plan.iotCharge ? Math.round(Number(plan.iotCharge) * data.iotQuantity * 100) : 0;
	const subscriptionUnitAmount = Math.round(Number(plan.price) * 100);
	if (iotStripeTotal > 0) {
		params.append("line_items[1][quantity]", "1");
		params.append("line_items[1][price_data][currency]", currency);
		params.append("line_items[1][price_data][product_data][name]", `IoT Sensor Setup × ${data.iotQuantity}`);
		params.append("line_items[1][price_data][product_data][description]", `One-time hardware installation for ${data.iotQuantity} sensor(s)`);
		params.append("line_items[1][price_data][unit_amount]", String(iotStripeTotal));
	}
	let session;
	try {
		session = await stripeFetch("/checkout/sessions", params);
	} catch (e) {
		console.warn("[checkout] separate IoT line item rejected, bundling into subscription:", e.message);
		session = await stripeFetch("/checkout/sessions", stripeForm({
			mode: "subscription",
			customer: customerId ?? void 0,
			client_reference_id: orderId ?? void 0,
			success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/checkout?plan=${plan.id}&canceled=1`,
			"metadata[user_id]": existingUserId ?? void 0,
			"metadata[customer_email]": customerEmail,
			"metadata[customer_name]": customerName,
			"metadata[plan_id]": plan.id,
			"metadata[iot_quantity]": String(data.iotQuantity),
			"metadata[hardware_order_id]": orderId ?? "",
			"metadata[iot_bundled]": "true",
			allow_promotion_codes: "true",
			"subscription_data[metadata][user_id]": existingUserId ?? void 0,
			"subscription_data[metadata][customer_email]": customerEmail,
			"subscription_data[metadata][hardware_order_id]": orderId ?? "",
			"subscription_data[metadata][plan_id]": plan.id,
			"line_items[0][quantity]": "1",
			"line_items[0][price_data][currency]": currency,
			"line_items[0][price_data][product_data][name]": `GrainHero ${plan.name} + IoT Setup`,
			"line_items[0][price_data][product_data][description]": `${plan.description} · Includes ${data.iotQuantity} sensor installation(s) (Rs. ${(data.iotQuantity * Number(plan.iotCharge)).toLocaleString()} one-time)`,
			"line_items[0][price_data][unit_amount]": String(subscriptionUnitAmount + iotStripeTotal),
			"line_items[0][price_data][recurring][interval]": plan.interval ?? "month"
		}));
	}
	if (orderId && admin) try {
		await admin.from("hardware_orders").update({ stripe_session_id: session.id }).eq("id", orderId);
	} catch (e) {
		console.warn("could not stash session id on order", e);
	}
	return {
		url: session.url,
		id: session.id
	};
});
var checkoutSummaryInput = objectType({ sessionId: stringType().trim().min(5).max(200) });
var getCheckoutSessionSummary_createServerFn_handler = createServerRpc({
	id: "fbb2d73f5b0d1e583223c008c24d0f1606038d02965d5ef8aae251ee5e6fb231",
	name: "getCheckoutSessionSummary",
	filename: "src/lib/stripe-checkout.functions.ts"
}, (opts) => getCheckoutSessionSummary.__executeServer(opts));
var getCheckoutSessionSummary = createServerFn({ method: "GET" }).inputValidator((d) => checkoutSummaryInput.parse(d)).handler(getCheckoutSessionSummary_createServerFn_handler, async ({ data }) => {
	const { stripeFetch } = await import("./stripe-api.server-BzTLA6oy.mjs");
	const session = await stripeFetch(`/checkout/sessions/${encodeURIComponent(data.sessionId)}`, null, "GET");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: order } = await supabaseAdmin.from("hardware_orders").select("plan_name, customer_name, customer_email, hardware_quantity").eq("stripe_session_id", session.id).maybeSingle();
	const row = order ?? {};
	return {
		id: session.id,
		paid: session.payment_status === "paid" || session.status === "complete",
		email: String(row.customer_email ?? session.customer_details?.email ?? session.metadata?.customer_email ?? ""),
		name: String(row.customer_name ?? session.customer_details?.name ?? session.metadata?.customer_name ?? ""),
		planName: String(row.plan_name ?? session.metadata?.plan_id ?? ""),
		hardwareQuantity: Number(row.hardware_quantity ?? session.metadata?.iot_quantity ?? 0)
	};
});
var claimInput = objectType({ sessionId: stringType().trim().min(5).max(200).optional() });
var claimPaidCheckoutForUser_createServerFn_handler = createServerRpc({
	id: "73096cbd8d553f2016d7710dd87f992ca56a457e297f15dc2f8dd6f656f1da77",
	name: "claimPaidCheckoutForUser",
	filename: "src/lib/stripe-checkout.functions.ts"
}, (opts) => claimPaidCheckoutForUser.__executeServer(opts));
var claimPaidCheckoutForUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => claimInput.parse(d ?? {})).handler(claimPaidCheckoutForUser_createServerFn_handler, async ({ data, context }) => {
	const { stripeFetch } = await import("./stripe-api.server-BzTLA6oy.mjs");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: profile } = await context.supabase.from("profiles").select("id,email,name,stripe_customer_id").eq("id", context.userId).maybeSingle();
	const email = (profile?.email ?? context.claims?.email ?? "").toLowerCase();
	if (!email) return { claimed: 0 };
	let orderQuery = supabaseAdmin.from("hardware_orders").select("*").or(`admin_id.eq.${context.userId},and(admin_id.is.null,customer_email.ilike.${email})`).order("created_at", { ascending: false });
	if (data.sessionId) orderQuery = orderQuery.eq("stripe_session_id", data.sessionId);
	const { data: ordersRaw } = await orderQuery;
	const orders = ordersRaw ?? [];
	if (orders.length === 0) return { claimed: 0 };
	const first = orders[0];
	await supabaseAdmin.from("hardware_orders").update({ admin_id: context.userId }).is("admin_id", null).ilike("customer_email", email);
	const stripeCustomerId = String(first.stripe_customer_id ?? "");
	if (stripeCustomerId) await supabaseAdmin.from("profiles").update({
		stripe_customer_id: stripeCustomerId,
		admin_id: context.userId
	}).eq("id", context.userId);
	else await supabaseAdmin.from("profiles").update({ admin_id: context.userId }).eq("id", context.userId);
	await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);
	await supabaseAdmin.from("user_roles").insert({
		user_id: context.userId,
		role: "admin"
	});
	const stripeSubscriptionId = String(first.stripe_subscription_id ?? "");
	const planId = String(first.plan_id ?? "basic");
	const planNameMap = {
		basic: "Grain Starter",
		intermediate: "Grain Professional",
		pro: "Grain Enterprise"
	};
	const planLimits = {
		basic: {
			users: 5,
			devices: 3,
			storage: 10,
			batches: 100
		},
		intermediate: {
			users: 10,
			devices: 6,
			storage: 50,
			batches: 500
		},
		pro: {
			users: 999999,
			devices: 15,
			storage: 999999,
			batches: 999999
		}
	};
	const limits = planLimits[planId] ?? planLimits.basic;
	const planPrice = Number(pricingData.find((p) => p.id === planId)?.price ?? 0);
	let stripeStatus = "active";
	let currentPeriodEnd = null;
	let unitAmount = planPrice;
	let currency = "pkr";
	let interval = "month";
	if (stripeSubscriptionId) try {
		const sub = await stripeFetch(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, null, "GET");
		stripeStatus = sub.status ?? stripeStatus;
		currentPeriodEnd = sub.current_period_end ?? null;
		const price = sub.items?.data?.[0]?.price;
		if (price?.unit_amount) unitAmount = Number(price.unit_amount) / 100;
		if (price?.currency) currency = price.currency;
		if (price?.recurring?.interval) interval = price.recurring.interval;
	} catch (e) {
		console.warn("could not fetch subscription during claim, using plan defaults:", e.message);
	}
	const status = (/* @__PURE__ */ new Set([
		"active",
		"inactive",
		"cancelled",
		"expired",
		"trial"
	])).has(stripeStatus) ? stripeStatus : "active";
	const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";
	if (stripeSubscriptionId) await supabaseAdmin.from("subscriptions").upsert({
		admin_id: context.userId,
		plan_name: planNameMap[planId] ?? "Custom",
		plan_description: `Stripe subscription (${planId})`,
		status,
		auto_renew: true,
		start_date: (/* @__PURE__ */ new Date()).toISOString(),
		end_date: currentPeriodEnd ? (/* @__PURE__ */ new Date(currentPeriodEnd * 1e3)).toISOString() : new Date(Date.now() + 720 * 60 * 60 * 1e3).toISOString(),
		next_payment_date: currentPeriodEnd ? (/* @__PURE__ */ new Date(currentPeriodEnd * 1e3)).toISOString() : null,
		price_per_month: unitAmount,
		currency: currency.toUpperCase(),
		billing_cycle: billingCycle,
		stripe_subscription_id: stripeSubscriptionId,
		stripe_customer_id: stripeCustomerId || null,
		max_users: limits.users,
		max_devices: limits.devices,
		max_storage_gb: limits.storage,
		max_batches: limits.batches
	}, { onConflict: "stripe_subscription_id" });
	else {
		const { data: existingSub } = await supabaseAdmin.from("subscriptions").select("id").eq("admin_id", context.userId).maybeSingle();
		if (existingSub) await supabaseAdmin.from("subscriptions").update({
			plan_name: planNameMap[planId] ?? "Custom",
			status: "active",
			auto_renew: true,
			start_date: (/* @__PURE__ */ new Date()).toISOString(),
			end_date: new Date(Date.now() + 720 * 60 * 60 * 1e3).toISOString(),
			price_per_month: planPrice,
			currency: "PKR",
			billing_cycle: "monthly",
			stripe_customer_id: stripeCustomerId || null,
			max_users: limits.users,
			max_devices: limits.devices,
			max_storage_gb: limits.storage,
			max_batches: limits.batches
		}).eq("admin_id", context.userId);
		else await supabaseAdmin.from("subscriptions").insert({
			admin_id: context.userId,
			plan_name: planNameMap[planId] ?? "Custom",
			plan_description: `Stripe subscription (${planId})`,
			status: "active",
			auto_renew: true,
			start_date: (/* @__PURE__ */ new Date()).toISOString(),
			end_date: new Date(Date.now() + 720 * 60 * 60 * 1e3).toISOString(),
			next_payment_date: new Date(Date.now() + 720 * 60 * 60 * 1e3).toISOString(),
			price_per_month: planPrice,
			currency: "PKR",
			billing_cycle: "monthly",
			stripe_customer_id: stripeCustomerId || null,
			max_users: limits.users,
			max_devices: limits.devices,
			max_storage_gb: limits.storage,
			max_batches: limits.batches
		});
	}
	return { claimed: orders.length };
});
var createStripeBillingPortalSession_createServerFn_handler = createServerRpc({
	id: "93b2ca4f8a506f76a8f30560d5938e1c7c8f609d88ef37c26179bdd5818b2c3f",
	name: "createStripeBillingPortalSession",
	filename: "src/lib/stripe-checkout.functions.ts"
}, (opts) => createStripeBillingPortalSession.__executeServer(opts));
var createStripeBillingPortalSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createStripeBillingPortalSession_createServerFn_handler, async ({ context }) => {
	const { stripeFetch, stripeForm } = await import("./stripe-api.server-BzTLA6oy.mjs");
	const { data: profile } = await context.supabase.from("profiles").select("stripe_customer_id").eq("id", context.userId).maybeSingle();
	const customerId = profile?.stripe_customer_id;
	if (!customerId) throw new Error("No Stripe customer on file");
	return { url: (await stripeFetch("/billing_portal/sessions", stripeForm({
		customer: customerId,
		return_url: `${processModule.env.APP_ORIGIN || "https://grainheroo.lovable.app"}/subscription`
	}))).url };
});
//#endregion
export { claimPaidCheckoutForUser_createServerFn_handler, createStripeBillingPortalSession_createServerFn_handler, createStripeCheckoutSession_createServerFn_handler, getCheckoutSessionSummary_createServerFn_handler };
