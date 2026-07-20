import { R as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { K as ShieldAlert } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PlatformScopeBanner-DM73icyc.js
var import_jsx_runtime = require_jsx_runtime();
/**
* Read-only banner shown to super_admin at the top of shared pages.
* Indicates the page is showing cross-tenant data and that write
* actions are disabled in platform mode.
*/
function PlatformScopeBanner({ label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "h-5 w-5 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-semibold text-amber-900",
				children: "Platform view — all tenants"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-amber-800/80 text-xs mt-0.5",
				children: label ?? "Showing data across every tenant. Write actions are disabled."
			})]
		})]
	});
}
//#endregion
export { PlatformScopeBanner as t };
