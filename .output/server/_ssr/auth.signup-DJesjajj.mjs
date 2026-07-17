import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.signup-DJesjajj.js
var $$splitComponentImporter = () => import("./auth.signup-DmVNPrRi.mjs");
var search = objectType({
	plan: stringType().optional(),
	email: stringType().email().optional(),
	redirect: stringType().optional()
});
var Route = createFileRoute("/auth/signup")({
	validateSearch: (s) => search.parse(s),
	head: () => ({ meta: [{ title: "Create your account — GrainHero" }, {
		name: "description",
		content: "Start monitoring your grain in minutes."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
