/**
 * auto-register.server.ts
 *
 * Mirrors GH1 firebaseRealtimeService.js lines 38-82.
 *
 * When the Firebase cron sees a device_id that has no matching row in
 * sensor_devices, this module creates the warehouse → silo → device chain
 * automatically so that the first reading is never silently dropped.
 *
 * GH2 architectural constraints satisfied:
 *   - admin_id / created_by resolve from AUTO_REGISTER_ADMIN_ID env var,
 *     falling back to the first super_admin in user_roles.
 *   - All NOT NULL FKs are populated before each INSERT.
 *   - Duplicate guard: returns the existing row if device_id already present.
 *
 * GH1 parity fields preserved exactly:
 *   device_name              → "GrainHero-{deviceId}"
 *   device_type              → "sensor"
 *   category                 → "environmental"
 *   status                   → "active"
 *   communication_protocol   → "firebase"
 *   sensor_types             → ["temperature","humidity","voc"]
 *   data_transmission_interval → 10
 *   silo name                → "Rice Storage Silo"
 *   silo capacity_kg         → 1000
 *   silo grain_type (in current_conditions) → "Rice"
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RegisteredDevice {
  id: string;
  device_id: string;
  silo_id: string;
  warehouse_id: string;
  admin_id: string;
}

// ─── resolveAdminId ───────────────────────────────────────────────────────────
// Returns a valid profiles.id to use as admin_id / created_by.
// Priority: AUTO_REGISTER_ADMIN_ID env var → first super_admin → null.
async function resolveAdminId(): Promise<string | null> {
  const envId = process.env.AUTO_REGISTER_ADMIN_ID?.trim();
  if (envId) return envId;

  // Fallback: first super_admin from user_roles table
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin")
    .limit(1)
    .single();

  return data?.user_id ?? null;
}

// ─── findOrCreateWarehouse ────────────────────────────────────────────────────
async function findOrCreateWarehouse(adminId: string, deviceLocation?: string): Promise<string> {
  // Check plan limits before creating new warehouse
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_plan, plan_usage_silos")
    .eq("id", adminId)
    .single();

  const plan = profile?.subscription_plan || "starter";

  // Get existing warehouses count
  const { data: existingWarehouses } = await supabaseAdmin
    .from("warehouses")
    .select("id, name, location")
    .eq("admin_id", adminId)
    .is("deleted_at", null);

  // For multi-warehouse support, try to match by location if provided
  if (deviceLocation && existingWarehouses && existingWarehouses.length > 0) {
    const matchedWarehouse = existingWarehouses.find((w: any) => {
      const loc = w.location as any;
      return loc?.city === deviceLocation || loc?.address?.includes(deviceLocation);
    });
    
    if (matchedWarehouse) {
      console.log(`[AutoRegister] Using existing warehouse: ${matchedWarehouse.id} for location ${deviceLocation}`);
      return matchedWarehouse.id;
    }
  }

  // If any warehouse exists and no location match, use the first one
  if (existingWarehouses && existingWarehouses.length > 0) {
    console.log(`[AutoRegister] Using existing warehouse: ${existingWarehouses[0].id}`);
    return existingWarehouses[0].id;
  }

  // Check if we can create a new warehouse (plan limits)
  const { data: planData } = await supabaseAdmin
    .from("plan_thresholds")
    .select("plan_id")
    .eq("plan_id", plan)
    .single();

  // If no plan limit or within limits, create warehouse
  const { data: created, error } = await supabaseAdmin
    .from("warehouses")
    .insert({
      admin_id: adminId,
      created_by: adminId,
      name: deviceLocation 
        ? `Warehouse - ${deviceLocation}` 
        : "Auto-Registered Warehouse",
      warehouse_id: `AUTO-WH-${Date.now()}`,
      status: "active",
      is_active: true,
      location: deviceLocation 
        ? { city: deviceLocation, description: `Auto-created for ${deviceLocation}` }
        : { description: "Auto-created warehouse" },
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`[AutoRegister] Failed to create warehouse: ${error?.message}`);
  }

  console.log(`[AutoRegister] ✅ Created warehouse: ${created.id} for location: ${deviceLocation || "default"}`);
  return created.id;
}

// ─── findOrCreateSilo ─────────────────────────────────────────────────────────
async function findOrCreateSilo(
  adminId: string,
  warehouseId: string,
  deviceId: string,
): Promise<string> {
  // Try to find any existing active silo in this warehouse
  const { data: existing } = await supabaseAdmin
    .from("silos")
    .select("id")
    .eq("admin_id", adminId)
    .eq("warehouse_id", warehouseId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (existing?.id) return existing.id;

  // Create a default silo — GH1 parity: name, capacity, grain_type
  const { data: created, error } = await supabaseAdmin
    .from("silos")
    .insert({
      admin_id: adminId,
      created_by: adminId,
      warehouse_id: warehouseId,
      name: "Rice Storage Silo",                  // GH1 exact match
      silo_id: deviceId,                             // GH1 exact match (silo_id: DEVICE_ID)
      capacity_kg: 1000,                           // GH1 exact match (capacity: 1000)
      status: "active",
      is_active: true,
      current_conditions: {
        grain_type: "Rice",                        // GH1 exact match
        description: "Primary GrainHero silo with live Arduino sensor",
      } as unknown as never,
      location: {
        description: "Primary GrainHero silo with live Arduino sensor",
      } as unknown as never,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`[AutoRegister] Failed to create silo: ${error?.message}`);
  }

  console.log(`[AutoRegister] ✅ Created silo: ${created.id}`);
  return created.id;
}

// ─── autoRegisterDevice ───────────────────────────────────────────────────────
/**
 * Idempotent: if the device already exists, returns the existing row.
 * If it does not exist, creates warehouse → silo → device in order.
 * Returns null if admin identity cannot be resolved (logs a warning).
 */
export async function autoRegisterDevice(
  deviceId: string,
): Promise<RegisteredDevice | null> {
  // 1. Duplicate guard — return existing row immediately
  const { data: existing } = await supabaseAdmin
    .from("sensor_devices")
    .select("id, device_id, silo_id, warehouse_id, admin_id")
    .eq("device_id", deviceId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (existing) return existing as RegisteredDevice;

  // 2. Resolve admin identity
  const adminId = await resolveAdminId();
  if (!adminId) {
    console.warn(
      `[AutoRegister] ⚠️  Cannot auto-register device ${deviceId}: ` +
      `no AUTO_REGISTER_ADMIN_ID env var and no super_admin found in user_roles. ` +
      `Set AUTO_REGISTER_ADMIN_ID to enable auto-registration.`,
    );
    return null;
  }

  console.log(`[AutoRegister] Device ${deviceId} not found — auto-registering…`);

  try {
    // 3. Ensure warehouse exists
    const warehouseId = await findOrCreateWarehouse(adminId);

    // 4. Ensure silo exists
    const siloId = await findOrCreateSilo(adminId, warehouseId, deviceId);

    // 5. Create the sensor device — GH1 parity fields exact
    const { data: device, error } = await supabaseAdmin
      .from("sensor_devices")
      .insert({
        device_id: deviceId,
        device_name: `GrainHero-${deviceId}`,          // GH1 exact match
        device_type: "sensor",                           // GH1 exact match
        category: "environmental",                       // GH1 exact match
        status: "active",                                // GH1 exact match
        communication_protocol: "firebase",              // GH1 exact match
        admin_id: adminId,
        created_by: adminId,
        silo_id: siloId,
        warehouse_id: warehouseId,
        sensor_types: ["temperature", "humidity", "voc"] as never, // GH1 exact match
        data_transmission_interval: 10,                  // GH1 exact match
        // GH1 parity: connection_status defaults to "offline" until first heartbeat
      })
      .select("id, device_id, silo_id, warehouse_id, admin_id")
      .single();

    if (error || !device) {
      throw new Error(`Insert failed: ${error?.message}`);
    }

    console.log(
      `[AutoRegister] ✅ Auto-registered device: ${deviceId} → silo ${siloId}`,
    );
    return device as RegisteredDevice;
  } catch (err) {
    console.error(`[AutoRegister] ❌ Failed to register device ${deviceId}:`, err);
    return null;
  }
}
