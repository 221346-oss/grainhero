import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/stripe-api.server-BzTLA6oy.js
var STRIPE_API = "https://api.stripe.com/v1";
function stripeForm(params) {
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
	if (!res.ok) {
		console.error(`[stripe ${res.status}] ${path}: ${text}`);
		throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
	}
	return JSON.parse(text);
}
//#endregion
export { stripeFetch, stripeForm };
