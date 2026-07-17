import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-no-admin.functions-CqXBeWc_.js
var getPlatformMetrics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("b026013b7cc822ae3d1ef4293c7e33ae8e749d31691fa9168c0ebd9d43ffbcff"));
var listAllUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("25f30cf84b271040f09acca59d0cc1fd12995ea0b9a84e00fe25137a4e664718"));
var listAllTenants = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("b3f064562e45be494aa7db9cdb62d3515512cf903275fb4cbea16428ca7ae8a4"));
var toggleUserBlocked = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("3236c0268227674414afc1dbd4ece9d09bc59beacbfc8fead48dcf8042fc1471"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d = {}) => d).handler(createSsrRpc("96a7f7f07a1e29d3184a8668245da2d9059dd9222ee39248a53ae62f7416a5f8"));
var getPlatformOverviewWidgets = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("1253c6f59a9a5145f096a09d76279ae74ae0838026d4c09e99d66569cdceb45d"));
var getAllSubscriptions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("f678a0f976ce5c311cbc32284024ec3fdf4f7021f96ce7a94407fc1dc23877c5"));
//#endregion
export { listAllUsers as a, listAllTenants as i, getPlatformMetrics as n, toggleUserBlocked as o, getPlatformOverviewWidgets as r, getAllSubscriptions as t };
