import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as stringType, o as objectType, r as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.login-BWrYCeNK.js
var $$splitComponentImporter = () => import("./auth.login-BWcCDUsw.mjs");
var search = objectType({
	prefill: stringType().email().optional(),
	redirect: stringType().optional(),
	reason: enumType([
		"idle",
		"expired",
		"external"
	]).optional()
});
var Route = createFileRoute("/auth/login")({
	validateSearch: (s) => search.parse(s),
	head: () => ({ meta: [{ title: "Sign in — GrainHero" }, {
		name: "description",
		content: "Sign in to your GrainHero account."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
