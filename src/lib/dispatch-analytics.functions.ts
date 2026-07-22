/**
 * Phase 14 — Dispatch performance analytics.
 * Aggregates shipment throughput and SLA compliance from settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const getDispatchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: ships, error } = await sb.from("buyer_shipments")
      .select("id, status, courier_key, courier_label, dispatched_at, expected_delivery_at, delivered_at, order_id, buyer_orders(currency, subtotal)")
      .gte("dispatched_at", since)
      .order("dispatched_at", { ascending: false });
    if (error) throw error;
    const rows = (ships ?? []) as Row[];

    const totals = { total: rows.length, delivered: 0, inTransit: 0, exception: 0, overdue: 0 };
    let totalTransitMs = 0; let transitCount = 0;
    let onTime = 0; let sla = 0;
    const byCourier: Record<string, { key: string; label: string; total: number; delivered: number; overdue: number; avgHours: number }> = {};
    const overdueMs = settings.dispatch.slaHours.delivered * 3600_000;
    const nowMs = Date.now();

    for (const s of rows) {
      const key = String(s.courier_key || "unknown");
      const c = (byCourier[key] ??= { key, label: String(s.courier_label || key), total: 0, delivered: 0, overdue: 0, avgHours: 0 });
      c.total++;
      if (s.status === "delivered") { totals.delivered++; c.delivered++; }
      else if (s.status === "exception") totals.exception++;
      else totals.inTransit++;

      const dispatchedAt = s.dispatched_at ? new Date(s.dispatched_at as string).getTime() : null;
      const deliveredAt = s.delivered_at ? new Date(s.delivered_at as string).getTime() : null;
      const expected = s.expected_delivery_at ? new Date(s.expected_delivery_at as string).getTime() : null;

      if (dispatchedAt && deliveredAt) {
        const dur = deliveredAt - dispatchedAt;
        totalTransitMs += dur; transitCount++;
        sla++;
        if (!expected || deliveredAt <= expected) onTime++;
        c.avgHours = (c.avgHours * (c.delivered - 1) + dur / 3600_000) / (c.delivered || 1);
      } else if (dispatchedAt) {
        const overdueLimit = expected ?? (dispatchedAt + overdueMs);
        if (nowMs > overdueLimit) { totals.overdue++; c.overdue++; }
      }
    }

    const avgTransitHours = transitCount ? totalTransitMs / transitCount / 3600_000 : 0;
    const onTimeRate = sla ? onTime / sla : 0;
    const deliveryRate = totals.total ? totals.delivered / totals.total : 0;

    return {
      totals, avgTransitHours, onTimeRate, deliveryRate,
      slaHours: settings.dispatch.slaHours,
      byCourier: Object.values(byCourier).sort((a, b) => b.total - a.total),
    };
  });

export const exportDispatchCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    days: z.number().int().min(1).max(365).default(30),
    siloId: z.string().uuid().optional(),
    batchId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_shipments")
      .select("id, status, courier_key, courier_label, tracking_number, dispatched_at, expected_delivery_at, delivered_at, notes, order_id, buyer_orders(order_number, currency, subtotal, batch_id, grain_listings(silo_id))")
      .gte("dispatched_at", since)
      .order("dispatched_at", { ascending: false })
      .limit(2000);
    const { data: rows, error } = await q;
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filtered = (rows ?? []) as any[];
    if (data.batchId) filtered = filtered.filter((r) => r.buyer_orders?.batch_id === data.batchId);
    if (data.siloId) filtered = filtered.filter((r) => r.buyer_orders?.grain_listings?.silo_id === data.siloId);

    const header = [
      "shipment_id","order_number","status","courier","tracking_number",
      "dispatched_at","expected_delivery_at","delivered_at",
      "transit_hours","on_time","currency","subtotal",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of filtered) {
      const dispatched = r.dispatched_at ? new Date(r.dispatched_at).getTime() : null;
      const delivered = r.delivered_at ? new Date(r.delivered_at).getTime() : null;
      const expected = r.expected_delivery_at ? new Date(r.expected_delivery_at).getTime() : null;
      const transitH = dispatched && delivered ? ((delivered - dispatched) / 3_600_000).toFixed(2) : "";
      const onTime = dispatched && delivered ? (!expected || delivered <= expected ? "yes" : "no") : "";
      lines.push([
        r.id, r.buyer_orders?.order_number ?? "", r.status,
        r.courier_label ?? r.courier_key ?? "", r.tracking_number ?? "",
        r.dispatched_at ?? "", r.expected_delivery_at ?? "", r.delivered_at ?? "",
        transitH, onTime,
        r.buyer_orders?.currency ?? "", r.buyer_orders?.subtotal ?? "",
      ].map(escape).join(","));
    }
    return { csv: lines.join("\n"), rows: filtered.length };
  });