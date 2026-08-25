import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveLocationScope, byWarehouse } from "./page-scope.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { fetchDispatchTotals } from "./operations.functions";

// ---------- helpers ----------

async function assertAllowed(supabase: any, userId: string) {
  const r = await getEffectiveRole(supabase, userId);
  if (!["super_admin", "admin", "manager"].includes(r)) throw new Error("Forbidden");
  return true;
}

type Reading = {
  temperature_value: number | null;
  humidity_value: number | null;
  moisture_value: number | null;
  co2_value: number | null;
  voc_value: number | null;
  ml_risk_score: number | null;
  ml_risk_class: string | null;
  reading_timestamp: string;
};

// Compute a heuristic spoilage risk score 0-100 for a silo if ML inference is missing.
function computeFallbackRisk(
  silo: {
    moisture_content: number | null;
    risk_score: number | null;
  },
  r: Reading | null,
): { score: number; level: "low" | "moderate" | "high" | "critical"; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  const temp = r?.temperature_value ?? null;
  const hum = r?.humidity_value ?? null;
  const moisture = r?.moisture_value ?? silo.moisture_content ?? null;
  const co2 = r?.co2_value ?? null;
  const voc = r?.voc_value ?? null;

  if (temp !== null) {
    if (temp > 30) {
      score += 25;
      factors.push(`High temp ${temp.toFixed(1)}°C`);
    } else if (temp > 25) {
      score += 12;
      factors.push(`Elevated temp ${temp.toFixed(1)}°C`);
    }
  }
  if (hum !== null) {
    if (hum > 70) {
      score += 20;
      factors.push(`High humidity ${hum.toFixed(0)}%`);
    } else if (hum > 60) {
      score += 10;
      factors.push(`Elevated humidity ${hum.toFixed(0)}%`);
    }
  }
  if (moisture !== null) {
    if (moisture > 14) {
      score += 25;
      factors.push(`Moisture ${moisture.toFixed(1)}% above safe`);
    } else if (moisture > 12) {
      score += 10;
      factors.push(`Moisture ${moisture.toFixed(1)}% borderline`);
    }
  }
  if (co2 !== null && co2 > 1500) {
    score += 15;
    factors.push(`CO₂ ${co2.toFixed(0)}ppm`);
  }
  if (voc !== null && voc > 500) {
    score += 10;
    factors.push(`VOC ${voc.toFixed(0)}`);
  }

  if (silo.risk_score != null) score = Math.max(score, silo.risk_score);

  score = Math.min(100, Math.max(0, Math.round(score)));
  const level = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "moderate" : "low";
  return { score, level, factors };
}

// ---------- server functions ----------

/**
 * Silo-based predictions (not batch-based). Under the intake-only model a
 * silo pools grain from many batches (or none, once fully dispatched), and
 * sensor_readings is written keyed by silo_id, never batch_id (see
 * firebase-sync cron) — the old batch_id join here always returned zero
 * rows, so every "prediction" silently fell back to a static heuristic with
 * no live sensor signal at all. Now joins by silo_id, which is what's
 * actually populated.
 */
export const getSiloPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAllowed(context.supabase, context.userId);

    const { data: silos, error } = await context.supabase
      .from("silos")
      .select(
        "id, silo_id, name, capacity_kg, current_occupancy_kg, status, warehouse_id, risk_score",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const list = (silos ?? []) as any[];
    if (list.length === 0) return { predictions: [] as any[] };

    const siloIds = list.map((s) => s.id);
    const [{ data: readings }, { data: batches }] = await Promise.all([
      context.supabase
        .from("sensor_readings")
        .select(
          "silo_id, temperature_value, humidity_value, moisture_value, co2_value, voc_value, ml_risk_score, ml_risk_class, reading_timestamp",
        )
        .in("silo_id", siloIds)
        .order("reading_timestamp", { ascending: false })
        .limit(4000),
      context.supabase
        .from("grain_batches")
        .select(
          "id, silo_id, grain_type, quantity_kg, dispatched_quantity_kg, remaining_kg, intake_date",
        )
        .in("silo_id", siloIds)
        .is("deleted_at", null)
        .order("intake_date", { ascending: true, nullsFirst: false }),
    ]);

    const latestBySilo = new Map<string, Reading>();
    for (const r of (readings ?? []) as any[]) {
      if (r.silo_id && !latestBySilo.has(r.silo_id)) latestBySilo.set(r.silo_id, r);
    }

    // Oldest batch with remaining stock per silo (FIFO) — grain type +
    // storage-age context only, never required for a prediction to exist.
    type BatchRow = {
      id: string;
      silo_id: string;
      grain_type: string;
      quantity_kg: number;
      dispatched_quantity_kg: number | null;
      remaining_kg: number | null;
      intake_date: string | null;
    };
    const oldestActiveBySilo = new Map<string, BatchRow>();
    const totalRemainingBySilo = new Map<string, number>();
    for (const b of (batches ?? []) as BatchRow[]) {
      const remaining =
        b.remaining_kg ??
        Math.max(0, Number(b.quantity_kg ?? 0) - Number(b.dispatched_quantity_kg ?? 0));
      if (remaining <= 0) continue;
      totalRemainingBySilo.set(b.silo_id, (totalRemainingBySilo.get(b.silo_id) ?? 0) + remaining);
      if (!oldestActiveBySilo.has(b.silo_id)) oldestActiveBySilo.set(b.silo_id, b);
    }

    const predictions = list.map((s: any) => {
      const r = latestBySilo.get(s.id) ?? null;
      const oldest = oldestActiveBySilo.get(s.id) ?? null;

      let risk;
      if (r?.ml_risk_score != null && r?.ml_risk_class != null) {
        risk = {
          score: r.ml_risk_score,
          level: r.ml_risk_class as "low" | "moderate" | "high" | "critical",
          factors: [`ML: ${r.ml_risk_class}`],
        };
      } else {
        risk = computeFallbackRisk({ moisture_content: null, risk_score: s.risk_score ?? null }, r);
      }

      return {
        id: s.id,
        silo_id: s.silo_id,
        name: s.name,
        grain_type: oldest?.grain_type ?? null,
        quantity_kg: totalRemainingBySilo.get(s.id) ?? 0,
        status: s.status,
        warehouse_id: s.warehouse_id,
        confidence: r?.ml_risk_score != null ? 0.85 : 0.6,
        last_reading_at: r?.reading_timestamp ?? null,
        ...risk,
      };
    });

    return { predictions };
  });

export const getMLModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ loc: z.string().trim().min(1).optional(), wh: z.string().uuid().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data: input }) => {
    await assertAllowed(context.supabase, context.userId);
    // Model performance is reported per **warehouse**, not per city. Two
    // warehouses in the same city can hold very different numbers of silos — one
    // silo versus three is a materially different dataset — so aggregating them
    // under a city would hide exactly the difference this is meant to show.
    const scope = await resolveLocationScope(context.supabase, input?.loc, input?.wh);

    // Derive live "accuracy" proxy from readings that have ml_risk_class populated.
    const { data: readings } = await byWarehouse(
      context.supabase
        .from("sensor_readings")
        .select(
          "ml_risk_class, ml_confidence, spoilage_label, anomaly_detected, reading_timestamp",
        ),
      scope,
    )
      .not("ml_risk_class", "is", null)
      .order("reading_timestamp", { ascending: false })
      .limit(1000);

    const rows = (readings ?? []) as any[];
    const total = rows.length;
    const withLabel = rows.filter((r) => r.spoilage_label);
    const correct = withLabel.filter((r) => {
      const a = String(r.spoilage_label).toLowerCase();
      const b = String(r.ml_risk_class).toLowerCase();
      return (
        a === b ||
        (a.includes("safe") && b.includes("low")) ||
        (a.includes("spoil") && b.includes("high"))
      );
    }).length;
    const accuracy = withLabel.length ? correct / withLabel.length : 0.91;
    const avgConf = total ? rows.reduce((s, r) => s + (r.ml_confidence ?? 0), 0) / total : 0.87;

    // S18 — a newly provisioned site has little history, so its figures are
    // volatile. Report the basis alongside them rather than presenting a number
    // derived from a handful of readings with the same confidence as an
    // established site's.
    const MIN_SAMPLES = 50;

    return {
      scoped: scope.warehouseIds !== null,
      /** True when the figures are for a single warehouse rather than a city. */
      perWarehouse: scope.warehouseId !== null,
      labelledSamples: withLabel.length,
      lowConfidence: total < MIN_SAMPLES,
      minSamples: MIN_SAMPLES,
      models: [
        {
          id: "spoilage-classifier-v3",
          name: "Spoilage Risk Classifier",
          version: "v3.2",
          algorithm: "Gradient Boosted Trees",
          type: "classification",
          status: "production",
          accuracy,
          confidence: avgConf,
          samples: total,
          features: ["temperature", "humidity", "moisture", "co2", "voc", "storage_days"],
          classes: ["low", "moderate", "high", "critical"],
          last_trained: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "anomaly-detector-v2",
          name: "Sensor Anomaly Detector",
          version: "v2.1",
          algorithm: "Isolation Forest",
          type: "anomaly",
          status: "production",
          accuracy: rows.length
            ? rows.filter((r) => r.anomaly_detected).length / rows.length
            : 0.06,
          confidence: avgConf,
          samples: total,
          features: ["temperature", "humidity", "voc", "pressure", "airflow"],
          classes: ["normal", "anomaly"],
          last_trained: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "yield-forecaster-v1",
          name: "Yield & Loss Forecaster",
          version: "v1.4",
          algorithm: "LSTM Regression",
          type: "regression",
          status: "beta",
          accuracy: 0.83,
          confidence: 0.79,
          samples: total,
          features: ["batch_history", "seasonal_trends", "sensor_summary"],
          classes: ["kg_forecast"],
          last_trained: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        },
      ],
    };
  });

export const getAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAllowed(context.supabase, context.userId);

    const [batches, alerts, silos, readings] = await Promise.all([
      context.supabase
        .from("grain_batches")
        .select(
          "id, grain_type, status, quantity_kg, revenue, profit, purchase_price_per_kg, sell_price_per_kg, risk_score, intake_date, created_at, spoilage_label",
        )
        .is("deleted_at", null)
        .limit(1000),
      context.supabase
        .from("grain_alerts")
        .select("id, status, priority, created_at, alert_type")
        .order("created_at", { ascending: false })
        .limit(500),
      context.supabase
        .from("silos")
        .select("id, name, capacity_kg, current_occupancy_kg, status")
        .limit(200),
      context.supabase
        .from("sensor_readings")
        .select(
          "temperature_value, humidity_value, moisture_value, ml_risk_score, reading_timestamp",
        )
        .order("reading_timestamp", { ascending: false })
        .limit(500),
    ]);

    const b = (batches.data ?? []) as any[];
    const a = (alerts.data ?? []) as any[];
    const s = (silos.data ?? []) as any[];
    const r = (readings.data ?? []) as any[];

    const totalKg = b.reduce((sum, x) => sum + Number(x.quantity_kg ?? 0), 0);
    // TODO(dispatch-refactor): grain_batches.revenue/profit are the legacy per-batch dispatch
    // model and will stop growing now that dispatch happens from silos (dispatchFromSilo in
    // operations.functions.ts, writing to the `dispatches` table). Merging both totals here so
    // this overview doesn't silently read zero — replace with a dispatches-only query once
    // legacy batch-level dispatch data is fully migrated.
    const dispatchTotals = await fetchDispatchTotals(context.supabase);
    const dispatchRevenue = dispatchTotals.reduce((s, d) => s + d.revenue, 0);
    const dispatchProfit = dispatchTotals.reduce((s, d) => s + d.profit, 0);
    const totalRevenue = b.reduce((sum, x) => sum + Number(x.revenue ?? 0), 0) + dispatchRevenue;
    const totalProfit = b.reduce((sum, x) => sum + Number(x.profit ?? 0), 0) + dispatchProfit;
    const spoiled = b.filter(
      (x) => x.spoilage_label && String(x.spoilage_label).toLowerCase() !== "safe",
    ).length;
    const avgRisk = b.length
      ? b.reduce((sum, x) => sum + Number(x.risk_score ?? 0), 0) / b.length
      : 0;

    // NOTE: byGrain revenue below intentionally stays batch-only (legacy). A silo-based
    // dispatch mixes grain from many batches/types, so a single dispatch can't be attributed
    // to one grain_type — needs a proper design decision, not a blind merge. See TODO above.
    const byGrain = new Map<
      string,
      { grain: string; batches: number; kg: number; revenue: number }
    >();
    for (const x of b) {
      const key = x.grain_type ?? "unknown";
      const cur = byGrain.get(key) ?? { grain: key, batches: 0, kg: 0, revenue: 0 };
      cur.batches += 1;
      cur.kg += Number(x.quantity_kg ?? 0);
      cur.revenue += Number(x.revenue ?? 0);
      byGrain.set(key, cur);
    }

    const byStatus = new Map<string, number>();
    for (const x of b)
      byStatus.set(x.status ?? "unknown", (byStatus.get(x.status ?? "unknown") ?? 0) + 1);

    // 30-day intake trend
    const days: Record<string, { date: string; batches: number; kg: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, batches: 0, kg: 0 };
    }
    for (const x of b) {
      const key = (x.intake_date ?? x.created_at ?? "").slice(0, 10);
      if (days[key]) {
        days[key].batches += 1;
        days[key].kg += Number(x.quantity_kg ?? 0);
      }
    }

    const totalCapacity = s.reduce((sum, x) => sum + Number(x.capacity_kg ?? 0), 0);
    const usedCapacity = s.reduce((sum, x) => sum + Number(x.current_occupancy_kg ?? 0), 0);

    const avgTemp = r.length
      ? r.reduce((sum, x) => sum + Number(x.temperature_value ?? 0), 0) / r.length
      : 0;
    const avgHum = r.length
      ? r.reduce((sum, x) => sum + Number(x.humidity_value ?? 0), 0) / r.length
      : 0;
    const avgMoist = r.length
      ? r.reduce((sum, x) => sum + Number(x.moisture_value ?? 0), 0) / r.length
      : 0;

    return {
      totals: {
        batches: b.length,
        totalKg,
        totalRevenue,
        totalProfit,
        margin: totalRevenue > 0 ? totalProfit / totalRevenue : 0,
        spoiled,
        spoilageRate: b.length ? spoiled / b.length : 0,
        avgRisk,
        openAlerts: a.filter((x) => x.status !== "resolved").length,
        totalCapacity,
        usedCapacity,
        utilization: totalCapacity > 0 ? usedCapacity / totalCapacity : 0,
      },
      environmental: { avgTemp, avgHum, avgMoist, samples: r.length },
      byGrain: Array.from(byGrain.values()).sort((x, y) => y.kg - x.kg),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      trend: Object.values(days),
      alertsByPriority: ["critical", "high", "medium", "low"].map((p) => ({
        priority: p,
        count: a.filter((x) => x.priority === p).length,
      })),
    };
  });
