import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hubspot.functions-XOaLLP_6.js
/** Create a HubSpot contact + trial deal and store IDs on the user's profile. */
var syncSignupToHubspot = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("56a98f6f0297a6a1b05dfc767788417c4e47b361157fe7f1969c52ea5e75f538"));
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(createSsrRpc("8d2ed68722129a2c5de970eb1dcefb67389df34cb18a074f0ca7fdceeb0dff73"));
/** Increment login count and, on the 3rd login, promote deal to trial-active. */
var trackLoginAndAdvance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("9bc397fd4f908edaa38a7d4b4c7d16c266aa516ad2ba43dd9bb159ca0b175fb8"));
/** Super-admin: list HubSpot deals for pipeline view. */
var adminListHubspotDeals = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("746d187c11d9f594b1e679542ea6777fde3718ac03f43dffed34b2d3695d6a83"));
/** Super-admin: list HubSpot contacts (leads view). */
var adminListHubspotContacts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("997cc05bd40aab1b7f27f44d728661cead1c784b7db63aca44eceb5c9b2cf77d"));
/** Super-admin: manually move a deal to a stage from the pipeline UI. */
var adminUpdateDealStage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i) => i).handler(createSsrRpc("f89c68f3a776aca7c0262c1b8e727c32cc7198cb1fd8f43f6f6ed06a7937277e"));
//#endregion
export { trackLoginAndAdvance as a, syncSignupToHubspot as i, adminListHubspotDeals as n, adminUpdateDealStage as r, adminListHubspotContacts as t };
