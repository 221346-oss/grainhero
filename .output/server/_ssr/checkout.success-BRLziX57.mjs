import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout.success-BRLziX57.js
var $$splitComponentImporter = () => import("./checkout.success-BxaN7-rv.mjs");
var search = objectType({ session_id: stringType().optional() });
var Route = createFileRoute("/checkout/success")({
	validateSearch: (s) => search.parse(s),
	head: () => ({ meta: [{ title: "Welcome to GrainHero 🎉" }, {
		name: "description",
		content: "Your payment is confirmed. Setting up your account…"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
