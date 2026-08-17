import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordSettingsAudit } from "./settings-audit.server";

const schema = z.object({
  default_page_size: z.number().int().positive().max(1000),
  max_attachment_mb: z.number().int().positive().max(100),
  offline_window_hours: z.number().int().positive().max(720),
  geofence_enforced: z.boolean(),
  actuator_override_allowed: z.boolean(),
  required_photo_rules: z.record(z.string(), z.any()),
  incident_categories: z.array(z.string().min(1)).min(1),
  bundle_ttl_minutes: z.number().int().positive().max(240).optional(),
  bundle_max_tasks: z.number().int().positive().max(1000).optional(),
  bundle_max_incidents: z.number().int().positive().max(500).optional(),
});

export const getFieldSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mobile_field_settings").select("*").eq("id", true).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateFieldSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => schema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: before } = await context.supabase.from("mobile_field_settings")
      .select("*").eq("id", true).maybeSingle();
    const { error } = await context.supabase.from("mobile_field_settings")
      .update({ ...data, updated_by: context.userId } as never).eq("id", true);
    if (error) throw new Error(error.message);
    await recordSettingsAudit({
      actorUserId: context.userId,
      settingsKey: "mobile_field",
      before,
      after: { ...data, updated_by: context.userId },
    });
    return { ok: true };
  });

export const listFieldIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("field_incidents").select("*")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const assignFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    id: z.string().uuid(),
    assigned_to: z.string().uuid(),
  }).parse(v))
  .handler(async ({ data, context }) => {

    const { requireRole } = await import("./rbac.server");
    await requireRole(context.supabase, context.userId, ["admin", "manager", "super_admin"]);

    // Policy: A technician can only work on 1 active task (QC batch or field incident) at a time
    const { data: activeIncidents } = await context.supabase
      .from("field_incidents")
      .select("id, category")
      .eq("assigned_to", data.assigned_to)
      .in("status", ["open", "investigating"] as never)
      .neq("id", data.id);

    if (activeIncidents && activeIncidents.length > 0) {
      throw new Error(`Technician is already working on an active incident (${activeIncidents[0].category}). Each technician can only handle 1 incident at a time.`);
    }

    const { data: activeQCBatches } = await context.supabase
      .from("grain_batches")
      .select("id, batch_id")
      .eq("assigned_technician_id" as never, data.assigned_to)
      .in("status", ["pending_qc", "qc_submitted", "qc_failed", "qc_passed"] as never);

    if (activeQCBatches && activeQCBatches.length > 0) {
      throw new Error(`Technician is already busy with active QC batch ${activeQCBatches[0].batch_id}.`);
    }

    const { error } = await context.supabase.from("field_incidents")
      .update({
        assigned_to: data.assigned_to,
        assigned_at: new Date().toISOString(),
        status: "investigating",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAssignedIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("field_incidents")
      .select("id, category, severity, status, notes, silo_id, created_at, assigned_at, reporter_user_id")
      .eq("assigned_to", context.userId)
      .in("status", ["investigating", "open"] as never)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open","investigating","resolved","dismissed"]),
    resolution_notes: z.string().max(2000).optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "resolved" || data.status === "dismissed") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = context.userId;
      patch.resolution_notes = data.resolution_notes ?? null;
    }
    const { error } = await context.supabase.from("field_incidents")
      .update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Clear discussion history when incident is closed
    if (data.status === "resolved" || data.status === "dismissed") {
      const { error: deleteErr } = await (context.supabase
        .from("field_incident_comments" as any) as any)
        .delete()
        .eq("incident_id", data.id);
      if (deleteErr) {
        console.warn("[resolveFieldIncident] Failed to clear discussion comments:", deleteErr.message);
      }
    }

    return { ok: true };
  });

// ─── Report a new ticket (manager or technician) ──────────────────────────────
/**
 * Mobile field report — this is the OLDER, pre-existing "web-side create" for
 * the mobile-sync `field_incidents` table (see the sync layer at
 * src/routes/api/public/v1/sync/field-incidents.ts and
 * src/lib/mobile-action-registry.server.ts, neither of which call this
 * function — they insert directly). Renamed from `reportFieldIncident` to
 * stop colliding in name (though never in code, different files) with the
 * unrelated, newer auto-routing feature in field-incidents.functions.ts,
 * which is backed by grain_alerts, not this table. Pure rename — behavior,
 * table, and callers below are unchanged.
 */
export const reportMobileFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    title: z.string().min(1).max(200).optional(),
    category: z.string().min(1).max(100).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    reporter_name: z.string().max(100).optional(),
    reporter_role: z.string().max(50).optional(),
    target_role: z.enum(["admin", "manager", "technician"]).optional(),
    description: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    silo_id: z.string().uuid().nullable().optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./rbac.server");
    await requireRole(context.supabase, context.userId, ["admin", "manager", "technician", "super_admin"]);

    // Resolve tenant id via existing helper
    const { data: profile } = await context.supabase
      .from("profiles").select("admin_id, id, name, email").eq("id", context.userId).maybeSingle();
    const tenantId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    const targetRole = data.target_role ?? "admin";
    const cat = data.title?.trim() || data.category?.trim() || "General Incident";
    const description = data.description?.trim() || data.notes?.trim() || "";
    const reporterName = data.reporter_name?.trim() || profile?.name || profile?.email;

    // Determine recipient_id based on target_role
    let recipientId: string | null = null;
    if (targetRole !== "admin") {
      // Find a user with the target role in the same tenant
      const { data: targetUsers } = await context.supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", targetRole)
        .limit(1)
        .maybeSingle();
      
      if (targetUsers?.user_id) {
        // Verify the user belongs to the same tenant
        const { data: profile } = await context.supabase
          .from("profiles")
          .select("id")
          .eq("id", targetUsers.user_id)
          .or(`admin_id.eq.${tenantId},id.eq.${tenantId}`)
          .maybeSingle();
        recipientId = profile?.id ?? null;
      }
    }

    // Insert into grain_alerts with source='field_incident' to be visible in monitoring page
    const { error, data: inserted } = await context.supabase.from("grain_alerts").insert({
      alert_id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      admin_id: tenantId, // Required for RLS policy
      title: cat,
      message: description || null,
      priority: data.severity === "high" ? "critical" : data.severity, // Map high to critical
      status: "open",
      alert_type: "in-app", // Must be one of: SMS, voice, in-app, email, push
      source: "field_incident",
      created_by: context.userId,
      recipient_id: recipientId,
      triggered_at: new Date().toISOString(),
      custom_fields: {
        silo_id: data.silo_id ?? null,
        reporter_name: reporterName,
        reporter_role: data.reporter_role?.trim() || null,
        target_role: targetRole,
      } as never,
    } as never).select("id").maybeSingle();

    if (error) throw new Error(error.message);

    // Notify users of the selected target role
    try {
      const { emitToRole } = await import("./notify");
      const notifSeverity = data.severity === "critical" || data.severity === "high" ? "warning" : "info";
      const notifLink = targetRole === "manager" ? "/manager/monitoring" : "/platform/monitoring";
      await emitToRole(context.supabase, tenantId, targetRole, {
        category: "ops",
        severity: notifSeverity,
        title: `New Incident Ticket: ${cat}`,
        body: `${reporterName || "A user"} reported a ${data.severity} incident targetted to ${targetRole}: "${cat}"`,
        link: notifLink,
        entityType: "field_incident",
        entityId: (inserted as { id?: string } | null)?.id ?? null,
      });
    } catch (e) {
      console.warn("[reportMobileFieldIncident] Failed to emit role notification:", e);
    }

    return { ok: true };
  });

// ─── List ALL open tickets for the tenant (manager + technician view) ─────────
export const listOpenFieldIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Updated to use grain_alerts with source='field_incident' instead of field_incidents table
    // This ensures consistency with other field incident queries across the app
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("id, title, message, status, priority, created_at, resolved_at, created_by, recipient_id, custom_fields, source")
      .eq("source", "field_incident")
      .in("status", ["open", "pending", "investigating"] as never)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    
    // Map grain_alerts structure to match expected field_incidents structure for backward compatibility
    const incidents = (data ?? []).map((incident: any) => ({
      id: incident.id,
      category: incident.title,
      severity: incident.priority ?? "medium",
      status: incident.status,
      notes: incident.message,
      created_at: incident.created_at,
      reporter_user_id: incident.created_by,
      assigned_to: incident.recipient_id,
      silo_id: incident.custom_fields?.silo_id ?? null,
    }));
    
    return incidents;
  });

// ─── List Comments / Discussion for an Incident Ticket ────────────────────────
export const listIncidentComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ incident_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    // Check if the caller is a participant (reporter or assignee)
    const { data: incident } = await context.supabase
      .from("field_incidents")
      .select("reporter_user_id, assigned_to, status")
      .eq("id", data.incident_id)
      .maybeSingle();

    const inc = incident as { reporter_user_id: string | null; assigned_to: string | null; status: string } | null;
    const isParticipant =
      inc?.reporter_user_id === context.userId ||
      inc?.assigned_to === context.userId;

    if (!isParticipant) {
      // Non-participants receive empty list with participation flag
      return { comments: [], isParticipant: false };
    }

    const { data: comments, error } = await (context.supabase
      .from("field_incident_comments" as any) as any)
      .select("id, incident_id, user_id, author_name, author_role, message, created_at")
      .eq("incident_id", data.incident_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[listIncidentComments] error fetching comments:", error.message);
      return { comments: [], isParticipant: true };
    }
    return {
      isParticipant: true,
      comments: (comments ?? []) as Array<{
        id: string;
        incident_id: string;
        user_id: string;
        author_name: string;
        author_role: string;
        message: string;
        created_at: string;
      }>,
    };
  });

// ─── Add Comment / Discussion Message to an Incident Ticket ─────────────────
export const addIncidentComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    incident_id: z.string().uuid(),
    message: z.string().min(1).max(2000),
  }).parse(v))
  .handler(async ({ data, context }) => {
    // Participant gate: only the reporter or assignee may post
    const { data: incidentCheck } = await context.supabase
      .from("field_incidents")
      .select("reporter_user_id, assigned_to, status")
      .eq("id", data.incident_id)
      .maybeSingle();

    const inc = incidentCheck as { reporter_user_id: string | null; assigned_to: string | null; status: string } | null;
    const isParticipant =
      inc?.reporter_user_id === context.userId ||
      inc?.assigned_to === context.userId;

    if (!isParticipant) {
      throw new Error("Not authorised to discuss this incident.");
    }

    if (inc?.status === "resolved" || inc?.status === "dismissed") {
      throw new Error("Discussion is closed — this incident has been resolved.");
    }

    const { getEffectiveRole } = await import("./rbac.server");
    const role = await getEffectiveRole(context.supabase, context.userId);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, name, email, admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    const authorName = profile?.name || profile?.email || "User";
    const tenantId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    const { error } = await (context.supabase.from("field_incident_comments" as any) as any).insert({
      incident_id: data.incident_id,
      user_id: context.userId,
      author_name: authorName,
      author_role: role,
      message: data.message.trim(),
    });

    if (error) throw new Error(error.message);

    // Notify participants in this incident discussion
    try {
      const { data: incident } = await context.supabase
        .from("field_incidents")
        .select("category, reporter_user_id, assigned_to")
        .eq("id", data.incident_id)
        .maybeSingle();

      if (incident) {
        const { emitNotification } = await import("./notify");
        // Target recipient: if caller is reporter, notify assigned or managers; else notify reporter
        const recipientId = context.userId === incident.reporter_user_id
          ? (incident.assigned_to ?? null)
          : incident.reporter_user_id;

        if (recipientId && recipientId !== context.userId) {
          await emitNotification(context.supabase, {
            recipientId,
            tenantAdminId: tenantId,
            category: "ops",
            severity: "info",
            title: `New Comment on Ticket: ${incident.category}`,
            body: `${authorName} (${role}): "${data.message.trim().slice(0, 100)}"`,
            link: "/platform/field-incidents",
            entityType: "field_incident",
            entityId: data.incident_id,
          });
        }
      }
    } catch (e) {
      console.warn("[addIncidentComment] Failed to emit notification:", e);
    }

    return { ok: true };
  });