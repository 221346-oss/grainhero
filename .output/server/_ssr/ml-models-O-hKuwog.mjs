import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Sn as Activity, Vt as Cpu, wt as GitBranch, zt as Database } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { r as getMLModels } from "./analytics.functions-1IN0FmxS.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { a as getPlatformMLInference, t as PlatformOverviewTable } from "./PlatformOverviewTable-SNRUTVYA.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ml-models-O-hKuwog.js
var import_jsx_runtime = require_jsx_runtime();
function MLModelsPage() {
	const fetchRole = useServerFn(getMyRole);
	const fetchModels = useServerFn(getMLModels);
	const roleQ = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole()
	});
	const role = roleQ.data?.role ?? "pending";
	const allowed = ["super_admin", "admin"].includes(role);
	const isSuperAdmin = role === "super_admin";
	const { data } = useQuery({
		queryKey: ["ml-models"],
		queryFn: () => fetchModels(),
		enabled: allowed
	});
	const fetchInf = useServerFn(getPlatformMLInference);
	const infQ = useQuery({
		queryKey: ["platform-ml-inference"],
		queryFn: () => fetchInf(),
		enabled: isSuperAdmin
	});
	if (!roleQ.isLoading && !allowed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-8 max-w-lg mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Access restricted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Model performance is available to admins and super admins." })] }) })
	});
	const models = data?.models ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Inference volume, accuracy and confidence measured across every tenant. Retraining is not available from this view." }),
			isSuperAdmin && infQ.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOverviewTable, {
				title: "Per-tenant inference (last 7 days)",
				description: `${infQ.data.totalInferences.toLocaleString()} inferences · ${infQ.data.totalAnomalies.toLocaleString()} anomalies`,
				rows: infQ.data.rows,
				columns: [
					{
						key: "inferences",
						label: "Inferences",
						align: "right",
						render: (r) => r.inferences.toLocaleString()
					},
					{
						key: "critical",
						label: "Critical",
						align: "right",
						render: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: r.critical > 0 ? "text-red-600 font-medium" : "",
							children: r.critical
						})
					},
					{
						key: "anomalies",
						label: "Anomalies",
						align: "right",
						render: (r) => r.anomalies
					},
					{
						key: "anomalyRate",
						label: "Anom rate",
						align: "right",
						render: (r) => `${(r.anomalyRate * 100).toFixed(1)}%`
					},
					{
						key: "avgConfidence",
						label: "Avg conf",
						align: "right",
						render: (r) => `${(r.avgConfidence * 100).toFixed(1)}%`
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "h-6 w-6 text-emerald-600" }), " ML Model Performance"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Health, accuracy and confidence of models powering AI Predictions."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-lg",
						children: m.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
						className: "text-xs mt-1 flex items-center gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: m.id
							}),
							" · ",
							m.algorithm
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: m.status === "production" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
							children: m.status
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-[10px]",
							children: m.version
						})]
					})]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-500 uppercase tracking-wider font-semibold",
									children: "Accuracy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-bold text-emerald-600",
									children: [(m.accuracy * 100).toFixed(1), "%"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
									value: m.accuracy * 100,
									className: "h-1.5 mt-1"
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-500 uppercase tracking-wider font-semibold",
									children: "Avg confidence"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-bold text-slate-900",
									children: [(m.confidence * 100).toFixed(1), "%"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
									value: m.confidence * 100,
									className: "h-1.5 mt-1"
								})
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-3 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-slate-600",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "h-3.5 w-3.5" }),
										m.samples,
										" samples"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-slate-600",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3.5 w-3.5" }), m.type]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-slate-600",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "h-3.5 w-3.5" }), new Date(m.last_trained).toLocaleDateString()]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1",
							children: "Features"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: m.features.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700",
								children: f
							}, f))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1",
							children: "Output classes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: m.classes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100",
								children: c
							}, c))
						})] })
					]
				})] }, m.id))
			})
		]
	});
}
//#endregion
export { MLModelsPage as component };
