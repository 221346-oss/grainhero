import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-verification-email.functions-DCIUaQUa.js
createServerFn({ method: "POST" }).inputValidator((d) => objectType({ email: stringType().trim().email().max(200) }).parse(d)).handler(createSsrRpc("a17b46b346ea3eb0149223cb10af4e6e4876c44eb919c580c30558d2b91f0293"));
/**
* Server function to auto-confirm a user's email right after signup.
* Automatically updates user's email confirmation status and promotes them to admin role.
*/
var autoConfirmUserEmail = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ email: stringType().trim().email() }).parse(d)).handler(createSsrRpc("66054a8b8bb6cbe12f9840de63872e3aa1be008f1b738f01a19041db959694d5"));
//#endregion
export { autoConfirmUserEmail as t };
