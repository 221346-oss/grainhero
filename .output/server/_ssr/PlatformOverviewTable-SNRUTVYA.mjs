import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PlatformOverviewTable-SNRUTVYA.js
var import_jsx_runtime = require_jsx_runtime();
var getPlatformAnalyticsBreakdown = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2f88d803f6658bfa0fade5693b939e3ff223a9580a035947019996760b55abc2"));
var getPlatformMLInference = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("0bf57704f441309d987d2ca1ff8f30ee3124798573db87020ab25d2f39206653"));
var getPlatformInsuranceOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("75ad4e2eca0d115ef54c492e66d58affde7b29e4c4eed509389f722dfa708461"));
var getPlatformBuyersOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("26e00a6998274e304562a157e02cefcf13dafcacffdda0fd9a50e55a97849415"));
/** Compact cross-tenant leaderboard table for platform views. */
function PlatformOverviewTable({ title, description, rows, columns, emptyLabel = "No data across tenants yet.", limit = 10 }) {
	const visible = rows.slice(0, limit);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
			className: "text-base",
			children: title
		}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, {
			className: "text-xs",
			children: description
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
			variant: "outline",
			className: "text-[10px]",
			children: [rows.length, " tenants"]
		})]
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "p-0",
		children: [visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-6 text-center text-sm text-slate-500",
			children: emptyLabel
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-slate-50 border-y border-slate-100",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "text-left px-4 py-2 text-xs uppercase text-slate-500 font-semibold",
						children: "Tenant"
					}), columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: `px-4 py-2 text-xs uppercase text-slate-500 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`,
						children: c.label
					}, String(c.key)))] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: visible.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-slate-100 last:border-0 hover:bg-slate-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2 font-medium text-slate-900 truncate max-w-[220px]",
						children: row.name
					}), columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: `px-4 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`,
						children: c.render(row)
					}, String(c.key)))]
				}, row.admin_id)) })]
			})
		}), rows.length > limit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-2 text-center text-xs text-slate-500 border-t border-slate-100",
			children: [
				"Showing top ",
				limit,
				" of ",
				rows.length
			]
		})]
	})] });
}
//#endregion
export { getPlatformMLInference as a, getPlatformInsuranceOverview as i, getPlatformAnalyticsBreakdown as n, getPlatformBuyersOverview as r, PlatformOverviewTable as t };
