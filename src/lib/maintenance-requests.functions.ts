/**
 * Maintenance requests — Admin triggers ("I want maintenance on this
 * device/silo"), Super Admin views and tracks to completion. Manager and
 * Technician have no access (enforced both here and by RLS — see
 * 20260724100000_maintenance_requests.sql).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole, getEffectiveRole } from "@/lib/rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const createInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  deviceId: z.string().uuid().optional().nullable(),
  siloId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

/** Admin-only: request maintenance on a device or silo sensor. */
export const createMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = (profile as { admin_id?: string | null } | null)?.admin_id ?? context.userId;

    const { data: row, error } = await context.supabase
      .from("maintenance_requests" as never)
      .insert({
        admin_id: tenantAdminId,
        requested_by: context.userId,
        device_id: data.deviceId ?? null,
        silo_id: data.siloId ?? null,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: "requested",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

/** Admin sees their own tenant's requests; super_admin sees every tenant's. */
export const listMaintenanceRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["admin", "super_admin"].includes(role)) throw new Error("Forbidden");

    // RLS already scopes admin to their own tenant and lets super_admin see
    // all — no extra .eq needed.
    const { data, error } = await context.supabase
      .from("maintenance_requests" as never)
      .select("*, devices:device_id(id, device_name, device_id), silos:silo_id(id, name, silo_id), technician:assigned_technician_id(id, name, email)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as Row[];

    if (role !== "super_admin") return { requests: rows };

    // Attach tenant name for the platform (cross-tenant) view.
    const adminIds = Array.from(new Set(rows.map((r) => r.admin_id as string).filter(Boolean)));
    let profiles: Row[] = [];
    if (adminIds.length > 0) {
      const { data: profs } = await context.supabase.from("profiles").select("id, name, email").in("id", adminIds);
      profiles = profs ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));
    return {
      requests: rows.map((r) => ({ ...r, tenantName: nameOf.get(r.admin_id) ?? r.admin_id })),
    };
  });

const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["requested", "acknowledged", "in_progress", "completed", "cancelled"]).optional(),
  assignedTechnicianId: z.string().uuid().optional().nullable(),
  resolutionNotes: z.string().trim().max(2000).optional().nullable(),
});

/** Super_admin-only: assign a technician, change status, add resolution notes. */
export const updateMaintenanceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);

    const patch: Row = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "completed") patch.resolved_at = new Date().toISOString();
    }
    if (data.assignedTechnicianId !== undefined) patch.assigned_technician_id = data.assignedTechnicianId;
    if (data.resolutionNotes !== undefined) patch.resolution_notes = data.resolutionNotes;

    const { error } = await context.supabase
      .from("maintenance_requests" as never)
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
