import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { z } from "zod";

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw new Error(r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · "));
}

async function assertSuperAdmin(supabase: any, userId: string) {
  if ((await getEffectiveRole(supabase, userId)) !== "super_admin") throw new Error("Forbidden");
}

/* -------------------- list -------------------- */

export const listPlanThresholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plan_thresholds")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

/* -------------------- update (super_admin) -------------------- */

const updatePlanInput = z.object({
  plan_id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0).optional(),
  max_users: z.number().int().min(0).optional(),
  max_silos: z.number().int().min(0).optional(),
  max_batches: z.number().int().min(0).optional(),
  max_sensors: z.number().int().min(0).optional(),
  max_actuators: z.number().int().min(0).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
  is_popular: z.boolean().optional(),
});

export const updatePlanThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(updatePlanInput, d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { plan_id, ...patch } = data;
    const { error } = await context.supabase
      .from("plan_thresholds")
      .update(patch as never)
      .eq("plan_id", plan_id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- admin: request plan change -------------------- */

const requestChangeInput = z.object({
  requested_plan: z.string().min(1),
  note: z.string().max(500).optional().nullable(),
});

export const requestPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(requestChangeInput, d))
  .handler(async ({ data, context }) => {
    // Phase 2 — verify identity (JWT still valid) + soft rate-limit
    const { getVerifiedUser } = await import("@/lib/session.server");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await getVerifiedUser(context.supabase);
    const gate = checkRateLimit(`plan-change:${context.userId}`, {
      limit: 5,
      windowMs: 60_000,
    });
    if (!gate.ok) {
      return { ok: false as const, error: "rate_limited", retryAfter: gate.retryAfter };
    }

    // Only tenant admins may request
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (role !== "admin") throw new Error("Only tenant admins can request plan changes");

    // Load caller profile + plans
    const [{ data: prof }, { data: plans }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, admin_id, subscription_plan, auto_upgrade_enabled")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("plan_thresholds").select("plan_id, sort_order, price_cents"),
    ]);
    if (!prof) throw new Error("Profile not found");

    const tenantAdminId = prof.admin_id ?? prof.id;
    const current = prof.subscription_plan ?? "starter";
    const cur = plans?.find((p: any) => p.plan_id === current);
    const next = plans?.find((p: any) => p.plan_id === data.requested_plan);
    if (!next) throw new Error("Requested plan not found");
    if (data.requested_plan === current) throw new Error("Already on this plan");

    const direction =
      (next.sort_order ?? 0) > (cur?.sort_order ?? 0) ? "upgrade" : "downgrade";

    const autoApply = direction === "upgrade" && prof.auto_upgrade_enabled === true;

    const status = autoApply ? "auto_applied" : "pending";

    const { data: inserted, error } = await context.supabase
      .from("tenant_plan_change_requests")
      .insert({
        tenant_admin_id: tenantAdminId,
        requested_plan: data.requested_plan,
        current_plan: current,
        direction,
        status,
        note: data.note ?? null,
        requested_by: context.userId,
        decided_by: autoApply ? context.userId : null,
        decided_at: autoApply ? new Date().toISOString() : null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    if (autoApply) {
      const { error: upErr } = await context.supabase
        .from("profiles")
        .update({ subscription_plan: data.requested_plan } as never)
        .eq("id", tenantAdminId);
      if (upErr) throw upErr;
    }

    return { ok: true, id: inserted?.id, auto_applied: autoApply };
  });

/* -------------------- admin: cancel own pending -------------------- */

export const cancelPlanChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(z.object({ id: z.string().uuid() }), d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenant_plan_change_requests")
      .update({ status: "cancelled" } as never)
      .eq("id", data.id)
      .eq("requested_by", context.userId)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- super_admin: decide -------------------- */

const decideInput = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(500).optional().nullable(),
});

export const decidePlanChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(decideInput, d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);

    const { data: req, error: e1 } = await context.supabase
      .from("tenant_plan_change_requests")
      .select("id, tenant_admin_id, requested_plan, status")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already decided");

    const newStatus = data.approve ? "approved" : "rejected";

    const { error: e2 } = await context.supabase
      .from("tenant_plan_change_requests")
      .update({
        status: newStatus,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        note: data.note ?? null,
      } as never)
      .eq("id", data.id);
    if (e2) throw e2;

    if (data.approve) {
      const { error: e3 } = await context.supabase
        .from("profiles")
        .update({ subscription_plan: req.requested_plan } as never)
        .eq("id", req.tenant_admin_id);
      if (e3) throw e3;
    }

    return { ok: true };
  });

/* -------------------- super_admin: manual set tenant plan -------------------- */

export const setTenantPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    parseOrThrow(z.object({ tenant_admin_id: z.string().uuid(), plan_id: z.string().min(1) }), d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profiles")
      .update({ subscription_plan: data.plan_id } as never)
      .eq("id", data.tenant_admin_id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- list requests -------------------- */

export const listPlanChangeRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    parseOrThrow(
      z.object({ status: z.enum(["all", "pending", "approved", "rejected", "auto_applied", "cancelled"]).default("all") }),
      d,
    ),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("tenant_plan_change_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const status = data.status ?? "all";
    if (status !== "all") q = q.eq("status", status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/* -------------------- admin: toggle auto-upgrade -------------------- */

export const setAutoUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(z.object({ enabled: z.boolean() }), d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const target = prof?.admin_id ?? context.userId;
    const { error } = await context.supabase
      .from("profiles")
      .update({ auto_upgrade_enabled: data.enabled } as never)
      .eq("id", target);
    if (error) throw error;
    return { ok: true };
  });