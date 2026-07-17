import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/expiry-reminders.server-P06qe0Fy.js
var RESEND_URL = "https://api.resend.com/emails";
async function runExpiryReminders() {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const thresholds = [
		7,
		3,
		1
	];
	const now = /* @__PURE__ */ new Date();
	const horizon = new Date(now.getTime() + 8 * 864e5);
	const { data: subs, error } = await supabaseAdmin.from("subscriptions").select("id, admin_id, plan_name, end_date, status, notified_expiry_thresholds").in("status", ["active", "trial"]).gte("end_date", now.toISOString()).lte("end_date", horizon.toISOString());
	if (error) throw error;
	const sent = [];
	const failed = [];
	for (const s of subs ?? []) {
		if (!s.end_date || !s.admin_id) continue;
		const daysLeft = Math.ceil((new Date(s.end_date).getTime() - now.getTime()) / 864e5);
		const threshold = thresholds.find((t) => daysLeft <= t);
		if (!threshold) continue;
		const already = s.notified_expiry_thresholds ?? [];
		if (already.includes(threshold)) continue;
		const { data: profile } = await supabaseAdmin.from("profiles").select("email, name, preferences").eq("id", s.admin_id).maybeSingle();
		if (!profile?.email) continue;
		const prefs = profile.preferences ?? {};
		const wantsEmail = prefs.expiry_email_alerts !== false;
		const wantsPush = prefs.expiry_push_alerts !== false;
		try {
			if (wantsEmail && processModule.env.RESEND_API_KEY) {
				const from = processModule.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
				const html = `
          <div style="font-family:Inter,sans-serif;color:#0f172a;">
            <h2>Your GrainHero ${s.plan_name ?? "plan"} expires in ${threshold} day${threshold === 1 ? "" : "s"}</h2>
            <p>Hi ${profile.name ?? "there"},</p>
            <p>Your subscription ends on <b>${new Date(s.end_date).toLocaleDateString()}</b>. Renew or manage your plan to avoid interruption.</p>
            <p><a href="https://grainheroo.lovable.app/subscription" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Manage subscription</a></p>
            <p style="color:#64748b;font-size:12px;margin-top:24px;">You can disable expiry alerts in Settings → Notifications.</p>
          </div>`;
				const res = await fetch(RESEND_URL, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${processModule.env.RESEND_API_KEY}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						from: `GrainHero <${from}>`,
						to: [profile.email],
						subject: `Your GrainHero plan expires in ${threshold} day${threshold === 1 ? "" : "s"}`,
						html
					})
				});
				if (!res.ok) {
					const t = await res.text();
					throw new Error(`Resend ${res.status}: ${t.slice(0, 200)}`);
				}
			}
			if (wantsPush) await supabaseAdmin.from("notifications").insert({
				admin_id: s.admin_id,
				user_id: s.admin_id,
				title: `Plan expires in ${threshold} day${threshold === 1 ? "" : "s"}`,
				message: `Your ${s.plan_name ?? "subscription"} ends on ${new Date(s.end_date).toLocaleDateString()}. Renew to avoid interruption.`,
				type: "warning",
				category: "billing",
				entity_type: "subscription",
				entity_id: s.id,
				action_url: "/subscription"
			});
			await supabaseAdmin.from("subscriptions").update({ notified_expiry_thresholds: [...already, threshold] }).eq("id", s.id);
			sent.push({
				subscriptionId: s.id,
				email: profile.email,
				days: threshold
			});
		} catch (e) {
			console.error("[expiry-reminder]", s.id, e?.message);
			failed.push({
				subscriptionId: s.id,
				error: String(e?.message ?? e)
			});
		}
	}
	return {
		checked: subs?.length ?? 0,
		sent,
		failed
	};
}
//#endregion
export { runExpiryReminders };
