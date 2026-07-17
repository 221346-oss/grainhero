import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.audit-logs-bVIRFx3A.js
var import_jsx_runtime = require_jsx_runtime();
var getAudit = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("18a3b9203256bebdd8ed40e10b9dde511b9fc2eba30199d6fd960e16899c903f"));
function AuditLogsPage() {
	const fetchAudit = useServerFn(getAudit);
	const { data, isLoading } = useQuery({
		queryKey: ["platform-audit-logs"],
		queryFn: () => fetchAudit()
	});
	if (isLoading || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6 max-w-7xl mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center py-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-slate-500",
				children: "Loading audit logs…"
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-start justify-between gap-4 flex-wrap",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold text-slate-900",
				children: "Audit Logs"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-600 mt-1",
				children: "Configuration changes, access events, and security events"
			})] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
					className: "border-b bg-gradient-to-r from-slate-50 to-white",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "text-base",
						children: [
							"Activity Logs (",
							data.activity.length,
							")"
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-[500px] overflow-y-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "divide-y divide-slate-100",
							children: [data.activity.map((row) => {
								const r = row;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "p-3 hover:bg-slate-50 transition-colors",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium text-slate-800 text-sm",
										children: String(r.action ?? r.event ?? "activity")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-slate-500 text-xs mt-1",
										children: new Date(String(r.created_at)).toLocaleString()
									})]
								}, String(r.id));
							}), data.activity.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "p-8 text-center text-slate-500",
								children: "No activity logs yet"
							})]
						})
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-md border-l-4 border-l-red-500",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
					className: "border-b bg-gradient-to-r from-red-50 to-white",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "text-base text-red-700",
						children: [
							"Security Events (",
							data.security.length,
							")"
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-[500px] overflow-y-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "divide-y divide-slate-100",
							children: [data.security.map((row) => {
								const r = row;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "p-3 hover:bg-red-50 transition-colors",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium text-slate-800 text-sm",
										children: String(r.event)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-slate-500 text-xs mt-1",
										children: new Date(String(r.created_at)).toLocaleString()
									})]
								}, String(r.id));
							}), data.security.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "p-8 text-center text-slate-500",
								children: "No security events"
							})]
						})
					})
				})]
			})]
		})]
	});
}
//#endregion
export { AuditLogsPage as component };
