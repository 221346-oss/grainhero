/**
 * Locations — the city-level view of an admin's warehouses.
 *
 * Backs the location picker an admin sees after logging in, and the switcher in
 * the app header. Returns one entry per city with enough signal on it to be
 * worth the click: how many warehouses and silos it holds, how full they are,
 * and how many alerts are open.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groupByCity } from "@/lib/location-scope";

export type LocationSilo = {
  id: string;
  name: string | null;
  capacity_kg: number | null;
  current_occupancy_kg: number | null;
  status: string | null;
};

export type LocationWarehouse = {
  id: string;
  warehouse_id: string;
  name: string;
  status: string | null;
  siloCount: number;
  capacityKg: number;
  occupancyKg: number;
};

/**
 * How the account's warehouse allowance is being used.
 *
 * Shown on the picker so the card grid reflects the plan rather than just
 * listing whatever exists — an admin should be able to see at a glance that
 * they are at their cap before wondering why a new site cannot be added.
 * `limit` of -1 means unlimited (or an unconfigured plan).
 */
export type PlanUsage = {
  planId: string;
  warehousesUsed: number;
  warehousesLimit: number;
  atLimit: boolean;
};

export type LocationCard = {
  /** Normalised, case-insensitive key — the value carried in the URL. */
  key: string;
  /** Display spelling of the city. */
  city: string;
  warehouses: LocationWarehouse[];
  warehouseCount: number;
  siloCount: number;
  capacityKg: number;
  occupancyKg: number;
  /** Percentage full, 0–100. Null when the location has no capacity recorded. */
  utilisationPct: number | null;
  openAlerts: number;
  criticalAlerts: number;
};

function sum(ns: Array<number | null | undefined>): number {
  return ns.reduce<number>((t, n) => t + (n ?? 0), 0);
}

/**
 * List the caller's warehouses grouped into cities.
 *
 * RLS scopes `warehouses` to the caller's tenant, so this returns the admin's
 * own sites and nothing else. Managers and technicians are narrowed further to
 * the warehouses they are assigned to — they never see the picker, but the
 * switcher reuses this and must not widen their view.
 */
export const listAdminLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ locations: LocationCard[]; plan: PlanUsage }> => {
    const sb = context.supabase;
    const { getEffectiveRole } = await import("./rbac.server");
    const role = await getEffectiveRole(sb, context.userId);

    let query = sb
      .from("warehouses")
      .select(
        "id, warehouse_id, name, status, location, location_city, location_address, silos:silos(id, name, capacity_kg, current_occupancy_kg, status)",
      )
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(500);

    if (role === "manager") query = query.eq("manager_id", context.userId);
    else if (role === "technician") query = query.contains("technician_ids", [context.userId]);

    const { data, error } = await query;
    if (error) throw error;

    // Plan usage is resolved for every response, including the empty one — the
    // picker's empty state still needs to say how many warehouses are allowed.
    const { computePlanGate } = await import("./plan-gate");
    const gate = await computePlanGate(sb, context.userId, "max_warehouses");
    const warehousesLimit = typeof gate.limit === "number" ? gate.limit : -1;
    const plan: PlanUsage = {
      planId: gate.planId,
      warehousesUsed: gate.used ?? 0,
      warehousesLimit,
      atLimit: !gate.isSuper && warehousesLimit > 0 && (gate.used ?? 0) >= warehousesLimit,
    };

    const rows = data ?? [];
    if (rows.length === 0) return { locations: [], plan };

    // Open alerts per warehouse, counted in one pass rather than per card.
    // "Open" is anything not resolved or closed — `alert_status` carries both,
    // plus escalated/investigating states that are still very much live.
    const alertsByWarehouse = new Map<string, { open: number; critical: number }>();
    const { data: alerts } = await sb
      .from("grain_alerts")
      .select("warehouse_id, priority")
      .in(
        "warehouse_id",
        rows.map((r) => r.id),
      )
      .is("deleted_at", null)
      .not("status", "in", "(resolved,closed)");

    for (const a of alerts ?? []) {
      const wid = a.warehouse_id;
      if (!wid) continue;
      const entry = alertsByWarehouse.get(wid) ?? { open: 0, critical: 0 };
      entry.open += 1;
      if (a.priority === "critical") entry.critical += 1;
      alertsByWarehouse.set(wid, entry);
    }

    const locations = groupByCity(rows).map(({ key, city, warehouses }) => {
      const cards: LocationWarehouse[] = warehouses.map((w) => {
        const silos = (w.silos ?? []) as LocationSilo[];
        return {
          id: w.id,
          warehouse_id: w.warehouse_id,
          name: w.name,
          status: w.status,
          siloCount: silos.length,
          capacityKg: sum(silos.map((s) => s.capacity_kg)),
          occupancyKg: sum(silos.map((s) => s.current_occupancy_kg)),
        };
      });

      const capacityKg = sum(cards.map((c) => c.capacityKg));
      const occupancyKg = sum(cards.map((c) => c.occupancyKg));
      const counts = warehouses.map((w) => alertsByWarehouse.get(w.id));

      return {
        key,
        city,
        warehouses: cards,
        warehouseCount: cards.length,
        siloCount: sum(cards.map((c) => c.siloCount)),
        capacityKg,
        occupancyKg,
        utilisationPct: capacityKg > 0 ? Math.round((occupancyKg / capacityKg) * 100) : null,
        openAlerts: sum(counts.map((c) => c?.open)),
        criticalAlerts: sum(counts.map((c) => c?.critical)),
      } satisfies LocationCard;
    });

    return { locations, plan };
  });
