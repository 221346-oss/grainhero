/**
 * Phase 15.5 — Super-admin SLA alerts.
 * Overdue shipments + delivery-rate deltas with drill-downs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function requireSuper(sb: unknown, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = sb as any;
  const { data } = await c.rpc("get_my_role", { _user_id: userId });
  if (data !== "super_admin") throw new Error("Forbidden");
}

function deliveryRate(rows: Row[]): number {
  if (!rows.length) return 0;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  return delivered / rows.length;
}

export const getSlaAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ days: z.number().int().min(7).max(90).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.supabase, context.userId);
    const settings = await loadMarketplaceSettings(context.supabase);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const nowMs = Date.now();
    const sinceIso = new Date(nowMs - data.days * 86400_000).toISOString();
    const prevIso = new Date(nowMs - data.days * 2 * 86400_000).toISOString();
    const overdueMs = settings.dispatch.slaHours.delivered * 3600_000;

    const { data: ships } = await sb
      .from("buyer_shipments")
      .select("id, order_id, admin_id, status, courier_key, courier_label, tracking_number, tracking_url, dispatched_at, expected_delivery_at, delivered_at, buyer_orders(order_number, buyer_id, buyers(name, company_name))")
      .gte("dispatched_at", prevIso)
      .order("dispatched_at", { ascending: false });
    const rows = ((ships ?? []) as Row[]);

    const current = rows.filter((r) => r.dispatched_at && r.dispatched_at >= sinceIso);
    const previous = rows.filter((r) => r.dispatched_at && r.dispatched_at < sinceIso);

    // Overdue = in-flight and past SLA/expected.
    const overdue = current
      .filter((s) => s.status !== "delivered" && s.status !== "cancelled")
      .map((s) => {
        const dispatched = s.dispatched_at ? new Date(s.dispatched_at).getTime() : null;
        const expected = s.expected_delivery_at ? new Date(s.expected_delivery_at).getTime() : null;
        const limit = expected ?? (dispatched ? dispatched + overdueMs : nowMs);
        const overdueHours = Math.max(0, (nowMs - limit) / 3600_000);
        return { ...s, overdueHours, limit };
      })
      .filter((s) => s.overdueHours > 0)
      .sort((a, b) => b.overdueHours - a.overdueHours);

    // Delivery-rate delta by seller.
    const bySeller = new Map<string, { adminId: string; current: Row[]; previous: Row[] }>();
    for (const s of current) {
      const key = String(s.admin_id ?? "unknown");
      const b = bySeller.get(key) ?? { adminId: key, current: [], previous: [] };
      b.current.push(s); bySeller.set(key, b);
    }
    for (const s of previous) {
      const key = String(s.admin_id ?? "unknown");
      const b = bySeller.get(key) ?? { adminId: key, current: [], previous: [] };
      b.previous.push(s); bySeller.set(key, b);
    }
    const sellerIds = Array.from(bySeller.keys()).filter((k) => k !== "unknown");
    const { data: profiles } = sellerIds.length
      ? await sb.from("profiles").select("id, name, email").in("id", sellerIds)
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((p: Row) => [p.id, p.name ?? p.email ?? p.id]));

    const sellerDrops = Array.from(bySeller.values()).map((b) => {
      const cur = deliveryRate(b.current);
      const prev = deliveryRate(b.previous);
      const delta = cur - prev;
      const overdueCount = b.current.filter((s) => {
        if (s.status === "delivered" || s.status === "cancelled") return false;
        const dispatched = s.dispatched_at ? new Date(s.dispatched_at).getTime() : null;
        const expected = s.expected_delivery_at ? new Date(s.expected_delivery_at).getTime() : null;
        const limit = expected ?? (dispatched ? dispatched + overdueMs : nowMs);
        return nowMs > limit;
      }).length;
      return {
        adminId: b.adminId,
        sellerName: (nameOf.get(b.adminId) as string) ?? "Unknown",
        currentRate: cur, previousRate: prev, delta,
        shipments: b.current.length, overdue: overdueCount,
      };
    }).sort((a, b) => a.delta - b.delta);

    const totalCurrent = current.length;
    const totalPrev = previous.length;
    const deliveredCurrent = current.filter((r) => r.status === "delivered").length;
    const deliveredPrev = previous.filter((r) => r.status === "delivered").length;

    return {
      window: { days: data.days },
      totals: {
        overdue: overdue.length,
        current: totalCurrent, previous: totalPrev,
        currentRate: totalCurrent ? deliveredCurrent / totalCurrent : 0,
        previousRate: totalPrev ? deliveredPrev / totalPrev : 0,
      },
      overdue: overdue.slice(0, 100),
      sellerDrops: sellerDrops.filter((s) => s.delta < 0 || s.overdue > 0).slice(0, 25),
      slaHours: settings.dispatch.slaHours,
    };
  });