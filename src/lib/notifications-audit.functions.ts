import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const msg = r.error.issues
    .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
    .join(" · ");
  throw new Error(msg);
}

/* ============================================================
 * NOTIFICATIONS
 * ============================================================ */

const listNotifInput = z.object({
  filter: z.enum(["all", "unread", "read"]).default("all"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(listNotifInput, d))
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 50;
    let q = context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.filter === "unread") q = q.eq("read", false);
    if (data.filter === "read") q = q.eq("read", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    const { count } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    return { notifications: rows ?? [], unread_count: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(z.object({ id: z.string().uuid() }), d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw error;
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(z.object({ id: z.string().uuid() }), d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* ============================================================
 * ACTIVITY LOGS
 * ============================================================ */

const listLogsInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
  entity_ref: z.string().optional().nullable(),
  actor_role: z.string().optional().nullable(),
  tenant_admin_id: z.string().optional().nullable(),
  user_id_filter: z.string().optional().nullable(),
});

export const listActivityLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(listLogsInput, d))
  .handler(async ({ data, context }) => {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Resolve caller's effective role for scope
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .order("role")
      .limit(1)
      .maybeSingle();
    const callerRole = (roleRow?.role as string | undefined) ?? "admin";

    let q = context.supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Role-based scope
    if (callerRole === "technician" || callerRole === "manager") {
      q = q.eq("user_id", context.userId);
    } else if (callerRole === "super_admin") {
      if (data.actor_role && data.actor_role !== "all") q = q.eq("user_role", data.actor_role);
      if (data.tenant_admin_id) q = q.eq("admin_id", data.tenant_admin_id);
      // else: unrestricted — RLS still applies
    } else {
      // admin: their own tenant (RLS already narrows, keep filter explicit)
      if (data.user_id_filter) q = q.eq("user_id", data.user_id_filter);
    }

    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59Z`);
    if (data.entity_ref) q = q.eq("entity_ref", data.entity_ref);
    if (data.search) q = q.or(`description.ilike.%${data.search}%,action.ilike.%${data.search}%,entity_ref.ilike.%${data.search}%`);

    const { data: rows, error, count } = await q.range(from, to);
    if (error) throw error;

    // Category summary counts (all-time within tenant scope, via RLS)
    const { data: catRows } = await context.supabase
      .from("activity_logs")
      .select("category");
    const categories: Record<string, number> = {};
    for (const r of catRows ?? []) {
      const k = r.category ?? "system";
      categories[k] = (categories[k] ?? 0) + 1;
    }

    const total = count ?? 0;
    return {
      logs: rows ?? [],
      caller_role: callerRole,
      pagination: {
        current_page: page,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        total_items: total,
        items_per_page: limit,
      },
      summary: { categories },
    };
  });

const createLogInput = z.object({
  action: z.string().min(1).max(120),
  category: z.string().min(1).max(60).default("system"),
  description: z.string().min(1).max(2000),
  entity_type: z.string().max(60).optional().nullable(),
  entity_id: z.string().max(120).optional().nullable(),
  entity_ref: z.string().max(120).optional().nullable(),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const createActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parseOrThrow(createLogInput, d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, name, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const adminId = prof?.admin_id ?? context.userId;
    const { error } = await context.supabase.from("activity_logs").insert({
      admin_id: adminId,
      user_id: context.userId,
      user_name: prof?.name ?? null,
      user_role: roleRow?.role ?? null,
      action: data.action,
      category: data.category,
      description: data.description,
      entity_type: data.entity_type ?? null,
      entity_id: data.entity_id ?? null,
      entity_ref: data.entity_ref ?? null,
      severity: data.severity,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw error;
    return { ok: true };
  });