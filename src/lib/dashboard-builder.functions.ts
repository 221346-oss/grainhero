/**
 * Phase 21 — Dashboard widget management.
 * - Personal widgets: created by any authenticated user, owner_id = self.
 * - Role widgets: super-admin only, role_scope set, owner_id null.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole, requireRole } from "@/lib/rbac.server";

const CHART_TYPES = ["tile", "line", "bar", "pie", "table"] as const;
const SIZES = ["sm", "md", "lg"] as const;
const ROLES = ["super_admin", "admin", "manager", "technician", "buyer"] as const;

type Row = Record<string, any>;

export const listWidgetsForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const role = await getEffectiveRole(sb, context.userId);
    const { data: rows, error } = await sb
      .from("dashboard_widgets")
      .select("*")
      .or(`owner_id.eq.${context.userId},and(role_scope.eq.${role},owner_id.is.null)`)
      .order("position", { ascending: true });
    if (error) throw error;
    return { widgets: (rows ?? []) as Row[], role };
  });

export const listWidgetsForRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ role: z.enum(ROLES) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);

    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("dashboard_widgets")
      .select("*")
      .eq("role_scope", data.role)
      .is("owner_id", null)
      .order("position", { ascending: true });
    if (error) throw error;
    return { widgets: (rows ?? []) as Row[] };
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  dashboard_key: z.string().default("role_default"),
  metric_key: z.string(),
  chart_type: z.enum(CHART_TYPES).default("tile"),
  size: z.enum(SIZES).default("sm"),
  filters: z.record(z.string(), z.any()).default({}),
  position: z.number().int().min(0).default(0),
  role_scope: z.enum(ROLES).optional(),
  personal: z.boolean().default(false),
});

export const saveWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const role = await getEffectiveRole(sb, context.userId);
    const isRoleWidget = !data.personal && !!data.role_scope;
    if (isRoleWidget && role !== "super_admin") throw new Error("Forbidden");
    const payload: Row = {
      dashboard_key: data.dashboard_key,
      metric_key: data.metric_key,
      chart_type: data.chart_type,
      size: data.size,
      filters: data.filters,
      position: data.position,
      owner_id: isRoleWidget ? null : context.userId,
      role_scope: isRoleWidget ? data.role_scope! : role,
    };
    if (data.id) {
      const { data: row, error } = await sb
        .from("dashboard_widgets")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      await sb.rpc("record_governance_audit", {
        _action: "widget.update",
        _target_type: "widget",
        _target_key: row.id,
        _before: null,
        _after: row,
      });
      return { widget: row as Row };
    }
    const { data: row, error } = await sb
      .from("dashboard_widgets")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await sb.rpc("record_governance_audit", {
      _action: "widget.create",
      _target_type: "widget",
      _target_key: row.id,
      _before: null,
      _after: row,
    });
    return { widget: row as Row };
  });

export const deleteWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: prev } = await sb
      .from("dashboard_widgets")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await sb.from("dashboard_widgets").delete().eq("id", data.id);
    if (error) throw error;
    await sb.rpc("record_governance_audit", {
      _action: "widget.delete",
      _target_type: "widget",
      _target_key: data.id,
      _before: prev ?? null,
      _after: null,
    });
    return { ok: true };
  });

export const reorderWidgets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        items: z
          .array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) }))
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    for (const it of data.items) {
      await sb.from("dashboard_widgets").update({ position: it.position }).eq("id", it.id);
    }
    return { ok: true };
  });
