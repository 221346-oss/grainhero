import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { a as numberType, c as stringType, i as literalType, n as booleanType, o as objectType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/operations.functions-7BqYD--d.js
function parseOrThrow(schema, data) {
	const r = schema.safeParse(data);
	if (r.success) return r.data;
	const msg = r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · ");
	throw new Error(msg);
}
var listWarehouses_createServerFn_handler = createServerRpc({
	id: "aa3703d8b00119c6e6f9b50717a78b2f238601d6b09705a8205dbd11ff128a16",
	name: "listWarehouses",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listWarehouses.__executeServer(opts));
var listWarehouses = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listWarehouses_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("warehouses").select("*, silos:silos(id)").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var warehouseInput = objectType({
	id: stringType().uuid().optional(),
	name: stringType().min(1).max(200),
	warehouse_id: stringType().min(1).max(50),
	location_description: stringType().max(500).optional().nullable(),
	address: stringType().max(500).optional().nullable(),
	total_capacity_kg: numberType().nonnegative().optional().nullable(),
	status: enumType([
		"active",
		"offline",
		"error",
		"maintenance"
	]).default("active"),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertWarehouse_createServerFn_handler = createServerRpc({
	id: "7f8294486c1f817664790a4ad132269d7ae02aae1e9e7047c033a797a1b8f30b",
	name: "upsertWarehouse",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertWarehouse.__executeServer(opts));
var upsertWarehouse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(warehouseInput, d)).handler(upsertWarehouse_createServerFn_handler, async ({ data, context }) => {
	const location = {
		description: data.location_description ?? null,
		address: data.address ?? null
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
		updated_by: context.userId
	};
	if (data.id) {
		const { data: row, error } = await context.supabase.from("warehouses").update({
			...payload,
			updated_by: context.userId
		}).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const { data: row, error } = await context.supabase.from("warehouses").insert(payload).select("*").single();
	if (error) throw error;
	return row;
});
var deleteWarehouse_createServerFn_handler = createServerRpc({
	id: "e5da7d1943ed6f8e335b001b2a449016834c4e99b990479b14a8917a6e4f429a",
	name: "deleteWarehouse",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteWarehouse.__executeServer(opts));
var deleteWarehouse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteWarehouse_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("warehouses").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var listSilos_createServerFn_handler = createServerRpc({
	id: "4a2aca9cea4bab0fef9d4c1d94c92603460ac135d64e2ff0eab15a3e7e0d0110",
	name: "listSilos",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listSilos.__executeServer(opts));
var listSilos = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listSilos_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("silos").select("*, warehouses(id, name, warehouse_id), current_batch:grain_batches!fk_silos_current_batch(id, batch_id, grain_type)").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var siloInput = objectType({
	id: stringType().uuid().optional(),
	silo_id: stringType().min(1).max(50).optional(),
	name: stringType().min(1).max(200).optional(),
	warehouse_id: stringType().uuid(),
	capacity_kg: numberType().positive(),
	location_description: stringType().max(500).optional().nullable(),
	status: enumType([
		"active",
		"offline",
		"error",
		"maintenance"
	]).default("active"),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertSilo_createServerFn_handler = createServerRpc({
	id: "6fb2b017ac3e0ec11e29f26019f8430af70dc9f9440371282f6bbd68416da14d",
	name: "upsertSilo",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertSilo.__executeServer(opts));
var upsertSilo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(siloInput, d)).handler(upsertSilo_createServerFn_handler, async ({ data, context }) => {
	const location = { description: data.location_description ?? null };
	if (data.id) {
		const { data: row, error } = await context.supabase.from("silos").update({
			warehouse_id: data.warehouse_id,
			capacity_kg: data.capacity_kg,
			location,
			status: data.status,
			notes: data.notes ?? null,
			updated_by: context.userId
		}).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const siloId = data.silo_id ?? `SILO-${Date.now().toString().slice(-8)}`;
	const name = data.name ?? `Silo ${siloId.slice(-4)}`;
	const { data: row, error } = await context.supabase.from("silos").insert({
		silo_id: siloId,
		name,
		warehouse_id: data.warehouse_id,
		capacity_kg: data.capacity_kg,
		location,
		status: data.status,
		notes: data.notes ?? null,
		admin_id: context.userId,
		created_by: context.userId
	}).select("*").single();
	if (error) throw error;
	return row;
});
var deleteSilo_createServerFn_handler = createServerRpc({
	id: "acd829f6da9f9cbf57a5a5522f6293b63d06cc1eeb39782deed8fe3ac3eb5363",
	name: "deleteSilo",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteSilo.__executeServer(opts));
var deleteSilo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteSilo_createServerFn_handler, async ({ data, context }) => {
	const { count, error: countError } = await context.supabase.from("grain_batches").select("id", {
		count: "exact",
		head: true
	}).eq("silo_id", data.id).in("status", [
		"stored",
		"on_hold",
		"processing",
		"damaged",
		"expired"
	]);
	if (countError) throw countError;
	if (count && count > 0) throw new Error("Cannot delete silo: it contains active grain batches. Dispatch or reassign them first.");
	const { error } = await context.supabase.from("silos").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var listGrainBatches_createServerFn_handler = createServerRpc({
	id: "2bd64bd5bee395b355e9fb0abcdac15b62e2d594a32f6de45a485293d4e5e9bf",
	name: "listGrainBatches",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listGrainBatches.__executeServer(opts));
var listGrainBatches = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listGrainBatches_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("grain_batches").select("*, silos:silo_id(id, silo_id, name, capacity_kg, warehouse_id), warehouses:warehouse_id(id, name, warehouse_id), buyers:buyer_id(id, name, company_name, contact_phone)").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var batchInput = objectType({
	id: stringType().uuid().optional(),
	batch_id: stringType().min(1).max(50).optional(),
	grain_type: enumType([
		"Wheat",
		"Rice",
		"Maize",
		"Corn",
		"Barley",
		"Sorghum"
	]),
	variety: stringType().max(100).optional().nullable(),
	grade: stringType().max(50).optional().nullable(),
	quantity_kg: numberType().positive(),
	silo_id: stringType().uuid(),
	moisture_content: numberType().min(0).max(100).optional().nullable(),
	protein_content: numberType().min(0).max(100).optional().nullable(),
	test_weight: numberType().nonnegative().optional().nullable(),
	farmer_name: stringType().max(200).optional().nullable(),
	farmer_contact: stringType().max(50).optional().nullable(),
	source_location: stringType().max(500).optional().nullable(),
	harvest_date: stringType().optional().nullable(),
	expected_dispatch_date: stringType().optional().nullable(),
	purchase_price_per_kg: numberType().nonnegative().optional().nullable(),
	intake_temperature: numberType().optional().nullable(),
	intake_humidity: numberType().optional().nullable(),
	status: enumType([
		"stored",
		"dispatched",
		"sold",
		"damaged",
		"expired",
		"on_hold",
		"processing"
	]).optional(),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertGrainBatch_createServerFn_handler = createServerRpc({
	id: "5172cc3a7b6e92375887e03ad683bff9117602e73ed65796762f5c8814a06bdd",
	name: "upsertGrainBatch",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertGrainBatch.__executeServer(opts));
var upsertGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(batchInput, d)).handler(upsertGrainBatch_createServerFn_handler, async ({ data, context }) => {
	const { data: silo, error: siloErr } = await context.supabase.from("silos").select("id, warehouse_id, capacity_kg, current_occupancy_kg").eq("id", data.silo_id).single();
	if (siloErr) throw siloErr;
	if (!silo?.warehouse_id) throw new Error("Silo has no warehouse");
	const intake_conditions = data.intake_temperature != null || data.intake_humidity != null ? {
		temperature: data.intake_temperature ?? null,
		humidity: data.intake_humidity ?? null
	} : null;
	const total_purchase_value = data.purchase_price_per_kg != null ? Number((data.purchase_price_per_kg * data.quantity_kg).toFixed(2)) : null;
	if (data.id) {
		const { data: row, error } = await context.supabase.from("grain_batches").update({
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
			updated_by: context.userId
		}).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const batchId = data.batch_id ?? `${data.grain_type.slice(0, 3).toUpperCase()}-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-6)}`;
	const qrPayload = `GH-${batchId}-${Date.now()}`;
	const { data: row, error } = await context.supabase.from("grain_batches").insert({
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
		created_by: context.userId
	}).select("*").single();
	if (error) throw error;
	await context.supabase.from("silos").update({
		current_occupancy_kg: (silo.current_occupancy_kg ?? 0) + data.quantity_kg,
		current_batch_id: row.id,
		batch_loaded_date: (/* @__PURE__ */ new Date()).toISOString(),
		batch_dispatched_date: null,
		updated_by: context.userId
	}).eq("id", data.silo_id);
	return row;
});
var deleteGrainBatch_createServerFn_handler = createServerRpc({
	id: "481dc88375a2add4afb1f20d4041185e6568eeb6cb655ceda6c8b5d8646b626b",
	name: "deleteGrainBatch",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteGrainBatch.__executeServer(opts));
var deleteGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteGrainBatch_createServerFn_handler, async ({ data, context }) => {
	const { data: batch } = await context.supabase.from("grain_batches").select("silo_id, quantity_kg, dispatched_quantity_kg").eq("id", data.id).single();
	const { error } = await context.supabase.from("grain_batches").delete().eq("id", data.id);
	if (error) throw error;
	if (batch?.silo_id) {
		const { data: silo } = await context.supabase.from("silos").select("id, current_batch_id, current_occupancy_kg").eq("id", batch.silo_id).single();
		const patch = {
			current_occupancy_kg: Math.max(0, (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg ?? 0)),
			updated_by: context.userId
		};
		if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
		await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
	}
	return { ok: true };
});
var dispatchInput = objectType({
	id: stringType().uuid(),
	buyer_id: stringType().uuid().optional().nullable(),
	new_buyer: objectType({
		name: stringType().min(1),
		contact_phone: stringType().optional().nullable(),
		contact_email: stringType().optional().nullable()
	}).optional().nullable(),
	sell_price_per_kg: numberType().positive(),
	dispatched_quantity_kg: numberType().positive(),
	vehicle_number: stringType().optional().nullable(),
	driver_name: stringType().optional().nullable(),
	driver_contact: stringType().optional().nullable(),
	destination: stringType().optional().nullable(),
	notes: stringType().optional().nullable()
});
var dispatchGrainBatch_createServerFn_handler = createServerRpc({
	id: "8ff178ce4cf541ca5be554842595687b66678cfe38e29ee7f5ca31e26bc82b0c",
	name: "dispatchGrainBatch",
	filename: "src/lib/operations.functions.ts"
}, (opts) => dispatchGrainBatch.__executeServer(opts));
var dispatchGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(dispatchInput, d)).handler(dispatchGrainBatch_createServerFn_handler, async ({ data, context }) => {
	let buyerId = data.buyer_id ?? null;
	if (!buyerId && data.new_buyer?.name) {
		const { data: b, error: bErr } = await context.supabase.from("buyers").insert({
			admin_id: context.userId,
			name: data.new_buyer.name,
			contact_name: data.new_buyer.name,
			contact_phone: data.new_buyer.contact_phone ?? null,
			contact_email: data.new_buyer.contact_email ?? null,
			buyer_type: "retailer",
			status: "active"
		}).select("id").single();
		if (bErr) throw bErr;
		buyerId = b.id;
	}
	if (!buyerId) throw new Error("Buyer required");
	const { data: batch, error: getErr } = await context.supabase.from("grain_batches").select("id, quantity_kg, dispatched_quantity_kg, purchase_price_per_kg, silo_id").eq("id", data.id).single();
	if (getErr) throw getErr;
	const newDispatched = Number(batch.dispatched_quantity_kg ?? 0) + data.dispatched_quantity_kg;
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
		dispatched_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	const { data: row, error } = await context.supabase.from("grain_batches").update({
		buyer_id: buyerId,
		sell_price_per_kg: data.sell_price_per_kg,
		dispatched_quantity_kg: newDispatched,
		revenue,
		profit,
		status: isFull ? "dispatched" : "processing",
		actual_dispatch_date: (/* @__PURE__ */ new Date()).toISOString(),
		dispatch_details,
		updated_by: context.userId
	}).eq("id", data.id).select("*").single();
	if (error) throw error;
	if (isFull && batch.silo_id) {
		const { data: silo } = await context.supabase.from("silos").select("id, current_batch_id, current_occupancy_kg").eq("id", batch.silo_id).single();
		const patch = {
			current_occupancy_kg: Math.max(0, (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg)),
			batch_dispatched_date: (/* @__PURE__ */ new Date()).toISOString(),
			updated_by: context.userId
		};
		if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
		await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
	}
	return row;
});
var spoilageInput = objectType({
	id: stringType().uuid(),
	type: stringType().min(1),
	severity: enumType([
		"low",
		"medium",
		"high",
		"critical"
	]),
	description: stringType().optional().nullable(),
	estimated_loss_kg: numberType().nonnegative().optional().nullable(),
	temperature: numberType().optional().nullable(),
	humidity: numberType().optional().nullable(),
	action_taken: stringType().optional().nullable()
});
var logSpoilageEvent_createServerFn_handler = createServerRpc({
	id: "438281d46cf381845e6fbfa3e579991c72e8445bc7cdd76102ba21686721943e",
	name: "logSpoilageEvent",
	filename: "src/lib/operations.functions.ts"
}, (opts) => logSpoilageEvent.__executeServer(opts));
var logSpoilageEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(spoilageInput, d)).handler(logSpoilageEvent_createServerFn_handler, async ({ data, context }) => {
	const { data: batch, error: getErr } = await context.supabase.from("grain_batches").select("spoilage_events, spoilage_label, risk_score").eq("id", data.id).single();
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
			humidity: data.humidity ?? null
		},
		action_taken: data.action_taken ?? null,
		logged_by: context.userId,
		logged_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	const newEvents = [...events, event];
	const label = data.severity === "critical" ? "Spoiled" : data.severity === "high" ? "Risky" : batch.spoilage_label ?? "Safe";
	const riskBump = {
		low: 5,
		medium: 20,
		high: 45,
		critical: 80
	}[data.severity];
	const newRisk = Math.min(100, Number(batch.risk_score ?? 0) + riskBump);
	const { data: row, error } = await context.supabase.from("grain_batches").update({
		spoilage_events: newEvents,
		spoilage_label: label,
		risk_score: newRisk,
		last_risk_assessment: (/* @__PURE__ */ new Date()).toISOString(),
		updated_by: context.userId
	}).eq("id", data.id).select("*").single();
	if (error) throw error;
	return row;
});
var listSensorDevices_createServerFn_handler = createServerRpc({
	id: "ab6e81e683beff5ac3d4167be83fa24e0b180c42e76a6b2db7e8b2a8ec06335d",
	name: "listSensorDevices",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listSensorDevices.__executeServer(opts));
var listSensorDevices = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listSensorDevices_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("sensor_devices").select("*, silos:silo_id(id, silo_id, name), warehouses:warehouse_id(id, name, warehouse_id)").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var sensorTypeEnum = enumType([
	"co2",
	"humidity",
	"light",
	"moisture",
	"ph",
	"pressure",
	"temperature",
	"voc"
]);
var sensorInput = objectType({
	id: stringType().uuid().optional(),
	device_id: stringType().min(1).max(80).optional(),
	device_name: stringType().min(1).max(200),
	mac_address: stringType().max(80).optional().nullable(),
	model: stringType().max(100).optional().nullable(),
	manufacturer: stringType().max(100).optional().nullable(),
	firmware_version: stringType().max(50).optional().nullable(),
	device_type: stringType().max(50).optional().nullable(),
	category: stringType().max(50).optional().nullable(),
	sensor_types: arrayType(sensorTypeEnum).optional().nullable(),
	warehouse_id: stringType().uuid(),
	silo_id: stringType().uuid(),
	status: enumType([
		"active",
		"offline",
		"error",
		"maintenance"
	]).default("active"),
	power_source: enumType([
		"solar",
		"battery",
		"direct",
		"hybrid"
	]).optional().nullable(),
	data_transmission_interval: numberType().int().positive().optional().nullable(),
	calibration_interval_days: numberType().int().positive().optional().nullable(),
	last_calibration_date: stringType().optional().nullable(),
	is_enabled: booleanType().optional(),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertSensorDevice_createServerFn_handler = createServerRpc({
	id: "04b3530e1d4de87824dd848602d9cbf6e6856905bf235b7912154c11193628e4",
	name: "upsertSensorDevice",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertSensorDevice.__executeServer(opts));
var upsertSensorDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(sensorInput, d)).handler(upsertSensorDevice_createServerFn_handler, async ({ data, context }) => {
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
		updated_by: context.userId
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
		created_by: context.userId
	}).select("*").single();
	if (error) throw error;
	return row;
});
var deleteSensorDevice_createServerFn_handler = createServerRpc({
	id: "03a2ba5918de0692975b9d9c41bdb13a905f76ad02ccf00ff22ba6a3f996bb73",
	name: "deleteSensorDevice",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteSensorDevice.__executeServer(opts));
var deleteSensorDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteSensorDevice_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("sensor_devices").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var listLatestSensorReadings_createServerFn_handler = createServerRpc({
	id: "c438b1cbdba0920d1093e397932d3f8eca950f8d4480cbeb38c1e0c030c799e9",
	name: "listLatestSensorReadings",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listLatestSensorReadings.__executeServer(opts));
var listLatestSensorReadings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listLatestSensorReadings_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("sensor_readings").select("id, device_id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, pressure_value, ml_risk_class, ml_risk_score, anomaly_detected, battery_level, signal_strength").order("reading_timestamp", { ascending: false }).limit(500);
	if (error) throw error;
	const rows = data ?? [];
	const map = /* @__PURE__ */ new Map();
	for (const r of rows) if (!map.has(r.device_id)) map.set(r.device_id, r);
	return Array.from(map.values());
});
var listDeviceReadings_createServerFn_handler = createServerRpc({
	id: "501cdb312512763da7e148e10e2a848bdd192a06bca91c3abaf84c6aed73d199",
	name: "listDeviceReadings",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listDeviceReadings.__executeServer(opts));
var listDeviceReadings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	device_id: stringType().uuid(),
	limit: numberType().int().max(500).default(50)
}).parse(d)).handler(listDeviceReadings_createServerFn_handler, async ({ data, context }) => {
	const { data: rows, error } = await context.supabase.from("sensor_readings").select("id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, ml_risk_class, ml_risk_score, anomaly_detected").eq("device_id", data.device_id).order("reading_timestamp", { ascending: false }).limit(data.limit);
	if (error) throw error;
	return rows ?? [];
});
var listActuators_createServerFn_handler = createServerRpc({
	id: "76f5181e58a6ce3e579337ac089022b708936a8f717197b429d5debb7434b34c",
	name: "listActuators",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listActuators.__executeServer(opts));
var listActuators = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listActuators_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("actuators").select("*, silos(id, silo_id, name, warehouse_id, warehouses(id, name, warehouse_id))").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var actuatorInput = objectType({
	id: stringType().uuid().optional(),
	actuator_id: stringType().min(1).max(80),
	name: stringType().min(1).max(200),
	actuator_type: enumType([
		"fan",
		"vent",
		"heater",
		"cooler",
		"alarm",
		"light"
	]),
	silo_id: stringType().uuid(),
	manufacturer: stringType().max(200).optional().nullable(),
	model: stringType().max(200).optional().nullable(),
	mac_address: stringType().max(80).optional().nullable(),
	status: enumType([
		"active",
		"offline",
		"error",
		"maintenance"
	]).default("active"),
	control_mode: enumType([
		"auto",
		"manual",
		"failsafe"
	]).default("auto"),
	is_enabled: booleanType().default(true),
	power_level: numberType().min(0).max(100).optional().nullable(),
	target_fan_speed: numberType().min(0).max(100).optional().nullable(),
	tags: arrayType(stringType()).optional().nullable(),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertActuator_createServerFn_handler = createServerRpc({
	id: "4865827c480098ba49ad3ea7923c5e23932d7526a663159786a9b0c57cd25ba9",
	name: "upsertActuator",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertActuator.__executeServer(opts));
var upsertActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(actuatorInput, d)).handler(upsertActuator_createServerFn_handler, async ({ data, context }) => {
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
		updated_by: context.userId
	};
	if (data.id) {
		const { data: row, error } = await context.supabase.from("actuators").update({
			...payload,
			updated_by: context.userId
		}).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const { data: row, error } = await context.supabase.from("actuators").insert(payload).select("*").single();
	if (error) throw error;
	return row;
});
var deleteActuator_createServerFn_handler = createServerRpc({
	id: "dd3372e5504b8f0998430e1309d8b3d30fc244c1062440e1cbd35033b8f6feab",
	name: "deleteActuator",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteActuator.__executeServer(opts));
var deleteActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteActuator_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("actuators").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var controlInput = objectType({
	id: stringType().uuid(),
	action: enumType([
		"turn_on",
		"turn_off",
		"set_value",
		"auto",
		"manual",
		"emergency_stop"
	]),
	value: numberType().min(0).max(100).optional()
});
var controlActuator_createServerFn_handler = createServerRpc({
	id: "b3f52c9983df406b9bcabdf1f0f6f6470d31258a9122b58712c3c1505d5c2524",
	name: "controlActuator",
	filename: "src/lib/operations.functions.ts"
}, (opts) => controlActuator.__executeServer(opts));
var controlActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(controlInput, d)).handler(controlActuator_createServerFn_handler, async ({ data, context }) => {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const patch = { updated_by: context.userId };
	if (data.action === "turn_on") {
		patch.is_on = true;
		patch.status = "active";
		patch.control_mode = "manual";
		patch.human_requested_fan = true;
		if (typeof data.value === "number") patch.power_level = data.value;
		patch.current_operation = {
			action: "turn_on",
			value: data.value ?? null,
			at: now,
			by: context.userId
		};
	} else if (data.action === "turn_off") {
		patch.is_on = false;
		patch.control_mode = "manual";
		patch.human_requested_fan = false;
		patch.power_level = 0;
		patch.current_operation = {
			action: "turn_off",
			at: now,
			by: context.userId
		};
	} else if (data.action === "set_value") {
		patch.power_level = data.value ?? 0;
		patch.target_fan_speed = data.value ?? 0;
		patch.control_mode = "manual";
		patch.current_operation = {
			action: "set_value",
			value: data.value ?? 0,
			at: now,
			by: context.userId
		};
	} else if (data.action === "auto") {
		patch.control_mode = "auto";
		patch.human_requested_fan = false;
		patch.current_operation = {
			action: "auto",
			at: now,
			by: context.userId
		};
	} else if (data.action === "manual") {
		patch.control_mode = "manual";
		patch.current_operation = {
			action: "manual",
			at: now,
			by: context.userId
		};
	} else if (data.action === "emergency_stop") {
		patch.is_on = false;
		patch.power_level = 0;
		patch.status = "maintenance";
		patch.control_mode = "manual";
		patch.human_requested_fan = false;
		patch.current_operation = {
			action: "emergency_stop",
			at: now,
			by: context.userId
		};
	}
	const { data: actRow, error: actError } = await context.supabase.from("actuators").select("actuator_id").eq("id", data.id).single();
	if (actError) throw actError;
	const { publishActuatorCommand } = await import("./actuator-bridge.server-C-vFaxOB.mjs").then((n) => n.t);
	await publishActuatorCommand(actRow.actuator_id, {
		action: data.action,
		value: data.value ?? null,
		by: context.userId,
		at: now
	});
	const { data: row, error } = await context.supabase.from("actuators").update(patch).eq("id", data.id).select("*").single();
	if (error) throw error;
	return row;
});
var listGrainAlerts_createServerFn_handler = createServerRpc({
	id: "663aeec9e92d1ba52cde7e3bb1526abf842a3eda6bc59e7cb491cdc5e426d845",
	name: "listGrainAlerts",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listGrainAlerts.__executeServer(opts));
var listGrainAlerts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listGrainAlerts_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("grain_alerts").select("*, silos(id, silo_id, name), warehouses(id, name, warehouse_id), grain_batches(id, batch_id, grain_type)").order("triggered_at", {
		ascending: false,
		nullsFirst: false
	}).limit(500);
	if (error) throw error;
	return data ?? [];
});
var alertInput = objectType({
	id: stringType().uuid().optional(),
	alert_id: stringType().min(1).max(80),
	title: stringType().min(1).max(200),
	message: stringType().min(1).max(2e3),
	priority: enumType([
		"low",
		"medium",
		"high",
		"critical"
	]),
	status: enumType([
		"pending",
		"acknowledged",
		"resolved",
		"escalated"
	]).default("pending"),
	source: stringType().min(1).max(80),
	alert_type: stringType().max(80).optional().nullable(),
	silo_id: stringType().uuid().optional().nullable(),
	warehouse_id: stringType().uuid().optional().nullable(),
	batch_id: stringType().uuid().optional().nullable(),
	tags: arrayType(stringType()).optional().nullable()
});
var upsertGrainAlert_createServerFn_handler = createServerRpc({
	id: "c47d5df0d77433db7ec526e4ed3f9ad4a483a0a96c6c329f120f74c121fea599",
	name: "upsertGrainAlert",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertGrainAlert.__executeServer(opts));
var upsertGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(alertInput, d)).handler(upsertGrainAlert_createServerFn_handler, async ({ data, context }) => {
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
		triggered_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	if (data.id) {
		const { data: row, error } = await context.supabase.from("grain_alerts").update(payload).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const { data: row, error } = await context.supabase.from("grain_alerts").insert(payload).select("*").single();
	if (error) throw error;
	return row;
});
var deleteGrainAlert_createServerFn_handler = createServerRpc({
	id: "3edc5dcb4d49991b1aa86efd00684a57e867c643b0939edd6cf62612e194d3e6",
	name: "deleteGrainAlert",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteGrainAlert.__executeServer(opts));
var deleteGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteGrainAlert_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("grain_alerts").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var alertActionInput = objectType({
	id: stringType().uuid(),
	action: enumType([
		"acknowledge",
		"resolve",
		"escalate",
		"reopen"
	]),
	notes: stringType().max(2e3).optional(),
	resolution_type: stringType().max(80).optional(),
	escalated_to: stringType().max(200).optional(),
	reason: stringType().max(500).optional()
});
var actionGrainAlert_createServerFn_handler = createServerRpc({
	id: "a1df7be968204572d3b24d0d6d2cfb3a6c73832389758f1269afc5c5d7bf096f",
	name: "actionGrainAlert",
	filename: "src/lib/operations.functions.ts"
}, (opts) => actionGrainAlert.__executeServer(opts));
var actionGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(alertActionInput, d)).handler(actionGrainAlert_createServerFn_handler, async ({ data, context }) => {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const patch = {};
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
			by: context.userId
		};
	} else if (data.action === "escalate") {
		const { data: current } = await context.supabase.from("grain_alerts").select("escalation_level, escalation_history").eq("id", data.id).single();
		const level = (current?.escalation_level ?? 0) + 1;
		const history = Array.isArray(current?.escalation_history) ? current.escalation_history : [];
		patch.status = "escalated";
		patch.escalation_level = level;
		patch.escalation_history = [...history, {
			level,
			escalated_to: data.escalated_to ?? null,
			escalated_by: context.userId,
			escalated_at: now,
			reason: data.reason ?? null
		}];
	} else if (data.action === "reopen") {
		patch.status = "pending";
		patch.resolved_at = null;
		patch.resolved_by = null;
	}
	const { data: row, error } = await context.supabase.from("grain_alerts").update(patch).eq("id", data.id).select("*").single();
	if (error) throw error;
	return row;
});
var listBuyers_createServerFn_handler = createServerRpc({
	id: "beedec8f4bc87d576ca1bfc6799df30a6e0c0e923e1e0ce0c61ae28c56dc08a9",
	name: "listBuyers",
	filename: "src/lib/operations.functions.ts"
}, (opts) => listBuyers.__executeServer(opts));
var listBuyers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listBuyers_createServerFn_handler, async ({ context }) => {
	const { data, error } = await context.supabase.from("buyers").select("*").order("created_at", { ascending: false }).limit(500);
	if (error) throw error;
	return data ?? [];
});
var buyerInput = objectType({
	id: stringType().uuid().optional(),
	name: stringType().min(1, "Buyer name is required").max(200),
	contact_name: stringType().min(1, "Contact name is required").max(200),
	contact_email: stringType().email("Invalid email").optional().nullable().or(literalType("")),
	contact_phone: stringType().max(50).optional().nullable(),
	contact_designation: stringType().max(120).optional().nullable(),
	company_name: stringType().max(200).optional().nullable(),
	buyer_type: enumType([
		"local_mill",
		"exporter",
		"wholesaler",
		"retailer",
		"government"
	]).optional().nullable(),
	status: enumType([
		"active",
		"paused",
		"inactive"
	]).default("active"),
	address: stringType().max(500).optional().nullable(),
	city: stringType().max(120).optional().nullable(),
	state: stringType().max(120).optional().nullable(),
	country: stringType().max(120).optional().nullable(),
	preferred_grain_types: arrayType(enumType([
		"Wheat",
		"Rice",
		"Maize",
		"Corn",
		"Barley",
		"Sorghum"
	])).optional().nullable(),
	preferred_payment_terms: stringType().max(120).optional().nullable(),
	rating: numberType().min(0).max(5).optional().nullable(),
	tags: arrayType(stringType()).optional().nullable(),
	notes: stringType().max(2e3).optional().nullable()
});
var upsertBuyer_createServerFn_handler = createServerRpc({
	id: "733f7325521374cc0371345e14292cae80ff8e0e54376a9ebe24854ae09d6b36",
	name: "upsertBuyer",
	filename: "src/lib/operations.functions.ts"
}, (opts) => upsertBuyer.__executeServer(opts));
var upsertBuyer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(buyerInput, d)).handler(upsertBuyer_createServerFn_handler, async ({ data, context }) => {
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
		admin_id: context.userId
	};
	if (data.id) {
		const { data: row, error } = await context.supabase.from("buyers").update(payload).eq("id", data.id).select("*").single();
		if (error) throw error;
		return row;
	}
	const { data: row, error } = await context.supabase.from("buyers").insert(payload).select("*").single();
	if (error) throw error;
	return row;
});
var deleteBuyer_createServerFn_handler = createServerRpc({
	id: "3b93b031275c6c988583ba925770d129f4c9f8e3ed45ca2848ced85da5d82bd2",
	name: "deleteBuyer",
	filename: "src/lib/operations.functions.ts"
}, (opts) => deleteBuyer.__executeServer(opts));
var deleteBuyer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(deleteBuyer_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("buyers").delete().eq("id", data.id);
	if (error) throw error;
	return { ok: true };
});
var getDashboardStats_createServerFn_handler = createServerRpc({
	id: "d50d957d7194ccb26b308b2db549b46a3a9c7e4a9d81eae30ad0bc08423db7ab",
	name: "getDashboardStats",
	filename: "src/lib/operations.functions.ts"
}, (opts) => getDashboardStats.__executeServer(opts));
var getDashboardStats = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getDashboardStats_createServerFn_handler, async ({ context }) => {
	const [warehouses, silos, batches, sensors, actuators, alerts, buyers] = await Promise.all([
		context.supabase.from("warehouses").select("id", {
			count: "exact",
			head: true
		}),
		context.supabase.from("silos").select("id", {
			count: "exact",
			head: true
		}),
		context.supabase.from("grain_batches").select("id, status", { count: "exact" }).limit(1e3),
		context.supabase.from("sensor_devices").select("id, status", { count: "exact" }).limit(1e3),
		context.supabase.from("actuators").select("id, status", { count: "exact" }).limit(1e3),
		context.supabase.from("grain_alerts").select("id, status, alert_type", { count: "exact" }).limit(1e3),
		context.supabase.from("buyers").select("id", {
			count: "exact",
			head: true
		})
	]);
	const batchesData = batches.data ?? [];
	const sensorsData = sensors.data ?? [];
	const actuatorsData = actuators.data ?? [];
	const alertsData = alerts.data ?? [];
	return {
		warehouses: warehouses.count ?? 0,
		silos: silos.count ?? 0,
		buyers: buyers.count ?? 0,
		batches: {
			total: batches.count ?? 0,
			active: batchesData.filter((b) => b.status === "stored" || b.status === "processing").length
		},
		sensors: {
			total: sensors.count ?? 0,
			online: sensorsData.filter((s) => s.status === "active").length
		},
		actuators: {
			total: actuators.count ?? 0,
			active: actuatorsData.filter((a) => a.status === "active").length
		},
		alerts: {
			total: alerts.count ?? 0,
			open: alertsData.filter((a) => a.status === "open" || a.status === "active").length,
			critical: alertsData.filter((a) => a.alert_type === "critical" || a.alert_type === "high").length
		}
	};
});
var getSensorHistory_createServerFn_handler = createServerRpc({
	id: "2da280639bb6f67bf7227893ca4fa05399641a4f8dbe8213e4471808efc598e4",
	name: "getSensorHistory",
	filename: "src/lib/operations.functions.ts"
}, (opts) => getSensorHistory.__executeServer(opts));
var getSensorHistory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	device_uuid: stringType().uuid(),
	hours: numberType().int().positive().default(6),
	limit: numberType().int().max(1e3).default(500)
}).parse(d)).handler(getSensorHistory_createServerFn_handler, async ({ data, context }) => {
	const cutoff = (/* @__PURE__ */ new Date(Date.now() - data.hours * 60 * 60 * 1e3)).toISOString();
	const { data: rows, error } = await context.supabase.from("sensor_readings").select("id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, dew_point, fan_state, lid_state, ml_risk_score, ml_risk_class, pressure_value, light_value, pest_presence_score").eq("device_id", data.device_uuid).gte("reading_timestamp", cutoff).order("reading_timestamp", { ascending: true }).limit(data.limit);
	if (error) throw error;
	return rows ?? [];
});
var exportSensorCSV_createServerFn_handler = createServerRpc({
	id: "c55894745f8fdaef4dee488f380b69dc2c1c68974a147b7064c24f08cef78dc8",
	name: "exportSensorCSV",
	filename: "src/lib/operations.functions.ts"
}, (opts) => exportSensorCSV.__executeServer(opts));
var exportSensorCSV = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ device_id: stringType().uuid().optional() }).parse(d)).handler(exportSensorCSV_createServerFn_handler, async ({ data, context }) => {
	let query = context.supabase.from("sensor_readings").select(`
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
      `).order("reading_timestamp", { ascending: true }).limit(1e3);
	if (data.device_id) query = query.eq("device_id", data.device_id);
	const { data: readings, error } = await query;
	if (error) throw error;
	return { csv: "timestamp,silo_id,batch_id,T_core,RH_core,T_amb,RH_amb,Grain_Moisture,fan_state,fan_duty,VOC_index,VOC_relative,dew_point_core,rainfall_last_hour,spoilage_label\n" + (readings ?? []).map((r) => {
		const siloId = r.silos?.silo_id ?? r.silo_id ?? "";
		const batchId = r.grain_batches?.batch_id ?? r.batch_id ?? "";
		return [
			r.reading_timestamp,
			siloId,
			batchId,
			r.temperature_value ?? "",
			r.humidity_value ?? "",
			r.ambient_temperature ?? "",
			r.ambient_humidity ?? "",
			r.moisture_value ?? "",
			r.fan_state ?? 0,
			r.fan_duty_cycle ?? 0,
			r.voc_value ?? "",
			r.voc_relative ?? "",
			r.dew_point ?? "",
			0,
			r.ml_risk_class ?? "unknown"
		].join(",");
	}).join("\n") };
});
//#endregion
export { actionGrainAlert_createServerFn_handler, controlActuator_createServerFn_handler, deleteActuator_createServerFn_handler, deleteBuyer_createServerFn_handler, deleteGrainAlert_createServerFn_handler, deleteGrainBatch_createServerFn_handler, deleteSensorDevice_createServerFn_handler, deleteSilo_createServerFn_handler, deleteWarehouse_createServerFn_handler, dispatchGrainBatch_createServerFn_handler, exportSensorCSV_createServerFn_handler, getDashboardStats_createServerFn_handler, getSensorHistory_createServerFn_handler, listActuators_createServerFn_handler, listBuyers_createServerFn_handler, listDeviceReadings_createServerFn_handler, listGrainAlerts_createServerFn_handler, listGrainBatches_createServerFn_handler, listLatestSensorReadings_createServerFn_handler, listSensorDevices_createServerFn_handler, listSilos_createServerFn_handler, listWarehouses_createServerFn_handler, logSpoilageEvent_createServerFn_handler, upsertActuator_createServerFn_handler, upsertBuyer_createServerFn_handler, upsertGrainAlert_createServerFn_handler, upsertGrainBatch_createServerFn_handler, upsertSensorDevice_createServerFn_handler, upsertSilo_createServerFn_handler, upsertWarehouse_createServerFn_handler };
