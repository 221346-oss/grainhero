import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchDispatchTotals } from "./operations.functions";
import { resolveLocationScope, byWarehouse, bySilo } from "./page-scope.server";
import { rangeToWindow, type Range } from "./date-window";
import { legacyBatchRevenue } from "./revenue";

export const getDashboardExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        range: z.enum(["today", "7d", "30d", "mtd", "ytd"]).default("30d"),
        // Active location scope. `wh` is the primary unit — a single warehouse;
        // `loc` is the city level of the picker. Both absent means tenant-wide.
        loc: z.string().trim().min(1).optional(),
        wh: z.string().uuid().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const tenantId = context.userId;
    const range = (data?.range ?? "30d") as Range;
    // Resolved server-side from the caller's own warehouses — see
    // resolveLocationScope for why the client's list is not trusted.
    const scope = await resolveLocationScope(context.supabase, context.userId, data?.loc, data?.wh);
    const { startISO, priorStartISO, priorEndISO } = rangeToWindow(range);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const now0 = new Date();
    // Everything below used to run as one Promise.all followed by two more
    // sequential `await`s (fetchDispatchTotals, then the revenue-sparkline
    // query) — two extra full network round-trips on every dashboard load,
    // even though neither depends on anything the first batch returns.
    // Folding them into the same Promise.all removes that waterfall.
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
      dispatchTotals,
      revRowsRes,
      siloDispatchesRes,
    ] = await Promise.all([
      byWarehouse(
        context.supabase
          .from("grain_batches")
          .select(
            "id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, purchase_price_per_kg, revenue, profit",
          ),
        scope,
      )
        .order("created_at", { ascending: false })
        .limit(5),
      byWarehouse(
        context.supabase
          .from("grain_alerts")
          .select(
            "id, alert_id, title, message, priority, status, alert_type, silo_id, triggered_at",
          ),
        scope,
      )
        .order("triggered_at", { ascending: false, nullsFirst: false })
        .limit(5),
      // INTENTIONALLY ACCOUNT-WIDE: team members belong to the tenant, not to
      // a city. An admin viewing Karachi still manages the same people.
      context.supabase
        .from("profiles")
        .select("id, name, email, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(5),
      bySilo(
        context.supabase
          .from("actuators")
          .select(
            "id, name, actuator_type, status, is_on, power_level, silo_id, silos:silo_id(name)",
          ),
        scope,
      ).limit(6),
      byWarehouse(
        context.supabase
          .from("silos")
          .select(
            "id, silo_id, name, capacity_kg, current_occupancy_kg, status, current_batch:grain_batches!fk_silos_current_batch(id, grain_type)",
          ),
        scope,
      )
        .order("created_at", { ascending: false })
        .limit(8),
      byWarehouse(
        context.supabase.from("hardware_orders").select("id, status", { count: "exact" }),
        scope,
      ).eq("admin_id", tenantId),
      // INTENTIONALLY ACCOUNT-WIDE: a plan is bought per tenant, not per site.
      // Filtering this by location would misreport the plan and break the
      // limits derived from it.
      context.supabase
        .from("subscriptions")
        .select("id, plan_name, price_per_month, status, next_payment_date")
        .eq("admin_id", tenantId)
        .in("status", ["active", "trial"])
        .order("created_at", { ascending: false })
        .limit(1),
      byWarehouse(
        context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
        scope,
      ).gte("created_at", sevenDaysAgo),
      byWarehouse(
        context.supabase.from("sensor_devices").select("id", { count: "exact", head: true }),
        scope,
      ).gte("created_at", sevenDaysAgo),
      // Full list for the dashboard table (dense)
      byWarehouse(
        context.supabase
          .from("grain_batches")
          .select(
            "id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, silo_id, silos:silo_id(name)",
          ),
        scope,
      )
        .order("created_at", { ascending: false })
        .limit(50),
      byWarehouse(
        context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
        scope,
      ).gte("created_at", startISO),
      byWarehouse(
        context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
        scope,
      )
        .gte("created_at", priorStartISO)
        .lt("created_at", priorEndISO),
      // "Open alerts" — status enum is pending|acknowledged|resolved|escalated,
      // so "open" means not yet resolved (see InsightsStrip's "X open alerts").
      byWarehouse(
        context.supabase.from("grain_alerts").select("id", { count: "exact", head: true }),
        scope,
      )
        .neq("status", "resolved")
        .gte("triggered_at", startISO),
      byWarehouse(
        context.supabase.from("grain_alerts").select("id", { count: "exact", head: true }),
        scope,
      )
        .neq("status", "resolved")
        .gte("triggered_at", priorStartISO)
        .lt("triggered_at", priorEndISO),
      // All active (non-resolved) alerts tied to a silo, for the dashboard's
      // combined silo-occupancy + alerts widget — not capped to the most
      // recent 5 like `recentAlerts`, since a silo with an older open alert
      // still needs to show it.
      byWarehouse(
        context.supabase.from("grain_alerts").select("id, silo_id, title, priority, status"),
        scope,
      )
        .not("silo_id", "is", null)
        .neq("status", "resolved")
        .limit(200),
      fetchDispatchTotals(context.supabase, scope.warehouseIds),
      // Every dispatched batch, not just the last twelve months. This feeds
      // the all-time legacy revenue total as well as the twelve-month
      // sparkline, and the total has to line up with fetchDispatchTotals,
      // which is also all-time. Same 10k ceiling as that query.
      byWarehouse(
        context.supabase
          .from("grain_batches")
          .select("created_at, revenue, purchase_price_per_kg, quantity_kg, status"),
        scope,
      )
        .eq("status", "dispatched")
        .limit(10000),
      // Also carries `created_at` and `total_amount` so the revenue sparkline
      // can count live silo dispatches without a second round trip.
      byWarehouse(
        context.supabase
          .from("grain_dispatches")
          .select("silo_id, total_qty_kg, created_at, total_amount"),
        scope,
      ).limit(5000),
    ]);

    const batches = batchesRes.data ?? [];

    // Legacy revenue is summed from every dispatched batch (revRowsRes), not
    // from `batches`. `batches` is the five most recent rows, fetched for the
    // "Recent batches" table, and summing it meant revenue counted only those
    // of the last five batches that happened to be dispatched: an account
    // whose five newest batches were all still stored reported none of its
    // legacy revenue at all, and every other account reported an arbitrary
    // slice of it. The figure is all-time (see RevenueMini, "Dispatched
    // batches"), so it must be counted over every dispatched batch to agree
    // with dispatchTotals, which is also all-time.
    const dispatchedBatches = revRowsRes.data ?? [];
    const legacyRevenue = dispatchedBatches.reduce((s, b) => s + legacyBatchRevenue(b), 0);
    // TODO(dispatch-refactor): legacyRevenue is the old per-batch dispatch model
    // (grain_batches.revenue) and will stop growing now that dispatch happens from silos
    // (dispatchFromSilo in operations.functions.ts, writing to the `dispatches` table).
    // Merging both here so this dashboard tile doesn't silently drop to zero — replace with
    // a dispatches-only query once legacy batch-level dispatch data is fully migrated.
    const revenue = legacyRevenue + dispatchTotals.reduce((s, d) => s + d.revenue, 0);

    const installRows = installRes.data ?? [];
    const installCounts = {
      pending: installRows.filter((r: { status: string }) => r.status === "pending").length,
      scheduled: installRows.filter((r: { status: string }) =>
        ["scheduled", "in_progress"].includes(r.status),
      ).length,
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
      pendingQC: allBatches.filter((b) =>
        ["pending_qc", "qc_submitted", "qc_failed"].includes(String(b.status)),
      ).length,
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
      atRisk: sumKg(
        (b) =>
          Number(b.risk_score ?? 0) >= 70 && !["damaged", "expired"].includes(String(b.status)),
      ),
      damaged: sumKg((b) => ["damaged", "expired"].includes(String(b.status))),
      stored: sumKg((b) => String(b.status) === "stored" && Number(b.risk_score ?? 0) < 70),
    };

    // 12-month revenue sparkline.
    //
    // Counts BOTH revenue models, the way the `revenue` total above does.
    // Bucketing only the legacy batches left the sparkline — and `revenueMtd`
    // and `revenueDeltaPct` derived from it, which is what the dashboard
    // actually renders — blind to every silo dispatch, so an account that had
    // moved to the new model showed a flat zero trend under a non-zero total.
    const now = now0;
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en", { month: "short" }),
        total: 0,
      });
    }
    const addToBucket = (iso: string | null, value: number) => {
      if (!iso) return;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.total += value;
    };
    for (const r of dispatchedBatches) {
      addToBucket(r.created_at as string, legacyBatchRevenue(r));
    }
    for (const d of siloDispatchesRes.data ?? []) {
      addToBucket(d.created_at as string, Number(d.total_amount ?? 0));
    }
    const revenueSpark = buckets.map((b) => b.total);
    const revenueMtd = buckets[buckets.length - 1]?.total ?? 0;
    const revenuePrev = buckets[buckets.length - 2]?.total ?? 0;
    const revenueDeltaPct = revenuePrev
      ? Math.round(((revenueMtd - revenuePrev) / revenuePrev) * 100)
      : revenueMtd
        ? 100
        : 0;

    function pctDelta(cur: number, prev: number) {
      if (!prev) return cur ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    }
    const deltas = {
      batches: {
        cur: curBatchesCount.count ?? 0,
        prev: prevBatchesCount.count ?? 0,
        pct: pctDelta(curBatchesCount.count ?? 0, prevBatchesCount.count ?? 0),
      },
      alerts: {
        cur: curAlertsCount.count ?? 0,
        prev: prevAlertsCount.count ?? 0,
        pct: pctDelta(curAlertsCount.count ?? 0, prevAlertsCount.count ?? 0),
      },
    };

    const siloOutgoingKg: Record<string, number> = {};
    for (const d of siloDispatchesRes.data ?? []) {
      const id = d.silo_id as string;
      siloOutgoingKg[id] = (siloOutgoingKg[id] ?? 0) + Number(d.total_qty_kg ?? 0);
    }

    return {
      recentBatches: batches,
      recentAlerts: alertsRes.data ?? [],
      team: profilesRes.data ?? [],
      actuators: actuatorsRes.data ?? [],
      silos: silosRes.data ?? [],
      siloAlerts: siloAlertsRes.data ?? [],
      siloOutgoingKg,
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
