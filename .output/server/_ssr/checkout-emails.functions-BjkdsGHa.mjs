import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout-emails.functions-BjkdsGHa.js
var input = objectType({ sessionId: stringType().trim().min(5).max(200) });
/**
* Idempotently emails the buyer a payment-confirmation with next steps.
* Safe to call from the success page and from the Stripe webhook.
* De-dupes by writing `confirmation_email_sent_at` on the hardware_orders row.
*/
var sendCheckoutConfirmationEmail = createServerFn({ method: "POST" }).inputValidator((d) => input.parse(d)).handler(createSsrRpc("130b05ae7b1efcd5dd9b4c6010761703ae7d87fe73e8e8e1ab4d17842f266d1a"));
//#endregion
export { sendCheckoutConfirmationEmail };
