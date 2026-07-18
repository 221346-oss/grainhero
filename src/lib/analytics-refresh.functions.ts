/**
 * Phase 21 — Warehouse refresh orchestration.
 * Super-admin only. Calls analytics.refresh_* functions via the admin client
 * and surfaces log rows so the Metric Registry / dashboard builder can show
 * warehouse freshness.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";

const SCOPES = ["all", "orders", "shipments", "finance", "insurance", "telemetry"] as const;

export const refreshWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ scope: z.enum(SCOPES).default("all") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fn = data.scope === "all" ? "refresh_all" : `refresh_${data.scope}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: result, error } = await admin.schema("analytics").rpc(fn);
    if (error) throw new Error(error.message);
    return { scope: data.scope, result };
  });

export const listRefreshLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("analytics_refresh_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return { rows: (rows ?? []) as Array<Record<string, unknown>> };
  });

export const getWarehouseHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("analytics_refresh_log")
      .select("fact_name, finished_at, rows_upserted, error")
      .order("finished_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    type Row = { fact_name: string; finished_at: string; rows_upserted: number | null; error: string | null };
    const byFact = new Map<string, Row>();
    for (const r of (rows ?? []) as Row[]) {
      if (!byFact.has(r.fact_name) && !r.error) byFact.set(r.fact_name, r);
    }
    const now = Date.now();
    return {
      facts: Array.from(byFact.values()).map((r) => ({
        fact_name: r.fact_name,
        last_success_at: r.finished_at,
        staleness_minutes: Math.round((now - new Date(r.finished_at).getTime()) / 60000),
        last_rows: r.rows_upserted ?? 0,
      })),
    };
  });