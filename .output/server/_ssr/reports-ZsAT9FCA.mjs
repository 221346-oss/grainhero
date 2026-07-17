import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Lt as Download, Rt as DollarSign, at as Package, b as TrendingUp, kt as FileChartColumnIncreasing, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { i as getReportsData } from "./monitoring.functions-DVigJ2E-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-ZsAT9FCA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function toCsv(rows) {
	if (rows.length === 0) return "";
	const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
	const esc = (v) => {
		if (v == null) return "";
		const s = typeof v === "object" ? JSON.stringify(v) : String(v);
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
	};
	return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
function download(name, csv) {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
}
function ReportsPage() {
	const fn = useServerFn(getReportsData);
	const { data } = useQuery({
		queryKey: ["reports"],
		queryFn: () => fn()
	});
	const [period, setPeriod] = (0, import_react.useState)("30");
	const filtered = (0, import_react.useMemo)(() => {
		if (!data) return {
			batches: [],
			alerts: [],
			invoices: [],
			silos: []
		};
		if (period === "all") return data;
		const cutoff = Date.now() - Number(period) * 24 * 3600 * 1e3;
		const inRange = (t) => t ? new Date(t).getTime() >= cutoff : false;
		return {
			batches: data.batches.filter((b) => inRange(b.created_at ?? b.intake_date)),
			alerts: data.alerts.filter((a) => inRange(a.created_at)),
			invoices: data.invoices.filter((i) => inRange(i.created_at)),
			silos: data.silos
		};
	}, [data, period]);
	const totalKg = filtered.batches.reduce((s, b) => s + Number(b.quantity_kg ?? 0), 0);
	const totalRev = filtered.batches.reduce((s, b) => s + Number(b.revenue ?? 0), 0);
	const totalProfit = filtered.batches.reduce((s, b) => s + Number(b.profit ?? 0), 0);
	const alertsResolved = filtered.alerts.filter((a) => a.status === "resolved").length;
	const spoiled = filtered.batches.filter((b) => b.spoilage_label && String(b.spoilage_label).toLowerCase() !== "safe").length;
	const collected = filtered.invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileChartColumnIncreasing, { className: "h-6 w-6 text-emerald-600" }), " Reports"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-500 mt-1",
					children: "Downloadable operational and financial reports."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: period,
					onValueChange: (v) => setPeriod(v),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-40",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "7",
							children: "Last 7 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "30",
							children: "Last 30 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "90",
							children: "Last 90 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "All time"
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Batches"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold",
								children: filtered.batches.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500",
								children: [(totalKg / 1e3).toFixed(1), "t inventory"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Revenue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-2xl font-bold",
								children: ["$", totalRev.toLocaleString()]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-emerald-600",
								children: [
									"$",
									totalProfit.toLocaleString(),
									" profit"
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Collected"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-2xl font-bold",
								children: ["$", collected.toLocaleString()]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500",
								children: [filtered.invoices.length, " invoices"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Alerts"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold",
								children: filtered.alerts.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500",
								children: [
									alertsResolved,
									" resolved · ",
									spoiled,
									" spoiled"
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-6 w-6 text-red-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [
					{
						title: "Batches report",
						desc: "Grain batch inventory, quality and financials",
						rows: filtered.batches,
						file: "batches.csv"
					},
					{
						title: "Alerts report",
						desc: "Alerts triggered in the selected period",
						rows: filtered.alerts,
						file: "alerts.csv"
					},
					{
						title: "Invoices report",
						desc: "Buyer invoices and payment status",
						rows: filtered.invoices,
						file: "invoices.csv"
					},
					{
						title: "Silo utilization",
						desc: "Current capacity and stock across silos",
						rows: filtered.silos,
						file: "silos.csv"
					}
				].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "flex flex-row items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-base",
						children: r.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: r.desc })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: "outline",
						children: [r.rows.length, " rows"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					disabled: r.rows.length === 0,
					onClick: () => download(r.file, toCsv(r.rows)),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-2" }), " Download CSV"]
				}) })] }, r.title))
			})
		]
	});
}
//#endregion
export { ReportsPage as component };
