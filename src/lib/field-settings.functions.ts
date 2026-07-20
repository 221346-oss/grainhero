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

    const { error } = await context.supabase.from("field_incidents")
      .update({
        assigned_to: data.assigned_to,
        assigned_at: new Date().toISOString(),
        status: "investigating",
      } as never)
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
    return { ok: true };
  });