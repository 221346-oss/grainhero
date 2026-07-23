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
        .select("id, silo_id, name, capacity_kg, current_occupancy_kg, status, current_conditions, warehouse_id")
        .order("current_occupancy_kg", { ascending: false }).limit(12),
      context.supabase.from("grain_alerts")
        .select("id, alert_id, title, priority, status, alert_type, triggered_at, silo_id")
        .in("status", ["pending", "acknowledged", "escalated"] as never)
        .order("triggered_at", { ascending: false, nullsFirst: false }).limit(10),
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, silo_id, qc_status, qc_assigned_to, qc_notes, moisture_content, protein_content, test_weight")
        .in("qc_status", ["arrived", "testing", "pending"] as never)
        .order("created_at", { ascending: false }).limit(15),
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, silo_id, purchase_price_per_kg")
        .in("status", ["ready", "stored"] as never)
        .order("created_at", { ascending: false }).limit(10),
      context.supabase.from("actuators")
        .select("id, name, actuator_type, status, is_on, power_level, silo_id")
        .order("updated_at", { ascending: false, nullsFirst: false }).limit(10),
      context.supabase.from("buyer_orders")
        .select("id, order_number, status, total_amount, buyer_id, created_at")
        .eq("admin_id", adminId)
        .in("status", ["pending", "confirmed"] as never)
        .order("created_at", { ascending: false }).limit(10),
      context.supabase.from("profiles")
        .select("id, name, email, department, shift_pattern")
        .eq("admin_id", adminId).limit(20),
      context.supabase.from("field_incidents")
        .select("id, category, severity, status, created_at, assigned_to, silo_id, notes")
        .in("status", ["open", "investigating"] as never)
        .order("created_at", { ascending: false }).limit(10),

      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true })
        .gte("created_at", startISO),
    ]);

    type SiloRow = {
      id: string; silo_id: string; name: string; capacity_kg: number;
      current_occupancy_kg: number | null; status: string | null;
      warehouse_id: string;
    };
    const silos = (silosRes.data ?? []).map((s: any): SiloRow => ({
      id: s.id, silo_id: s.silo_id, name: s.name,
      capacity_kg: Number(s.capacity_kg ?? 0),
      current_occupancy_kg: s.current_occupancy_kg,
      status: s.status ?? null,
      warehouse_id: s.warehouse_id,
    }));
    const totalCap = silos.reduce((s, x) => s + Number(x.capacity_kg ?? 0), 0);
    const totalOcc = silos.reduce((s, x) => s + Number(x.current_occupancy_kg ?? 0), 0);
    const fillPct = totalCap ? Math.round((totalOcc / totalCap) * 100) : 0;

    const fillSpark = silos.slice(0, 12).map((s) => {
      const cap = Number(s.capacity_kg ?? 0);
      const occ = Number(s.current_occupancy_kg ?? 0);
      return cap ? Math.round((occ / cap) * 100) : 0;
    });

    const actuators = actuatorsRes.data ?? [];
    const rawTechs = techsRes.data ?? [];
    const activeQC = qcRes.data ?? [];
    const activeIncidents = incidentsRes.data ?? [];
    const busyTechMap: Record<string, string> = {};
    activeQC.forEach((b) => {
      if (b.qc_assigned_to) busyTechMap[b.qc_assigned_to] = `QC: ${b.batch_id}`;
    });
    activeIncidents.forEach((inc) => {
      if (inc.assigned_to) busyTechMap[inc.assigned_to] = `Incident: ${inc.category}`;
    });

    const technicians = rawTechs.map((t) => ({
      ...t,
      is_busy: Boolean(busyTechMap[t.id]),
      active_batch_id: busyTechMap[t.id] ?? null,
    }));



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
      technicians,
      incidents: incidentsRes.data ?? [],
    };

  });