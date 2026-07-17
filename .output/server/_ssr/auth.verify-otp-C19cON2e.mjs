import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.verify-otp-C19cON2e.js
var $$splitComponentImporter = () => import("./auth.verify-otp-BK9d379n.mjs");
var search = objectType({ email: stringType().email() });
var Route = createFileRoute("/auth/verify-otp")({
	validateSearch: (s) => search.parse(s),
	head: () => ({ meta: [{ title: "Enter your code — GrainHero" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
