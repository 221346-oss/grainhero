import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analytics.functions-1IN0FmxS.js
var getBatchPredictions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("f5ade3f6be8b4526dd21392af6da852a973a34e283f7e74cd4e4ec3037bfdfe6"));
var getPlatformSpoilageOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("0a4f1956207c6e2ec775037f42ba8aa5704b09185089097bdd3c2cd5c8408716"));
var getMLModels = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("460e7e15689ebea621fd0b9d854d732d1676be1721323da74b149f923329ecb0"));
var getAnalyticsOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("c949da06721dff0cef413c27a8251ddadc4e59565079d64eff876b1eb7fe5f02"));
//#endregion
export { getPlatformSpoilageOverview as i, getBatchPredictions as n, getMLModels as r, getAnalyticsOverview as t };
