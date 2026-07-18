import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENDPOINTS = ["field-tasks", "field-incidents", "marketplace", "buyer-summary"] as const;
export type SyncEndpoint = typeof ENDPOINTS[number];

export const getSyncMonitorOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("mobile_sync_runs")
      .select("endpoint,status,duration_ms,row_count,error_message,started_at,finished_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ endpoint: string; status: string; duration_ms: number | null; row_count: number | null; error_message: string | null; started_at: string; finished_at: string | null }>;
    const byEndpoint = ENDPOINTS.map((endpoint) => {
      const items = rows.filter((r) => r.endpoint === endpoint);
      const durations = items.map((r) => r.duration_ms ?? 0).sort((a, b) => a - b);
      const p95 = durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : 0;
      const errors = items.filter((r) => r.status === "error");
      const lastError = errors[0];
      const last = items[0];
      return {
        endpoint,
        total: items.length,
        success: items.filter((r) => r.status === "ok").length,
        failure: errors.length,
        error_rate: items.length ? errors.length / items.length : 0,
        p95_ms: p95,
        last_run_at: last?.started_at ?? null,
        last_error_at: lastError?.started_at ?? null,
        last_error_message: lastError?.error_message ?? null,
      };
    });
    const totals = {
      total: rows.length,
      error_rate: rows.length ? rows.filter((r) => r.status === "error").length / rows.length : 0,
      p95_ms: (() => {
        const d = rows.map((r) => r.duration_ms ?? 0).sort((a, b) => a - b);
        return d.length ? d[Math.min(d.length - 1, Math.floor(d.length * 0.95))] : 0;
      })(),
    };
    return { window_hours: 24, endpoints: byEndpoint, totals };
  });

export const listSyncRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ endpoint: z.enum(ENDPOINTS).optional(), limit: z.number().int().positive().max(200).optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    let q = context.supabase.from("mobile_sync_runs").select("*")
      .order("started_at", { ascending: false }).limit(data.limit ?? 50);
    if (data.endpoint) q = q.eq("endpoint", data.endpoint);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const runSyncManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ endpoint: z.enum(ENDPOINTS) }).parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");

    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    let status: "ok" | "error" = "ok";
    let rowCount = 0;
    let errorMessage: string | null = null;

    try {
      if (data.endpoint === "buyer-summary") {
        // Requires a mobile bearer; instead we probe RLS visibility as a health check.
        const { count, error } = await context.supabase
          .from("mobile_buyer_summary_v" as never)
          .select("*", { head: true, count: "exact" });
        if (error) throw new Error(error.message);
        rowCount = count ?? 0;
      } else if (data.endpoint === "marketplace") {
        const { count, error } = await context.supabase
          .from("mobile_marketplace_v" as never)
          .select("*", { head: true, count: "exact" });
        if (error) throw new Error(error.message);
        rowCount = count ?? 0;
      } else if (data.endpoint === "field-tasks") {
        const { count, error } = await context.supabase
          .from("mobile_field_task_v" as never)
          .select("*", { head: true, count: "exact" });
        if (error) throw new Error(error.message);
        rowCount = count ?? 0;
      } else if (data.endpoint === "field-incidents") {
        const { count, error } = await context.supabase
          .from("field_incidents")
          .select("*", { head: true, count: "exact" });
        if (error) throw new Error(error.message);
        rowCount = count ?? 0;
      }
    } catch (err) {
      status = "error";
      errorMessage = (err as Error).message?.slice(0, 500) ?? "unknown";
    }

    const { logSyncRun } = await import("./sync-monitor.server");
    await logSyncRun({
      endpoint: data.endpoint,
      actorUserId: context.userId,
      status,
      durationMs: Date.now() - started,
      rowCount,
      errorMessage,
      requestMeta: { manual: true },
      startedAt,
    });
    return { ok: status === "ok", row_count: rowCount, error: errorMessage };
  });