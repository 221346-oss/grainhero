/**
 * Super-admin, read-only, API/model-level monitoring for the ML spoilage
 * cascade. Deliberately excludes tenant prediction data (risk scores,
 * spoilage classifications) — that's each tenant's own Intelligence page.
 * See ml_inference_requests (20260724120000_ml_inference_requests.sql) for
 * the request-log this reads.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

type Row = Record<string, any>;

export const getPlatformIntelligenceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("ml_inference_requests" as never)
      .select(
        "id, admin_id, model_name, source, success, latency_ms, error_message, triggered_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    const list = (data ?? []) as Row[];

    const total = list.length;
    const succeeded = list.filter((r) => r.success).length;
    const failed = total - succeeded;
    const withLatency = list.filter((r) => r.latency_ms != null);
    const avgLatencyMs = withLatency.length
      ? Math.round(withLatency.reduce((s, r) => s + Number(r.latency_ms), 0) / withLatency.length)
      : null;

    const bySource = { api: 0, python_local: 0, cascade_failed: 0 };
    for (const r of list) {
      if (r.source === "api") bySource.api++;
      else if (r.source === "python_local") bySource.python_local++;
      else bySource.cascade_failed++;
    }

    // Per-admin breakdown.
    const byAdmin = new Map<
      string,
      {
        adminId: string;
        total: number;
        success: number;
        failed: number;
        lastRequestAt: string | null;
        recentFailures: Row[];
      }
    >();
    for (const r of list) {
      const key = r.admin_id ?? "unknown";
      const b = byAdmin.get(key) ?? {
        adminId: key,
        total: 0,
        success: 0,
        failed: 0,
        lastRequestAt: null,
        recentFailures: [] as Row[],
      };
      b.total += 1;
      if (r.success) b.success += 1;
      else {
        b.failed += 1;
        if (b.recentFailures.length < 5) b.recentFailures.push(r);
      }
      if (!b.lastRequestAt || r.created_at > b.lastRequestAt) b.lastRequestAt = r.created_at;
      byAdmin.set(key, b);
    }

    const ids = Array.from(byAdmin.keys()).filter((k) => k !== "unknown");
    let profiles: Row[] = [];
    if (ids.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", ids);
      profiles = profs ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));

    const tenants = Array.from(byAdmin.values())
      .map((b) => ({
        ...b,
        tenantName: b.adminId === "unknown" ? "Unattributed" : (nameOf.get(b.adminId) ?? b.adminId),
        recentFailures: b.recentFailures.map((f) => ({
          at: f.created_at,
          error: f.error_message,
          source: f.source,
          triggeredBy: f.triggered_by,
        })),
      }))
      .sort((a, b) => b.failed - a.failed || b.total - a.total)
      .slice(0, 50);

    return {
      model: {
        // No formal model registry exists yet — this reflects the actual
        // cascade config (ai-inference.functions.ts): remote API is tried
        // first when configured, local Python is the fallback.
        primary: process.env.GRAINHERO_ML_API_URL
          ? "HuggingFace remote API (spoilage-classifier)"
          : "Not configured — local Python fallback only",
        fallback: "Local Python subprocess (src/ml/smartbin_predict.py)",
        apiConfigured: !!process.env.GRAINHERO_ML_API_URL,
      },
      totals: { total, succeeded, failed, avgLatencyMs },
      bySource,
      tenants,
    };
  });
