// Server-only helper — single source of truth for PKR plan pricing.
// Reads plan_thresholds.price_cents. Used by every revenue calculation
// (SuperAdmin overview, revenue analytics, financials, integrity checks)
// so a price edit in the DB propagates everywhere immediately.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type PlanPriceRow = {
  plan_id: string;
  name: string | null;
  price_rs: number; // whole PKR (rupees), not cents
  currency: string | null;
};

/** Load canonical PKR plan prices keyed by plan_id AND name (lowercased). */
export async function loadPlanPricing(supabase: AnyClient): Promise<Map<string, PlanPriceRow>> {
  const { data } = await supabase
    .from("plan_thresholds")
    .select("plan_id, name, price_cents, currency")
    .eq("is_active", true);
  const map = new Map<string, PlanPriceRow>();
  for (const r of (data ?? []) as Array<{
    plan_id: string;
    name: string | null;
    price_cents: number | null;
    currency: string | null;
  }>) {
    const row: PlanPriceRow = {
      plan_id: String(r.plan_id),
      name: r.name,
      price_rs: Math.round(Number(r.price_cents ?? 0) / 100),
      currency: r.currency ?? "PKR",
    };
    map.set(String(r.plan_id).toLowerCase(), row);
    if (r.name) map.set(String(r.name).toLowerCase(), row);
  }
  return map;
}

/** Fetch the set of super_admin user ids so they can be excluded from MRR. */
export async function loadSuperAdminIds(supabase: AnyClient): Promise<Set<string>> {
  const { data } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
}

export type MrrInputs = {
  supabase: AnyClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriptions?: Array<any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles?: Array<any> | null;
};

export type MrrResult = {
  mrr: number;
  activeSubs: number;
  planMap: Map<string, PlanPriceRow>;
  byPlan: Record<string, number>;
  /** Subscribers merged (subscriptions rows + profile fallback rows). */

  entries: Array<{
    admin_id: string | null;
    plan_id: string;
    plan_name: string;
    price: number;
    created_at: string | null;
  }>;
};

/**
 * Compute MRR in PKR.
 * Priority:
 *   1. If a subscription row is active/trialing, use its plan → plan_thresholds price.
 *   2. Otherwise, for a profile with subscription_plan set (and not a super_admin),
 *      count the plan_thresholds price as MRR.
 *
 * subscriptions.price_per_month is intentionally IGNORED so a stale/legacy USD
 * value cannot pollute the totals. Everything is PKR from plan_thresholds.
 */
export async function computeMrr({
  supabase,
  subscriptions,
  profiles,
}: MrrInputs): Promise<MrrResult> {
  const [planMap, superIds] = await Promise.all([
    loadPlanPricing(supabase),
    loadSuperAdminIds(supabase),
  ]);

  const priceFor = (raw?: string | null): PlanPriceRow | undefined => {
    if (!raw) return undefined;
    const k = String(raw).trim().toLowerCase();
    return planMap.get(k) ?? planMap.get(k.replace(/^grain\s+/, ""));
  };

  const entries: MrrResult["entries"] = [];
  const seenAdmins = new Set<string>();

  // 1. Subscription rows first (only active / trialing counted).
  for (const s of (subscriptions ?? []) as Array<{
    admin_id: string | null;
    status: string | null;
    plan_name: string | null;
    plan_id?: string | null;
    created_at: string | null;
  }>) {
    if (!(s.status === "active" || s.status === "trialing")) continue;
    if (s.admin_id && superIds.has(s.admin_id)) continue;
    const plan = priceFor(s.plan_id ?? s.plan_name);
    if (!plan) continue;
    entries.push({
      admin_id: s.admin_id,
      plan_id: plan.plan_id,
      plan_name: plan.name ?? plan.plan_id,
      price: plan.price_rs,
      created_at: s.created_at,
    });
    if (s.admin_id) seenAdmins.add(s.admin_id);
  }

  // 2. Profile fallback for tenants without a subscription row yet
  //    (typical right after signup — Stripe/webhook hasn't populated it).
  for (const p of (profiles ?? []) as Array<{
    id: string;
    subscription_plan: string | null;
    created_at: string | null;
  }>) {
    if (superIds.has(p.id)) continue;
    if (seenAdmins.has(p.id)) continue;
    const plan = priceFor(p.subscription_plan);
    if (!plan) continue;
    entries.push({
      admin_id: p.id,
      plan_id: plan.plan_id,
      plan_name: plan.name ?? plan.plan_id,
      price: plan.price_rs,
      created_at: p.created_at,
    });
  }

  const mrr = entries.reduce((s, e) => s + e.price, 0);
  const byPlan: Record<string, number> = {};
  for (const e of entries) byPlan[e.plan_name] = (byPlan[e.plan_name] ?? 0) + e.price;

  return { mrr, activeSubs: entries.length, planMap, byPlan, entries };
}
