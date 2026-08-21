/**
 * Batch traceability / audit trail — reuses the existing activity_logs
 * infrastructure (see src/lib/activity.ts) rather than a new table.
 *
 * Manager/admin only, per spec. Note this is deliberately NOT the same scope
 * as listActivityLogs (notifications-audit.functions.ts), which restricts
 * manager/technician to their own actions only (user_id = caller) — that
 * scoping is an app-level choice in that function, not an RLS limit
 * (activity_logs RLS is tenant-wide). A batch's journey involves multiple
 * actors (technician QC input, manager review, admin approval), so this
 * function is entity-scoped instead of actor-scoped.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const input = z.object({ batchId: z.string().uuid() });

export const getBatchTraceability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["admin", "manager"].includes(role)) throw new Error("Forbidden");

    const { data: logs, error } = await context.supabase
      .from("activity_logs")
      .select(
        "id, action, description, category, severity, user_id, user_name, user_role, metadata, created_at",
      )
      .eq("entity_type", "grain_batch")
      .eq("entity_id", data.batchId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Field incidents tied to this batch, if any (see field-incidents.functions.ts).
    // The current "Report field incident" form doesn't collect a batch, so
    // this will typically be empty until/unless that's added.
    const { data: incidents } = await context.supabase
      .from("grain_alerts")
      .select("id, title, message, status, created_at, created_by, recipient_id")
      .eq("source", "field_incident")
      .eq("batch_id", data.batchId)
      .order("created_at", { ascending: true });

    const actorIds = Array.from(new Set((logs ?? []).map((l: Row) => l.user_id).filter(Boolean)));
    const incidentPeopleIds = (incidents ?? [])
      .flatMap((i: Row) => [i.created_by, i.recipient_id])
      .filter(Boolean);
    const allIds = Array.from(new Set([...actorIds, ...incidentPeopleIds]));
    let profiles: Row[] = [];
    if (allIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", allIds);
      profiles = profs ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));

    const timeline = [
      ...(logs ?? []).map((l: Row) => ({
        kind: "log" as const,
        id: l.id,
        at: l.created_at,
        action: l.action,
        description: l.description,
        severity: l.severity,
        actorName: l.user_id ? (nameOf.get(l.user_id) ?? l.user_name ?? "Unknown") : "System",
        actorRole: l.user_role,
        metadata: l.metadata,
      })),
      ...(incidents ?? []).map((i: Row) => ({
        kind: "field_incident" as const,
        id: i.id,
        at: i.created_at,
        action: i.status === "closed" ? "field_incident.closed" : "field_incident.reported",
        description: i.title,
        severity: "warning",
        actorName: i.created_by ? (nameOf.get(i.created_by) ?? "Unknown") : "Unknown",
        recipientName: i.recipient_id ? (nameOf.get(i.recipient_id) ?? "Unknown") : "Unknown",
        status: i.status,
      })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return { timeline };
  });
