import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
  .inputValidator((d: unknown) => warehouseInput.parse(d))
  .handler(async ({ data, context }) => {
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
      admin_id: context.userId,
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
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
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
  .inputValidator((d: unknown) => siloInput.parse(d))
  .handler(async ({ data, context }) => {
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
        admin_id: context.userId,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
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
});

export const upsertGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => batchInput.parse(d))
  .handler(async ({ data, context }) => {
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
        })
        .eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }

    const batchId = data.batch_id ?? `${data.grain_type.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const qrPayload = JSON.stringify({ batch_id: batchId, grain_type: data.grain_type, ts: Date.now() });
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
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
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
  .inputValidator((d: unknown) => dispatchInput.parse(d))
  .handler(async ({ data, context }) => {
    let buyerId = data.buyer_id ?? null;
    if (!buyerId && data.new_buyer?.name) {
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
  .inputValidator((d: unknown) => spoilageInput.parse(d))
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
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listActuators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("actuators")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listGrainAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
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