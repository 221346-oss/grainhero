import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { c as stringType, n as booleanType, o as objectType, r as enumType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/hardware-orders.functions-Du3B0izQ.js
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
var listMyHardwareOrders_createServerFn_handler = createServerRpc({
	id: "adf0c152d23b226bda652ec5879e8187c8edeefad69733d1d5815fba532d6fd7",
	name: "listMyHardwareOrders",
	filename: "src/lib/hardware-orders.functions.ts"
}, (opts) => listMyHardwareOrders.__executeServer(opts));
var listMyHardwareOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listMyHardwareOrders_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("hardware_orders").select("*").eq("admin_id", context.userId).order("created_at", { ascending: false });
	if (error) throw error;
	return { orders: data ?? [] };
});
var listAllHardwareOrders_createServerFn_handler = createServerRpc({
	id: "36647d63df0532f493377a03dada81a3a397c192479e4ceeb35027e772439324",
	name: "listAllHardwareOrders",
	filename: "src/lib/hardware-orders.functions.ts"
}, (opts) => listAllHardwareOrders.__executeServer(opts));
var listAllHardwareOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listAllHardwareOrders_createServerFn_handler, async ({ context }) => {
	if (!(await getEffectiveRole(context.supabase, context.userId) === "super_admin")) throw new Error("Forbidden");
	const { data, error } = await context.supabase.from("hardware_orders").select("*").order("created_at", { ascending: false });
	if (error) throw error;
	const rows = data ?? [];
	const adminIds = Array.from(new Set(rows.map((o) => o.admin_id).filter(Boolean)));
	let profiles = {};
	if (adminIds.length > 0) {
		const { data: profs } = await context.supabase.from("profiles").select("id,name,email").in("id", adminIds);
		profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, {
			name: p.name ?? null,
			email: p.email ?? null
		}]));
	}
	return { orders: rows.map((o) => ({
		...o,
		buyer: profiles[o.admin_id] ?? {
			name: o.customer_name ?? null,
			email: o.customer_email ?? null
		}
	})) };
});
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
var updateHardwareOrder_createServerFn_handler = createServerRpc({
	id: "ac3d678c05fe84bb94876b2cb6b85789e7b723c84c2b3b29f067bbd7adf9f7e3",
	name: "updateHardwareOrder",
	filename: "src/lib/hardware-orders.functions.ts"
}, (opts) => updateHardwareOrder.__executeServer(opts));
var updateHardwareOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => updateInput.parse(d)).handler(updateHardwareOrder_createServerFn_handler, async ({ data, context }) => {
	if (!(await getEffectiveRole(context.supabase, context.userId) === "super_admin")) throw new Error("Forbidden");
	const patch = {};
	if (data.status) patch.status = data.status;
	if (data.technicianName !== void 0) patch.technician_name = data.technicianName;
	if (data.technicianPhone !== void 0) patch.technician_phone = data.technicianPhone;
	if (data.scheduledInstallDate !== void 0) patch.scheduled_install_date = data.scheduledInstallDate || null;
	if (data.status === "installed") patch.installed_at = (/* @__PURE__ */ new Date()).toISOString();
	if (data.status === "cancelled") patch.cancelled_at = (/* @__PURE__ */ new Date()).toISOString();
	if (data.cancelReason !== void 0) patch.cancel_reason = data.cancelReason;
	if (data.refunded !== void 0) patch.refunded = data.refunded;
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: updated, error } = await supabaseAdmin.from("hardware_orders").update(patch).eq("id", data.orderId).select("*").single();
	if (error) throw error;
	const o = updated;
	if (o.admin_id) await supabaseAdmin.from("notifications").insert({
		user_id: o.admin_id,
		tenant_id: o.admin_id,
		type: `order.${data.status ?? "update"}`,
		subject: `Your install order was updated`,
		body: `Status: ${o.status}${o.technician_name ? ` · Tech: ${o.technician_name}` : ""}${o.scheduled_install_date ? ` · Scheduled: ${new Date(o.scheduled_install_date).toLocaleString()}` : ""}`,
		is_read: false
	});
	return { order: o };
});
var messageInput = objectType({
	orderId: stringType().uuid(),
	message: stringType().trim().min(1).max(2e3),
	emailBuyer: booleanType().default(true)
});
/** Super-admin: send a message + optional email to the buyer for an order. */
var sendOrderMessage_createServerFn_handler = createServerRpc({
	id: "6e552e6e3f8ab7a2a3310d31acf83c98f3b039e1d765412ffde97f0da38530ff",
	name: "sendOrderMessage",
	filename: "src/lib/hardware-orders.functions.ts"
}, (opts) => sendOrderMessage.__executeServer(opts));
var sendOrderMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => messageInput.parse(d)).handler(sendOrderMessage_createServerFn_handler, async ({ data, context }) => {
	if (!(await getEffectiveRole(context.supabase, context.userId) === "super_admin")) throw new Error("Forbidden");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: order } = await supabaseAdmin.from("hardware_orders").select("id,admin_id,customer_email,customer_name").eq("id", data.orderId).single();
	if (!order) throw new Error("Order not found");
	const buyerId = order.admin_id ?? null;
	let emailed = false;
	if (data.emailBuyer) {
		const { data: buyer } = buyerId ? await supabaseAdmin.from("profiles").select("email,name").eq("id", buyerId).maybeSingle() : { data: null };
		const email = buyer?.email ?? order.customer_email ?? null;
		const gatewayKey = processModule.env.LOVABLE_API_KEY;
		const resendKey = processModule.env.RESEND_API_KEY;
		const from = processModule.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
		if (email && gatewayKey && resendKey) emailed = !!(await fetch("https://connector-gateway.lovable.dev/resend/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${gatewayKey}`,
				"X-Connection-Api-Key": resendKey
			},
			body: JSON.stringify({
				from,
				to: [email],
				subject: `Update on your GrainHero install order`,
				html: `<p>${data.message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`
			})
		}).catch(() => null))?.ok;
	}
	await supabaseAdmin.from("hardware_order_messages").insert({
		order_id: data.orderId,
		sender_id: context.userId,
		message: data.message,
		emailed
	});
	if (buyerId) await supabaseAdmin.from("notifications").insert({
		user_id: buyerId,
		tenant_id: buyerId,
		type: "order.message",
		subject: "New message about your install order",
		body: data.message,
		is_read: false
	});
	return {
		ok: true,
		emailed
	};
});
var countPendingOrders_createServerFn_handler = createServerRpc({
	id: "6ee5c1a51aae0759f1526ee05cfbd8bbcd8bad7fcff3bdbef6e651d27fbcb33c",
	name: "countPendingOrders",
	filename: "src/lib/hardware-orders.functions.ts"
}, (opts) => countPendingOrders.__executeServer(opts));
var countPendingOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(countPendingOrders_createServerFn_handler, async ({ context }) => {
	if (!(await getEffectiveRole(context.supabase, context.userId) === "super_admin")) return { count: 0 };
	const { count } = await context.supabase.from("hardware_orders").select("id", {
		count: "exact",
		head: true
	}).in("status", [
		"new",
		"approved",
		"tech_assigned"
	]);
	return { count: count ?? 0 };
});
//#endregion
export { countPendingOrders_createServerFn_handler, listAllHardwareOrders_createServerFn_handler, listMyHardwareOrders_createServerFn_handler, sendOrderMessage_createServerFn_handler, updateHardwareOrder_createServerFn_handler };
