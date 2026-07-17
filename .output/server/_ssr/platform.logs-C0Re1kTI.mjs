import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Yt as ClipboardList } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.logs-C0Re1kTI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("7d9d5b75b82531caa7b80613a9755229fd69476e7ec98d571e99476a0df20996"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("98d5be8fe9a2de824161af034a13240b244ab5e6404a7e4dad599e6cc29c0d56"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("194d25263da9e3c207149529c9cb5ae79a2453b1d7884c869f33ac470ed8e050"));
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("bdc913768aaa89f28ab88ca6ce2259b438166731ceefc958c922781a7c666687"));
var getPlatformLogs = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d = {}) => d).handler(createSsrRpc("fd201edd96e7f39cd3cfd52c7148c38a62a6929c14c343a89549dd657394eb52"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("012258d378541291265a1e519078def84e60dea73a164aee3646b7c36be4d5db"));
var SEV = {
	info: "bg-slate-100 text-slate-700 border-slate-200",
	warning: "bg-amber-100 text-amber-700 border-amber-200",
	critical: "bg-red-100 text-red-700 border-red-200"
};
function LogsPage() {
	const [sev, setSev] = (0, import_react.useState)("all");
	const fn = useServerFn(getPlatformLogs);
	const { data = [], isLoading } = useQuery({
		queryKey: ["platform-logs", sev],
		queryFn: () => fn({ data: {
			limit: 200,
			severity: sev
		} })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-4 flex-wrap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold text-slate-900",
				children: "Platform Logs"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-600 mt-1",
				children: "Global activity across all tenants and users"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: sev,
				onValueChange: setSev,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "w-48",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "all",
						children: "All severities"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "info",
						children: "Info"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "warning",
						children: "Warning"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "critical",
						children: "Critical"
					})
				] })]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "shadow-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "border-b bg-gradient-to-r from-slate-50 to-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-lg",
					children: "Activity Logs"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-8 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-slate-500",
						children: "Loading logs…"
					})]
				}) : data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-12 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "h-12 w-12 text-slate-300 mx-auto mb-3" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-500 font-medium",
							children: "No logs found"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-slate-400 mt-1",
							children: "Try adjusting your filter"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-slate-100",
					children: data.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 hover:bg-slate-50 transition-colors",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 flex-wrap mb-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: SEV[l.severity] ?? SEV.info,
										children: l.severity
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-semibold text-slate-800",
										children: l.action
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-slate-500",
										children: l.category
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-auto text-xs text-slate-400",
										children: new Date(l.created_at).toLocaleString()
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm text-slate-600",
								children: l.description
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 text-xs text-slate-400",
								children: [
									l.user_name ?? "system",
									" · ",
									l.user_role ?? "—",
									" · tenant ",
									l.admin_id?.slice(0, 8)
								]
							})
						]
					}, l.id))
				})
			})]
		})]
	});
}
//#endregion
export { LogsPage as component };
