import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// End-to-end verification that every revenue surface agrees on PKR MRR
// sourced from plan_thresholds. Surfaced on /platform/launch-readiness so
// a data-change that empties a chart is immediately flagged.
export const verifyRevenueIntegrity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSA } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSA) throw new Error("Forbidden");

    const { computeMrr, loadPlanPricing } = await import("@/lib/plan-pricing.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: subs }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("admin_id, status, plan_id, plan_name, price_per_month, created_at"),
      supabaseAdmin
        .from("profiles")
        .select("id, subscription_plan, created_at")
        .not("subscription_plan", "is", null),
    ]);
    const planMap = await loadPlanPricing(supabaseAdmin);
    const mrrResult = await computeMrr({
      supabase: supabaseAdmin,
      subscriptions: subs ?? [],
      profiles: profiles ?? [],
    });

    const issues: Array<{ level: "error" | "warn"; message: string }> = [];
    if (planMap.size === 0)
      issues.push({
        level: "error",
        message: "plan_thresholds is empty — every revenue chart will be blank.",
      });
    if (mrrResult.mrr === 0 && (profiles ?? []).length > 0) {
      issues.push({
        level: "warn",
        message: "Tenants have subscription_plan set but MRR is 0. Check plan_thresholds pricing.",
      });
    }
    for (const p of profiles ?? []) {
      const raw = String((p as any).subscription_plan ?? "").toLowerCase();
      if (!raw) continue;
      if (!planMap.get(raw) && !planMap.get(raw.replace(/^grain\s+/, ""))) {
        issues.push({
          level: "warn",
          message: `Profile ${(p as any).id} references unknown plan "${raw}".`,
        });
      }
    }

    return {
      ok: issues.filter((i) => i.level === "error").length === 0,
      mrr: mrrResult.mrr,
      currency: "PKR",
      activeSubs: mrrResult.activeSubs,
      byPlan: mrrResult.byPlan,
      plans: Array.from(planMap.values()),
      issues,
      generated_at: new Date().toISOString(),
    };
  });
