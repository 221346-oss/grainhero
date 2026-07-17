import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, n as booleanType, o as objectType, r as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hardware-orders.functions-cPlHFJSi.js
var STATUS = enumType([
	"pending_payment",
	"new",
	"approved",
	"tech_assigned",
	"installed",
	"live",
	"cancelled"
]);
/** Buyer: list my own orders. */
var listMyHardwareOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("adf0c152d23b226bda652ec5879e8187c8edeefad69733d1d5815fba532d6fd7"));
/** Super-admin: list every order. */
var listAllHardwareOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("36647d63df0532f493377a03dada81a3a397c192479e4ceeb35027e772439324"));
var updateInput = objectType({
	orderId: stringType().uuid(),
	status: STATUS.optional(),
	technicianName: stringType().trim().max(200).optional().nullable(),
	technicianPhone: stringType().trim().max(40).optional().nullable(),
	scheduledInstallDate: stringType().trim().max(60).optional().nullable(),
	cancelReason: stringType().trim().max(500).optional().nullable(),
	refunded: booleanType().optional()
});
/** Super-admin: update status / assign technician / mark installed / cancel. */
var updateHardwareOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => updateInput.parse(d)).handler(createSsrRpc("ac3d678c05fe84bb94876b2cb6b85789e7b723c84c2b3b29f067bbd7adf9f7e3"));
var messageInput = objectType({
	orderId: stringType().uuid(),
	message: stringType().trim().min(1).max(2e3),
	emailBuyer: booleanType().default(true)
});
/** Super-admin: send a message + optional email to the buyer for an order. */
var sendOrderMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => messageInput.parse(d)).handler(createSsrRpc("6e552e6e3f8ab7a2a3310d31acf83c98f3b039e1d765412ffde97f0da38530ff"));
/** Super-admin: count of orders needing attention, for sidebar badge. */
var countPendingOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("6ee5c1a51aae0759f1526ee05cfbd8bbcd8bad7fcff3bdbef6e651d27fbcb33c"));
//#endregion
export { updateHardwareOrder as a, sendOrderMessage as i, listAllHardwareOrders as n, listMyHardwareOrders as r, countPendingOrders as t };
