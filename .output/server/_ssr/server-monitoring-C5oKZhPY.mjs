import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as Signal, V as Server, _n as Battery, a as Wifi, o as WifiOff } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
import { t as useIsSuperAdmin } from "./useIsSuperAdmin-bJ_EKAEZ.mjs";
import { t as getDeviceHealth } from "./operations2.functions-Dlnt5BX1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-monitoring-C5oKZhPY.js
var import_jsx_runtime = require_jsx_runtime();
function fmtGap(s) {
	if (s == null) return "never";
	if (s < 60) return `${s}s ago`;
	if (s < 3600) return `${Math.round(s / 60)}m ago`;
	if (s < 86400) return `${Math.round(s / 3600)}h ago`;
	return `${Math.round(s / 86400)}d ago`;
}
function ServerMonitoringPage() {
	const fn = useServerFn(getDeviceHealth);
	const { data } = useQuery({
		queryKey: ["device-health"],
		queryFn: () => fn(),
		refetchInterval: 15e3
	});
	const { isSuperAdmin } = useIsSuperAdmin();
	const devices = data?.devices ?? [];
	const totals = data?.totals ?? {
		total: 0,
		online: 0,
		offline: 0,
		lowBattery: 0,
		weakSignal: 0
	};
	const uptime = totals.total ? totals.online / totals.total * 100 : 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Fleet health across every tenant. Read-only." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, { className: "h-6 w-6 text-emerald-600" }), " Device Health"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Live connectivity and hardware status across all sensor devices."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Uptime"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-2xl font-bold text-emerald-600",
							children: [uptime.toFixed(1), "%"]
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Online"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: totals.online
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Offline"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-red-600",
							children: totals.offline
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { className: "h-6 w-6 text-red-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Low battery"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: totals.lowBattery
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-6 w-6 text-amber-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Weak signal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: totals.weakSignal
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signal, { className: "h-6 w-6 text-amber-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Devices" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [devices.length, " sensors"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y",
					children: [devices.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 flex flex-col sm:flex-row sm:items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-wrap",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold",
										children: d.device_name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: d.online ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
										children: d.online ? "online" : "offline"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "text-[10px]",
										children: d.device_type
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: [
									d.device_id,
									" · fw ",
									d.firmware_version ?? "—",
									" · heartbeat ",
									fmtGap(d.secondsSinceHeartbeat)
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2 text-xs",
							children: [d.battery_level != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								variant: "outline",
								className: d.battery_level < 20 ? "text-red-700 border-red-200" : "",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-3 w-3 mr-1" }),
									d.battery_level,
									"%"
								]
							}), d.signal_strength != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								variant: "outline",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Signal, { className: "h-3 w-3 mr-1" }),
									d.signal_strength,
									" dBm"
								]
							})]
						})]
					}, d.id)), devices.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-8 text-center text-sm text-slate-500",
						children: "No devices registered."
					})]
				})
			})] })
		]
	});
}
//#endregion
export { ServerMonitoringPage as component };
