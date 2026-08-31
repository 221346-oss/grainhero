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

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: (updated as Row).admin_id as string,
      action: "alert.acknowledged",
      targetType: "grain_alert",
      targetId: data.id,
      meta: { title: (updated as Row).title },
    });
    return { ok: true };
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

/**
 * Fetch active alerts (pending/acknowledged) for silos assigned to technician.
 * Technician sees alerts for silos they have assigned batches.
 */
export const getTechnicianAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    status: z.enum(["all", "pending", "acknowledged"]).default("all").optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    limit: z.number().int().min(1).max(500).default(50),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // Step 1: Find all silos where technician has assigned batches
    const { data: batches, error: batchError } = await context.supabase
      .from("grain_batches")
      .select("silo_id")
      .eq("assigned_technician_id", context.userId)
      .not("silo_id", "is", null);
    
    if (batchError) throw batchError;

    const siloIds = Array.from(new Set((batches ?? []).map((b: Row) => b.silo_id as string).filter(Boolean)));

    // If technician has no assigned batches/silos, return empty
    if (siloIds.length === 0) {
      return { alerts: [] };
    }

    // Step 2: Query grain_alerts for those silos with active status
    let q = context.supabase
      .from("grain_alerts")
      .select("id, alert_id, title, message, priority, status, source, alert_type, sensor_type, silo_id, warehouse_id, batch_id, triggered_at, acknowledged_at, resolved_at, created_at, created_by, assigned_to, trigger_conditions, silos(id, silo_id, name)")
      .in("silo_id", siloIds)
      .order("triggered_at", { ascending: false })
      .limit(data.limit);

    // Filter by status
    if (data.status === "pending") {
      q = q.eq("status", "pending");
    } else if (data.status === "acknowledged") {
      q = q.eq("status", "acknowledged");
    } else {
      // "all" = show active alerts (pending or acknowledged, not resolved/escalated)
      q = q.in("status", ["pending", "acknowledged"]);
    }

    // Filter by priority if provided
    if (data.priority) {
      q = q.eq("priority", data.priority);
    }

    const { data: alerts, error: alertError } = await q;
    if (alertError) throw alertError;

    return { alerts: (alerts ?? []) as unknown as Row[] };
  });
