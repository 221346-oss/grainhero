/**
 * Phase 9 — Alert list/ack/assign server fns.
 * Reads use RLS (context.supabase). Writes emit activity + notifications.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const LIST_INPUT = z.object({
  siloId: z.string().uuid().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["pending", "acknowledged", "resolved", "escalated"]).optional(),
  fromIso: z.string().datetime().optional(),
  toIso: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => LIST_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("grain_alerts")
      .select("id, alert_id, title, message, priority, status, source, alert_type, triggered_at, acknowledged_at, resolved_at, silo_id, warehouse_id, silos(id, silo_id, name)")
      .order("triggered_at", { ascending: false })
      .limit(data.limit);
    if (data.siloId) q = q.eq("silo_id", data.siloId);
    if (data.severity) q = q.eq("priority", data.severity);
    if (data.status) q = q.eq("status", data.status);
    if (data.fromIso) q = q.gte("triggered_at", data.fromIso);
    if (data.toIso) q = q.lte("triggered_at", data.toIso);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { alerts: (rows ?? []) as unknown as Row[] };
  });

export const acknowledgeAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("grain_alerts")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: context.userId,
      } as never)
      .eq("id", data.id)
      .select("id, admin_id, title")
      .single();
    if (error) throw error;

    const { logAlertAcknowledged } = await import("@/lib/activity-log.functions");
    await logAlertAcknowledged(
      (updated as Row).admin_id as string,
      context.userId,
      data.id,
      (updated as Row).title as string,
    );
    return { success: true, data: updated };
  });

export const assignAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), assigneeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("grain_alerts")
      .update({ assigned_to: data.assigneeId } as never)
      .eq("id", data.id)
      .select("id, admin_id, title")
      .single();
    if (error) throw error;

    const { emitNotification } = await import("@/lib/notify");
    await emitNotification(context.supabase, {
      recipientId: data.assigneeId,
      tenantAdminId: (updated as Row).admin_id as string,
      category: "ops",
      severity: "info",
      title: "Alert assigned to you",
      body: (updated as Row).title as string,
      link: "/grain-alerts",
      entityType: "grain_alert",
      entityId: data.id,
    });

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: (updated as Row).admin_id as string,
      action: "alert.assigned",
      targetType: "grain_alert",
      targetId: data.id,
      meta: { assigneeId: data.assigneeId },
    });
    return { ok: true };
  });

export const resolveAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), resolutionNote: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("grain_alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
        resolution_note: data.resolutionNote ?? null,
      } as never)
      .eq("id", data.id)
      .select("id, admin_id, title")
      .single();
    if (error) throw error;

    const { logAlertResolved } = await import("@/lib/activity-log.functions");
    await logAlertResolved(
      (updated as Row).admin_id as string,
      context.userId,
      data.id,
      (updated as Row).title as string,
    );
    return { success: true, data: updated };
  });

export const escalateAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), reason: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("grain_alerts")
      .update({
        status: "escalated",
      } as never)
      .eq("id", data.id)
      .select("id, admin_id, title")
      .single();
    if (error) throw error;

    const { emitNotification } = await import("@/lib/notify");
    // Escalate to tenant admin
    await emitNotification(context.supabase, {
      recipientId: (updated as Row).admin_id as string,
      tenantAdminId: (updated as Row).admin_id as string,
      category: "ops",
      severity: "warning",
      title: "🚨 Alert Escalated",
      body: `Alert "${(updated as Row).title}" was escalated by a user. Reason: ${data.reason ?? 'None provided'}`,
      link: "/grain-alerts",
      entityType: "grain_alert",
      entityId: data.id,
    });

    const { logAlertEscalated } = await import("@/lib/activity-log.functions");
    await logAlertEscalated(
      (updated as Row).admin_id as string,
      context.userId,
      data.id,
      (updated as Row).title as string,
      "Manager/Admin", // escalatedTo placeholder
    );
    return { success: true, data: updated };
  });
