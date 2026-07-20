import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/DataListPage-yAUru_pi.js
var import_jsx_runtime = require_jsx_runtime();
function StatusBadge({ value }) {
	if (!value) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-slate-400",
		children: "—"
	});
	const cls = {
		active: "bg-emerald-100 text-emerald-700",
		online: "bg-emerald-100 text-emerald-700",
		stored: "bg-emerald-100 text-emerald-700",
		processing: "bg-sky-100 text-sky-700",
		open: "bg-amber-100 text-amber-700",
		critical: "bg-rose-100 text-rose-700",
		high: "bg-rose-100 text-rose-700",
		offline: "bg-slate-200 text-slate-600",
		error: "bg-rose-100 text-rose-700",
		dispatched: "bg-violet-100 text-violet-700",
		sold: "bg-violet-100 text-violet-700"
	}[value.toLowerCase()] ?? "bg-slate-100 text-slate-700";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		className: `${cls} hover:${cls}`,
		children: value
	});
}
//#endregion
export { StatusBadge as t };
