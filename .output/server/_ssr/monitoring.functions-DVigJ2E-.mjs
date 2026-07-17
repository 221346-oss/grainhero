import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, n as booleanType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/monitoring.functions-DVigJ2E-.js
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4c92e43a6b90255231e2f77d742ef2ccef782f0abd07ae0e8526908860bf7d65"));
var getIncidents = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("7a37ae0a6f12b858c52dba22f342595fbbbe6a36c51a8bf36ec2fa4731890f4f"));
var getPlatformIncidentsOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("d7de986c418601f81b50a89056ac6ba609e327d65ada6ae51c17d15776d22812"));
var ackInput = objectType({
	id: stringType().uuid(),
	resolve: booleanType().optional()
});
var acknowledgeIncident = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => ackInput.parse(d)).handler(createSsrRpc("1c2124078c28ebe0fc1d148084ebb9c6376581f94a7e873d0e2b3fdb99ddc70e"));
var getReportsData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("de89ab97da5f10332365e2fdcb41265285a468e6d3b1b0c972a3265a2f43dbb0"));
//#endregion
export { getReportsData as i, getIncidents as n, getPlatformIncidentsOverview as r, acknowledgeIncident as t };
