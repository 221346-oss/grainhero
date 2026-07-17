import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/roles.functions-DsCBlTtJ.js
var getMyRole = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("c0adc3062374bc86ae16e3547a5bb9beef089d6374a4cb215de592c0f0ada109"));
//#endregion
export { getMyRole as t };
