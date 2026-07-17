import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout-emails.functions-Cf2bzqzr.js
var input = objectType({ sessionId: stringType().trim().min(5).max(200) });
/**
* Idempotently emails the buyer a payment-confirmation with next steps.
* Safe to call from the success page and from the Stripe webhook.
* De-dupes by writing `confirmation_email_sent_at` on the hardware_orders row.
*/
var sendCheckoutConfirmationEmail_createServerFn_handler = createServerRpc({
	id: "130b05ae7b1efcd5dd9b4c6010761703ae7d87fe73e8e8e1ab4d17842f266d1a",
	name: "sendCheckoutConfirmationEmail",
	filename: "src/lib/checkout-emails.functions.ts"
}, (opts) => sendCheckoutConfirmationEmail.__executeServer(opts));
var sendCheckoutConfirmationEmail = createServerFn({ method: "POST" }).inputValidator((d) => input.parse(d)).handler(sendCheckoutConfirmationEmail_createServerFn_handler, async ({ data }) => {
	const { stripeFetch } = await import("./stripe-api.server-BzTLA6oy.mjs");
	const session = await stripeFetch(`/checkout/sessions/${encodeURIComponent(data.sessionId)}`, null, "GET");
	const paid = session.payment_status === "paid" || session.status === "complete";
	console.log("[checkout email] session status:", session.payment_status, session.status, "paid:", paid);
	if (!paid) return {
		sent: false,
		reason: "not_paid"
	};
	let order = {};
	let admin = null;
	try {
		admin = await loadAdmin();
		if (!admin) throw new Error("no admin");
		const { data: row } = await admin.from("hardware_orders").select("id,plan_name,hardware_quantity,hardware_total,install_address,install_city,install_country,contact_phone,preferred_install_date,customer_email,customer_name,confirmation_email_sent_at").eq("stripe_session_id", data.sessionId).maybeSingle();
		order = row ?? {};
		console.log("[checkout email] order found:", !!row, "already_sent:", !!order.confirmation_email_sent_at, "email:", order.customer_email);
	} catch (e) {
		console.warn("[checkout email] admin unavailable:", e.message);
	}
	const to = order.customer_email || session.customer_details?.email || session.metadata?.customer_email || "";
	const name = order.customer_name || session.customer_details?.name || session.metadata?.customer_name || "there";
	console.log("[checkout email] sending to:", to, "name:", name);
	if (!to) return {
		sent: false,
		reason: "no_recipient"
	};
	const gatewayKey = processModule.env.LOVABLE_API_KEY;
	const resendKey = processModule.env.RESEND_API_KEY;
	const configFrom = processModule.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
	if (!resendKey) {
		console.warn("[checkout email] missing resend key");
		return {
			sent: false,
			reason: "not_configured"
		};
	}
	const emailHeaders = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${gatewayKey ?? resendKey}`
	};
	if (gatewayKey) emailHeaders["X-Connection-Api-Key"] = resendKey;
	const activateUrl = `${processModule.env.APP_ORIGIN || "https://grainheroo.lovable.app"}/auth/signup?email=${encodeURIComponent(to)}&redirect=${encodeURIComponent(`/checkout/success?session_id=${data.sessionId}`)}`;
	const planName = order.plan_name || session.metadata?.plan_id || "your plan";
	const qty = Number(order.hardware_quantity ?? session.metadata?.iot_quantity ?? 0);
	const totalPkr = Number(order.hardware_total ?? qty * 7e3);
	const html = `<!doctype html><html><body style="margin:0;background:#f6faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.06)">
      <div style="background:linear-gradient(135deg,#00a63e,#22c55e);padding:28px;color:#fff;text-align:center">
        <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">GrainHero</div>
        <h1 style="margin:8px 0 0;font-size:24px">Payment received 🎉</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 16px">Thanks for choosing GrainHero — your payment was confirmed.</p>
        <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:16px;margin:16px 0">
          <div style="font-size:12px;color:#065f46;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Order summary</div>
          <div style="margin-top:8px;font-size:14px;color:#0f172a">
            <div><b>Plan:</b> ${escapeHtml(String(planName))}</div>
            <div><b>IoT sensors:</b> ${qty} × Rs. 7,000 = Rs. ${totalPkr.toLocaleString()}</div>
            ${order.install_address ? `<div style="margin-top:6px"><b>Install:</b> ${escapeHtml(order.install_address)}, ${escapeHtml(order.install_city ?? "")}, ${escapeHtml(order.install_country ?? "")}</div>` : ""}
            ${order.contact_phone ? `<div><b>Phone:</b> ${escapeHtml(order.contact_phone)}</div>` : ""}
          </div>
        </div>
        <h3 style="margin:20px 0 8px;font-size:16px">Activate your account</h3>
        <p style="margin:0 0 16px;font-size:14px;color:#334155">Create a password so you can sign in and track your install:</p>
        <p style="text-align:center;margin:24px 0"><a href="${activateUrl}" style="background:#00a63e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Activate account</a></p>
        <p style="font-size:12px;color:#64748b;margin:12px 0 0">Or paste this link in your browser:<br/><span style="word-break:break-all">${activateUrl}</span></p>
        <h3 style="margin:24px 0 8px;font-size:16px">What happens next</h3>
        <ol style="padding-left:20px;margin:0;color:#334155;font-size:14px;line-height:1.6">
          <li>Our team contacts you within 24 hours to schedule the sensor install.</li>
          <li>Our technician installs the IoT sensors on-site and turns monitoring live.</li>
          <li>You get a guided walkthrough of your dashboard.</li>
        </ol>
        <p style="margin:24px 0 0;font-size:12px;color:#64748b">Need help? Reply to this email or write to support@grainhero.app.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0">© GrainHero</p>
  </div>
 </body></html>`;
	const trySend = async (fromAddress) => {
		if (gatewayKey) try {
			const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${gatewayKey}`,
					"X-Connection-Api-Key": resendKey
				},
				body: JSON.stringify({
					from: fromAddress,
					to: [to],
					subject: `Payment confirmed — welcome to GrainHero`,
					html
				})
			});
			if (res.ok) return true;
			console.warn(`[checkout email] Gateway send failed: ${res.status}`);
		} catch (e) {
			console.warn("[checkout email] Gateway fetch failed:", e);
		}
		try {
			const res = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${resendKey}`
				},
				body: JSON.stringify({
					from: fromAddress,
					to: [to],
					subject: `Payment confirmed — welcome to GrainHero`,
					html
				})
			});
			if (res.ok) return true;
			const body = await res.text();
			console.warn(`[checkout email] Direct Resend send failed (${res.status}): ${body}`);
		} catch (e) {
			console.warn("[checkout email] Direct Resend fetch failed:", e);
		}
		return false;
	};
	let success = await trySend(configFrom);
	if (!success && !configFrom.includes("resend.dev")) {
		console.log("[checkout email] Retrying with sandbox onboarding@resend.dev sender");
		success = await trySend("GrainHero <onboarding@resend.dev>");
	}
	if (!success) {
		console.error("[checkout email] All email sending attempts failed.");
		return {
			sent: false,
			reason: "send_failed"
		};
	}
	if (admin && order.id) try {
		await admin.from("hardware_orders").update({ confirmation_email_sent_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", order.id);
	} catch (e) {
		console.warn("[checkout email] could not mark sent:", e.message);
	}
	return {
		sent: true,
		to
	};
});
function escapeHtml(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function loadAdmin() {
	try {
		return (await import("./client.server-Bw6iWMJ-.mjs")).supabaseAdmin;
	} catch {
		return null;
	}
}
//#endregion
export { sendCheckoutConfirmationEmail_createServerFn_handler };
