import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as literalType, l as unionType, o as objectType, r as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout.index-DyKJurgB.js
var $$splitComponentImporter = () => import("./checkout.index-hBy0Trm5.mjs");
var search = objectType({
	plan: enumType([
		"basic",
		"intermediate",
		"pro"
	]).optional(),
	canceled: unionType([literalType("1"), literalType(1)]).optional()
});
var Route = createFileRoute("/checkout/")({
	validateSearch: (s) => search.parse(s),
	head: () => ({ meta: [{ title: "Checkout — GrainHero" }, {
		name: "description",
		content: "Choose your plan and start monitoring your grain."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
