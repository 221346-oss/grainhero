import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Range = "today" | "7d" | "30d" | "mtd" | "ytd";
function rangeWindow(range: Range) {
  const now = new Date();
  let start = new Date(now);
  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 86400_000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 86400_000);
      break;
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { startISO: start.toISOString() };
}

export const getManagerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ range: z.enum(["today", "7d", "30d", "mtd", "ytd"]).default("mtd") }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const range = data.range as Range;
    const { startISO } = rangeWindow(range);

    // Resolve tenant admin id
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    const [
      silosRes,
      alertsRes,
      qcRes,
      dispatchReadyRes,
      dispatchesRes,
      actuatorsRes,
      buyersRes,
      techsRes,
      incidentsRes,
      batchesCountRes,
      activeBatchesRes,
      pendingApprovalRes,
      spoiledBatchesRes,
    ] = await Promise.all([
      context.supabase
        .from("silos")
        .select(
          "id, silo_id, name, capacity_kg, current_occupancy_kg, status, current_conditions, warehouse_id, created_at",
        )
        .order("current_occupancy_kg", { ascending: false })
        .limit(12),
      context.supabase
        .from("grain_alerts")
        .select("id, alert_id, title, priority, status, alert_type, triggered_at, silo_id")
        .in("status", ["pending", "acknowledged", "escalated"] as never)
        .order("triggered_at", { ascending: false, nullsFirst: false })
        .limit(10),
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, risk_score, created_at, silo_id")
        .in("status", [
          "intake",
          "processing",
          "treatment",
          "pending_qc",
          "qc_submitted",
          "qc_failed",
          "qc_passed",
        ] as never)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, silo_id, purchase_price_per_kg")
        .in("status", ["ready", "stored"] as never)
        .order("created_at", { ascending: false })
        .limit(10),
      // Fetch actual grain dispatches with batch and buyer info
      context.supabase
        .from("grain_dispatches")
        .select("id, grain_type, total_qty_kg, status, dispatched_at, created_at, silo_id")
        .in("status", ["staged", "in_transit", "delivered"] as never)
        .order("dispatched_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("actuators")
        .select("id, name, actuator_type, status, is_on, power_level, silo_id")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(10),
      context.supabase
        .from("buyers")
        .select("id, name, company_name, status, contact_name, created_at")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("profiles")
        .select("id, name, email, department, shift_pattern")
        .eq("admin_id", adminId)
        .limit(20),
      context.supabase
        .from("field_incidents")
        .select("id, category, severity, status, created_at, assigned_to, silo_id, notes")
        .in("status", ["open", "investigating"] as never)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase
        .from("grain_batches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startISO),
      // Fetch batches pending admin approval (manager-created batches)
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, created_at, silo_id, created_by")
        .eq("status", "pending_approval" as never)
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(10),
      // Fetch spoiled/damaged batches for alert triage
      context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, created_at, silo_id")
        .in("status", ["damaged", "expired"] as never)
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    type SiloRow = {
      id: string;
      silo_id: string;
      name: string;
      capacity_kg: number;
      current_occupancy_kg: number | null;
      status: string | null;
      warehouse_id: string;
    };
    const silos = (silosRes.data ?? []).map((s: SiloRow): SiloRow => ({
      id: s.id,
      silo_id: s.silo_id,
      name: s.name,
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

    // assigned_technician_id isn't in the generated Supabase types for
    // grain_batches yet (see the same `as never` workaround in
    // operations.functions.ts), so it's fetched separately here rather than
    // widening the qcRes select above (which would fail select-string typing).
    const { data: assignedQCData } = await context.supabase
      .from("grain_batches")
      .select("assigned_technician_id, batch_id" as never)
      .in("status", ["pending_qc", "qc_submitted", "qc_failed", "qc_passed"] as never)
      .not("assigned_technician_id" as never, "is", null);
    const assignedQC = (assignedQCData ?? []) as unknown as Array<{
      assigned_technician_id: string | null;
      batch_id: string;
    }>;

    const busyTechMap: Record<string, string> = {};
    assignedQC.forEach((b) => {
      if (b.assigned_technician_id) busyTechMap[b.assigned_technician_id] = `QC: ${b.batch_id}`;
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
        fillPct,
        totalCap,
        totalOcc,
        batchesTotal: batchesCountRes.count ?? 0,
        batchesActive: activeBatchesRes.count ?? 0,
        alertsOpen: (alertsRes.data ?? []).length,
        alertsCritical: (alertsRes.data ?? []).filter((a) => String(a.priority) === "critical")
          .length,
        qcPending: (qcRes.data ?? []).length,
        dispatchReady: (dispatchesRes.data ?? []).length,
        actuatorsOn: actuators.filter((a) => a.is_on).length,
        actuatorsTotal: actuators.length,
        ordersOpen: (buyersRes.data ?? []).length,
        pendingApprovals: (pendingApprovalRes.data ?? []).length,
        spoiledBatches: (spoiledBatchesRes.data ?? []).length,
      },
      fillSpark,
      silos,
      alerts: alertsRes.data ?? [],
      qcQueue: qcRes.data ?? [],
      dispatchQueue: dispatchesRes.data ?? [],
      actuators,
      buyers: buyersRes.data ?? [],
      technicians,
      incidents: incidentsRes.data ?? [],
      pendingApprovals: pendingApprovalRes.data ?? [],
      spoiledBatches: spoiledBatchesRes.data ?? [],
    };
  });
