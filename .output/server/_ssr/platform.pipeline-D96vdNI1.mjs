import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Rt as DollarSign, b as TrendingUp, bn as ArrowRight, ht as LoaderCircle } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as adminListHubspotDeals, r as adminUpdateDealStage } from "./hubspot.functions-XOaLLP_6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.pipeline-D96vdNI1.js
var import_jsx_runtime = require_jsx_runtime();
var STAGES = [
	{
		id: "appointmentscheduled",
		label: "Trial Started",
		color: "bg-blue-100 text-blue-700 border-blue-200"
	},
	{
		id: "qualifiedtobuy",
		label: "Trial Active",
		color: "bg-indigo-100 text-indigo-700 border-indigo-200"
	},
	{
		id: "presentationscheduled",
		label: "Trial Engaged",
		color: "bg-purple-100 text-purple-700 border-purple-200"
	},
	{
		id: "decisionmakerboughtin",
		label: "Demo Requested",
		color: "bg-amber-100 text-amber-700 border-amber-200"
	},
	{
		id: "contractsent",
		label: "Quote Sent",
		color: "bg-orange-100 text-orange-700 border-orange-200"
	},
	{
		id: "closedwon",
		label: "Closed Won",
		color: "bg-emerald-100 text-emerald-700 border-emerald-200"
	},
	{
		id: "closedlost",
		label: "Closed Lost",
		color: "bg-red-100 text-red-700 border-red-200"
	}
];
function PipelinePage() {
	const listFn = useServerFn(adminListHubspotDeals);
	const updateFn = useServerFn(adminUpdateDealStage);
	const qc = useQueryClient();
	const { data, isLoading, error } = useQuery({
		queryKey: ["platform-pipeline"],
		queryFn: () => listFn()
	});
	const mut = useMutation({
		mutationFn: (v) => updateFn({ data: v }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-pipeline"] })
	});
	const dealsByStage = /* @__PURE__ */ new Map();
	for (const s of STAGES) dealsByStage.set(s.id, []);
	for (const d of data?.results ?? []) {
		const stage = d.properties?.dealstage ?? "appointmentscheduled";
		if (!dealsByStage.has(stage)) dealsByStage.set(stage, []);
		dealsByStage.get(stage).push(d);
	}
	const totalDeals = data?.results?.length ?? 0;
	const totalValue = (data?.results ?? []).reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);
	const wonDeals = dealsByStage.get("closedwon")?.length ?? 0;
	const wonValue = (dealsByStage.get("closedwon") ?? []).reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold text-slate-900",
					children: "Sales Pipeline"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-600 mt-1",
					children: "HubSpot deals across the sales funnel"
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-4 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-blue-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Total Deals"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-3xl font-bold mt-1 text-slate-900",
									children: totalDeals
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-8 w-8 text-blue-600" })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-purple-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Pipeline Value"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-3xl font-bold mt-1 text-slate-900",
									children: ["PKR ", totalValue.toLocaleString()]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-8 w-8 text-purple-600" })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-emerald-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Won Deals"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-3xl font-bold mt-1 text-emerald-700",
									children: wonDeals
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-8 w-8 text-emerald-600" })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-green-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Won Value"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-3xl font-bold mt-1 text-green-700",
									children: ["PKR ", wonValue.toLocaleString()]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-8 w-8 text-green-600" })]
							})
						})
					})
				]
			}),
			isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-8 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-slate-500",
					children: "Loading pipeline…"
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-l-4 border-l-red-500",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-red-600 font-medium",
						children: ["Error: ", error.message]
					})
				})
			}),
			!isLoading && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
				children: STAGES.map((s) => {
					const list = dealsByStage.get(s.id) ?? [];
					const stageValue = list.reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "shadow-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
							className: "pb-3 bg-gradient-to-r from-slate-50 to-white border-b",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
									className: "text-sm font-bold text-slate-700",
									children: s.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "outline",
									className: s.color,
									children: list.length
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
								className: "text-xs mt-1",
								children: ["PKR ", stageValue.toLocaleString()]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3 space-y-2 max-h-[400px] overflow-y-auto",
							children: [list.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow bg-white",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-semibold text-slate-800 truncate mb-1",
										children: d.properties?.dealname ?? d.id
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm text-emerald-600 font-medium mb-2",
										children: ["PKR ", Number(d.properties?.amount ?? 0).toLocaleString()]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex gap-1 flex-wrap",
										children: STAGES.filter((x) => x.id !== s.id).slice(0, 2).map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "outline",
											className: "h-7 px-2 text-xs",
											onClick: () => mut.mutate({
												dealId: d.id,
												stage: x.id
											}),
											disabled: mut.isPending,
											children: [mut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3 w-3 mr-1" }), x.label]
										}, x.id))
									})
								]
							}, d.id)), list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-center py-8 text-slate-400 text-sm",
								children: "No deals in this stage"
							})]
						})]
					}, s.id);
				})
			})
		]
	});
}
//#endregion
export { PipelinePage as component };
