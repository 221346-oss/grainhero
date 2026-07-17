/**
 * Phase 1 — Plan gating helper.
 *
 * Single source of truth for "does this tenant's plan allow feature X /
 * are they under the numeric cap for Y". Backed by `plan_thresholds`
 * (row per plan, numeric caps as columns, boolean toggles in `features`
 * jsonb).
 *
 * Server usage:
 *   await assertPlanAllows({ adminId, feature: "max_silos", currentUsage })
 * Client usage:
 *   const gate = usePlanGate("max_sensors")
 */
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export type PlanNumericFeature =
  | "max_users"
  | "max_silos"
  | "max_batches"
  | "max_sensors"
  | "max_actuators"
  | "max_buyers";

export type PlanBooleanFeature =
  | "exports"
  | "alerts_sms"
  | "api"
  | "insurance"
  | "sso";

export type PlanFeature = PlanNumericFeature | PlanBooleanFeature;

const NUMERIC: readonly PlanNumericFeature[] = [
  "max_users",
  "max_silos",
  "max_batches",
  "max_sensors",
  "max_actuators",
  "max_buyers",
];

export class PlanLimitError extends Error {
  code = "PLAN_LIMIT" as const;
  constructor(
    public feature: PlanFeature,
    public limit: number | boolean,
    public used?: number,
  ) {
    super(`Plan limit reached for ${feature}`);
  }
}

function isNumeric(f: PlanFeature): f is PlanNumericFeature {
  return (NUMERIC as readonly string[]).includes(f);
}

/**
 * Server: fetch the effective plan gate for a given admin (tenant owner).
 * Returns `{ allowed, limit, used }`. `used` is only defined for numeric
 * caps when the caller supplied `currentUsage`.
 */
export const getPlanGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { feature: PlanFeature; currentUsage?: number }) =>
    z
      .object({
        feature: z.string() as unknown as z.ZodType<PlanFeature>,
        currentUsage: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context;
    const { data: profile } = await sb
      .from("profiles")
      .select("admin_id, subscription_plan")
      .eq("id", userId)
      .maybeSingle();
    const tenantAdminId = profile?.admin_id ?? userId;

    let planId = profile?.subscription_plan ?? null;
    if (!planId && tenantAdminId !== userId) {
      const { data: owner } = await sb
        .from("profiles")
        .select("subscription_plan")
        .eq("id", tenantAdminId)
        .maybeSingle();
      planId = owner?.subscription_plan ?? null;
    }
    planId = planId ?? "starter";

    const { data: plan } = await sb
      .from("plan_thresholds")
      .select("*")
      .eq("plan_id", planId)
      .maybeSingle();

    if (!plan) {
      return { allowed: false, limit: 0, used: data.currentUsage, planId };
    }

    if (isNumeric(data.feature)) {
      const limit = (plan as unknown as Record<string, number>)[data.feature] ?? 0;
      const used = data.currentUsage ?? 0;
      return { allowed: used < limit, limit, used, planId };
    }
    const features = (plan.features ?? {}) as Record<string, unknown>;
    const raw = features[data.feature];
    const allowed = raw === true || raw === "true" || (typeof raw === "string" && raw !== "basic" && raw !== "false");
    return { allowed, limit: allowed, used: undefined, planId };
  });

/**
 * Server-only assertion helper. Call inside mutating server fns before
 * inserting a new silo/sensor/etc.
 */
export async function assertPlanAllows(args: {
  feature: PlanFeature;
  currentUsage?: number;
}) {
  const gate = await getPlanGate({ data: args });
  if (!gate.allowed) throw new PlanLimitError(args.feature, gate.limit, gate.used);
  return gate;
}

/**
 * Client hook: React Query wrapper around `getPlanGate`. Use to disable
 * "Add X" buttons and show upgrade nudges.
 */
export function usePlanGate(feature: PlanFeature, currentUsage?: number) {
  return useQuery({
    queryKey: ["plan-gate", feature, currentUsage],
    queryFn: () => getPlanGate({ data: { feature, currentUsage } }),
    staleTime: 60_000,
  });
}

// Re-export supabase to keep tree-shaken clients from importing an unused
// module — helpful for tests that stub the browser client.
export const _debugClient = supabase;
