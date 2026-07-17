import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { a as welcomeEmailHTML } from "./email-templates-6djD6Xmy.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/email-automation.functions-AOLN2h5w.js
function firstNameOf(name, email) {
	if (name) return name.trim().split(/\s+/)[0];
	if (email) return email.split("@")[0];
	return "there";
}
function appOrigin() {
	return processModule.env.APP_ORIGIN ?? processModule.env.VITE_APP_URL ?? "https://grainheroo.lovable.app";
}
/** Send the welcome email immediately on signup. */
var sendWelcomeEmail_createServerFn_handler = createServerRpc({
	id: "b2320314d4d04e6a1eab8d45e20394aa9e6d5b1e8fddfcb8844153fa9d82e7b7",
	name: "sendWelcomeEmail",
	filename: "src/lib/email-automation.functions.ts"
}, (opts) => sendWelcomeEmail.__executeServer(opts));
var sendWelcomeEmail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(sendWelcomeEmail_createServerFn_handler, async ({ context }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: profile } = await supabaseAdmin.from("profiles").select("email, name").eq("id", context.userId).maybeSingle();
	if (!profile?.email) return { skipped: true };
	const { data: existing } = await supabaseAdmin.from("email_send_log").select("id").eq("user_id", context.userId).eq("email_type", "welcome").maybeSingle();
	if (existing) return { skipped: true };
	const { sendEmailViaResend } = await import("./resend.server-34GEZQa-.mjs");
	try {
		const res = await sendEmailViaResend({
			to: profile.email,
			subject: "Welcome to GrainHero 🌾",
			html: welcomeEmailHTML(firstNameOf(profile.name, profile.email), `${appOrigin()}/dashboard`)
		});
		await supabaseAdmin.from("email_send_log").insert({
			user_id: context.userId,
			email_type: "welcome",
			recipient_email: profile.email,
			status: "sent",
			provider_message_id: res.id ?? null
		});
		return { sent: true };
	} catch (e) {
		await supabaseAdmin.from("email_send_log").insert({
			user_id: context.userId,
			email_type: "welcome",
			recipient_email: profile.email,
			status: "error",
			error_message: e.message
		});
		return {
			sent: false,
			error: e.message
		};
	}
});
//#endregion
export { sendWelcomeEmail_createServerFn_handler };
