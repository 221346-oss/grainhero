import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { assertPlanAllows } from "@/lib/plan-gate";

// Turn ZodError into a readable one-liner so the client toast is helpful.
function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const msg = r.error.issues
    .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
    .join(" · ");
  throw new Error(msg);
}

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("warehouses")
      .select("*, silos:silos(id)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const warehouseInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  warehouse_id: z.string().min(1).max(50),
  location_description: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  total_capacity_kg: z.number().nonnegative().optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(warehouseInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_warehouses", sb: context.supabase, userId: context.userId });
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    // Managers/technicians have profiles.admin_id set to their tenant admin; admins have it null.
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const location = {
      description: data.location_description ?? null,
      address: data.address ?? null,
    };
    const payload = {
      name: data.name,
      warehouse_id: data.warehouse_id,
      location,
      total_capacity_kg: data.total_capacity_kg ?? null,
      status: data.status,
      notes: data.notes ?? null,
      admin_id: tenantAdminId,
      created_by: context.userId,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("warehouses")
        .update({ ...payload, updated_by: context.userId })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("warehouses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listSilos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("silos")
      .select("*, warehouses(id, name, warehouse_id), current_batch:grain_batches!fk_silos_current_batch(id, batch_id, grain_type)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const siloInput = z.object({
  id: z.string().uuid().optional(),
  silo_id: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  warehouse_id: z.string().uuid(),
  capacity_kg: z.number().positive(),
  location_description: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(siloInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_silos", sb: context.supabase, userId: context.userId });
    }
    const location = { description: data.location_description ?? null };
    if (data.id) {
      // Update: don't touch silo_id or name (immutable per original app)
      const { data: row, error } = await context.supabase
        .from("silos")
        .update({
          warehouse_id: data.warehouse_id,
          capacity_kg: data.capacity_kg,
          location,
          status: data.status,
          notes: data.notes ?? null,
          updated_by: context.userId,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    // Insert: auto-generate silo_id and name if not provided
    const siloId = data.silo_id ?? `SILO-${Date.now().toString().slice(-8)}`;
    const name = data.name ?? `Silo ${siloId.slice(-4)}`;
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data: row, error } = await context.supabase
      .from("silos")
      .insert({
        silo_id: siloId,
        name,
        warehouse_id: data.warehouse_id,
        capacity_kg: data.capacity_kg,
        location,
        status: data.status,
        notes: data.notes ?? null,
        admin_id: tenantAdminId,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { count, error: countError } = await context.supabase
      .from("grain_batches")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", data.id)
      .in("status", ["stored", "on_hold", "processing", "damaged", "expired"]);
      
    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error("Cannot delete silo: it contains active grain batches. Dispatch or reassign them first.");
    }

    const { error } = await context.supabase.from("silos").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listGrainBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_batches")
      .select("*, silos:silo_id(id, silo_id, name, capacity_kg, warehouse_id), warehouses:warehouse_id(id, name, warehouse_id), buyers:buyer_id(id, name, company_name, contact_phone)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const grainTypes = ["Wheat","Rice","Maize","Corn","Barley","Sorghum"] as const;
const batchStatuses = ["stored","dispatched","sold","damaged","expired","on_hold","processing"] as const;

const batchInput = z.object({
  id: z.string().uuid().optional(),
  batch_id: z.string().min(1).max(50).optional(),
  grain_type: z.enum(grainTypes),
  variety: z.string().max(100).optional().nullable(),
  grade: z.string().max(50).optional().nullable(),
  quantity_kg: z.number().positive(),
  silo_id: z.string().uuid(),
  moisture_content: z.number().min(0).max(100).optional().nullable(),
  protein_content: z.number().min(0).max(100).optional().nullable(),
  test_weight: z.number().nonnegative().optional().nullable(),
  farmer_name: z.string().max(200).optional().nullable(),
  farmer_contact: z.string().max(50).optional().nullable(),
  source_location: z.string().max(500).optional().nullable(),
  harvest_date: z.string().optional().nullable(),
  expected_dispatch_date: z.string().optional().nullable(),
  purchase_price_per_kg: z.number().nonnegative().optional().nullable(),
  intake_temperature: z.number().optional().nullable(),
  intake_humidity: z.number().optional().nullable(),
  status: z.enum(batchStatuses).optional(),
  notes: z.string().max(2000).optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  source_kind: z.enum(["external","own_farm","internal_transfer","anonymous"]).optional().nullable(),
  unit_cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
});

export const upsertGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(batchInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_batches", sb: context.supabase, userId: context.userId });
    }
    // resolve warehouse from silo
    const { data: silo, error: siloErr } = await context.supabase
      .from("silos").select("id, warehouse_id, capacity_kg, current_occupancy_kg").eq("id", data.silo_id).single();
    if (siloErr) throw siloErr;
    if (!silo?.warehouse_id) throw new Error("Silo has no warehouse");

    const intake_conditions = (data.intake_temperature != null || data.intake_humidity != null) ? {
      temperature: data.intake_temperature ?? null,
      humidity: data.intake_humidity ?? null,
    } : null;

    const total_purchase_value = data.purchase_price_per_kg != null
      ? Number((data.purchase_price_per_kg * data.quantity_kg).toFixed(2))
      : null;

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("grain_batches")
        .update({
          grain_type: data.grain_type,
          variety: data.variety ?? null,
          grade: data.grade ?? "Standard",
          quantity_kg: data.quantity_kg,
          silo_id: data.silo_id,
          warehouse_id: silo.warehouse_id,
          moisture_content: data.moisture_content ?? null,
          protein_content: data.protein_content ?? null,
          test_weight: data.test_weight ?? null,
          farmer_name: data.farmer_name ?? null,
          farmer_contact: data.farmer_contact ?? null,
          source_location: data.source_location ?? null,
          harvest_date: data.harvest_date || null,
          expected_dispatch_date: data.expected_dispatch_date || null,
          purchase_price_per_kg: data.purchase_price_per_kg ?? null,
          total_purchase_value,
          intake_conditions,
          status: data.status ?? "stored",
          notes: data.notes ?? null,
          updated_by: context.userId,
          supplier_id: data.supplier_id ?? null,
          source_kind: data.source_kind ?? null,
          unit_cost: data.unit_cost ?? data.purchase_price_per_kg ?? null,
          currency: data.currency ?? "PKR",
        })
        .eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }

    const batchId = data.batch_id ?? `${data.grain_type.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const qrPayload = `GH-${batchId}-${Date.now()}`;
    const { data: row, error } = await context.supabase
      .from("grain_batches")
      .insert({
        batch_id: batchId,
        qr_code: qrPayload,
        admin_id: context.userId,
        silo_id: data.silo_id,
        warehouse_id: silo.warehouse_id,
        grain_type: data.grain_type,
        variety: data.variety ?? null,
        grade: data.grade ?? "Standard",
        quantity_kg: data.quantity_kg,
        moisture_content: data.moisture_content ?? null,
        protein_content: data.protein_content ?? null,
        test_weight: data.test_weight ?? null,
        farmer_name: data.farmer_name ?? null,
        farmer_contact: data.farmer_contact ?? null,
        source_location: data.source_location ?? null,
        harvest_date: data.harvest_date || null,
        expected_dispatch_date: data.expected_dispatch_date || null,
        purchase_price_per_kg: data.purchase_price_per_kg ?? null,
        total_purchase_value,
        intake_conditions,
        status: data.status ?? "stored",
        notes: data.notes ?? null,
        created_by: context.userId,
        supplier_id: data.supplier_id ?? null,
        source_kind: data.source_kind ?? null,
        unit_cost: data.unit_cost ?? data.purchase_price_per_kg ?? null,
        currency: data.currency ?? "PKR",
      })
      .select("*").single();
    if (error) throw error;

    // update silo occupancy and current_batch link
    await context.supabase.from("silos").update({
      current_occupancy_kg: (silo.current_occupancy_kg ?? 0) + data.quantity_kg,
      current_batch_id: row.id,
      batch_loaded_date: new Date().toISOString(),
      batch_dispatched_date: null,
      updated_by: context.userId,
    }).eq("id", data.silo_id);

    return row;
  });

export const deleteGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // free up silo if this was the current batch
    const { data: batch } = await context.supabase
      .from("grain_batches").select("silo_id, quantity_kg, dispatched_quantity_kg").eq("id", data.id).single();
    const { error } = await context.supabase.from("grain_batches").delete().eq("id", data.id);
    if (error) throw error;
    if (batch?.silo_id) {
      const { data: silo } = await context.supabase.from("silos").select("id, current_batch_id, current_occupancy_kg").eq("id", batch.silo_id).single();
      const remaining = Math.max(0, (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg ?? 0));
      const patch: { current_occupancy_kg: number; updated_by: string; current_batch_id?: string | null } = { current_occupancy_kg: remaining, updated_by: context.userId };
      if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
      await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
    }
    return { ok: true };
  });

const dispatchInput = z.object({
  id: z.string().uuid(),
  buyer_id: z.string().uuid().optional().nullable(),
  new_buyer: z.object({
    name: z.string().min(1),
    contact_phone: z.string().optional().nullable(),
    contact_email: z.string().optional().nullable(),
  }).optional().nullable(),
  sell_price_per_kg: z.number().positive(),
  dispatched_quantity_kg: z.number().positive(),
  vehicle_number: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  driver_contact: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const dispatchGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(dispatchInput, d))
  .handler(async ({ data, context }) => {
    let buyerId = data.buyer_id ?? null;
    if (!buyerId && data.new_buyer?.name) {
      await assertPlanAllows({ feature: "max_buyers", sb: context.supabase, userId: context.userId });
      const { data: b, error: bErr } = await context.supabase.from("buyers").insert({
        admin_id: context.userId,
        name: data.new_buyer.name,
        contact_name: data.new_buyer.name,
        contact_phone: data.new_buyer.contact_phone ?? null,
        contact_email: data.new_buyer.contact_email ?? null,
        buyer_type: "retailer",
        status: "active",
      }).select("id").single();
      if (bErr) throw bErr;
      buyerId = b.id;
    }
    if (!buyerId) throw new Error("Buyer required");

    const { data: batch, error: getErr } = await context.supabase
      .from("grain_batches").select("id, quantity_kg, dispatched_quantity_kg, purchase_price_per_kg, silo_id").eq("id", data.id).single();
    if (getErr) throw getErr;

    const alreadyDispatched = Number(batch.dispatched_quantity_kg ?? 0);
    const newDispatched = alreadyDispatched + data.dispatched_quantity_kg;
    const isFull = newDispatched >= Number(batch.quantity_kg);
    const revenue = Number((data.sell_price_per_kg * data.dispatched_quantity_kg).toFixed(2));
    const cost = batch.purchase_price_per_kg ? Number((Number(batch.purchase_price_per_kg) * data.dispatched_quantity_kg).toFixed(2)) : 0;
    const profit = Number((revenue - cost).toFixed(2));

    const dispatch_details = {
      buyer_id: buyerId,
      vehicle_number: data.vehicle_number ?? null,
      driver_name: data.driver_name ?? null,
      driver_contact: data.driver_contact ?? null,
      destination: data.destination ?? null,
      notes: data.notes ?? null,
      quantity: data.dispatched_quantity_kg,
      dispatched_at: new Date().toISOString(),
    };

    const { data: row, error } = await context.supabase.from("grain_batches").update({
      buyer_id: buyerId,
      sell_price_per_kg: data.sell_price_per_kg,
      dispatched_quantity_kg: newDispatched,
      revenue,
      profit,
      status: isFull ? "dispatched" : "processing",
      actual_dispatch_date: new Date().toISOString(),
      dispatch_details,
      updated_by: context.userId,
    }).eq("id", data.id).select("*").single();
    if (error) throw error;

    if (isFull && batch.silo_id) {
      const { data: silo } = await context.supabase.from("silos").select("id, current_batch_id, current_occupancy_kg").eq("id", batch.silo_id).single();
      const remaining = Math.max(0, (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg));
      const patch: { current_occupancy_kg: number; batch_dispatched_date: string; updated_by: string; current_batch_id?: string | null } = {
        current_occupancy_kg: remaining,
        batch_dispatched_date: new Date().toISOString(),
        updated_by: context.userId,
      };
      if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
      await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
    }

    return row;
  });

const spoilageInput = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  severity: z.enum(["low","medium","high","critical"]),
  description: z.string().optional().nullable(),
  estimated_loss_kg: z.number().nonnegative().optional().nullable(),
  temperature: z.number().optional().nullable(),
  humidity: z.number().optional().nullable(),
  action_taken: z.string().optional().nullable(),
});

export const logSpoilageEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(spoilageInput, d))
  .handler(async ({ data, context }) => {
    const { data: batch, error: getErr } = await context.supabase
      .from("grain_batches").select("spoilage_events, spoilage_label, risk_score").eq("id", data.id).single();
    if (getErr) throw getErr;
    const events = Array.isArray(batch.spoilage_events) ? batch.spoilage_events : [];
    const event = {
      event_id: `SP-${Date.now()}`,
      type: data.type,
      severity: data.severity,
      description: data.description ?? null,
      estimated_loss_kg: data.estimated_loss_kg ?? 0,
      environmental_conditions: {
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
      },
      action_taken: data.action_taken ?? null,
      logged_by: context.userId,
      logged_at: new Date().toISOString(),
    };
    const newEvents = [...events, event];
    const label = data.severity === "critical" ? "Spoiled" : data.severity === "high" ? "Risky" : batch.spoilage_label ?? "Safe";
    const riskBump = { low: 5, medium: 20, high: 45, critical: 80 }[data.severity];
    const newRisk = Math.min(100, Number(batch.risk_score ?? 0) + riskBump);
    const { data: row, error } = await context.supabase.from("grain_batches").update({
      spoilage_events: newEvents,
      spoilage_label: label,
      risk_score: newRisk,
      last_risk_assessment: new Date().toISOString(),
      updated_by: context.userId,
    }).eq("id", data.id).select("*").single();
    if (error) throw error;
    return row;
  });

export const listSensorDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sensor_devices")
      .select("*, silos:silo_id(id, silo_id, name), warehouses:warehouse_id(id, name, warehouse_id)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const sensorTypeEnum = z.enum(["co2","humidity","light","moisture","ph","pressure","temperature","voc"]);
const sensorInput = z.object({
  id: z.string().uuid().optional(),
  device_id: z.string().min(1).max(80).optional(),
  device_name: z.string().min(1).max(200),
  mac_address: z.string().max(80).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  firmware_version: z.string().max(50).optional().nullable(),
  device_type: z.string().max(50).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  sensor_types: z.array(sensorTypeEnum).optional().nullable(),
  warehouse_id: z.string().uuid(),
  silo_id: z.string().uuid(),
  status: z.enum(["active","offline","error","maintenance"]).default("active"),
  power_source: z.enum(["solar","battery","direct","hybrid"]).optional().nullable(),
  data_transmission_interval: z.number().int().positive().optional().nullable(),
  calibration_interval_days: z.number().int().positive().optional().nullable(),
  last_calibration_date: z.string().optional().nullable(),
  is_enabled: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertSensorDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(sensorInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_sensors", sb: context.supabase, userId: context.userId });
    }
    const base = {
      device_name: data.device_name,
      mac_address: data.mac_address ?? null,
      model: data.model ?? null,
      manufacturer: data.manufacturer ?? null,
      firmware_version: data.firmware_version ?? null,
      device_type: data.device_type ?? "environmental",
      category: data.category ?? "environmental",
      sensor_types: data.sensor_types ?? [],
      warehouse_id: data.warehouse_id,
      silo_id: data.silo_id,
      status: data.status,
      power_source: data.power_source ?? null,
      data_transmission_interval: data.data_transmission_interval ?? 60,
      calibration_interval_days: data.calibration_interval_days ?? 365,
      last_calibration_date: data.last_calibration_date || null,
      is_enabled: data.is_enabled ?? true,
      notes: data.notes ?? null,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("sensor_devices").update(base).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const deviceId = data.device_id ?? `DEV-${Date.now().toString().slice(-8)}`;
    const { data: row, error } = await context.supabase.from("sensor_devices").insert({
      ...base,
      device_id: deviceId,
      admin_id: context.userId,
      created_by: context.userId,
    }).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteSensorDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sensor_devices").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Latest reading per device (used to power live tiles)
type LatestReading = {
  id: string; device_id: string; reading_timestamp: string;
  temperature_value: number | null; humidity_value: number | null;
  co2_value: number | null; voc_value: number | null;
  moisture_value: number | null; pressure_value: number | null;
  ml_risk_class: string | null; ml_risk_score: number | null;
  anomaly_detected: boolean | null;
  battery_level: number | null; signal_strength: number | null;
};
export const listLatestSensorReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LatestReading[]> => {
    const { data, error } = await context.supabase
      .from("sensor_readings")
      .select("id, device_id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, pressure_value, ml_risk_class, ml_risk_score, anomaly_detected, battery_level, signal_strength")
      .order("reading_timestamp", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as LatestReading[];
    const map = new Map<string, LatestReading>();
    for (const r of rows) if (!map.has(r.device_id)) map.set(r.device_id, r);
    return Array.from(map.values());
  });

// Recent readings for a single device (history)
export const listDeviceReadings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ device_id: z.string().uuid(), limit: z.number().int().max(500).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sensor_readings")
      .select("id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, ml_risk_class, ml_risk_score, anomaly_detected")
      .eq("device_id", data.device_id)
      .order("reading_timestamp", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const listActuators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("actuators")
      .select("*, silos(id, silo_id, name, warehouse_id, warehouses(id, name, warehouse_id))")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const actuatorInput = z.object({
  id: z.string().uuid().optional(),
  actuator_id: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  actuator_type: z.enum(["fan", "vent", "heater", "cooler", "alarm", "light"]),
  silo_id: z.string().uuid(),
  manufacturer: z.string().max(200).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
  mac_address: z.string().max(80).optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  control_mode: z.enum(["auto", "manual", "failsafe"]).default("auto"),
  is_enabled: z.boolean().default(true),
  power_level: z.number().min(0).max(100).optional().nullable(),
  target_fan_speed: z.number().min(0).max(100).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(actuatorInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_actuators", sb: context.supabase, userId: context.userId });
    }
    const payload = {
      actuator_id: data.actuator_id,
      name: data.name,
      actuator_type: data.actuator_type,
      silo_id: data.silo_id,
      manufacturer: data.manufacturer ?? null,
      model: data.model ?? null,
      mac_address: data.mac_address ?? null,
      status: data.status,
      control_mode: data.control_mode,
      is_enabled: data.is_enabled,
      power_level: data.power_level ?? null,
      target_fan_speed: data.target_fan_speed ?? null,
      tags: data.tags ?? null,
      notes: data.notes ?? null,
      admin_id: context.userId,
      created_by: context.userId,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("actuators")
        .update({ ...payload, updated_by: context.userId })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("actuators")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("actuators").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const controlInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["turn_on", "turn_off", "set_value", "auto", "manual", "emergency_stop"]),
  value: z.number().min(0).max(100).optional(),
});

export const controlActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(controlInput, d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["actuators"]["Update"] = { updated_by: context.userId };
    if (data.action === "turn_on") {
      patch.is_on = true;
      patch.status = "active";
      patch.control_mode = "manual";
      patch.human_requested_fan = true;
      if (typeof data.value === "number") patch.power_level = data.value;
      patch.current_operation = { action: "turn_on", value: data.value ?? null, at: now, by: context.userId };
    } else if (data.action === "turn_off") {
      patch.is_on = false;
      patch.control_mode = "manual";
      patch.human_requested_fan = false;
      patch.power_level = 0;
      patch.current_operation = { action: "turn_off", at: now, by: context.userId };
    } else if (data.action === "set_value") {
      patch.power_level = data.value ?? 0;
      patch.target_fan_speed = data.value ?? 0;
      patch.control_mode = "manual";
      patch.current_operation = { action: "set_value", value: data.value ?? 0, at: now, by: context.userId };
    } else if (data.action === "auto") {
      patch.control_mode = "auto";
      patch.human_requested_fan = false;
      patch.current_operation = { action: "auto", at: now, by: context.userId };
    } else if (data.action === "manual") {
      patch.control_mode = "manual";
      patch.current_operation = { action: "manual", at: now, by: context.userId };
    } else if (data.action === "emergency_stop") {
      patch.is_on = false;
      patch.power_level = 0;
      patch.status = "maintenance";
      patch.control_mode = "manual";
      patch.human_requested_fan = false;
      patch.current_operation = { action: "emergency_stop", at: now, by: context.userId };
    }
    const { data: actRow, error: actError } = await context.supabase
      .from("actuators")
      .select("actuator_id")
      .eq("id", data.id)
      .single();
    if (actError) throw actError;

    // Bridge: publish command to Firebase RTDB (blocking - will throw if offline/fails)
    const { publishActuatorCommand } = await import("./actuator-bridge.server");
    await publishActuatorCommand(actRow.actuator_id, {
      action: data.action,
      value: data.value ?? null,
      by: context.userId,
      at: now,
    });

    const { data: row, error } = await context.supabase
      .from("actuators")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;

    return row;
  });

export const listGrainAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("*, silos(id, silo_id, name), warehouses(id, name, warehouse_id), grain_batches(id, batch_id, grain_type)")
      .order("triggered_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const alertInput = z.object({
  id: z.string().uuid().optional(),
  alert_id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "acknowledged", "resolved", "escalated"]).default("pending"),
  source: z.string().min(1).max(80),
  alert_type: z.string().max(80).optional().nullable(),
  silo_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  batch_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const upsertGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(alertInput, d))
  .handler(async ({ data, context }) => {
    const payload = {
      alert_id: data.alert_id,
      title: data.title,
      message: data.message,
      priority: data.priority,
      status: data.status,
      source: data.source,
      alert_type: data.alert_type ?? null,
      silo_id: data.silo_id ?? null,
      warehouse_id: data.warehouse_id ?? null,
      batch_id: data.batch_id ?? null,
      tags: data.tags ?? null,
      admin_id: context.userId,
      created_by: context.userId,
      triggered_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("grain_alerts")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("grain_alerts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const alertActionInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["acknowledge", "resolve", "escalate", "reopen"]),
  notes: z.string().max(2000).optional(),
  resolution_type: z.string().max(80).optional(),
  escalated_to: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
});

export const actionGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(alertActionInput, d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["grain_alerts"]["Update"] = {};
    if (data.action === "acknowledge") {
      patch.status = "acknowledged";
      patch.acknowledged_at = now;
      patch.acknowledged_by = context.userId;
    } else if (data.action === "resolve") {
      patch.status = "resolved";
      patch.resolved_at = now;
      patch.resolved_by = context.userId;
      patch.resolution = {
        type: data.resolution_type ?? "manual",
        notes: data.notes ?? null,
        at: now,
        by: context.userId,
      };
    } else if (data.action === "escalate") {
      const { data: current } = await context.supabase
        .from("grain_alerts")
        .select("escalation_level, escalation_history")
        .eq("id", data.id)
        .single();
      const level = (current?.escalation_level ?? 0) + 1;
      const history = Array.isArray(current?.escalation_history) ? current!.escalation_history : [];
      patch.status = "escalated";
      patch.escalation_level = level;
      patch.escalation_history = [
        ...history,
        {
          level,
          escalated_to: data.escalated_to ?? null,
          escalated_by: context.userId,
          escalated_at: now,
          reason: data.reason ?? null,
        },
      ] as unknown as Database["public"]["Tables"]["grain_alerts"]["Update"]["escalation_history"];
    } else if (data.action === "reopen") {
      patch.status = "pending";
      patch.resolved_at = null;
      patch.resolved_by = null;
    }
    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("buyers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const buyerInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Buyer name is required").max(200),
  contact_name: z.string().min(1, "Contact name is required").max(200),
  contact_email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_designation: z.string().max(120).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  buyer_type: z.enum(["local_mill","exporter","wholesaler","retailer","government"]).optional().nullable(),
  status: z.enum(["active","paused","inactive"]).default("active"),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  preferred_grain_types: z.array(z.enum(["Wheat","Rice","Maize","Corn","Barley","Sorghum"])).optional().nullable(),
  preferred_payment_terms: z.string().max(120).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(buyerInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({ feature: "max_buyers", sb: context.supabase, userId: context.userId });
    }
    const payload = {
      name: data.name,
      contact_name: data.contact_name,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone ?? null,
      contact_designation: data.contact_designation ?? null,
      company_name: data.company_name ?? null,
      buyer_type: data.buyer_type ?? null,
      status: data.status,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      preferred_grain_types: data.preferred_grain_types ?? null,
      preferred_payment_terms: data.preferred_payment_terms ?? null,
      rating: data.rating ?? null,
      tags: data.tags ?? null,
      notes: data.notes ?? null,
      admin_id: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("buyers")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("buyers")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Dashboard aggregate counts used by role dashboards
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [warehouses, silos, batches, sensors, actuators, alerts, buyers] = await Promise.all([
      context.supabase.from("warehouses").select("id", { count: "exact", head: true }),
      context.supabase.from("silos").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_batches").select("id, status", { count: "exact" }).limit(1000),
      context.supabase.from("sensor_devices").select("id, status", { count: "exact" }).limit(1000),
      context.supabase.from("actuators").select("id, status", { count: "exact" }).limit(1000),
      context.supabase.from("grain_alerts").select("id, status, alert_type", { count: "exact" }).limit(1000),
      context.supabase.from("buyers").select("id", { count: "exact", head: true }),
    ]);
    const batchesData = (batches.data ?? []) as Array<{ status: string | null }>;
    const sensorsData = (sensors.data ?? []) as Array<{ status: string | null }>;
    const actuatorsData = (actuators.data ?? []) as Array<{ status: string | null }>;
    const alertsData = (alerts.data ?? []) as Array<{ status: string | null; alert_type: string | null }>;
    return {
      warehouses: warehouses.count ?? 0,
      silos: silos.count ?? 0,
      buyers: buyers.count ?? 0,
      batches: {
        total: batches.count ?? 0,
        active: batchesData.filter((b) => b.status === "stored" || b.status === "processing").length,
      },
      sensors: {
        total: sensors.count ?? 0,
        online: sensorsData.filter((s) => s.status === "active").length,
      },
      actuators: {
        total: actuators.count ?? 0,
        active: actuatorsData.filter((a) => a.status === "active").length,
      },
      alerts: {
        total: alerts.count ?? 0,
        open: alertsData.filter((a) => a.status === "open" || a.status === "active").length,
        critical: alertsData.filter((a) => a.alert_type === "critical" || a.alert_type === "high").length,
      },
    };
  });

export const getSensorHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      device_uuid: z.string().uuid(),
      hours: z.number().int().positive().default(6),
      limit: z.number().int().max(1000).default(500),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const cutoff = new Date(Date.now() - data.hours * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("sensor_readings")
      .select("id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, dew_point, fan_state, lid_state, ml_risk_score, ml_risk_class, pressure_value, light_value, pest_presence_score")
      .eq("device_id", data.device_uuid)
      .gte("reading_timestamp", cutoff)
      .order("reading_timestamp", { ascending: true })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const exportSensorCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      device_id: z.string().uuid().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("sensor_readings")
      .select(`
        reading_timestamp,
        silo_id,
        batch_id,
        temperature_value,
        humidity_value,
        ambient_temperature,
        ambient_humidity,
        moisture_value,
        fan_state,
        fan_duty_cycle,
        voc_value,
        voc_relative,
        dew_point,
        ml_risk_class,
        silos:silo_id(silo_id),
        grain_batches:batch_id(batch_id)
      `)
      .order("reading_timestamp", { ascending: true })
      .limit(1000);

    if (data.device_id) {
      query = query.eq("device_id", data.device_id);
    }

    const { data: readings, error } = await query;
    if (error) throw error;

    const csvHeader = 'timestamp,silo_id,batch_id,T_core,RH_core,T_amb,RH_amb,Grain_Moisture,fan_state,fan_duty,VOC_index,VOC_relative,dew_point_core,rainfall_last_hour,spoilage_label\n';

    const csvRows = (readings ?? []).map((r: any) => {
      const siloId = r.silos?.silo_id ?? r.silo_id ?? '';
      const batchId = r.grain_batches?.batch_id ?? r.batch_id ?? '';
      return [
        r.reading_timestamp,
        siloId,
        batchId,
        r.temperature_value ?? '',
        r.humidity_value ?? '',
        r.ambient_temperature ?? '',
        r.ambient_humidity ?? '',
        r.moisture_value ?? '',
        r.fan_state ?? 0,
        r.fan_duty_cycle ?? 0,
        r.voc_value ?? '',
        r.voc_relative ?? '',
        r.dew_point ?? '',
        0, // rainfall_last_hour fallback
        r.ml_risk_class ?? 'unknown'
      ].join(',');
    });

    return { csv: csvHeader + csvRows.join('\n') };
  });