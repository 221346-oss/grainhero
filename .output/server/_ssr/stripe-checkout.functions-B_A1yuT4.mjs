import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stripe-checkout.functions-B_A1yuT4.js
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
var createStripeCheckoutSession = createServerFn({ method: "POST" }).inputValidator((d) => checkoutInput.parse(d)).handler(createSsrRpc("2e9ad4fa17edee905268042a3eff00b7e24b0140c9c57871343e81e09acc63a1"));
var checkoutSummaryInput = objectType({ sessionId: stringType().trim().min(5).max(200) });
var getCheckoutSessionSummary = createServerFn({ method: "GET" }).inputValidator((d) => checkoutSummaryInput.parse(d)).handler(createSsrRpc("fbb2d73f5b0d1e583223c008c24d0f1606038d02965d5ef8aae251ee5e6fb231"));
var claimInput = objectType({ sessionId: stringType().trim().min(5).max(200).optional() });
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => claimInput.parse(d ?? {})).handler(createSsrRpc("73096cbd8d553f2016d7710dd87f992ca56a457e297f15dc2f8dd6f656f1da77"));
/**
* Opens a Stripe Customer Portal session so the tenant admin can manage
* payment methods, invoices, and cancel/upgrade the subscription.
*/
var createStripeBillingPortalSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("93b2ca4f8a506f76a8f30560d5938e1c7c8f609d88ef37c26179bdd5818b2c3f"));
//#endregion
export { createStripeCheckoutSession as n, getCheckoutSessionSummary as r, createStripeBillingPortalSession as t };
