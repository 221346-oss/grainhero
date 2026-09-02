/**
 * Phase 21 — Metric Registry CRUD + preview runner.
 * Super-admin only for writes. Everyone can list metrics visible to their role
 * (used by the dashboard builder).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole, requireRole } from "@/lib/rbac.server";

const CHART_HINTS = ["tile", "line", "bar", "pie", "table"] as const;
const ROLES = ["super_admin", "admin", "manager", "technician", "buyer", "pending"] as const;
const FORMATS = ["number", "currency", "percent", "ratio", "duration"] as const;
const KEY_RE = /^[a-z][a-z0-9_]{2,63}$/;

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().regex(KEY_RE, "snake_case, 3-64 chars"),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  sql_template: z.string().min(10).max(4000),
  csv_template: z.string().max(4000).optional().nullable(),
  unit: z.string().max(16).optional().nullable(),
  format: z.enum(FORMATS).default("number"),
  allowed_roles: z.array(z.enum(ROLES)).min(1),
  default_filters: z.record(z.string(), z.any()).default({}),
  chart_hint: z.enum(CHART_HINTS).default("tile"),
  active: z.boolean().default(true),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const listMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        onlyMine: z.boolean().default(false),
        active: z.enum(["all", "active", "inactive"]).default("all"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await getEffectiveRole(sb, context.userId);
    let q = sb.from("metric_registry").select("*").order("label");
    if (data.active === "active") q = q.eq("active", true);
    if (data.active === "inactive") q = q.eq("active", false);
    if (data.onlyMine && role !== "super_admin") q = q.contains("allowed_roles", [role]);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { metrics: (rows ?? []) as Row[], role };
  });

export const upsertMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: prev } = data.id
      ? await sb.from("metric_registry").select("*").eq("id", data.id).maybeSingle()
      : { data: null };
    const payload = { ...data, created_by: context.userId };
    const { data: row, error } = await sb
      .from("metric_registry")
      .upsert(payload, { onConflict: "key" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await sb.rpc("record_governance_audit", {
      _action: prev ? "metric.update" : "metric.create",
      _target_type: "metric",
      _target_key: row.key,
      _before: prev ?? null,
      _after: row,
    });
    return { metric: row as Row };
  });

export const toggleMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: prev } = await sb
      .from("metric_registry")
      .select("key,active")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await sb
      .from("metric_registry")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw error;
    await sb.rpc("record_governance_audit", {
      _action: "metric.toggle",
      _target_type: "metric",
      _target_key: prev?.key ?? null,
      _before: prev ?? null,
      _after: { ...(prev ?? {}), active: data.active },
    });
    return { ok: true };
  });

export const deleteMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: prev } = await sb
      .from("metric_registry")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await sb.from("metric_registry").delete().eq("id", data.id);
    if (error) throw error;
    await sb.rpc("record_governance_audit", {
      _action: "metric.delete",
      _target_type: "metric",
      _target_key: prev?.key ?? null,
      _before: prev ?? null,
      _after: null,
    });
    return { ok: true };
  });

export const runMetricPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        key: z.string(),
        filters: z.record(z.string(), z.any()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const started = Date.now();
    const { data: result, error } = await sb.rpc("run_metric", {
      _key: data.key,
      _filters: data.filters,
    });
    const elapsed_ms = Date.now() - started;
    if (error) return { ok: false as const, error: error.message, elapsed_ms };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { ok: true as const, result: result as any, elapsed_ms };
  });
