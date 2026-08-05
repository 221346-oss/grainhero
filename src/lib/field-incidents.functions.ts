/**
 * Field Incident — always a strict 1-to-1 report: creator -> exactly one
 * recipient. Only the creator and the current recipient can see a given row
 * (no tenant-wide broadcast). Recipient is auto-routed by the creator's role,
 * except a Technician who picks one specific Manager themselves:
 *   - Technician -> picks one Manager. If that Manager doesn't act within 30
 *     minutes, it's auto-reassigned to the tenant Admin (see the escalation
 *     pass added to alerts-escalation.ts) — the Manager loses visibility once
 *     reassigned, since recipient_id has moved, not been duplicated.
 *   - Manager -> auto-routed to the tenant Admin.
 *   - Admin -> auto-routed to the (single) Super Admin.
 * Deliberately separate from the technician->manager->super_admin escalation
 * chain in monitoring.functions.ts — see that file's reportIncident/
 * assignIncident/escalateIncident, which this does not touch.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const TENANT_ROLES = ["admin", "manager", "technician"];

async function resolveTenantAdminId(supabase: Row, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles").select("admin_id").eq("id", userId).maybeSingle();
  return (profile as { admin_id?: string | null } | null)?.admin_id ?? userId;
}

const reportInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(1000),
  // Only required (and only used) when the creator is a technician — they're
  // the one case that still picks a specific person (a manager) themselves.
  recipientId: z.string().uuid().optional().nullable(),
});

export const reportFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!TENANT_ROLES.includes(role)) throw new Error("Forbidden");

    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    let recipientId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customFields: Record<string, any> = { creatorRole: role };
    // Only set for the super_admin fan-out case — inserting the notification
    // row for the recipient needs a cross-tenant client (see below).
    let notifyWithAdmin = false;

    if (role === "technician") {
      if (!data.recipientId) throw new Error("Pick a manager to send this to");
      const { data: recipient } = await context.supabase
        .from("profiles").select("id, admin_id").eq("id", data.recipientId).maybeSingle();
      const r = recipient as { id: string; admin_id: string | null } | null;
      if (!r || (r.admin_id ?? r.id) !== tenantAdminId) throw new Error("Recipient must be a member of your team");
      const { data: roleRow } = await context.supabase
        .from("user_roles").select("role").eq("user_id", data.recipientId).eq("role", "manager").maybeSingle();
      if (!roleRow) throw new Error("Pick a manager to send this to");
      recipientId = data.recipientId;
      // Eligible for the 30-min manager -> admin auto-reassignment.
      customFields.escalatable = true;
    } else if (role === "manager") {
      recipientId = tenantAdminId;
    } else {
      // role === "admin": route to the platform's super_admin. The system is
      // built assuming exactly one; if more than one exists we just take the
      // first found rather than fan out to all of them.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: supers } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("role", "super_admin").limit(1);
      const superAdminId = (supers as { user_id: string }[] | null)?.[0]?.user_id;
      if (!superAdminId) throw new Error("No super admin found to route this to");
      recipientId = superAdminId;
      notifyWithAdmin = true;
    }

    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .insert({
        alert_id: `FLD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        admin_id: tenantAdminId,
        title: data.title,
        message: data.description,
        priority: "medium",
        source: "field_incident",
        status: "pending",
        created_by: context.userId,
        recipient_id: recipientId,
        custom_fields: customFields,
        triggered_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const id = (row as { id: string }).id;

    const { data: reporter } = await context.supabase
      .from("profiles").select("name, email").eq("id", context.userId).maybeSingle();
    const reporterName = (reporter as { name?: string; email?: string } | null)?.name
      ?? (reporter as { name?: string; email?: string } | null)?.email ?? "A teammate";

    const { emitNotification } = await import("@/lib/notify");
    if (notifyWithAdmin) {
      // Admin -> super_admin crosses tenants: the reporter's RLS-scoped
      // client can't insert a notification row for a different admin_id, so
      // this one has to go through the service-role client (same reasoning
      // as notify.ts's emitToSuperAdmins).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await emitNotification(supabaseAdmin, {
        recipientId,
        tenantAdminId: recipientId,
        category: "incident",
        severity: "warning",
        title: "New field incident reported to you",
        body: `${reporterName}: ${data.title}`,
        link: "/administration",
        entityType: "grain_alert",
        entityId: id,
      });
    } else {
      await emitNotification(context.supabase, {
        recipientId,
        tenantAdminId,
        category: "incident",
        severity: "warning",
        title: "New field incident reported to you",
        body: `${reporterName}: ${data.title}`,
        link: "/administration",
        entityType: "grain_alert",
        entityId: id,
      });
    }

    return { id };
  });

export const listFieldIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!TENANT_ROLES.includes(role) && role !== "super_admin") throw new Error("Forbidden");

    // Strict 1-to-1 privacy: only the creator or the current recipient can
    // see a row. (Reassignment moves recipient_id rather than duplicating the
    // row, so the previous recipient naturally drops out of this filter.)
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("id, title, message, status, created_at, resolved_at, created_by, recipient_id, custom_fields")
      .eq("source", "field_incident")
      .or(`created_by.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    const rows = (data ?? []) as Row[];

    const ids = Array.from(new Set(rows.flatMap((r) => [r.created_by, r.recipient_id]).filter(Boolean)));
    let profiles: Row[] = [];
    if (ids.length > 0) {
      const { data: profs } = await context.supabase.from("profiles").select("id, name, email").in("id", ids);
      profiles = profs ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));

    return {
      incidents: rows.map((r) => ({
        ...r,
        reportedByName: r.created_by ? (nameOf.get(r.created_by) ?? null) : null,
        recipientName: r.recipient_id ? (nameOf.get(r.recipient_id) ?? null) : null,
        isMine: r.created_by === context.userId,
        isForMe: r.recipient_id === context.userId,
        wasReassigned: !!r.custom_fields?.reassignedFrom,
      })),
    };
  });

const closeInput = z.object({ id: z.string().uuid() });

/** Reporter or recipient can close. Nobody else. */
export const closeFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => closeInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!TENANT_ROLES.includes(role) && role !== "super_admin") throw new Error("Forbidden");

    const { data: existing } = await context.supabase
      .from("grain_alerts")
      .select("id, source, created_by, recipient_id, status")
      .eq("id", data.id)
      .maybeSingle();
    const e = existing as { id: string; source: string; created_by: string | null; recipient_id: string | null; status: string } | null;
    if (!e || e.source !== "field_incident") throw new Error("Not a field incident");
    if (e.created_by !== context.userId && e.recipient_id !== context.userId) {
      throw new Error("Only the reporter or the recipient can close this");
    }
    if (e.status === "closed") return { ok: true };

    const { error } = await context.supabase
      .from("grain_alerts")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      } as never)
      .eq("id", data.id);
    if (error) throw error;

    if (e.created_by && e.created_by !== context.userId) {
      const { emitNotification } = await import("@/lib/notify");
      const tenantAdminId = await resolveTenantAdminId(context.supabase, e.created_by);
      await emitNotification(context.supabase, {
        recipientId: e.created_by,
        tenantAdminId,
        category: "incident",
        severity: "success",
        title: "Your field incident was closed",
        body: "The incident you reported has been marked closed.",
        link: "/administration",
        entityType: "grain_alert",
        entityId: data.id,
      });
    }

    return { ok: true };
  });
