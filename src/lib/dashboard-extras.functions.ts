import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchDispatchTotals } from "./operations.functions";

type Range = "today" | "7d" | "30d" | "mtd" | "ytd";
function rangeToWindow(range: Range) {
  const now = new Date();
  let start = new Date(now);
  let priorStart = new Date(now);
  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      priorStart = new Date(start.getTime() - 24 * 3600 * 1000);
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      priorStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      priorStart = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      break;
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      priorStart = new Date(now.getFullYear() - 1, 0, 1);
      break;
  }
  return {
    startISO: start.toISOString(),
    priorStartISO: priorStart.toISOString(),
    priorEndISO: start.toISOString(),
  };
}

export const getDashboardExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({ range: z.enum(["today", "7d", "30d", "mtd", "ytd"]).default("30d") })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const tenantId = context.userId;
    const range = (data?.range ?? "30d") as Range;
    const { startISO, priorStartISO, priorEndISO } = rangeToWindow(range);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [
      batchesRes,
      alertsRes,
      profilesRes,
      actuatorsRes,
      silosRes,
      installRes,
      subRes,
      batches7Res,
      sensors7Res,
      allBatchesRes,
      curBatchesCount,
      prevBatchesCount,
      curAlertsCount,
      prevAlertsCount,
      siloAlertsRes,
    ] = await Promise.all([
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, purchase_price_per_kg, revenue, profit")
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("grain_alerts")
        .select("id, alert_id, title, message, priority, status, alert_type, silo_id, triggered_at")
        .order("triggered_at", { ascending: false, nullsFirst: false })
        .limit(5),
      context.supabase
        .from("profiles")
        .select("id, name, email, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(5),
      context.supabase
        .from("actuators")
        .select("id, name, actuator_type, status, is_on, power_level, silo_id, silos:silo_id(name)")
        .limit(6),
      context.supabase
        .from("silos")
        .select("id, silo_id, name, capacity_kg, current_occupancy_kg, status, current_batch:grain_batches!fk_silos_current_batch(id, grain_type)")
        .order("created_at", { ascending: false })
        .limit(8),
      context.supabase
        .from("hardware_orders")
        .select("id, status", { count: "exact" })
        .eq("admin_id", tenantId),
      context.supabase
        .from("subscriptions")
        .select("id, plan_name, price_per_month, status, next_payment_date")
        .eq("admin_id", tenantId)
        .in("status", ["active", "trial"])
        .order("created_at", { ascending: false })
        .limit(1),
      context.supabase
        .from("grain_batches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      context.supabase
        .from("sensor_devices")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      // Full list for the dashboard table (dense)
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, silo_id, silos:silo_id(name)")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("grain_batches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startISO),
      context.supabase
        .from("grain_batches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", priorStartISO)
        .lt("created_at", priorEndISO),
      // "Open alerts" — status enum is pending|acknowledged|resolved|escalated,
      // so "open" means not yet resolved (see InsightsStrip's "X open alerts").
      context.supabase
        .from("grain_alerts")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved")
        .gte("triggered_at", startISO),
      context.supabase
        .from("grain_alerts")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved")
        .gte("triggered_at", priorStartISO)
        .lt("triggered_at", priorEndISO),
      // All active (non-resolved) alerts tied to a silo, for the dashboard's
      // combined silo-occupancy + alerts widget — not capped to the most
      // recent 5 like `recentAlerts`, since a silo with an older open alert
      // still needs to show it.
      context.supabase
        .from("grain_alerts")
        .select("id, silo_id, title, priority, status")
        .not("silo_id", "is", null)
        .neq("status", "resolved")
        .limit(200),
    ]);

    const batches = batchesRes.data ?? [];
    const legacyRevenue = batches
      .filter((b) => b.status === "dispatched")
      .reduce((s, b) => s + Number(b.revenue ?? (Number(b.purchase_price_per_kg ?? 0) * Number(b.quantity_kg ?? 0))), 0);
    // TODO(dispatch-refactor): legacyRevenue above is the old per-batch dispatch model
    // (grain_batches.revenue) and will stop growing now that dispatch happens from silos
    // (dispatchFromSilo in operations.functions.ts, writing to the `dispatches` table).
    // Merging both here so this dashboard tile doesn't silently drop to zero — replace with
    // a dispatches-only query once legacy batch-level dispatch data is fully migrated.
    const dispatchTotals = await fetchDispatchTotals(context.supabase);
    const revenue = legacyRevenue + dispatchTotals.reduce((s, d) => s + d.revenue, 0);

    const installRows = installRes.data ?? [];
    const installCounts = {
      pending: installRows.filter((r: { status: string }) => r.status === "pending").length,
      scheduled: installRows.filter((r: { status: string }) => ["scheduled", "in_progress"].includes(r.status)).length,
      completed: installRows.filter((r: { status: string }) => r.status === "completed").length,
      total: installRows.length,
    };
    const sub = subRes.data?.[0] ?? null;

    const allBatches = allBatchesRes.data ?? [];
    // A real intake -> QC -> stored pipeline now exists (see batch-qc.functions.ts
    // and the pending_qc/qc_submitted/qc_failed/qc_passed/admin_rejected
    // batch_status values) — pendingQC/rejectedQC below use those directly
    // instead of the old "on_hold"/"rejected" approximations (which never
    // matched a genuine QC gate). "readyToShip" still has no real signal in
    // the data model — left as-is.
    const insights = {
      pendingQC: allBatches.filter((b) => ["pending_qc", "qc_submitted", "qc_failed"].includes(String(b.status))).length,
      rejectedQC: allBatches.filter((b) => String(b.status) === "admin_rejected").length,
      atRisk: allBatches.filter((b) => Number(b.risk_score ?? 0) >= 70).length,
      readyToShip: allBatches.filter((b) => String(b.status) === "ready").length,
      actuatorsOn: (actuatorsRes.data ?? []).filter((a) => a.is_on).length,
      actuatorsTotal: (actuatorsRes.data ?? []).length,
    };

    // "Why stuck" pipeline breakdown — kg + count per real, reachable status
    // group, for the dashboard's status-aware insight (see report: the
    // literal 3-step intake/QC/stored pipeline isn't buildable from today's
    // schema, this is the closest honest approximation from real data).
    function sumKg(pred: (b: (typeof allBatches)[number]) => boolean) {
      const rows = allBatches.filter(pred);
      return { count: rows.length, kg: rows.reduce((s, b) => s + Number(b.quantity_kg ?? 0), 0) };
    }
    const pipeline = {
      onHold: sumKg((b) => String(b.status) === "on_hold"),
      atRisk: sumKg((b) => Number(b.risk_score ?? 0) >= 70 && !["damaged", "expired"].includes(String(b.status))),
      damaged: sumKg((b) => ["damaged", "expired"].includes(String(b.status))),
      stored: sumKg((b) => String(b.status) === "stored" && Number(b.risk_score ?? 0) < 70),
    };

    // 12-month revenue sparkline from dispatched batches
    const now = new Date();
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en", { month: "short" }),
        total: 0,
      });
    }
    const twelveMoAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
    const { data: revRows } = await context.supabase
      .from("grain_batches")
      .select("created_at, revenue, purchase_price_per_kg, quantity_kg, status")
      .eq("status", "dispatched")
      .gte("created_at", twelveMoAgo);
    for (const r of revRows ?? []) {
      const d = new Date(r.created_at as string);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.find((x) => x.key === k);
      if (!b) continue;
      const val = Number(r.revenue ?? (Number(r.purchase_price_per_kg ?? 0) * Number(r.quantity_kg ?? 0)));
      b.total += val;
    }
    const revenueSpark = buckets.map((b) => b.total);
    const revenueMtd = buckets[buckets.length - 1]?.total ?? 0;
    const revenuePrev = buckets[buckets.length - 2]?.total ?? 0;
    const revenueDeltaPct = revenuePrev
      ? Math.round(((revenueMtd - revenuePrev) / revenuePrev) * 100)
      : (revenueMtd ? 100 : 0);

    function pctDelta(cur: number, prev: number) {
      if (!prev) return cur ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    }
    const deltas = {
      batches: { cur: curBatchesCount.count ?? 0, prev: prevBatchesCount.count ?? 0, pct: pctDelta(curBatchesCount.count ?? 0, prevBatchesCount.count ?? 0) },
      alerts: { cur: curAlertsCount.count ?? 0, prev: prevAlertsCount.count ?? 0, pct: pctDelta(curAlertsCount.count ?? 0, prevAlertsCount.count ?? 0) },
    };

    return {
      recentBatches: batches,
      recentAlerts: alertsRes.data ?? [],
      team: profilesRes.data ?? [],
      actuators: actuatorsRes.data ?? [],
      silos: silosRes.data ?? [],
      siloAlerts: siloAlertsRes.data ?? [],
      revenue,
      installCounts,
      subscription: sub,
      allBatches,
      insights,
      pipeline,
      deltas,
      range,
      revenueSpark,
      revenueMtd,
      revenueDeltaPct,
      trends: {
        newBatches7d: batches7Res.count ?? 0,
        newSensors7d: sensors7Res.count ?? 0,
      },
    };
  });