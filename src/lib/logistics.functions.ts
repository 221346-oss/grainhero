/**
 * Phase 17 — Logistics orchestration.
 * Carriers, vehicles, drivers, shipment assignments, cost ledger,
 * fleet analytics. All settings-driven via marketplace-settings.logistics.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: super_admin only");
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function routeDistanceKm(stops: Array<{ lat?: number | null; lng?: number | null }>): number {
  let total = 0;
  const pts = stops.filter((s) => s.lat != null && s.lng != null) as Array<{
    lat: number;
    lng: number;
  }>;
  for (let i = 1; i < pts.length; i++) total += haversineKm(pts[i - 1], pts[i]);
  return Math.round(total * 10) / 10;
}

function nearestNeighbourOrder<T extends { lat?: number | null; lng?: number | null }>(
  stops: T[],
): T[] {
  if (stops.length < 3) return stops;
  const remaining = [...stops];
  const ordered: T[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    if (last.lat == null || last.lng == null) {
      ordered.push(remaining.shift()!);
      continue;
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      if (c.lat == null || c.lng == null) continue;
      const d = haversineKm(
        last as { lat: number; lng: number },
        c as { lat: number; lng: number },
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/* ---------- Carriers ---------- */

export const listCarriers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data } = await sb.from("carriers").select("*").order("name");
    return { carriers: (data ?? []) as Row[] };
  });

const CarrierSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_-]+$/i),
  name: z.string().min(1).max(120),
  type: z.enum(["in_house", "third_party"]),
  tracking_url_template: z.string().max(500).optional().nullable(),
  event_map: z.record(z.string(), z.string()).optional().default({}),
  contact_email: z.string().email().max(200).optional().nullable(),
  contact_phone: z.string().max(60).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const upsertCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => CarrierSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const payload = { ...data };
    if (payload.id) {
      const { error } = await sb.from("carriers").update(payload).eq("id", payload.id);
      if (error) throw error;
      return { id: payload.id };
    }
    const { data: row, error } = await sb.from("carriers").insert(payload).select("id").single();
    if (error) throw error;
    return { id: (row as Row).id };
  });

export const rotateCarrierWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb
      .from("carriers")
      .update({ webhook_secret: secret })
      .eq("id", data.id);
    if (error) throw error;
    return { secret };
  });

/* ---------- Vehicles ---------- */

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data } = await sb
      .from("vehicles")
      .select("*, carriers(name, code)")
      .order("registration_no");
    return { vehicles: (data ?? []) as Row[] };
  });

const VehicleSchema = z.object({
  id: z.string().uuid().optional(),
  carrier_id: z.string().uuid(),
  registration_no: z.string().min(1).max(60),
  type: z.string().min(1).max(60),
  capacity_kg: z.number().min(0),
  fuel_type: z.string().max(40).optional().nullable(),
  avg_kmpl: z.number().min(0).max(100).optional().nullable(),
  current_status: z.enum(["idle", "assigned", "in_transit", "maintenance"]).optional(),
  active: z.boolean().optional().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const upsertVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => VehicleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    if (data.id) {
      const { error } = await sb.from("vehicles").update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("vehicles").insert(data).select("id").single();
    if (error) throw error;
    return { id: (row as Row).id };
  });

/* ---------- Drivers ---------- */

export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data } = await sb.from("drivers").select("*, carriers(name)").order("full_name");
    return { drivers: (data ?? []) as Row[] };
  });

const DriverSchema = z.object({
  id: z.string().uuid().optional(),
  carrier_id: z.string().uuid(),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(60).optional().nullable(),
  license_no: z.string().max(60).optional().nullable(),
  license_expiry: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const upsertDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => DriverSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    if (data.id) {
      const { error } = await sb.from("drivers").update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("drivers").insert(data).select("id").single();
    if (error) throw error;
    return { id: (row as Row).id };
  });

/* ---------- Assignments ---------- */

const StopSchema = z.object({
  sequence: z.number().int().min(0),
  stop_type: z.enum(["pickup", "dropoff", "waypoint"]).default("dropoff"),
  address: z.string().max(400).optional().nullable(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  notes: z.string().max(400).optional().nullable(),
});

export const assignShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        shipmentId: z.string().uuid(),
        carrierId: z.string().uuid(),
        vehicleId: z.string().uuid().optional().nullable(),
        driverId: z.string().uuid().optional().nullable(),
        plannedPickupAt: z.string().datetime().optional().nullable(),
        plannedDeliveryAt: z.string().datetime().optional().nullable(),
        stops: z.array(StopSchema).max(20).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.logistics.carriersEnabled) throw new Error("Logistics disabled");

    // Validate driver license
    if (data.driverId) {
      const { data: drv } = await sb
        .from("drivers")
        .select("license_expiry, active")
        .eq("id", data.driverId)
        .maybeSingle();
      const d0 = drv as Row | null;
      if (!d0?.active) throw new Error("Driver not active");
      if (d0.license_expiry && new Date(d0.license_expiry) < new Date()) {
        throw new Error("Driver licence has expired");
      }
    }

    const distanceKm = routeDistanceKm(data.stops);
    const nowIso = new Date().toISOString();
    const planned_pickup_at =
      data.plannedPickupAt ??
      new Date(Date.now() + settings.logistics.defaultPickupWindowHours * 3_600_000).toISOString();
    const planned_delivery_at =
      data.plannedDeliveryAt ??
      new Date(
        Date.now() + settings.logistics.defaultDeliveryWindowHours * 3_600_000,
      ).toISOString();

    // Upsert assignment (one per shipment)
    const { data: existing } = await sb
      .from("shipment_assignments")
      .select("id")
      .eq("shipment_id", data.shipmentId)
      .maybeSingle();

    const assignmentPayload = {
      shipment_id: data.shipmentId,
      carrier_id: data.carrierId,
      vehicle_id: data.vehicleId ?? null,
      driver_id: data.driverId ?? null,
      planned_pickup_at,
      planned_delivery_at,
      distance_km: distanceKm || null,
      assigned_by: context.userId,
      assigned_at: nowIso,
      status: "planned",
    };

    let assignmentId: string;
    if (existing) {
      assignmentId = (existing as Row).id;
      const { error } = await sb
        .from("shipment_assignments")
        .update(assignmentPayload)
        .eq("id", assignmentId);
      if (error) throw error;
      await sb.from("shipment_route_stops").delete().eq("assignment_id", assignmentId);
    } else {
      const { data: row, error } = await sb
        .from("shipment_assignments")
        .insert(assignmentPayload)
        .select("id")
        .single();
      if (error) throw error;
      assignmentId = (row as Row).id;
    }

    if (data.stops.length) {
      const rows = data.stops.map((s) => ({ assignment_id: assignmentId, ...s }));
      const { error } = await sb.from("shipment_route_stops").insert(rows);
      if (error) throw error;
    }

    // Fetch shipment to log & notify
    const { data: ship } = await sb
      .from("buyer_shipments")
      .select("id, order_id, admin_id")
      .eq("id", data.shipmentId)
      .maybeSingle();
    const s = ship as Row | null;
    if (s) {
      const { data: carrier } = await sb
        .from("carriers")
        .select("name, code")
        .eq("id", data.carrierId)
        .maybeSingle();
      const cName = (carrier as Row | null)?.name ?? "Carrier";
      await sb.from("buyer_shipment_events").insert({
        shipment_id: data.shipmentId,
        code: "carrier_assigned",
        label: `Carrier assigned: ${cName}`,
        source: "seller",
        actor_user_id: context.userId,
      });
      await logActivity({
        actorId: context.userId,
        tenantAdminId: s.admin_id as string,
        action: "logistics.assigned",
        targetType: "shipment_assignment",
        targetId: assignmentId,
        meta: { shipmentId: data.shipmentId, carrierId: data.carrierId, distanceKm },
      });
    }

    // Vehicle status
    if (data.vehicleId) {
      await sb.from("vehicles").update({ current_status: "assigned" }).eq("id", data.vehicleId);
    }
    return { assignmentId, distanceKm };
  });

export const optimizeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ assignmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const settings = await loadMarketplaceSettings(context.supabase);
    if (settings.logistics.routeOptimizer === "off")
      return { ok: false, reason: "optimizer disabled" };
    const { data: stops } = await sb
      .from("shipment_route_stops")
      .select("*")
      .eq("assignment_id", data.assignmentId)
      .order("sequence");
    const ordered = nearestNeighbourOrder((stops ?? []) as Row[]);
    for (let i = 0; i < ordered.length; i++) {
      await sb
        .from("shipment_route_stops")
        .update({ sequence: i })
        .eq("id", (ordered[i] as Row).id);
    }
    const distanceKm = routeDistanceKm(ordered as Row[]);
    await sb
      .from("shipment_assignments")
      .update({ distance_km: distanceKm || null })
      .eq("id", data.assignmentId);
    return { ok: true, distanceKm, count: ordered.length };
  });

/* ---------- Cost ledger ---------- */

export const recordLogisticsCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        category: z.enum(["fuel", "driver_payout", "toll", "misc"]),
        amount: z.number().min(0),
        currency: z.string().length(3).default("PKR"),
        incurredAt: z.string().datetime().optional(),
        receiptUrl: z.string().url().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("logistics_cost_entries").insert({
      assignment_id: data.assignmentId,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      incurred_at: data.incurredAt ?? new Date().toISOString(),
      recorded_by: context.userId,
      receipt_url: data.receiptUrl ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listAssignmentCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ assignmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("logistics_cost_entries")
      .select("*")
      .eq("assignment_id", data.assignmentId)
      .order("incurred_at", { ascending: false });
    return { costs: (rows ?? []) as Row[] };
  });

/* ---------- Command-center analytics ---------- */

export const getLogisticsCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [aRes, cRes, vRes, dRes] = await Promise.all([
      sb
        .from("shipment_assignments")
        .select(
          "id, status, planned_delivery_at, actual_delivery_at, distance_km, carrier_id, assigned_at",
        ),
      sb.from("logistics_cost_entries").select("assignment_id, amount, category"),
      sb.from("vehicles").select("id, current_status, active"),
      sb.from("drivers").select("id, active, license_expiry"),
    ]);
    const assignments = (aRes.data ?? []) as Row[];
    const costs = (cRes.data ?? []) as Row[];
    const vehicles = (vRes.data ?? []) as Row[];
    const drivers = (dRes.data ?? []) as Row[];

    const active = assignments.filter(
      (a) => a.status !== "delivered" && a.status !== "cancelled",
    ).length;
    const delivered = assignments.filter((a) => a.status === "delivered");
    const onTime = delivered.filter(
      (a) =>
        !a.planned_delivery_at ||
        !a.actual_delivery_at ||
        new Date(a.actual_delivery_at) <= new Date(a.planned_delivery_at),
    ).length;
    const onTimePct = delivered.length ? Math.round((onTime / delivered.length) * 100) : 0;
    const totalCost = costs.reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const totalKg = 0; // hooked later via join to buyer_orders.quantity_kg
    const costPerKg = totalKg ? totalCost / totalKg : 0;
    const fleetActive = vehicles.filter((v) => v.active).length;
    const fleetInUse = vehicles.filter(
      (v) => v.current_status === "assigned" || v.current_status === "in_transit",
    ).length;
    const utilization = fleetActive ? Math.round((fleetInUse / fleetActive) * 100) : 0;

    const now = new Date();
    const licenseAlerts = drivers.filter((d) => {
      if (!d.active || !d.license_expiry) return false;
      const days = Math.floor((new Date(d.license_expiry).getTime() - now.getTime()) / 86_400_000);
      return days <= 30;
    }).length;

    return {
      kpis: {
        activeShipments: active,
        deliveredCount: delivered.length,
        onTimePct,
        totalLogisticsCost: Math.round(totalCost),
        costPerKg: Math.round(costPerKg * 100) / 100,
        fleetUtilizationPct: utilization,
        driversCount: drivers.filter((d) => d.active).length,
        licenseAlertsCount: licenseAlerts,
      },
    };
  });

export const getFleetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: vehicles }, { data: drivers }] = await Promise.all([
      sb.from("vehicles").select("*, carriers(name)").order("registration_no"),
      sb.from("drivers").select("*, carriers(name)").order("full_name"),
    ]);
    return { vehicles: (vehicles ?? []) as Row[], drivers: (drivers ?? []) as Row[] };
  });

/* ---------- Totals helper for financials integration ---------- */

export async function sumLogisticsCosts(sb: unknown): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = sb as any;
  const { data } = await c.from("logistics_cost_entries").select("amount");
  return (data ?? []).reduce((s: number, r: Row) => s + Number(r.amount ?? 0), 0);
}
