import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, o as objectType, r as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/operations2.functions-Dlnt5BX1.js
var getMaintenanceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("18e1d22b3fba65d1055699856d4cbd9d96a856cf1d192e2d15db5463da40ab81"));
var getPlatformMaintenanceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("14a224dbf7ff1a071688a66334eea88b215e34881148b9a1eb567438f9311629"));
var maintInput = objectType({
	id: stringType().uuid(),
	kind: enumType(["device", "actuator"]),
	nextInDays: numberType().int().min(1).max(3650).default(180)
});
var markMaintenanceDone = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => maintInput.parse(d)).handler(createSsrRpc("6ef1852e6fc3f048aa1331546d7bd49399be311d0877d6b095b725e493285644"));
var getDeviceHealth = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("8a2e616c0cae24006c055ded15599b5b9aeb4eb692912d089912c3be9dba86fe"));
var getSecurityOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("67c98ecc966c1f9f24c4c4149a1e3dc908eae843a3429f91d47bcb9b8931b1b8"));
//#endregion
export { markMaintenanceDone as a, getSecurityOverview as i, getMaintenanceOverview as n, getPlatformMaintenanceOverview as r, getDeviceHealth as t };
