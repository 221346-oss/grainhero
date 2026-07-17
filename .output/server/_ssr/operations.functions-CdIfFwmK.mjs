import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, i as literalType, n as booleanType, o as objectType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/operations.functions-CdIfFwmK.js
function parseOrThrow(schema, data) {
	const r = schema.safeParse(data);
	if (r.success) return r.data;
	const msg = r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · ");
	throw new Error(msg);
}
var listWarehouses = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("aa3703d8b00119c6e6f9b50717a78b2f238601d6b09705a8205dbd11ff128a16"));
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
var upsertWarehouse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(warehouseInput, d)).handler(createSsrRpc("7f8294486c1f817664790a4ad132269d7ae02aae1e9e7047c033a797a1b8f30b"));
var deleteWarehouse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("e5da7d1943ed6f8e335b001b2a449016834c4e99b990479b14a8917a6e4f429a"));
var listSilos = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4a2aca9cea4bab0fef9d4c1d94c92603460ac135d64e2ff0eab15a3e7e0d0110"));
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
var upsertSilo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(siloInput, d)).handler(createSsrRpc("6fb2b017ac3e0ec11e29f26019f8430af70dc9f9440371282f6bbd68416da14d"));
var deleteSilo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("acd829f6da9f9cbf57a5a5522f6293b63d06cc1eeb39782deed8fe3ac3eb5363"));
var listGrainBatches = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2bd64bd5bee395b355e9fb0abcdac15b62e2d594a32f6de45a485293d4e5e9bf"));
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
var upsertGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(batchInput, d)).handler(createSsrRpc("5172cc3a7b6e92375887e03ad683bff9117602e73ed65796762f5c8814a06bdd"));
var deleteGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("481dc88375a2add4afb1f20d4041185e6568eeb6cb655ceda6c8b5d8646b626b"));
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
var dispatchGrainBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(dispatchInput, d)).handler(createSsrRpc("8ff178ce4cf541ca5be554842595687b66678cfe38e29ee7f5ca31e26bc82b0c"));
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
var logSpoilageEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(spoilageInput, d)).handler(createSsrRpc("438281d46cf381845e6fbfa3e579991c72e8445bc7cdd76102ba21686721943e"));
var listSensorDevices = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("ab6e81e683beff5ac3d4167be83fa24e0b180c42e76a6b2db7e8b2a8ec06335d"));
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
var upsertSensorDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(sensorInput, d)).handler(createSsrRpc("04b3530e1d4de87824dd848602d9cbf6e6856905bf235b7912154c11193628e4"));
var deleteSensorDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("03a2ba5918de0692975b9d9c41bdb13a905f76ad02ccf00ff22ba6a3f996bb73"));
var listLatestSensorReadings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("c438b1cbdba0920d1093e397932d3f8eca950f8d4480cbeb38c1e0c030c799e9"));
var listDeviceReadings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	device_id: stringType().uuid(),
	limit: numberType().int().max(500).default(50)
}).parse(d)).handler(createSsrRpc("501cdb312512763da7e148e10e2a848bdd192a06bca91c3abaf84c6aed73d199"));
var listActuators = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("76f5181e58a6ce3e579337ac089022b708936a8f717197b429d5debb7434b34c"));
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
var upsertActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(actuatorInput, d)).handler(createSsrRpc("4865827c480098ba49ad3ea7923c5e23932d7526a663159786a9b0c57cd25ba9"));
var deleteActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("dd3372e5504b8f0998430e1309d8b3d30fc244c1062440e1cbd35033b8f6feab"));
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
var controlActuator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(controlInput, d)).handler(createSsrRpc("b3f52c9983df406b9bcabdf1f0f6f6470d31258a9122b58712c3c1505d5c2524"));
var listGrainAlerts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("663aeec9e92d1ba52cde7e3bb1526abf842a3eda6bc59e7cb491cdc5e426d845"));
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
var upsertGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(alertInput, d)).handler(createSsrRpc("c47d5df0d77433db7ec526e4ed3f9ad4a483a0a96c6c329f120f74c121fea599"));
var deleteGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("3edc5dcb4d49991b1aa86efd00684a57e867c643b0939edd6cf62612e194d3e6"));
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
var actionGrainAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(alertActionInput, d)).handler(createSsrRpc("a1df7be968204572d3b24d0d6d2cfb3a6c73832389758f1269afc5c5d7bf096f"));
var listBuyers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("beedec8f4bc87d576ca1bfc6799df30a6e0c0e923e1e0ce0c61ae28c56dc08a9"));
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
var upsertBuyer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => parseOrThrow(buyerInput, d)).handler(createSsrRpc("733f7325521374cc0371345e14292cae80ff8e0e54376a9ebe24854ae09d6b36"));
var deleteBuyer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ id: stringType().uuid() }).parse(d)).handler(createSsrRpc("3b93b031275c6c988583ba925770d129f4c9f8e3ed45ca2848ced85da5d82bd2"));
var getDashboardStats = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("d50d957d7194ccb26b308b2db549b46a3a9c7e4a9d81eae30ad0bc08423db7ab"));
var getSensorHistory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	device_uuid: stringType().uuid(),
	hours: numberType().int().positive().default(6),
	limit: numberType().int().max(1e3).default(500)
}).parse(d)).handler(createSsrRpc("2da280639bb6f67bf7227893ca4fa05399641a4f8dbe8213e4471808efc598e4"));
var exportSensorCSV = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ device_id: stringType().uuid().optional() }).parse(d)).handler(createSsrRpc("c55894745f8fdaef4dee488f380b69dc2c1c68974a147b7064c24f08cef78dc8"));
//#endregion
export { upsertWarehouse as A, logSpoilageEvent as C, upsertGrainBatch as D, upsertGrainAlert as E, upsertSensorDevice as O, listWarehouses as S, upsertBuyer as T, listGrainAlerts as _, deleteGrainAlert as a, listSensorDevices as b, deleteSilo as c, exportSensorCSV as d, getDashboardStats as f, listDeviceReadings as g, listBuyers as h, deleteBuyer as i, upsertSilo as k, deleteWarehouse as l, listActuators as m, controlActuator as n, deleteGrainBatch as o, getSensorHistory as p, deleteActuator as r, deleteSensorDevice as s, actionGrainAlert as t, dispatchGrainBatch as u, listGrainBatches as v, upsertActuator as w, listSilos as x, listLatestSensorReadings as y };
