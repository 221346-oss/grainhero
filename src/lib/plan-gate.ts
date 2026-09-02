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
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export type PlanNumericFeature =
  | "max_users"
  | "max_warehouses"
  | "max_silos"
  | "max_batches"
  | "max_sensors"
  | "max_actuators"
  | "max_buyers"
  | "max_active_alert_rules";

export type PlanBooleanFeature = "exports" | "alerts_sms" | "api" | "insurance" | "sso";

export type PlanFeature = PlanNumericFeature | PlanBooleanFeature;

const NUMERIC: readonly PlanNumericFeature[] = [
  "max_users",
  "max_warehouses",
  "max_silos",
  "max_batches",
  "max_sensors",
  "max_actuators",
  "max_buyers",
  "max_active_alert_rules",
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

type Sb = SupabaseClient<Database>;

/** Server-only: resolve tenant admin id + plan id for a caller. */
async function resolvePlan(
  sb: Sb,
  userId: string,
): Promise<{
  tenantAdminId: string;
  planId: string;
  isSuper: boolean;
}> {
  const { data: profile } = await sb
    .from("profiles")
    .select("admin_id, subscription_plan")
    .eq("id", userId)
    .maybeSingle();
  const tenantAdminId = profile?.admin_id ?? userId;

  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const isSuper = (roles ?? []).some((r) => r.role === "super_admin");

  let planId = profile?.subscription_plan ?? null;
  if (!planId && tenantAdminId !== userId) {
    const { data: owner } = await sb
      .from("profiles")
      .select("subscription_plan")
      .eq("id", tenantAdminId)
      .maybeSingle();
    planId = owner?.subscription_plan ?? null;
  }
  // "basic" is the actual lowest-tier plan_id seeded in plan_thresholds on
  // this deployment (basic/intermediate/pro) — NOT "starter". A "starter"
  // default here would never match a plan_thresholds row and would push
  // every caller with a null subscription_plan into the "unknown plan"
  // branch below (denies every feature), rather than the real entry tier.
  return { tenantAdminId, planId: planId ?? "basic", isSuper };
}

/** Server-only: count current usage for a numeric feature. */
export async function getTenantUsage(
  sb: Sb,
  tenantAdminId: string,
  feature: PlanNumericFeature,
): Promise<number> {
  const table =
    feature === "max_warehouses"
      ? "warehouses"
      : feature === "max_silos"
        ? "silos"
        : feature === "max_batches"
          ? "grain_batches"
          : feature === "max_sensors"
            ? "sensor_devices"
            : feature === "max_actuators"
              ? "actuators"
              : feature === "max_buyers"
                ? "buyers"
                : "profiles"; // max_users
  if (feature === "max_users") {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .or(`admin_id.eq.${tenantAdminId},id.eq.${tenantAdminId}`);
    return count ?? 0;
  }
  let query = sb
    .from(table as "warehouses")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", tenantAdminId);
  // Exclude soft-deleted silos so they don't count toward the plan limit
  if (feature === "max_silos") {
    query = (query as any).is("deleted_at", null);
  }
  const { count } = await query;
  return count ?? 0;
}

/** Core gate resolver used by both the serverFn and server-side assertions. */
export async function computePlanGate(
  sb: Sb,
  userId: string,
  feature: PlanFeature,
  currentUsage?: number,
): Promise<{
  allowed: boolean;
  limit: number | boolean;
  used?: number;
  planId: string;
  isSuper: boolean;
  tenantAdminId: string;
}> {
  const { tenantAdminId, planId, isSuper } = await resolvePlan(sb, userId);
  if (isSuper) {
    return { allowed: true, limit: -1, used: currentUsage, planId, isSuper, tenantAdminId };
  }
  const { data: plan } = await sb
    .from("plan_thresholds")
    .select("*")
    .eq("plan_id", planId)
    .maybeSingle();
  if (!plan) {
    // Unknown / unconfigured plan → allow by default rather than silently blocking.
    // A missing plan_thresholds row means the feature hasn't been capped yet.
    return { allowed: true, limit: -1, used: currentUsage, planId, isSuper, tenantAdminId };
  }
  if (isNumeric(feature)) {
    const limit = Number((plan as unknown as Record<string, number>)[feature] ?? 0);
    const used = currentUsage ?? (await getTenantUsage(sb, tenantAdminId, feature));
    // limit <= 0 → treat as blocked (explicit zero cap); 9999+ acts as unlimited via cap.
    const allowed = limit > 0 && used < limit;
    return { allowed, limit, used, planId, isSuper, tenantAdminId };
  }
  const features = (plan.features ?? {}) as Record<string, unknown>;
  const raw = features[feature];
  const allowed = raw === true || raw === "true";
  return { allowed, limit: allowed, used: undefined, planId, isSuper, tenantAdminId };
}

/**
 * Server: fetch the effective plan gate for a given admin (tenant owner).
 * Client-callable wrapper around `computePlanGate` for `usePlanGate`.
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
    const gate = await computePlanGate(
      context.supabase,
      context.userId,
      data.feature,
      data.currentUsage,
    );
    return { allowed: gate.allowed, limit: gate.limit, used: gate.used, planId: gate.planId };
  });

/**
 * Server-only assertion helper. Call inside mutating server fn handlers
 * before inserting a new silo/sensor/etc. Pass the request-scoped
 * `context.supabase` and `context.userId`.
 */
export async function assertPlanAllows(args: {
  feature: PlanFeature;
  sb: Sb;
  userId: string;
  currentUsage?: number;
}): Promise<ReturnType<typeof computePlanGate> extends Promise<infer R> ? R : never> {
  const gate = await computePlanGate(args.sb, args.userId, args.feature, args.currentUsage);
  if (!gate.allowed) {
    // Log the hit for SuperAdmin insights; never let logging fail the caller.
    logActivity({
      actorId: args.userId,
      tenantAdminId: gate.tenantAdminId,
      action: "plan_limit_hit",
      targetType: "plan",
      severity: "warning",
      meta: { feature: args.feature, used: gate.used, limit: gate.limit, plan: gate.planId },
    }).catch(() => undefined);
    // Standardized wire format so the client can parse and CTA.
    const used = gate.used ?? 0;
    const limit = typeof gate.limit === "number" ? gate.limit : 0;
    throw new Error(`PLAN_LIMIT:${args.feature}:${used}/${limit}`);
  }
  return gate;
}

/** Client helper: parse `PLAN_LIMIT:<feature>:<used>/<limit>` out of a thrown error. */
export function parsePlanLimitError(err: unknown): {
  feature: PlanFeature;
  used: number;
  limit: number;
} | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = /PLAN_LIMIT:([a-z_]+):(\d+)\/(\d+)/.exec(msg);
  if (!m) return null;
  return { feature: m[1] as PlanFeature, used: Number(m[2]), limit: Number(m[3]) };
}

/**
 * Client hook: React Query wrapper around `getPlanGate`. Use to disable
 * "Add X" buttons and show upgrade nudges.
 */
export function usePlanGate(feature: PlanFeature, currentUsage?: number) {
  return useQuery({
    queryKey: ["plan-gate", feature, currentUsage],
    queryFn: () => getPlanGate({ data: { feature, currentUsage } }),
    staleTime: 10_000, // reduced from 60s — gate data must be fresh after requests
    refetchOnWindowFocus: true,
  });
}

// Re-export supabase to keep tree-shaken clients from importing an unused
// module — helpful for tests that stub the browser client.
export const _debugClient = supabase;
