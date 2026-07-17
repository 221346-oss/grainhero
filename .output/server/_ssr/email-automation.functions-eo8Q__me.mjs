import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { i as trialEndingEmailHTML, n as day3EmailHTML, r as reengagementEmailHTML, t as day10EmailHTML } from "./email-templates-6djD6Xmy.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/email-automation.functions-eo8Q__me.js
function firstNameOf(name, email) {
	if (name) return name.trim().split(/\s+/)[0];
	if (email) return email.split("@")[0];
	return "there";
}
function appOrigin() {
	return processModule.env.APP_ORIGIN ?? processModule.env.VITE_APP_URL ?? "https://grainheroo.lovable.app";
}
/** Send the welcome email immediately on signup. */
var sendWelcomeEmail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("b2320314d4d04e6a1eab8d45e20394aa9e6d5b1e8fddfcb8844153fa9d82e7b7"));
/** Internal helper the cron uses. Uses admin client + skips duplicates. */
async function sendLifecycleEmail(userId, stage) {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: profile } = await supabaseAdmin.from("profiles").select("email, name, trial_ends_at").eq("id", userId).maybeSingle();
	if (!profile?.email) return { skipped: true };
	const { data: existing } = await supabaseAdmin.from("email_send_log").select("id").eq("user_id", userId).eq("email_type", stage).maybeSingle();
	if (existing) return { skipped: true };
	const firstName = firstNameOf(profile.name, profile.email);
	const origin = appOrigin();
	const { count: siloCountRaw } = await supabaseAdmin.from("silos").select("id", {
		count: "exact",
		head: true
	}).eq("admin_id", userId);
	const siloCount = siloCountRaw ?? 0;
	const storageGB = Math.max(1, siloCount * 2);
	let subject = "";
	let html = "";
	switch (stage) {
		case "day3":
			subject = "Maximize your GrainHero trial 🚀";
			html = day3EmailHTML(firstName, siloCount, `${origin}/analytics`);
			break;
		case "day10":
			subject = "Unlock hidden features 💎";
			html = day10EmailHTML(firstName, siloCount, storageGB, `${origin}/analytics`);
			break;
		case "trial_ending": {
			const daysLeft = profile.trial_ends_at ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1440 * 60 * 1e3))) : 3;
			subject = `Your GrainHero trial ends in ${daysLeft} days`;
			html = trialEndingEmailHTML(firstName, daysLeft, `${origin}/plans`);
			break;
		}
		case "reengagement":
			subject = "We miss you at GrainHero 👋";
			html = reengagementEmailHTML(firstName, siloCount, storageGB, `${origin}/auth/login`);
			break;
	}
	const { sendEmailViaResend } = await import("./resend.server-34GEZQa-.mjs");
	try {
		const res = await sendEmailViaResend({
			to: profile.email,
			subject,
			html
		});
		await supabaseAdmin.from("email_send_log").insert({
			user_id: userId,
			email_type: stage,
			recipient_email: profile.email,
			status: "sent",
			provider_message_id: res.id ?? null
		});
		return { sent: true };
	} catch (e) {
		await supabaseAdmin.from("email_send_log").insert({
			user_id: userId,
			email_type: stage,
			recipient_email: profile.email,
			status: "error",
			error_message: e.message
		});
		return {
			sent: false,
			error: e.message
		};
	}
}
//#endregion
export { sendLifecycleEmail, sendWelcomeEmail };
