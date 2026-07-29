/**
 * Open Field Incident — any role (technician, manager, admin) can report one
 * to a specific person they choose; the recipient (or the reporter) closes
 * it. Visible to everyone in the tenant (grain_alerts RLS is already
 * tenant-wide). Deliberately separate from the technician->manager->
 * super_admin escalation chain in monitoring.functions.ts — see that file's
 * reportIncident/assignIncident/escalateIncident, which this does not touch.
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
  recipientId: z.string().uuid(),
});

export const reportFieldIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!TENANT_ROLES.includes(role)) throw new Error("Forbidden");

    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    // Recipient must be a real member of the same tenant.
    const { data: recipient } = await context.supabase
      .from("profiles").select("id, admin_id, name, email").eq("id", data.recipientId).maybeSingle();
    const r = recipient as { id: string; admin_id: string | null; name: string | null; email: string | null } | null;
    if (!r || (r.admin_id ?? r.id) !== tenantAdminId) throw new Error("Recipient must be a member of your team");
    if (r.id === context.userId) throw new Error("Pick someone else to send this to");

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
        recipient_id: data.recipientId,
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
    await emitNotification(context.supabase, {
      recipientId: data.recipientId,
      tenantAdminId,
      category: "incident",
      severity: "warning",
      title: "New field incident reported to you",
      body: `${reporterName}: ${data.title}`,
      link: "/administration",
      entityType: "grain_alert",
      entityId: id,
    });

    return { id };
  });

export const listFieldIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!TENANT_ROLES.includes(role)) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("id, title, message, status, created_at, resolved_at, created_by, recipient_id")
      .eq("source", "field_incident")
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
    if (!TENANT_ROLES.includes(role)) throw new Error("Forbidden");

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
    return { ok: true };
  });
