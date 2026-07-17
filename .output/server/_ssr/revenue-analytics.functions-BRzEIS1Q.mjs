import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/revenue-analytics.functions-BRzEIS1Q.js
async function assertSuperAdmin(supabase, userId) {
	if (await getEffectiveRole(supabase, userId) !== "super_admin") throw new Error("Forbidden: super admin only");
}
var getSaasRevenueAnalytics_createServerFn_handler = createServerRpc({
	id: "37fdafb32f1b4bd9cd03a4b79461d45fe2ba9bef368e96e08f3831290373f3a4",
	name: "getSaasRevenueAnalytics",
	filename: "src/lib/revenue-analytics.functions.ts"
}, (opts) => getSaasRevenueAnalytics.__executeServer(opts));
var getSaasRevenueAnalytics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getSaasRevenueAnalytics_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const [{ data: subs }, { data: invs }] = await Promise.all([supabaseAdmin.from("subscriptions").select("*"), supabaseAdmin.from("invoices").select("*").order("billing_date", { ascending: false }).limit(500)]);
	const subscriptions = subs ?? [];
	const invoices = invs ?? [];
	const activeSubs = subscriptions.filter((s) => s.status === "active");
	const trialSubs = subscriptions.filter((s) => s.status === "trial");
	const cancelledSubs = subscriptions.filter((s) => s.status === "cancelled");
	const monthly = (s) => {
		const p = Number(s.price_per_month ?? 0);
		if (s.billing_cycle === "yearly") return p / 12;
		return p;
	};
	const mrr = activeSubs.reduce((sum, s) => sum + monthly(s), 0);
	const arr = mrr * 12;
	const paid = invoices.filter((i) => i.status === "paid");
	const totalRevenue = paid.reduce((s, i) => s + Number(i.amount ?? 0), 0);
	const byMonth = {};
	for (let i = 11; i >= 0; i--) {
		const d = /* @__PURE__ */ new Date();
		d.setMonth(d.getMonth() - i);
		byMonth[d.toISOString().slice(0, 7)] = 0;
	}
	for (const inv of paid) {
		const key = String(inv.billing_date ?? inv.created_at ?? "").slice(0, 7);
		if (key in byMonth) byMonth[key] += Number(inv.amount ?? 0);
	}
	const revenueSeries = Object.entries(byMonth).map(([month, revenue]) => ({
		month,
		revenue
	}));
	const byPlan = {};
	for (const s of activeSubs) {
		const name = s.plan_name ?? "Unknown";
		byPlan[name] = (byPlan[name] ?? 0) + monthly(s);
	}
	const planSeries = Object.entries(byPlan).map(([plan, mrr]) => ({
		plan,
		mrr: Math.round(mrr)
	}));
	const growth = [];
	for (let i = 11; i >= 0; i--) {
		const d = /* @__PURE__ */ new Date();
		d.setMonth(d.getMonth() - i);
		const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		const count = subscriptions.filter((s) => {
			return (s.start_date ? new Date(s.start_date) : new Date(s.created_at)) <= cutoff;
		}).length;
		growth.push({
			month: d.toISOString().slice(0, 7),
			subscribers: count
		});
	}
	const now = Date.now();
	const in7 = now + 7 * 864e5;
	const expiring = activeSubs.filter((s) => s.end_date && new Date(s.end_date).getTime() <= in7 && new Date(s.end_date).getTime() >= now).sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
	const in30 = now - 30 * 864e5;
	const churned = subscriptions.filter((s) => s.status === "cancelled" && s.updated_at && new Date(s.updated_at).getTime() >= in30).length;
	const activeStart = subscriptions.filter((s) => new Date(s.created_at).getTime() < in30 && s.status !== "trial").length;
	const churnRate = activeStart > 0 ? churned / activeStart * 100 : 0;
	return {
		kpis: {
			mrr: Math.round(mrr),
			arr: Math.round(arr),
			totalRevenue: Math.round(totalRevenue),
			activeCount: activeSubs.length,
			trialCount: trialSubs.length,
			cancelledCount: cancelledSubs.length,
			expiringCount: expiring.length,
			churnRate: Number(churnRate.toFixed(1))
		},
		revenueSeries,
		planSeries,
		growth,
		expiring: expiring.slice(0, 20).map((s) => ({
			id: s.id,
			admin_id: s.admin_id,
			plan_name: s.plan_name,
			end_date: s.end_date,
			status: s.status
		})),
		recentInvoices: invoices.slice(0, 20).map((i) => ({
			id: i.id,
			admin_id: i.admin_id,
			amount: i.amount,
			currency: i.currency,
			status: i.status,
			billing_date: i.billing_date,
			invoice_number: i.invoice_number
		})),
		currency: "PKR"
	};
});
var triggerExpiryRemindersNow_createServerFn_handler = createServerRpc({
	id: "923da397c6a6053e75968bef1297eae1caab91ea192c9aab6564e7c4651df112",
	name: "triggerExpiryRemindersNow",
	filename: "src/lib/revenue-analytics.functions.ts"
}, (opts) => triggerExpiryRemindersNow.__executeServer(opts));
var triggerExpiryRemindersNow = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(triggerExpiryRemindersNow_createServerFn_handler, async ({ context }) => {
	await assertSuperAdmin(context.supabase, context.userId);
	const { runExpiryReminders } = await import("./expiry-reminders.server-P06qe0Fy.mjs");
	return runExpiryReminders();
});
//#endregion
export { getSaasRevenueAnalytics_createServerFn_handler, triggerExpiryRemindersNow_createServerFn_handler };
