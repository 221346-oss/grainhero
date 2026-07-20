import { supabaseAdmin } from "./client.server-Bw6iWMJ-.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/auto-register.server-ITjP9oWH.js
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
async function resolveAdminId() {
	const envId = processModule.env.AUTO_REGISTER_ADMIN_ID?.trim();
	if (envId) return envId;
	const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "super_admin").limit(1).single();
	return data?.user_id ?? null;
}
async function findOrCreateWarehouse(adminId) {
	const { data: existing } = await supabaseAdmin.from("warehouses").select("id").eq("admin_id", adminId).is("deleted_at", null).limit(1).single();
	if (existing?.id) return existing.id;
	const { data: created, error } = await supabaseAdmin.from("warehouses").insert({
		admin_id: adminId,
		created_by: adminId,
		name: "Auto-Registered Warehouse",
		warehouse_id: `AUTO-WH-${Date.now()}`,
		status: "active",
		is_active: true
	}).select("id").single();
	if (error || !created) throw new Error(`[AutoRegister] Failed to create warehouse: ${error?.message}`);
	console.log(`[AutoRegister] ✅ Created warehouse: ${created.id}`);
	return created.id;
}
async function findOrCreateSilo(adminId, warehouseId, deviceId) {
	const { data: existing } = await supabaseAdmin.from("silos").select("id").eq("admin_id", adminId).eq("warehouse_id", warehouseId).is("deleted_at", null).limit(1).single();
	if (existing?.id) return existing.id;
	const { data: created, error } = await supabaseAdmin.from("silos").insert({
		admin_id: adminId,
		created_by: adminId,
		warehouse_id: warehouseId,
		name: "Rice Storage Silo",
		silo_id: deviceId,
		capacity_kg: 1e3,
		status: "active",
		is_active: true,
		current_conditions: {
			grain_type: "Rice",
			description: "Primary GrainHero silo with live Arduino sensor"
		},
		location: { description: "Primary GrainHero silo with live Arduino sensor" }
	}).select("id").single();
	if (error || !created) throw new Error(`[AutoRegister] Failed to create silo: ${error?.message}`);
	console.log(`[AutoRegister] ✅ Created silo: ${created.id}`);
	return created.id;
}
/**
* Idempotent: if the device already exists, returns the existing row.
* If it does not exist, creates warehouse → silo → device in order.
* Returns null if admin identity cannot be resolved (logs a warning).
*/
async function autoRegisterDevice(deviceId) {
	const { data: existing } = await supabaseAdmin.from("sensor_devices").select("id, device_id, silo_id, warehouse_id, admin_id").eq("device_id", deviceId).is("deleted_at", null).limit(1).single();
	if (existing) return existing;
	const adminId = await resolveAdminId();
	if (!adminId) {
		console.warn(`[AutoRegister] ⚠️  Cannot auto-register device ${deviceId}: no AUTO_REGISTER_ADMIN_ID env var and no super_admin found in user_roles. Set AUTO_REGISTER_ADMIN_ID to enable auto-registration.`);
		return null;
	}
	console.log(`[AutoRegister] Device ${deviceId} not found — auto-registering…`);
	try {
		const warehouseId = await findOrCreateWarehouse(adminId);
		const siloId = await findOrCreateSilo(adminId, warehouseId, deviceId);
		const { data: device, error } = await supabaseAdmin.from("sensor_devices").insert({
			device_id: deviceId,
			device_name: `GrainHero-${deviceId}`,
			device_type: "sensor",
			category: "environmental",
			status: "active",
			communication_protocol: "firebase",
			admin_id: adminId,
			created_by: adminId,
			silo_id: siloId,
			warehouse_id: warehouseId,
			sensor_types: [
				"temperature",
				"humidity",
				"voc"
			],
			data_transmission_interval: 10
		}).select("id, device_id, silo_id, warehouse_id, admin_id").single();
		if (error || !device) throw new Error(`Insert failed: ${error?.message}`);
		console.log(`[AutoRegister] ✅ Auto-registered device: ${deviceId} → silo ${siloId}`);
		return device;
	} catch (err) {
		console.error(`[AutoRegister] ❌ Failed to register device ${deviceId}:`, err);
		return null;
	}
}
//#endregion
export { autoRegisterDevice };
