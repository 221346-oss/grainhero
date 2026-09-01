/**
 * Tenant locations — the super admin's per-tenant view of one account's sites.
 *
 * `listAdminLocations` shows the caller their own warehouses, grouped by city.
 * This shows a super admin *any* tenant's, grouped the same way and returning
 * the same `LocationCard` shape, so the city and warehouse tiles are literally
 * the same components. A super admin opening a tenant should see what that
 * tenant sees, not a second rendering of the same rows that drifts from it.
 *
 * Every query here is pinned to one resolved tenant. A super admin is allowed
 * to read across tenants, but not to read across two of them at once by
 * accident — a missing filter would silently widen a page whose entire purpose
 * is that it is narrow.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groupByCity } from "@/lib/location-scope";
import type {
  LocationCard,
  LocationSilo,
  LocationWarehouse,
  PlanUsage,
} from "@/lib/locations.functions";

type Sb = { from: (t: string) => any; rpc: (n: string, a: unknown) => Promise<{ data: unknown }> };

export type TenantIdentity = {
  id: string;
  name: string | null;
  email: string | null;
  businessType: string | null;
  blocked: boolean;
  joinedAt: string | null;
  planName: string | null;
  planStatus: string | null;
  planEndDate: string | null;
};

export type TenantLocations = {
  tenant: TenantIdentity | null;
  plan: PlanUsage;
  locations: LocationCard[];
};

function sum(ns: Array<number | null | undefined>): number {
  return ns.reduce<number>((t, n) => t + (n ?? 0), 0);
}

/**
 * Refuse anyone who is not a super admin.
 *
 * Thrown rather than returned: there is no partial answer to give, and a caller
 * that reaches this with the wrong role has a bug worth surfacing loudly.
 */
async function requireSuper(sb: Sb, userId: string): Promise<void> {
  const { data: isSuper } = await sb.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!isSuper) throw new Error("Forbidden: super_admin only");
}

/**
 * The account root for whatever profile id the client sent.
 *
 * The tenants list only ever links account owners, but a hand-typed URL or a
 * stale link can carry a team member's id. Climbing to `admin_id` means such a
 * URL opens the account that member belongs to instead of rendering an empty
 * shell, which is both more useful and less confusing than a blank page.
 */
async function resolveTenantRoot(sb: Sb, adminId: string): Promise<string | null> {
  const { data } = await sb.from("profiles").select("id, admin_id").eq("id", adminId).maybeSingle();
  if (!data) return null;
  return (data.admin_id as string | null) ?? (data.id as string);
}

/** The tenant's warehouses, grouped into cities, with live signal on each. */
export const getTenantLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string }) => d)
  .handler(async ({ data, context }): Promise<TenantLocations> => {
    const sb = context.supabase as unknown as Sb;
    await requireSuper(sb, context.userId);

    const tenantId = await resolveTenantRoot(sb, data.adminId);
    const emptyPlan: PlanUsage = {
      planId: "unknown",
      warehousesUsed: 0,
      warehousesLimit: -1,
      atLimit: false,
    };
    if (!tenantId) return { tenant: null, plan: emptyPlan, locations: [] };

    const [profileRes, subRes, warehouseRes] = await Promise.all([
      sb
        .from("profiles")
        .select("id, name, email, business_type, created_at, blocked, subscription_plan")
        .eq("id", tenantId)
        .maybeSingle(),
      sb
        .from("subscriptions")
        .select("plan_name, status, end_date")
        .eq("admin_id", tenantId)
        .in("status", ["active", "trial"])
        .maybeSingle(),
      sb
        .from("warehouses")
        .select(
          "id, warehouse_id, name, status, location, location_city, location_address, silos:silos(id, name, capacity_kg, current_occupancy_kg, status)",
        )
        .eq("admin_id", tenantId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(500),
    ]);

    if (warehouseRes.error) throw warehouseRes.error;

    const p = profileRes.data;
    const sub = subRes.data;
    const tenant: TenantIdentity | null = p
      ? {
          id: p.id,
          name: p.name ?? null,
          email: p.email ?? null,
          businessType: p.business_type ?? null,
          blocked: Boolean(p.blocked),
          joinedAt: p.created_at ?? null,
          planName: sub?.plan_name ?? p.subscription_plan ?? null,
          planStatus: sub?.status ?? null,
          planEndDate: sub?.end_date ?? null,
        }
      : null;

    // The tenant's own allowance, resolved against the tenant rather than the
    // caller. Passing the super admin's id here would short-circuit to
    // "unlimited" and report every tenant as uncapped.
    const { computePlanGate } = await import("./plan-gate");
    const gate = await computePlanGate(context.supabase, tenantId, "max_warehouses");
    const warehousesLimit = typeof gate.limit === "number" ? gate.limit : -1;
    const plan: PlanUsage = {
      planId: gate.planId,
      warehousesUsed: gate.used ?? 0,
      warehousesLimit,
      atLimit: warehousesLimit > 0 && (gate.used ?? 0) >= warehousesLimit,
    };

    const rows = (warehouseRes.data ?? []) as any[];
    if (rows.length === 0) return { tenant, plan, locations: [] };

    // Open alerts per warehouse, counted in one pass. "Open" is anything not
    // resolved or closed, matching the admin-side picker exactly — the same
    // warehouse must not report a different alert count to the two roles.
    const alertsByWarehouse = new Map<string, { open: number; critical: number }>();
    const { data: alerts } = await sb
      .from("grain_alerts")
      .select("warehouse_id, priority")
      .eq("admin_id", tenantId)
      .in(
        "warehouse_id",
        rows.map((r) => r.id),
      )
      .is("deleted_at", null)
      .not("status", "in", "(resolved,closed)");

    for (const a of (alerts ?? []) as any[]) {
      const wid = a.warehouse_id;
      if (!wid) continue;
      const entry = alertsByWarehouse.get(wid) ?? { open: 0, critical: 0 };
      entry.open += 1;
      if (a.priority === "critical") entry.critical += 1;
      alertsByWarehouse.set(wid, entry);
    }

    const locations = groupByCity(rows).map(({ key, city, warehouses }) => {
      const cards: LocationWarehouse[] = warehouses.map((w: any) => {
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
      const counts = warehouses.map((w: any) => alertsByWarehouse.get(w.id));

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

    return { tenant, plan, locations };
  });

export type TenantWarehouseSilo = LocationSilo & { utilisationPct: number | null };

export type TenantWarehouseDetail = {
  warehouse: {
    id: string;
    warehouse_id: string;
    name: string;
    status: string | null;
    city: string;
    address: string | null;
    siloCount: number;
    capacityKg: number;
    occupancyKg: number;
    utilisationPct: number | null;
  } | null;
  silos: TenantWarehouseSilo[];
  alerts: Array<{
    id: string;
    title: string;
    message: string | null;
    priority: string | null;
    status: string | null;
    triggered_at: string | null;
  }>;
  batches: Array<{
    id: string;
    batch_id: string;
    grain_type: string | null;
    quantity_kg: number | null;
    status: string | null;
    created_at: string | null;
  }>;
  team: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: "manager" | "technician";
  }>;
};

/**
 * One warehouse inside one tenant — the third level of the drill-down.
 *
 * The warehouse id arrives from the client, so it is treated as a request
 * rather than a permission: it is looked up *with* the tenant filter applied,
 * and a warehouse belonging to anyone else resolves to null instead of
 * returning that other tenant's rows.
 */
export const getTenantWarehouseDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string; warehouseId: string }) => d)
  .handler(async ({ data, context }): Promise<TenantWarehouseDetail> => {
    const sb = context.supabase as unknown as Sb;
    await requireSuper(sb, context.userId);

    const empty: TenantWarehouseDetail = {
      warehouse: null,
      silos: [],
      alerts: [],
      batches: [],
      team: [],
    };

    const tenantId = await resolveTenantRoot(sb, data.adminId);
    if (!tenantId) return empty;

    const { data: wh } = await sb
      .from("warehouses")
      .select(
        "id, warehouse_id, name, status, location, location_city, location_address, manager_id, technician_ids",
      )
      .eq("id", data.warehouseId)
      .eq("admin_id", tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    // Not this tenant's warehouse — an empty result, never a wider one.
    if (!wh) return empty;

    const [silosRes, alertsRes, batchesRes] = await Promise.all([
      sb
        .from("silos")
        .select("id, name, capacity_kg, current_occupancy_kg, status")
        .eq("admin_id", tenantId)
        .eq("warehouse_id", wh.id)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(200),
      sb
        .from("grain_alerts")
        .select("id, title, message, priority, status, triggered_at")
        .eq("admin_id", tenantId)
        .eq("warehouse_id", wh.id)
        .is("deleted_at", null)
        .not("status", "in", "(resolved,closed)")
        .order("triggered_at", { ascending: false })
        .limit(10),
      sb
        .from("grain_batches")
        .select("id, batch_id, grain_type, quantity_kg, status, created_at")
        .eq("admin_id", tenantId)
        .eq("warehouse_id", wh.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const silos = ((silosRes.data ?? []) as LocationSilo[]).map((s) => ({
      ...s,
      utilisationPct:
        s.capacity_kg && s.capacity_kg > 0
          ? Math.round(((s.current_occupancy_kg ?? 0) / s.capacity_kg) * 100)
          : null,
    }));

    // The people attached to this warehouse — R13 means the manager slot holds
    // exactly one person, so it is rendered as a single row, not a list.
    const staffIds = [wh.manager_id, ...((wh.technician_ids ?? []) as string[])].filter(
      Boolean,
    ) as string[];
    let team: TenantWarehouseDetail["team"] = [];
    if (staffIds.length > 0) {
      const { data: people } = await sb
        .from("profiles")
        .select("id, name, email")
        .in("id", staffIds)
        .limit(50);
      team = ((people ?? []) as any[]).map((m) => ({
        id: m.id,
        name: m.name ?? null,
        email: m.email ?? null,
        role: m.id === wh.manager_id ? ("manager" as const) : ("technician" as const),
      }));
      // Manager first — it is the accountable slot, and a list that opens with
      // a technician reads as if nobody is in charge.
      team.sort((a, b) => (a.role === b.role ? 0 : a.role === "manager" ? -1 : 1));
    }

    const capacityKg = sum(silos.map((s) => s.capacity_kg));
    const occupancyKg = sum(silos.map((s) => s.current_occupancy_kg));
    const { deriveCity } = await import("./location-scope");

    return {
      warehouse: {
        id: wh.id,
        warehouse_id: wh.warehouse_id,
        name: wh.name,
        status: wh.status ?? null,
        city: deriveCity(wh),
        address: wh.location_address ?? null,
        siloCount: silos.length,
        capacityKg,
        occupancyKg,
        utilisationPct: capacityKg > 0 ? Math.round((occupancyKg / capacityKg) * 100) : null,
      },
      silos,
      alerts: (alertsRes.data ?? []) as TenantWarehouseDetail["alerts"],
      batches: (batchesRes.data ?? []) as TenantWarehouseDetail["batches"],
      team,
    };
  });
