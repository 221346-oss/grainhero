/**
 * Phase 22 — Widget/metric CSV export with date range.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export const exportMetricCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        key: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
        filters: z.record(z.string(), z.any()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const filters = { ...(data.filters ?? {}), date_from: data.from, date_to: data.to };
    const { data: result, error } = await sb.rpc("run_metric", {
      _key: data.key,
      _filters: filters,
    });
    if (error) throw new Error(error.message);

    const r = result as any;
    let rows: Array<Record<string, unknown>> = [];
    if (Array.isArray(r)) rows = r;
    else if (r && typeof r === "object") {
      const arr = Object.values(r).find((v) => Array.isArray(v));
      if (arr) rows = arr as Array<Record<string, unknown>>;
      else rows = [r as Record<string, unknown>];
    }
    const csv = toCsv(rows);
    return {
      csv,
      filename: `${data.key}_${new Date().toISOString().slice(0, 10)}.csv`,
      count: rows.length,
    };
  });
