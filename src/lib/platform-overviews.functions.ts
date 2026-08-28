import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { fetchDispatchTotals } from "./operations.functions";

async function assertSuper(supabase: any, userId: string) {
  if ((await getEffectiveRole(supabase, userId)) !== "super_admin") {
    throw new Error("Forbidden: super admin only");
  }
}

async function loadTenants(sa: any) {
  const { data } = await sa
    .from("profiles")
    .select("id, name, email, business_type")
    .is("admin_id", null);
  const map = new Map<string, any>();
  for (const p of (data ?? []) as any[]) map.set(p.id, p);
  return map;
}

function tenantName(map: Map<string, any>, id: string | null | undefined) {
  if (!id) return "Unknown tenant";
  const p = map.get(id);
  return p?.name ?? p?.email ?? "Unknown tenant";
}

// -------- Analytics: per-tenant revenue / inventory / spoilage ranking --------
export const getPlatformAnalyticsBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const tenants = await loadTenants(sa);

    const { data: batches } = await sa
      .from("grain_batches")
      .select("admin_id, quantity_kg, revenue, profit, spoilage_label, status")
      .is("deleted_at", null)
      .limit(10000);

    const agg = new Map<
      string,
      {
        admin_id: string;
        batches: number;
        kg: number;
        revenue: number;
        profit: number;
        spoiled: number;
      }
    >();
    for (const b of (batches ?? []) as any[]) {
      const k = b.admin_id ?? "unknown";
      const cur = agg.get(k) ?? {
        admin_id: k,
        batches: 0,
        kg: 0,
        revenue: 0,
        profit: 0,
        spoiled: 0,
      };
      cur.batches += 1;
      cur.kg += Number(b.quantity_kg ?? 0);
      cur.revenue += Number(b.revenue ?? 0);
      cur.profit += Number(b.profit ?? 0);
      if (b.spoilage_label && String(b.spoilage_label).toLowerCase() !== "safe") cur.spoiled += 1;
      agg.set(k, cur);
    }

    // TODO(dispatch-refactor): grain_batches.revenue/profit above are the legacy per-batch
    // dispatch model and will stop growing now that dispatch happens from silos
    // (dispatchFromSilo in operations.functions.ts, writing to the `dispatches` table).
    // Merging both per-tenant so platform analytics doesn't undercount tenants that have
    // moved to silo-based dispatch — replace with a dispatches-only query once legacy
    // batch-level dispatch data is fully migrated.
    const dispatchTotals = await fetchDispatchTotals(sa);
    for (const d of dispatchTotals) {
      const cur = agg.get(d.admin_id) ?? {
        admin_id: d.admin_id,
        batches: 0,
        kg: 0,
        revenue: 0,
        profit: 0,
        spoiled: 0,
      };
      cur.revenue += d.revenue;
      cur.profit += d.profit;
      agg.set(d.admin_id, cur);
    }

    const rows = Array.from(agg.values())
      .map((t) => ({
        admin_id: t.admin_id,
        name: tenantName(tenants, t.admin_id),
        batches: t.batches,
        kg: t.kg,
        revenue: t.revenue,
        margin: t.revenue > 0 ? t.profit / t.revenue : 0,
        spoilageRate: t.batches > 0 ? t.spoiled / t.batches : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totals = rows.reduce(
      (s, r) => ({
        kg: s.kg + r.kg,
        revenue: s.revenue + r.revenue,
        batches: s.batches + r.batches,
      }),
      { kg: 0, revenue: 0, batches: 0 },
    );

    return { rows, totals, totalTenants: rows.length };
  });

// -------- Insurance: insured value + claim rate per tenant --------
export const getPlatformInsuranceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const tenants = await loadTenants(sa);

    const [{ data: policies }, { data: claims }] = await Promise.all([
      sa
        .from("insurance_policies")
        .select("admin_id, coverage_amount, premium_amount, status")
        .limit(5000),
      sa
        .from("insurance_claims")
        .select("admin_id, amount_claimed, amount_approved, status")
        .limit(5000),
    ]);

    const agg = new Map<
      string,
      {
        admin_id: string;
        policies: number;
        activePolicies: number;
        coverage: number;
        premium: number;
        claims: number;
        openClaims: number;
        claimed: number;
        approved: number;
      }
    >();
    for (const p of (policies ?? []) as any[]) {
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
        approved: 0,
      };
      cur.policies += 1;
      if (p.status === "active") cur.activePolicies += 1;
      cur.coverage += Number(p.coverage_amount ?? 0);
      cur.premium += Number(p.premium_amount ?? 0);
      agg.set(k, cur);
    }
    for (const c of (claims ?? []) as any[]) {
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
        approved: 0,
      };
      cur.claims += 1;
      if (c.status !== "paid" && c.status !== "rejected") cur.openClaims += 1;
      cur.claimed += Number(c.amount_claimed ?? 0);
      cur.approved += Number(c.amount_approved ?? 0);
      agg.set(k, cur);
    }

    const rows = Array.from(agg.values())
      .map((t) => ({
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
        claimRate: t.policies > 0 ? t.claims / t.policies : 0,
      }))
      .sort((a, b) => b.coverage - a.coverage);

    const totals = rows.reduce(
      (s, r) => ({
        coverage: s.coverage + r.coverage,
        premium: s.premium + r.premium,
        claimed: s.claimed + r.claimed,
        openClaims: s.openClaims + r.openClaims,
        policies: s.policies + r.policies,
      }),
      { coverage: 0, premium: 0, claimed: 0, openClaims: 0, policies: 0 },
    );

    return { rows, totals };
  });

// -------- Buyers: buyer / dispatch activity per tenant --------
export const getPlatformBuyersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const tenants = await loadTenants(sa);

    const [{ data: buyers }, { data: invoices }] = await Promise.all([
      sa.from("buyers").select("admin_id, status, rating, last_order_at").limit(10000),
      sa
        .from("buyer_invoices")
        .select("admin_id, total_amount, payment_status, created_at")
        .limit(10000),
    ]);

    const agg = new Map<
      string,
      {
        admin_id: string;
        buyers: number;
        active: number;
        ratingSum: number;
        ratingN: number;
        invoices: number;
        revenue: number;
        outstanding: number;
      }
    >();
    for (const b of (buyers ?? []) as any[]) {
      const k = b.admin_id ?? "unknown";
      const cur = agg.get(k) ?? {
        admin_id: k,
        buyers: 0,
        active: 0,
        ratingSum: 0,
        ratingN: 0,
        invoices: 0,
        revenue: 0,
        outstanding: 0,
      };
      cur.buyers += 1;
      if (b.status === "active") cur.active += 1;
      if (typeof b.rating === "number") {
        cur.ratingSum += b.rating;
        cur.ratingN += 1;
      }
      agg.set(k, cur);
    }
    for (const inv of (invoices ?? []) as any[]) {
      const k = inv.admin_id ?? "unknown";
      const cur = agg.get(k) ?? {
        admin_id: k,
        buyers: 0,
        active: 0,
        ratingSum: 0,
        ratingN: 0,
        invoices: 0,
        revenue: 0,
        outstanding: 0,
      };
      cur.invoices += 1;
      cur.revenue += Number(inv.total_amount ?? 0);
      if (inv.payment_status !== "paid" && inv.payment_status !== "cancelled")
        cur.outstanding += Number(inv.total_amount ?? 0);
      agg.set(k, cur);
    }

    const rows = Array.from(agg.values())
      .map((t) => ({
        admin_id: t.admin_id,
        name: tenantName(tenants, t.admin_id),
        buyers: t.buyers,
        active: t.active,
        avgRating: t.ratingN > 0 ? t.ratingSum / t.ratingN : 0,
        invoices: t.invoices,
        revenue: t.revenue,
        outstanding: t.outstanding,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totals = rows.reduce(
      (s, r) => ({
        buyers: s.buyers + r.buyers,
        active: s.active + r.active,
        invoices: s.invoices + r.invoices,
        revenue: s.revenue + r.revenue,
        outstanding: s.outstanding + r.outstanding,
      }),
      { buyers: 0, active: 0, invoices: 0, revenue: 0, outstanding: 0 },
    );

    return { rows, totals };
  });
