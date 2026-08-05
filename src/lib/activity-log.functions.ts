/**
 * activity-log.functions.ts
 * ──────────────────────────
 * Server functions for auditing and tracking user activity.
 * Includes both internal utility functions for logging events
 * and exposed server functions for fetching logs in the dashboard.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type LogSeverity = "info" | "warning" | "error" | "critical";
export type LogCategory = "system" | "user" | "sensor" | "billing" | "security" | "hardware";

export interface LogActivityParams {
  userId?: string;
  adminId: string;
  action: string;
  category?: LogCategory;
  entityType?: string;
  entityId?: string;
  entityRef?: string;
  description: string;
  metadata?: Record<string, unknown>;
  severity?: LogSeverity;
  ipAddress?: string;
}

// ─── INTERNAL UTILS ──────────────────────────────────────────────────────────

/**
 * Internal utility to log an activity from other server-side functions.
 */
export async function logActivity(params: LogActivityParams) {
  try {
    // Attempt to enrich with user details if userId is provided
    let userName = "System";
    let userRole = "system";

    if (params.userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", params.userId)
        .maybeSingle();
      if (profile?.name) userName = profile.name;
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", params.userId)
        .maybeSingle();
      if (roleRow?.role) userRole = roleRow.role;
    }

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      admin_id: params.adminId,
      user_id: params.userId ?? null,
      user_name: userName,
      user_role: userRole,
      action: params.action,
      category: params.category ?? "system",
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_ref: params.entityRef ?? null,
      description: params.description,
      metadata: (params.metadata ?? {}) as never,
      severity: params.severity ?? "info",
      ip_address: params.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[ActivityLog] Failed to insert log:", error);
    }
  } catch (err) {
    console.error("[ActivityLog] Unexpected error during logging:", err);
  }
}

// ─── SERVER FUNCTIONS (Exposed to Frontend) ──────────────────────────────────

/**
 * listActivityLogs
 * Fetches paginated activity logs for the tenant's dashboard.
 */
export const listActivityLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
    category: z.string().optional(),
    severity: z.string().optional(),
    userId: z.string().optional(),
    entityType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }).optional())
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const args = data ?? { page: 1, limit: 50 };
    const page = args.page ?? 1;
    const limit = args.limit ?? 50;

    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" });

    if (args.category) query = query.eq("category", args.category);
    if (args.severity) query = query.eq("severity", args.severity);
    if (args.userId) query = query.eq("user_id", args.userId);
    if (args.entityType) query = query.eq("entity_type", args.entityType);
    if (args.startDate) query = query.gte("created_at", args.startDate);
    if (args.endDate) query = query.lte("created_at", args.endDate);
    
    if (args.search) {
      query = query.or(`action.ilike.%${args.search}%,description.ilike.%${args.search}%,entity_ref.ilike.%${args.search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: logs, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      success: true,
      logs: logs ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      }
    };
  });

/**
 * getActivityLogsSummary
 * Returns aggregated stats for charts/widgets on the dashboard.
 */
export const getActivityLogsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    days: z.number().default(7),
  }).optional())
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = data?.days ?? 7;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const { data: logs, error } = await supabase
      .from("activity_logs")
      .select("category, severity, created_at")
      .gte("created_at", cutoff);

    if (error) throw new Error(error.message);

    const summary = {
      total: logs.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      timeline: {} as Record<string, number>,
    };

    logs.forEach(log => {
      // Category count
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
      
      // Severity count
      summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1;

      // Timeline (by day)
      const dayStr = log.created_at.split("T")[0];
      summary.timeline[dayStr] = (summary.timeline[dayStr] || 0) + 1;
    });

    return { success: true, summary };
  });
