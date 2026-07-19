import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Range = "today" | "7d" | "30d" | "mtd" | "ytd";
function rangeWindow(range: Range) {
  const now = new Date();
  let start = new Date(now);
  switch (range) {
    case "today": start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "7d":    start = new Date(now.getTime() - 7 * 86400_000); break;
    case "30d":   start = new Date(now.getTime() - 30 * 86400_000); break;
    case "mtd":   start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "ytd":   start = new Date(now.getFullYear(), 0, 1); break;
  }
  return { startISO: start.toISOString() };
}

export const getManagerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ range: z.enum(["today","7d","30d","mtd","ytd"]).default("mtd") }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const range = data.range as Range;
    const { startISO } = rangeWindow(range);

    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles").select("id, admin_id").eq("id", context.userId).maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    const [
      silosRes, alertsRes, qcRes, dispatchReadyRes,
      actuatorsRes, ordersRes, techsRes, incidentsRes,
      batchesCountRes, activeBatchesRes,
    ] = await Promise.all([
      context.supabase.from("silos")
        .select("id, silo_id, name, capacity_kg, current_occupancy_kg, status, temperature_c, humidity_pct, warehouse_id")
        .order("current_occupancy_kg", { ascending: false }).limit(12),
      context.supabase.from("grain_alerts")
        .select("id, alert_id, title, priority, status, alert_type, triggered_at, silo_id")
        .in("status", ["open", "active", "triggered", "unresolved"])
        .order("triggered_at", { ascending: false, nullsFirst: false }).limit(10),
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, silo_id")
        .in("status", ["qc_pending", "quality_check", "qc"])
        .order("created_at", { ascending: false }).limit(10),
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, silo_id, purchase_price_per_kg")
        .in("status", ["ready", "ready_to_ship", "dispatch_pending", "stored"])
        .order("created_at", { ascending: false }).limit(10),
      context.supabase.from("actuators")
        .select("id, name, actuator_type, status, is_on, power_level, silo_id")
        .order("updated_at", { ascending: false, nullsFirst: false }).limit(10),
      context.supabase.from("buyer_orders")
        .select("id, order_number, status, total_amount, buyer_id, created_at")
        .eq("admin_id", adminId)
        .in("status", ["pending", "confirmed", "processing", "awaiting_shipment"])
        .order("created_at", { ascending: false }).limit(10),
      context.supabase.from("profiles")
        .select("id, name, email, department, shift_pattern")
        .eq("admin_id", adminId).limit(20),
      context.supabase.from("field_incidents")
        .select("id, title, severity, status, created_at, assigned_to")
        .in("status", ["open", "in_progress", "pending"])
        .order("created_at", { ascending: false }).limit(8),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true })
        .gte("created_at", startISO),
    ]);

    const silos = silosRes.data ?? [];
    const totalCap = silos.reduce((s, x) => s + Number(x.capacity_kg ?? 0), 0);
    const totalOcc = silos.reduce((s, x) => s + Number(x.current_occupancy_kg ?? 0), 0);
    const fillPct = totalCap ? Math.round((totalOcc / totalCap) * 100) : 0;

    const fillSpark = silos.slice(0, 12).map((s) => {
      const cap = Number(s.capacity_kg ?? 0);
      const occ = Number(s.current_occupancy_kg ?? 0);
      return cap ? Math.round((occ / cap) * 100) : 0;
    });

    const actuators = actuatorsRes.data ?? [];
    return {
      range,
      kpis: {
        fillPct, totalCap, totalOcc,
        batchesTotal: batchesCountRes.count ?? 0,
        batchesActive: activeBatchesRes.count ?? 0,
        alertsOpen: (alertsRes.data ?? []).length,
        alertsCritical: (alertsRes.data ?? []).filter((a) => String(a.priority) === "critical").length,
        qcPending: (qcRes.data ?? []).length,
        dispatchReady: (dispatchReadyRes.data ?? []).length,
        actuatorsOn: actuators.filter((a) => a.is_on).length,
        actuatorsTotal: actuators.length,
        ordersOpen: (ordersRes.data ?? []).length,
      },
      fillSpark,
      silos,
      alerts: alertsRes.data ?? [],
      qcQueue: qcRes.data ?? [],
      dispatchQueue: dispatchReadyRes.data ?? [],
      actuators,
      orders: ordersRes.data ?? [],
      technicians: techsRes.data ?? [],
      incidents: incidentsRes.data ?? [],
    };
  });