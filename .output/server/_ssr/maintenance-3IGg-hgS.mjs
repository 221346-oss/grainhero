import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Jt as Clock, Qt as CircleCheck, U as Search, _n as Battery, r as Wrench, z as ShieldAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
import { t as useIsSuperAdmin } from "./useIsSuperAdmin-bJ_EKAEZ.mjs";
import { a as markMaintenanceDone, n as getMaintenanceOverview, r as getPlatformMaintenanceOverview } from "./operations2.functions-Dlnt5BX1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/maintenance-3IGg-hgS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function urgencyBadge(next) {
	if (!next) return {
		cls: "bg-slate-100 text-slate-700",
		label: "Unscheduled"
	};
	const t = new Date(next).getTime();
	const now = Date.now();
	if (t < now) return {
		cls: "bg-red-100 text-red-800",
		label: `Overdue ${Math.ceil((now - t) / 864e5)}d`
	};
	const days = Math.ceil((t - now) / 864e5);
	if (days <= 30) return {
		cls: "bg-amber-100 text-amber-800",
		label: `Due in ${days}d`
	};
	return {
		cls: "bg-emerald-100 text-emerald-800",
		label: `In ${days}d`
	};
}
function MaintenancePage() {
	const { isSuperAdmin } = useIsSuperAdmin();
	if (isSuperAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformMaintenanceView, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TenantMaintenanceView, {});
}
function TenantMaintenanceView() {
	const fn = useServerFn(getMaintenanceOverview);
	const doneFn = useServerFn(markMaintenanceDone);
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["maintenance"],
		queryFn: () => fn()
	});
	const [q, setQ] = (0, import_react.useState)("");
	const doneM = useMutation({
		mutationFn: (args) => doneFn({ data: {
			...args,
			nextInDays: 180
		} }),
		onSuccess: () => {
			toast.success("Marked serviced");
			qc.invalidateQueries({ queryKey: ["maintenance"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed")
	});
	const devices = data?.devices ?? [];
	const actuators = data?.actuators ?? [];
	const totals = data?.totals ?? {
		devices: 0,
		actuators: 0,
		overdue: 0,
		dueSoon: 0,
		lowBattery: 0,
		warrantyExpiring: 0
	};
	const combined = (0, import_react.useMemo)(() => {
		const term = q.trim().toLowerCase();
		const items = [...devices.map((d) => ({
			...d,
			kind: "device",
			name: d.device_name,
			id_str: d.device_id
		})), ...actuators.map((a) => ({
			...a,
			kind: "actuator",
			name: a.name,
			id_str: a.actuator_id
		}))];
		return term ? items.filter((i) => i.name?.toLowerCase().includes(term) || i.id_str?.toLowerCase().includes(term)) : items;
	}, [
		devices,
		actuators,
		q
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-6 w-6 text-emerald-600" }), " Maintenance"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Servicing schedule for sensors and actuators."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Assets"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold",
								children: totals.devices + totals.actuators
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500",
								children: [
									totals.devices,
									" sensors · ",
									totals.actuators,
									" actuators"
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-6 w-6 text-slate-500" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Overdue"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-red-600",
							children: totals.overdue
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-6 w-6 text-red-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Due 30d"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: totals.dueSoon
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-6 w-6 text-amber-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Low battery"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold",
								children: totals.lowBattery
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500",
								children: [totals.warrantyExpiring, " warranty exp."]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-6 w-6 text-amber-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex flex-row items-center justify-between gap-3 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Service schedule" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [combined.length, " assets"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search…",
						className: "pl-8 w-56"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y",
					children: [combined.map((i) => {
						const u = urgencyBadge(i.next_maintenance_date);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 flex flex-col sm:flex-row sm:items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-slate-900",
											children: i.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "outline",
											className: "text-[10px]",
											children: i.kind
										}),
										i.kind === "device" && i.battery_level != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: i.battery_level < 20 ? "text-red-700 border-red-200" : "",
											children: [i.battery_level, "%"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: u.cls + " text-[10px]",
											children: u.label
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-slate-500 mt-1",
									children: [
										i.id_str,
										i.manufacturer ? ` · ${i.manufacturer} ${i.model ?? ""}` : "",
										i.last_maintenance_date ? ` · last ${new Date(i.last_maintenance_date).toLocaleDateString()}` : ""
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								onClick: () => doneM.mutate({
									id: i.id,
									kind: i.kind
								}),
								disabled: doneM.isPending,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5 mr-1" }), " Mark serviced"]
							})]
						}, `${i.kind}-${i.id}`);
					}), combined.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-8 text-center text-sm text-slate-500",
						children: "No assets found."
					})]
				})
			})] })
		]
	});
}
function PlatformMaintenanceView() {
	const fn = useServerFn(getPlatformMaintenanceOverview);
	const { data, isLoading, error } = useQuery({
		queryKey: ["platform-maintenance"],
		queryFn: () => fn(),
		refetchInterval: 6e4
	});
	const totals = data?.totals ?? {
		devices: 0,
		overdue: 0,
		dueSoon: 0,
		lowBattery: 0
	};
	const tenants = data?.tenants ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Overdue and upcoming maintenance across every tenant. Read-only." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-6 w-6 text-emerald-600" }), " Platform maintenance"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Tenants ranked by overdue devices."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Devices"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: totals.devices
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-6 w-6 text-slate-500" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Overdue"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-red-600",
							children: totals.overdue
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-6 w-6 text-red-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Due 30d"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: totals.dueSoon
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-6 w-6 text-amber-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Low battery"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: totals.lowBattery
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-6 w-6 text-amber-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Worst-offender tenants" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Ranked by overdue devices, then due-soon." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-8 text-center text-sm text-slate-500",
					children: "Loading…"
				}) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-8 text-center text-sm text-red-600",
					children: ["Failed to load: ", error.message]
				}) : tenants.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-8 text-center text-sm text-slate-500",
					children: "Every tenant is up to date."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y",
					children: tenants.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 flex items-center gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-semibold text-slate-900 truncate",
									children: t.tenantName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-slate-500",
									children: [
										t.devices,
										" device",
										t.devices === 1 ? "" : "s"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								className: "bg-red-100 text-red-800 border-red-200",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "h-3.5 w-3.5 mr-1" }),
									t.overdue,
									" overdue"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								className: "bg-amber-100 text-amber-800 border-amber-200",
								children: [t.dueSoon, " due 30d"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								variant: "outline",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-3.5 w-3.5 mr-1" }),
									t.lowBattery,
									" low"
								]
							})
						]
					}, t.adminId))
				})
			})] })
		]
	});
}
//#endregion
export { MaintenancePage as component };
