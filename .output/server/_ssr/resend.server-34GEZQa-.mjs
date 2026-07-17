import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/resend.server-34GEZQa-.js
var GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
async function sendEmailViaResend(params) {
	const lovableKey = processModule.env.LOVABLE_API_KEY;
	const resendKey = processModule.env.RESEND_API_KEY;
	if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
	if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
	const from = params.from ?? processModule.env.RESEND_FROM_EMAIL ?? "GrainHero <onboarding@resend.dev>";
	const response = await fetch(`${GATEWAY_URL}/emails`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${lovableKey}`,
			"X-Connection-Api-Key": resendKey
		},
		body: JSON.stringify({
			from,
			to: [params.to],
			subject: params.subject,
			html: params.html
		})
	});
	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Resend request failed [${response.status}]: ${errorBody}`);
	}
	return await response.json();
}
//#endregion
export { sendEmailViaResend };
