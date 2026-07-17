import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-settings-insurance.functions-B-NzOE-L.js
var listTeamMembers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("bf892ef9b46bdd9412939f3cbd42379019d6141a7c60626b6fd07aea576d61d4"));
var inviteTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("ef22370ee284026323c6a31db9934f656c1aa1e666e2a7f1a8423eb6cf642db5"));
var updateTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("af93174231cc5b2092143d617119a45364d7a502ddb645ca33bd0fdc4e45505f"));
var removeTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e762cb76e6c320cbafd44bf444e572dd337f7d939cdf7857510d9c2f43b48ae5"));
var getMySettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("51609d7b938c4518605449551942f9f3e0a17fd31ee48795d185e426c5354cc5"));
var updateMySettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("0778b6186cf85463455873c1f64d71ebcf4ae2a0dac631cfb546f5ec80e90663"));
var listPolicies = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("938761e1f32d2678eba4cf4da4530c6bb15494b0af4d771a6a70993798d5bd92"));
var upsertPolicy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("ecdc3fe21bb39ffcc78f14de9e3cdab4a201081348fffb03ab3df0f4d69be942"));
var deletePolicy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e0507d4a7cf892654ff26f984ab731de8b5a73aad2387676059737b6ba0adbe7"));
var listClaims = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4a1f7e59c07e8ce484add358c9c33e35ac2ed7d6e16d00f1ab2789642f906d2e"));
var upsertClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("d80473e6da80e5aee49e90d520c7c7926e16c38465c36dca8654620d23c6060b"));
var deleteClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("15aa177184339f4dbb5ca446ad588a9af1a8a35a015a8728d3cf0218cd7e3c0d"));
//#endregion
export { listClaims as a, removeTeamMember as c, upsertClaim as d, upsertPolicy as f, inviteTeamMember as i, updateMySettings as l, deletePolicy as n, listPolicies as o, getMySettings as r, listTeamMembers as s, deleteClaim as t, updateTeamMember as u };
