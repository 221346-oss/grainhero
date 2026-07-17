import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-notify.server-D3yHIDtc.js
function formatMessage(e) {
	switch (e.type) {
		case "signup": return `🟢 New signup: ${e.email}${e.businessType ? ` (${e.businessType})` : ""}`;
		case "user_blocked": return `🚫 User blocked: ${e.email ?? e.userId} by ${e.by}`;
		case "user_unblocked": return `✅ User unblocked: ${e.email ?? e.userId} by ${e.by}`;
		case "critical_alert": return `🔥 Critical alert in tenant ${e.tenantId}: ${e.message}`;
		case "stripe_payment_failed": return `💳 Payment failed for customer ${e.customerId}${e.amount != null ? ` (${e.amount} ${e.currency ?? ""})` : ""}`;
		case "churn": return `📉 Churn: customer ${e.customerId}${e.plan ? ` (${e.plan})` : ""}`;
	}
}
async function notifyPlatformEvent(event) {
	const url = processModule.env.PLATFORM_EVENT_WEBHOOK_URL;
	if (!url) return;
	const text = formatMessage(event);
	try {
		await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text,
				content: text,
				event
			})
		});
	} catch {}
}
//#endregion
export { notifyPlatformEvent };
