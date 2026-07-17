import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { I as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-CkAivaVl.mjs";
import { t as Badge } from "./_ssr/badge-D1Dupn2y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_shared-CXvP2OQF.js
var import_jsx_runtime = require_jsx_runtime();
function PageHeader({ title, subtitle, badge }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-6 sm:mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "truncate text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground",
				children: title
			}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground line-clamp-2",
				children: subtitle
			})]
		}), badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			className: "shrink-0 border-0 text-[--fusion-ink] font-bold",
			style: { background: "var(--gradient-fusion)" },
			children: badge
		})]
	});
}
var accentMap = {
	emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-600",
	amber: "from-amber-500/10 to-amber-500/0 text-amber-600",
	sky: "from-sky-500/10 to-sky-500/0 text-sky-600",
	violet: "from-violet-500/10 to-violet-500/0 text-violet-600",
	rose: "from-rose-500/10 to-rose-500/0 text-rose-600"
};
function StatCard({ label, value, icon: Icon, trend, accent = "emerald" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "relative overflow-hidden border-slate-200/70 shadow-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("absolute inset-0 bg-gradient-to-br pointer-events-none", accentMap[accent]) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "pb-2 relative",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-xs font-semibold uppercase tracking-wider text-slate-500",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: cn("h-4 w-4", accentMap[accent].split(" ").pop()) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-2xl font-bold text-slate-900",
					children: value
				}), trend && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-slate-500",
					children: trend
				})]
			})
		]
	});
}
//#endregion
export { StatCard as n, PageHeader as t };
