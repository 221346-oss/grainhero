import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { It as Droplet, Rt as DollarSign, at as Package, b as TrendingUp, s as Wheat, sn as ChartColumn, w as Thermometer, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { t as getAnalyticsOverview } from "./analytics.functions-1IN0FmxS.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { n as getPlatformAnalyticsBreakdown, t as PlatformOverviewTable } from "./PlatformOverviewTable-SNRUTVYA.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analytics-D-xux8VR.js
var import_jsx_runtime = require_jsx_runtime();
function fmtKg(n) {
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M kg`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}t`;
	return `${Math.round(n)} kg`;
}
function fmtMoney(n) {
	return n.toLocaleString(void 0, {
		style: "currency",
		currency: "PKR",
		maximumFractionDigits: 0
	});
}
function AnalyticsPage() {
	const fetchRole = useServerFn(getMyRole);
	const fetchOverview = useServerFn(getAnalyticsOverview);
	const roleQ = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole()
	});
	const role = roleQ.data?.role ?? "pending";
	const allowed = [
		"super_admin",
		"admin",
		"manager"
	].includes(role);
	const isSuperAdmin = role === "super_admin";
	const { data } = useQuery({
		queryKey: ["analytics-overview"],
		queryFn: () => fetchOverview(),
		enabled: allowed,
		refetchInterval: 6e4
	});
	const fetchPlatform = useServerFn(getPlatformAnalyticsBreakdown);
	const platformQ = useQuery({
		queryKey: ["platform-analytics-breakdown"],
		queryFn: () => fetchPlatform(),
		enabled: isSuperAdmin,
		refetchInterval: 6e4
	});
	if (!roleQ.isLoading && !allowed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-8 max-w-lg mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Access restricted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Analytics is available to managers, admins and super admins." })] }) })
	});
	const t = data?.totals;
	const env = data?.environmental;
	const trend = data?.trend ?? [];
	const byGrain = data?.byGrain ?? [];
	const byStatus = data?.byStatus ?? [];
	const alertsByPriority = data?.alertsByPriority ?? [];
	const maxTrend = Math.max(1, ...trend.map((d) => d.kg));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Aggregated operational and financial metrics across every tenant." }),
			isSuperAdmin && platformQ.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOverviewTable, {
				title: "Per-tenant performance",
				description: `${platformQ.data.totalTenants} tenants · ${fmtKg(platformQ.data.totals.kg)} · ${fmtMoney(platformQ.data.totals.revenue)}`,
				rows: platformQ.data.rows,
				columns: [
					{
						key: "batches",
						label: "Batches",
						align: "right",
						render: (r) => r.batches
					},
					{
						key: "kg",
						label: "Volume",
						align: "right",
						render: (r) => fmtKg(r.kg)
					},
					{
						key: "revenue",
						label: "Revenue",
						align: "right",
						render: (r) => fmtMoney(r.revenue)
					},
					{
						key: "margin",
						label: "Margin",
						align: "right",
						render: (r) => `${(r.margin * 100).toFixed(1)}%`
					},
					{
						key: "spoilageRate",
						label: "Spoilage",
						align: "right",
						render: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: r.spoilageRate > .1 ? "text-red-600 font-medium" : "",
							children: [(r.spoilageRate * 100).toFixed(1), "%"]
						})
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-6 w-6 text-emerald-600" }), " Business Analytics"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Operational and financial performance across your grain operations."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Total inventory"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold text-slate-900",
								children: fmtKg(t?.totalKg ?? 0)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: [t?.batches ?? 0, " batches"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Revenue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold text-slate-900",
								children: fmtMoney(t?.totalRevenue ?? 0)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-emerald-600 mt-1",
								children: [((t?.margin ?? 0) * 100).toFixed(1), "% margin"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Capacity used"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-2xl font-bold text-slate-900",
								children: [((t?.utilization ?? 0) * 100).toFixed(0), "%"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
								value: (t?.utilization ?? 0) * 100,
								className: "h-1.5 mt-2"
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Spoilage rate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-2xl font-bold text-red-600",
								children: [((t?.spoilageRate ?? 0) * 100).toFixed(1), "%"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: [
									t?.spoiled ?? 0,
									" affected · ",
									t?.openAlerts ?? 0,
									" open alerts"
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-6 w-6 text-red-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thermometer, { className: "h-5 w-5 text-orange-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Avg temperature"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xl font-bold",
							children: [(env?.avgTemp ?? 0).toFixed(1), "°C"]
						})] })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Droplet, { className: "h-5 w-5 text-blue-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Avg humidity"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xl font-bold",
							children: [(env?.avgHum ?? 0).toFixed(1), "%"]
						})] })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "h-5 w-5 text-amber-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Avg moisture"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xl font-bold",
							children: [(env?.avgMoist ?? 0).toFixed(1), "%"]
						})] })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Intake trend (30 days)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Daily inventory received" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-end gap-1 h-40",
				children: trend.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 flex flex-col items-center justify-end group",
					title: `${d.date}: ${fmtKg(d.kg)} (${d.batches} batches)`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-full bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600",
						style: {
							height: `${d.kg / maxTrend * 100}%`,
							minHeight: d.kg > 0 ? "2px" : "0"
						}
					})
				}, d.date))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between text-[10px] text-slate-400 mt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: trend[0]?.date }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: trend[trend.length - 1]?.date })]
			})] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "By grain type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Volume and revenue split" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-3",
					children: [byGrain.map((g) => {
						const max = Math.max(1, ...byGrain.map((x) => x.kg));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between text-sm mb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "capitalize font-medium",
								children: g.grain
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-slate-500",
								children: [
									fmtKg(g.kg),
									" · ",
									fmtMoney(g.revenue)
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-2 bg-slate-100 rounded-full overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full bg-emerald-500 rounded-full",
								style: { width: `${g.kg / max * 100}%` }
							})
						})] }, g.grain);
					}), byGrain.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm text-slate-500 text-center py-6",
						children: "No batches yet."
					})]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Alerts & status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Distribution across priorities and batch states" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase text-slate-500 font-semibold mb-2",
						children: "Alerts by priority"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-2",
						children: alertsByPriority.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center p-2 rounded border border-slate-100",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-bold text-slate-900",
								children: a.count
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] uppercase text-slate-500",
								children: a.priority
							})]
						}, a.priority))
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase text-slate-500 font-semibold mb-2",
						children: "Batch status"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: byStatus.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "outline",
							className: "text-xs",
							children: [
								s.status,
								": ",
								s.count
							]
						}, s.status))
					})] })]
				})] })]
			})
		]
	});
}
//#endregion
export { AnalyticsPage as component };
