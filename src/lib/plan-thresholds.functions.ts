import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { z } from "zod";
import { logActivity } from "./activity";

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
  max_warehouses: z.number().int().min(0).optional(),
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

    // Propagate updated limits to all live subscription rows on this plan
    // so usePlanLimits on the admin side reflects the change immediately.
    // Uses context.supabase first (super_admin passes RLS), falls back to
    // supabaseAdmin only if the service role key is available.
    try {
      const limitPatch: Record<string, number> = {};
      if (patch.max_silos      !== undefined) limitPatch.max_silos      = patch.max_silos;
      if (patch.max_warehouses !== undefined) limitPatch.max_warehouses = patch.max_warehouses;
      if (patch.max_users      !== undefined) limitPatch.max_users      = patch.max_users;
      if (patch.max_batches    !== undefined) limitPatch.max_batches    = patch.max_batches;
      if (patch.max_sensors    !== undefined) limitPatch.max_sensors    = patch.max_sensors;
      if (patch.max_actuators  !== undefined) limitPatch.max_actuators  = patch.max_actuators;

      if (Object.keys(limitPatch).length > 0) {
        // super_admin passes RLS on subscriptions — context.supabase is enough
        await context.supabase
          .from("subscriptions")
          .update(limitPatch as never)
          .eq("plan_name", plan_id as never)
          .in("status", ["active", "trial"]);
      }
    } catch (err) {
      console.warn("[updatePlanThreshold] subscription limit sync failed", err);
    }

    // Notify all tenant admins on this plan so they see updated limits immediately.
    // Also notify super admins so the editor sees confirmation in their bell.
    try {
      // Fetch plan name — context.supabase (super_admin) can read plan_thresholds
      const { data: planRow } = await context.supabase
        .from("plan_thresholds")
        .select("name")
        .eq("plan_id", plan_id)
        .maybeSingle();
      const planName = planRow?.name ?? plan_id;

      // Find affected TENANT ADMIN IDs via two sources.
      // super_admin passes RLS on both profiles and subscriptions tables,
      // so context.supabase works here — no service role key needed.

      // Source 1 — profiles with subscription_plan match AND no admin_id (i.e., the tenant admin themselves)
      const { data: profileRows } = await context.supabase
        .from("profiles")
        .select("id")
        .eq("subscription_plan", plan_id as never)
        .is("admin_id", null);

      const profileIds = (profileRows ?? []).map((r: { id: string }) => r.id);
      const { data: roleRows } = profileIds.length
        ? await context.supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", profileIds)
        : { data: [] as Array<{ user_id: string; role: string }> };

      const rolesByUser = new Map<string, string[]>();
      for (const rr of (roleRows ?? []) as Array<{ user_id: string; role: string }>) {
        rolesByUser.set(rr.user_id, [...(rolesByUser.get(rr.user_id) ?? []), rr.role]);
      }

      // Source 2 — subscriptions.plan_name match (active/trial rows)
      const { data: subRows } = await context.supabase
        .from("subscriptions")
        .select("admin_id")
        .eq("plan_name", plan_id as never)
        .in("status", ["active", "trial"]);

      // Union and deduplicate — only keep actual tenant admins (not managers/technicians)
      const fromProfiles = profileIds
        .filter((id) => {
          const roles = rolesByUser.get(id) ?? [];
          // Include if they have admin role, or if no roles (legacy seed data), but never if manager/technician only
          const hasManagerOrTech = roles.some((rr) => rr === "manager" || rr === "technician");
          const hasAdmin = roles.some((rr) => rr === "admin" || rr === "super_admin");
          if (hasManagerOrTech && !hasAdmin) return false;
          return true;
        });

      const fromSubs = (subRows ?? [])
        .map((r: { admin_id: string | null }) => r.admin_id)
        .filter(Boolean) as string[];
      const tenantAdminIds = Array.from(new Set([...fromProfiles, ...fromSubs]));

      // Notify tenant admins with rich detail on exactly what changed
      if (tenantAdminIds.length > 0) {
        // Build a readable change summary
        const changes: string[] = [];
        if (patch.max_silos !== undefined)      changes.push(`Silos: ${patch.max_silos}`);
        if (patch.max_warehouses !== undefined) changes.push(`Warehouses: ${patch.max_warehouses}`);
        if (patch.max_users !== undefined)      changes.push(`Users: ${patch.max_users}`);
        if (patch.max_batches !== undefined)    changes.push(`Batches: ${patch.max_batches}`);
        if (patch.max_sensors !== undefined)    changes.push(`Sensors: ${patch.max_sensors}`);
        if (patch.max_actuators !== undefined)  changes.push(`Actuators: ${patch.max_actuators}`);
        if (patch.price_cents !== undefined)    changes.push(`Price: PKR ${Math.round(patch.price_cents / 100)}/mo`);
        
        const changesSummary = changes.length > 0 
          ? `Limits updated instantly across all tenants on this plan. You'll see a confirmation in your notification bell.`
          : "Your plan details have been updated.";

        const detailedMessage = changes.length > 0
          ? `Your ${planName} plan limits have been updated by GrainHero:\n\n${changes.join(" · ")}\n\nYour account reflects the new limits immediately.`
          : "Your plan limits have been adjusted by GrainHero. Your account reflects the new limits immediately.";

        const notifRows = tenantAdminIds.map((id: string) => ({
          admin_id: id,
          user_id: id,
          type: "success",
          category: "plan",
          title: `"${planName}" plan saved`,
          message: detailedMessage,
          action_url: "/subscription",
          entity_type: "plan_threshold",
          entity_id: plan_id,
          metadata: { plan_id, updated_fields: Object.keys(patch), changes },
          read: false,
        }));

        const { error: notifErr } = await context.supabase
          .from("notifications")
          .insert(notifRows as never);

        if (notifErr) {
          console.warn("[updatePlanThreshold] tenant admin notification insert failed:", notifErr.message);
        }
      }

      // Only tenant admins are notified. Super admin made the change intentionally
      // so they do not need an in-app notification — the toast on the UI is sufficient.
    } catch (err) {
      console.warn("[updatePlanThreshold] notification dispatch failed", err);
    }

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
    const current = prof.subscription_plan ?? "basic";
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
    // Use insert_notification RPC (security-definer) so no service role key needed.
    try {
      const { data: superAdmins } = await context.supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      const saIds = ((superAdmins ?? []) as { user_id: string }[]).map((r) => r.user_id);
      const notifTitle = autoApply
        ? `Auto-upgrade: ${current} → ${data.requested_plan}`
        : `Plan change requested: ${current} → ${data.requested_plan}`;
      const notifBody = autoApply
        ? `Tenant auto-upgraded to ${data.requested_plan}.`
        : `A tenant requested to switch to ${data.requested_plan}. Review in Plan requests.`;

      for (const saId of saIds) {
        await (context.supabase as any).rpc("insert_notification", {
          p_user_id: saId,
          p_admin_id: context.userId,
          p_title: notifTitle,
          p_message: notifBody,
          p_category: "plan",
          p_type: autoApply ? "info" : "warning",
          p_action_url: "/platform/plans",
          p_entity_type: "plan_change_request",
          p_entity_id: inserted?.id ?? null,
          p_metadata: { tenant_admin_id: tenantAdminId, direction, from: current, to: data.requested_plan },
        });
      }
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
        // super_admin passes RLS on subscriptions — context.supabase is sufficient
        await context.supabase
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

    // Security event — super_admin passes RLS on security_events
    try {
      await (context.supabase as any).from("security_events").insert({
        user_id: context.userId,
        tenant_id: req.tenant_admin_id,
        event: data.approve ? "plan_change.approved" : "plan_change.rejected",
        meta: { request_id: data.id, from: req.current_plan, to: req.requested_plan } as never,
      } as never);
    } catch (err) {
      console.warn("[decide] security event failed", err);
    }

    if (req.requested_by) {
      // Use insert_notification RPC (security-definer) — works without service role key.
      // super_admin also passes RLS but RPC is more reliable for cross-tenant inserts.
      const { error: rpcErr } = await (context.supabase as any).rpc("insert_notification", {
        p_user_id: req.requested_by,
        p_admin_id: req.tenant_admin_id,
        p_title: data.approve ? "Plan change approved" : "Plan change rejected",
        p_message: data.approve
          ? `Your plan has been changed to ${req.requested_plan}.`
          : `Your request to switch to ${req.requested_plan} was rejected: ${decisionNote}`,
        p_category: "plan",
        p_type: data.approve ? "success" : "warning",
        p_action_url: "/subscription",
        p_entity_type: "plan_change_request",
        p_entity_id: data.id,
        p_metadata: { from: req.current_plan, to: req.requested_plan, status: data.approve ? "approved" : "rejected" },
      });
      if (rpcErr) console.warn("[decide] notification RPC failed:", rpcErr.message);
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