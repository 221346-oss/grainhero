import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing.functions-CNrpoOgJ.js
var getMySubscription = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("48fcc40f58ad39c08329f119ce649d36efdb15ca2b19c042b36a267cf06b34ed"));
var cancelInput = objectType({ reason: stringType().max(500).optional() });
var cancelMySubscription = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => cancelInput.parse(d)).handler(createSsrRpc("c0905a2df85e1b2f55320d3e264f4dac7992695ba7c7fa11ff51766f7705b2ca"));
var getRevenueOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("3a8c3086f32b9637534eda0e78d7284392cb7e05e58de3bdbd51c1c9c20c0698"));
var markPaidInput = objectType({
	id: stringType().uuid(),
	amount: numberType().nonnegative().optional()
});
var markInvoicePaid = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => markPaidInput.parse(d)).handler(createSsrRpc("3c9584d86bbc8c959e834b164f4bb3cc214db4ef6fc7a67108c8804a822abe2f"));
//#endregion
export { markInvoicePaid as i, getMySubscription as n, getRevenueOverview as r, cancelMySubscription as t };
