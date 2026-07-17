import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { z } from "zod";
import { logActivity } from "./activity";
import { emitNotification, emitToSuperAdmins } from "./notify";

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw new Error(r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · "));
}

async function assertSuperAdmin(supabase: any, userId: string) {
  if ((await getEffectiveRole(supabase, userId)) !== "super_admin") throw new Error("Forbidden");
}

async function verifyAndLimit(
  context: { supabase: any; userId: string },
  bucket: string,
  limit = 10,
) {
  const { getVerifiedUser } = await import("@/lib/session.server");
  const { checkRateLimit } = await import("@/lib/rate-limit");
  await getVerifiedUser(context.supabase);
  const gate = checkRateLimit(`${bucket}:${context.userId}`, { limit, windowMs: 60_000 });
  if (!gate.ok) throw new Error(`Too many requests. Try again in ${gate.retryAfter}s.`);
}

// Notification helpers now live in @/lib/notify.

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
      throw new Error(`Too many plan change requests. Try again in ${gate.retryAfter}s.`);
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

    // Notify super-admins of the incoming request (or auto-applied change).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await emitToSuperAdmins(supabaseAdmin, {
        category: "plan",
        severity: autoApply ? "info" : "warning",
        title: autoApply
          ? `Auto-upgrade: ${current} → ${data.requested_plan}`
          : `Plan change requested: ${current} → ${data.requested_plan}`,
        body: autoApply
          ? `Tenant auto-upgraded to ${data.requested_plan}.`
          : `A tenant requested to switch to ${data.requested_plan}. Review in Plan requests.`,
        link: "/platform/plans",
        entityType: "plan_change_request",
        entityId: inserted?.id ?? null,
        metadata: { tenant_admin_id: tenantAdminId, direction, from: current, to: data.requested_plan },
      });
    } catch (err) {
      console.warn("[requestPlanChange] super-admin notify failed", err);
    }

    return { ok: true, id: inserted?.id, auto_applied: autoApply };
  });

/* -------------------- admin: cancel own pending -------------------- */

export const cancelPlanChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(z.object({ id: z.string().uuid() }), d))
  .handler(async ({ data, context }) => {
    await verifyAndLimit(context, "plan-change-cancel");
    const { error } = await context.supabase
      .from("tenant_plan_change_requests")
      .update({ status: "cancelled" } as never)
      .eq("id", data.id)
      .eq("requested_by", context.userId)
      .eq("status", "pending");
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      tenantAdminId: context.userId,
      action: "plan_change_cancelled",
      targetType: "plan_change_request",
      targetId: data.id,
      sb: context.supabase,
    });
    return { ok: true };
  });

/* -------------------- super_admin: decide -------------------- */

const decideInput = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(500).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});

export const decidePlanChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(decideInput, d))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("@/lib/session.server");
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    await verifyAndLimit(context, "plan-change-decide");

    if (!data.approve && !(data.reason && data.reason.trim().length > 0)) {
      throw new Error("Rejection reason is required");
    }

    const { data: req, error: e1 } = await context.supabase
      .from("tenant_plan_change_requests")
      .select("id, tenant_admin_id, requested_plan, current_plan, requested_by, status")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already decided");

    const newStatus = data.approve ? "approved" : "rejected";
    const decisionNote = data.approve ? (data.note ?? null) : (data.reason ?? null);

    const { error: e2 } = await context.supabase
      .from("tenant_plan_change_requests")
      .update({
        status: newStatus,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        note: decisionNote,
      } as never)
      .eq("id", data.id);
    if (e2) throw e2;

    if (data.approve) {
      const { error: e3 } = await context.supabase
        .from("profiles")
        .update({ subscription_plan: req.requested_plan } as never)
        .eq("id", req.tenant_admin_id);
      if (e3) throw e3;

      // Best-effort: keep any live subscription row's plan_name in sync so
      // financials + gates pick it up immediately. Skip if none exists.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("subscriptions")
          .update({ plan_name: req.requested_plan } as never)
          .eq("admin_id", req.tenant_admin_id)
          .in("status", ["active", "trial"]);
      } catch (err) {
        console.warn("[decide] subscription sync failed", err);
      }
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId: req.tenant_admin_id,
      action: data.approve ? "plan_change_approved" : "plan_change_rejected",
      targetType: "plan_change_request",
      targetId: data.id,
      meta: {
        from: req.current_plan,
        to: req.requested_plan,
        note: decisionNote,
      },
      sb: context.supabase,
    });

    // Security event via admin client (RLS-free insert).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("security_events").insert({
        user_id: context.userId,
        tenant_id: req.tenant_admin_id,
        event: data.approve ? "plan_change.approved" : "plan_change.rejected",
        meta: { request_id: data.id, from: req.current_plan, to: req.requested_plan } as never,
      } as never);
    } catch (err) {
      console.warn("[decide] security event failed", err);
    }

    if (req.requested_by) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await emitNotification(supabaseAdmin, {
        recipientId: req.requested_by,
        tenantAdminId: req.tenant_admin_id,
        category: "plan",
        severity: data.approve ? "success" : "warning",
        title: data.approve ? "Plan change approved" : "Plan change rejected",
        body: data.approve
          ? `Your plan has been changed to ${req.requested_plan}.`
          : `Your request to switch to ${req.requested_plan} was rejected: ${decisionNote}`,
        link: "/subscription",
        entityType: "plan_change_request",
        entityId: data.id,
        metadata: {
          from: req.current_plan,
          to: req.requested_plan,
          status: newStatus,
        },
      });
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