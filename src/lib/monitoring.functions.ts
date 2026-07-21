import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function role(supabase: any, userId: string) {
  const roles: string[] = [];
  for (const r of ["super_admin", "admin", "manager", "technician"]) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: r });
    if (data) roles.push(r);
  }
  const order = ["super_admin", "admin", "manager", "technician", "pending"];
  return order.find((r) => roles.includes(r)) ?? "pending";
}

function requireAny(r: string, allowed: string[]) {
  if (!allowed.includes(r)) throw new Error("Forbidden");
}

// ---------- Environmental ----------

export const getEnvironmentalOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: readings } = await context.supabase
      .from("sensor_readings")
      .select("silo_id, warehouse_id, device_id, temperature_value, humidity_value, moisture_value, co2_value, voc_value, ambient_temperature, ambient_humidity, dew_point, condensation_risk, anomaly_detected, reading_timestamp")
      .gte("reading_timestamp", since)
      .order("reading_timestamp", { ascending: false })
      .limit(2000);

    const rows = (readings ?? []) as any[];
    const avg = (k: string) => rows.length ? rows.reduce((s, x) => s + Number(x[k] ?? 0), 0) / rows.length : 0;
    const min = (k: string) => rows.length ? Math.min(...rows.map((x) => Number(x[k] ?? Infinity))) : 0;
    const max = (k: string) => rows.length ? Math.max(...rows.map((x) => Number(x[k] ?? -Infinity))) : 0;

    // Latest per silo
    const bySilo = new Map<string, any>();
    for (const r of rows) {
      if (r.silo_id && !bySilo.has(r.silo_id)) bySilo.set(r.silo_id, r);
    }
    const siloIds = Array.from(bySilo.keys());
    let silos: any[] = [];
    if (siloIds.length > 0) {
      const { data } = await context.supabase.from("silos").select("id, name, silo_id, warehouse_id, status").in("id", siloIds);
      silos = data ?? [];
    }
    const siloLatest = silos.map((s: any) => ({ ...s, latest: bySilo.get(s.id) }));

    // Hourly bins for last 24h
    const bins: Record<string, { hour: string; temp: number; hum: number; moist: number; count: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const key = `${d.toISOString().slice(0, 13)}:00`;
      bins[key] = { hour: key, temp: 0, hum: 0, moist: 0, count: 0 };
    }
    for (const r of rows) {
      const key = `${(r.reading_timestamp as string).slice(0, 13)}:00`;
      if (bins[key]) {
        bins[key].temp += Number(r.temperature_value ?? 0);
        bins[key].hum += Number(r.humidity_value ?? 0);
        bins[key].moist += Number(r.moisture_value ?? 0);
        bins[key].count += 1;
      }
    }
    const trend = Object.values(bins).map((b) => ({
      hour: b.hour.slice(11, 16),
      temp: b.count ? b.temp / b.count : 0,
      hum: b.count ? b.hum / b.count : 0,
      moist: b.count ? b.moist / b.count : 0,
    }));

    return {
      samples: rows.length,
      env: {
        temp: { avg: avg("temperature_value"), min: min("temperature_value"), max: max("temperature_value") },
        hum: { avg: avg("humidity_value"), min: min("humidity_value"), max: max("humidity_value") },
        moist: { avg: avg("moisture_value"), min: min("moisture_value"), max: max("moisture_value") },
        co2: { avg: avg("co2_value"), max: max("co2_value") },
        voc: { avg: avg("voc_value"), max: max("voc_value") },
      },
      anomalies: rows.filter((x) => x.anomaly_detected).length,
      condensationRisk: rows.filter((x) => x.condensation_risk).length,
      trend,
      siloLatest,
    };
  });

// ---------- Incidents ----------

export const getIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    const { data: alerts } = await context.supabase
      .from("grain_alerts")
      .select("id, alert_id, title, message, priority, status, alert_type, sensor_type, silo_id, batch_id, warehouse_id, triggered_at, acknowledged_at, resolved_at, created_at")
      .in("priority", ["critical", "high"])
      .order("triggered_at", { ascending: false })
      .limit(200);

    const list = (alerts ?? []) as any[];
    const totals = {
      total: list.length,
      open: list.filter((x) => x.status === "open" || x.status === "active").length,
      resolved: list.filter((x) => x.status === "resolved").length,
      acknowledged: list.filter((x) => x.acknowledged_at && !x.resolved_at).length,
    };

    // MTTA / MTTR minutes
    const mtta = list.filter((x) => x.acknowledged_at && x.triggered_at);
    const mttr = list.filter((x) => x.resolved_at && x.triggered_at);
    const avgMinutes = (arr: any[], a: string, b: string) =>
      arr.length ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 60000, 0) / arr.length : 0;

    return {
      incidents: list,
      totals,
      mtta: avgMinutes(mtta, "acknowledged_at", "triggered_at"),
      mttr: avgMinutes(mttr, "resolved_at", "triggered_at"),
    };
  });

const ackInput = z.object({ id: z.string().uuid(), resolve: z.boolean().optional() });

export const acknowledgeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ackInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    const patch: any = { acknowledged_at: new Date().toISOString(), acknowledged_by: context.userId, status: "acknowledged" };
    if (data.resolve) {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = context.userId;
      patch.status = "resolved";
    }
    const { error } = await context.supabase.from("grain_alerts").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Reports ----------

export const getReportsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager"]);

    const [batches, alerts, invoices, silos] = await Promise.all([
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, status, quantity_kg, revenue, profit, purchase_price_per_kg, sell_price_per_kg, spoilage_label, risk_score, intake_date, created_at")
        .is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("grain_alerts")
        .select("id, priority, status, alert_type, created_at, resolved_at")
        .order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("buyer_invoices")
        .select("id, invoice_number, buyer_name, total_amount, amount_paid, payment_status, currency, created_at")
        .order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("silos").select("id, name, capacity_kg, current_occupancy_kg, status").limit(500),
    ]);

    return {
      batches: batches.data ?? [],
      alerts: alerts.data ?? [],
      invoices: invoices.data ?? [],
      silos: silos.data ?? [],
    };
  });