import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import { getEffectiveRole } from "./rbac.server-BDKrrmZN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-overviews.functions-4GImiCsa.js
async function assertSuper(supabase, userId) {
	if (await getEffectiveRole(supabase, userId) !== "super_admin") throw new Error("Forbidden: super admin only");
}
async function loadTenants(sa) {
	const { data } = await sa.from("profiles").select("id, name, email, business_type").is("admin_id", null);
	const map = /* @__PURE__ */ new Map();
	for (const p of data ?? []) map.set(p.id, p);
	return map;
}
function tenantName(map, id) {
	if (!id) return "Unknown tenant";
	const p = map.get(id);
	return p?.name ?? p?.email ?? "Unknown tenant";
}
var getPlatformAnalyticsBreakdown_createServerFn_handler = createServerRpc({
	id: "2f88d803f6658bfa0fade5693b939e3ff223a9580a035947019996760b55abc2",
	name: "getPlatformAnalyticsBreakdown",
	filename: "src/lib/platform-overviews.functions.ts"
}, (opts) => getPlatformAnalyticsBreakdown.__executeServer(opts));
var getPlatformAnalyticsBreakdown = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformAnalyticsBreakdown_createServerFn_handler, async ({ context }) => {
	await assertSuper(context.supabase, context.userId);
	const { supabaseAdmin: sa } = await import("./client.server-Bw6iWMJ-.mjs");
	const tenants = await loadTenants(sa);
	const { data: batches } = await sa.from("grain_batches").select("admin_id, quantity_kg, revenue, profit, spoilage_label, status").is("deleted_at", null).limit(1e4);
	const agg = /* @__PURE__ */ new Map();
	for (const b of batches ?? []) {
		const k = b.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			batches: 0,
			kg: 0,
			revenue: 0,
			profit: 0,
			spoiled: 0
		};
		cur.batches += 1;
		cur.kg += Number(b.quantity_kg ?? 0);
		cur.revenue += Number(b.revenue ?? 0);
		cur.profit += Number(b.profit ?? 0);
		if (b.spoilage_label && String(b.spoilage_label).toLowerCase() !== "safe") cur.spoiled += 1;
		agg.set(k, cur);
	}
	const rows = Array.from(agg.values()).map((t) => ({
		admin_id: t.admin_id,
		name: tenantName(tenants, t.admin_id),
		batches: t.batches,
		kg: t.kg,
		revenue: t.revenue,
		margin: t.revenue > 0 ? t.profit / t.revenue : 0,
		spoilageRate: t.batches > 0 ? t.spoiled / t.batches : 0
	})).sort((a, b) => b.revenue - a.revenue);
	return {
		rows,
		totals: rows.reduce((s, r) => ({
			kg: s.kg + r.kg,
			revenue: s.revenue + r.revenue,
			batches: s.batches + r.batches
		}), {
			kg: 0,
			revenue: 0,
			batches: 0
		}),
		totalTenants: rows.length
	};
});
var getPlatformMLInference_createServerFn_handler = createServerRpc({
	id: "0bf57704f441309d987d2ca1ff8f30ee3124798573db87020ab25d2f39206653",
	name: "getPlatformMLInference",
	filename: "src/lib/platform-overviews.functions.ts"
}, (opts) => getPlatformMLInference.__executeServer(opts));
var getPlatformMLInference = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformMLInference_createServerFn_handler, async ({ context }) => {
	await assertSuper(context.supabase, context.userId);
	const { supabaseAdmin: sa } = await import("./client.server-Bw6iWMJ-.mjs");
	const tenants = await loadTenants(sa);
	const since = (/* @__PURE__ */ new Date(Date.now() - 168 * 3600 * 1e3)).toISOString();
	const { data: readings } = await sa.from("sensor_readings").select("admin_id, ml_risk_score, ml_risk_class, ml_confidence, anomaly_detected, reading_timestamp").gte("reading_timestamp", since).limit(2e4);
	const agg = /* @__PURE__ */ new Map();
	let totalInferences = 0;
	let totalAnomalies = 0;
	for (const r of readings ?? []) {
		const k = r.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			inferences: 0,
			anomalies: 0,
			confSum: 0,
			confN: 0,
			critical: 0
		};
		if (r.ml_risk_class != null) {
			cur.inferences += 1;
			totalInferences += 1;
			if (r.ml_confidence != null) {
				cur.confSum += Number(r.ml_confidence);
				cur.confN += 1;
			}
			if (String(r.ml_risk_class).toLowerCase() === "critical") cur.critical += 1;
		}
		if (r.anomaly_detected) {
			cur.anomalies += 1;
			totalAnomalies += 1;
		}
		agg.set(k, cur);
	}
	return {
		rows: Array.from(agg.values()).map((t) => ({
			admin_id: t.admin_id,
			name: tenantName(tenants, t.admin_id),
			inferences: t.inferences,
			anomalies: t.anomalies,
			critical: t.critical,
			avgConfidence: t.confN > 0 ? t.confSum / t.confN : 0,
			anomalyRate: t.inferences > 0 ? t.anomalies / t.inferences : 0
		})).sort((a, b) => b.inferences - a.inferences),
		totalInferences,
		totalAnomalies,
		windowDays: 7
	};
});
var getPlatformInsuranceOverview_createServerFn_handler = createServerRpc({
	id: "75ad4e2eca0d115ef54c492e66d58affde7b29e4c4eed509389f722dfa708461",
	name: "getPlatformInsuranceOverview",
	filename: "src/lib/platform-overviews.functions.ts"
}, (opts) => getPlatformInsuranceOverview.__executeServer(opts));
var getPlatformInsuranceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformInsuranceOverview_createServerFn_handler, async ({ context }) => {
	await assertSuper(context.supabase, context.userId);
	const { supabaseAdmin: sa } = await import("./client.server-Bw6iWMJ-.mjs");
	const tenants = await loadTenants(sa);
	const [{ data: policies }, { data: claims }] = await Promise.all([sa.from("insurance_policies").select("admin_id, coverage_amount, premium_amount, status").limit(5e3), sa.from("insurance_claims").select("admin_id, amount_claimed, amount_approved, status").limit(5e3)]);
	const agg = /* @__PURE__ */ new Map();
	for (const p of policies ?? []) {
		const k = p.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			policies: 0,
			activePolicies: 0,
			coverage: 0,
			premium: 0,
			claims: 0,
			openClaims: 0,
			claimed: 0,
			approved: 0
		};
		cur.policies += 1;
		if (p.status === "active") cur.activePolicies += 1;
		cur.coverage += Number(p.coverage_amount ?? 0);
		cur.premium += Number(p.premium_amount ?? 0);
		agg.set(k, cur);
	}
	for (const c of claims ?? []) {
		const k = c.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			policies: 0,
			activePolicies: 0,
			coverage: 0,
			premium: 0,
			claims: 0,
			openClaims: 0,
			claimed: 0,
			approved: 0
		};
		cur.claims += 1;
		if (c.status !== "paid" && c.status !== "rejected") cur.openClaims += 1;
		cur.claimed += Number(c.amount_claimed ?? 0);
		cur.approved += Number(c.amount_approved ?? 0);
		agg.set(k, cur);
	}
	const rows = Array.from(agg.values()).map((t) => ({
		admin_id: t.admin_id,
		name: tenantName(tenants, t.admin_id),
		policies: t.policies,
		activePolicies: t.activePolicies,
		coverage: t.coverage,
		premium: t.premium,
		claims: t.claims,
		openClaims: t.openClaims,
		claimed: t.claimed,
		approved: t.approved,
		claimRate: t.policies > 0 ? t.claims / t.policies : 0
	})).sort((a, b) => b.coverage - a.coverage);
	return {
		rows,
		totals: rows.reduce((s, r) => ({
			coverage: s.coverage + r.coverage,
			premium: s.premium + r.premium,
			claimed: s.claimed + r.claimed,
			openClaims: s.openClaims + r.openClaims,
			policies: s.policies + r.policies
		}), {
			coverage: 0,
			premium: 0,
			claimed: 0,
			openClaims: 0,
			policies: 0
		})
	};
});
var getPlatformBuyersOverview_createServerFn_handler = createServerRpc({
	id: "26e00a6998274e304562a157e02cefcf13dafcacffdda0fd9a50e55a97849415",
	name: "getPlatformBuyersOverview",
	filename: "src/lib/platform-overviews.functions.ts"
}, (opts) => getPlatformBuyersOverview.__executeServer(opts));
var getPlatformBuyersOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getPlatformBuyersOverview_createServerFn_handler, async ({ context }) => {
	await assertSuper(context.supabase, context.userId);
	const { supabaseAdmin: sa } = await import("./client.server-Bw6iWMJ-.mjs");
	const tenants = await loadTenants(sa);
	const [{ data: buyers }, { data: invoices }] = await Promise.all([sa.from("buyers").select("admin_id, status, rating, last_order_at").limit(1e4), sa.from("buyer_invoices").select("admin_id, total_amount, payment_status, created_at").limit(1e4)]);
	const agg = /* @__PURE__ */ new Map();
	for (const b of buyers ?? []) {
		const k = b.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			buyers: 0,
			active: 0,
			ratingSum: 0,
			ratingN: 0,
			invoices: 0,
			revenue: 0,
			outstanding: 0
		};
		cur.buyers += 1;
		if (b.status === "active") cur.active += 1;
		if (typeof b.rating === "number") {
			cur.ratingSum += b.rating;
			cur.ratingN += 1;
		}
		agg.set(k, cur);
	}
	for (const inv of invoices ?? []) {
		const k = inv.admin_id ?? "unknown";
		const cur = agg.get(k) ?? {
			admin_id: k,
			buyers: 0,
			active: 0,
			ratingSum: 0,
			ratingN: 0,
			invoices: 0,
			revenue: 0,
			outstanding: 0
		};
		cur.invoices += 1;
		cur.revenue += Number(inv.total_amount ?? 0);
		if (inv.payment_status !== "paid" && inv.payment_status !== "cancelled") cur.outstanding += Number(inv.total_amount ?? 0);
		agg.set(k, cur);
	}
	const rows = Array.from(agg.values()).map((t) => ({
		admin_id: t.admin_id,
		name: tenantName(tenants, t.admin_id),
		buyers: t.buyers,
		active: t.active,
		avgRating: t.ratingN > 0 ? t.ratingSum / t.ratingN : 0,
		invoices: t.invoices,
		revenue: t.revenue,
		outstanding: t.outstanding
	})).sort((a, b) => b.revenue - a.revenue);
	return {
		rows,
		totals: rows.reduce((s, r) => ({
			buyers: s.buyers + r.buyers,
			active: s.active + r.active,
			invoices: s.invoices + r.invoices,
			revenue: s.revenue + r.revenue,
			outstanding: s.outstanding + r.outstanding
		}), {
			buyers: 0,
			active: 0,
			invoices: 0,
			revenue: 0,
			outstanding: 0
		})
	};
});
//#endregion
export { getPlatformAnalyticsBreakdown_createServerFn_handler, getPlatformBuyersOverview_createServerFn_handler, getPlatformInsuranceOverview_createServerFn_handler, getPlatformMLInference_createServerFn_handler };
