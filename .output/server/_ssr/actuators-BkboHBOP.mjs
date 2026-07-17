import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, $t as CircleCheckBig, At as Fan, C as Timer, Dt as Flame, I as Shield, Mt as Eye, N as Snowflake, Q as PowerOff, S as Trash2, Sn as Activity, T as ThermometerSun, Tt as Gauge, U as Search, Z as Power, _t as Lightbulb, hn as Bell, ht as LoaderCircle, i as Wind, tt as Pen, xt as Inbox, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { t as CardsSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { t as Textarea } from "./textarea-1llmCJsE.mjs";
import { t as Checkbox } from "./checkbox-BhwBotB1.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-BCrgGGf7.mjs";
import { t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { t as StatusBadge } from "./DataListPage-yAUru_pi.mjs";
import { m as listActuators, n as controlActuator, r as deleteActuator, w as upsertActuator, x as listSilos } from "./operations.functions-CdIfFwmK.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/radix-ui__react-slider.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/actuators-BkboHBOP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
	ref,
	className: cn("relative flex w-full touch-none select-none items-center", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
		className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-primary" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" })]
}));
Slider.displayName = Slider$1.displayName;
var TYPES = [
	"fan",
	"vent",
	"heater",
	"cooler",
	"alarm",
	"light"
];
var empty = {
	actuator_id: "",
	name: "",
	actuator_type: "fan",
	silo_id: "",
	manufacturer: "",
	model: "",
	mac_address: "",
	status: "active",
	control_mode: "auto",
	is_enabled: true,
	power_level: "80",
	target_fan_speed: "80",
	tags: "",
	notes: ""
};
var typeIcon = (t) => {
	switch (t) {
		case "fan": return Fan;
		case "vent": return Wind;
		case "heater": return Flame;
		case "cooler": return Snowflake;
		case "alarm": return Bell;
		case "light": return Lightbulb;
		default: return Activity;
	}
};
function ActuatorsPage() {
	const qc = useQueryClient();
	const listFn = useServerFn(listActuators);
	const silosFn = useServerFn(listSilos);
	const saveFn = useServerFn(upsertActuator);
	const delFn = useServerFn(deleteActuator);
	const ctrlFn = useServerFn(controlActuator);
	const { data: rows = [], isLoading } = useQuery({
		queryKey: ["actuators"],
		queryFn: () => listFn(),
		refetchInterval: 15e3
	});
	const { data: silos = [] } = useQuery({
		queryKey: ["silos"],
		queryFn: () => silosFn()
	});
	const [query, setQuery] = (0, import_react.useState)("");
	const [typeFilter, setTypeFilter] = (0, import_react.useState)("all");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [dlgOpen, setDlgOpen] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [viewing, setViewing] = (0, import_react.useState)(null);
	const [toDelete, setToDelete] = (0, import_react.useState)(null);
	const [pwmByRow, setPwmByRow] = (0, import_react.useState)({});
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return rows.filter((r) => {
			if (typeFilter !== "all" && r.actuator_type !== typeFilter) return false;
			if (statusFilter !== "all" && r.status !== statusFilter) return false;
			if (!q) return true;
			return r.name.toLowerCase().includes(q) || r.actuator_id.toLowerCase().includes(q) || (r.silos?.name ?? "").toLowerCase().includes(q);
		});
	}, [
		rows,
		query,
		typeFilter,
		statusFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			total: rows.length,
			on: rows.filter((r) => r.is_on).length,
			auto: rows.filter((r) => r.control_mode === "auto").length,
			err: rows.filter((r) => r.status === "error" || r.status === "offline").length
		};
	}, [rows]);
	const save = useMutation({
		mutationFn: (payload) => saveFn({ data: payload }),
		onSuccess: () => {
			toast.success("Actuator saved");
			qc.invalidateQueries({ queryKey: ["actuators"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDlgOpen(false);
			setForm(empty);
		},
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: (id) => delFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Actuator deleted");
			qc.invalidateQueries({ queryKey: ["actuators"] });
			setToDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const control = useMutation({
		mutationFn: (v) => ctrlFn({ data: v }),
		onSuccess: (_d, v) => {
			toast.success(`✅ ${v.action.replace("_", " ")}`);
			qc.invalidateQueries({ queryKey: ["actuators"] });
		},
		onError: (e) => toast.error(`❌ ${e.message}`)
	});
	const openCreate = () => {
		setForm(empty);
		setDlgOpen(true);
	};
	const openEdit = (r) => {
		setForm({
			id: r.id,
			actuator_id: r.actuator_id,
			name: r.name,
			actuator_type: r.actuator_type,
			silo_id: r.silo_id,
			manufacturer: r.manufacturer ?? "",
			model: r.model ?? "",
			mac_address: r.mac_address ?? "",
			status: r.status,
			control_mode: r.control_mode ?? "auto",
			is_enabled: !!r.is_enabled,
			power_level: String(r.power_level ?? 80),
			target_fan_speed: String(r.target_fan_speed ?? 80),
			tags: (r.tags ?? []).join(", "),
			notes: r.notes ?? ""
		});
		setDlgOpen(true);
	};
	const submit = () => {
		if (!form.name || !form.actuator_id || !form.silo_id) {
			toast.error("Name, ID and silo are required");
			return;
		}
		save.mutate({
			id: form.id,
			actuator_id: form.actuator_id,
			name: form.name,
			actuator_type: form.actuator_type,
			silo_id: form.silo_id,
			manufacturer: form.manufacturer || null,
			model: form.model || null,
			mac_address: form.mac_address || null,
			status: form.status,
			control_mode: form.control_mode,
			is_enabled: form.is_enabled,
			power_level: form.power_level ? Number(form.power_level) : null,
			target_fan_speed: form.target_fan_speed ? Number(form.target_fan_speed) : null,
			tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
			notes: form.notes || null
		});
	};
	const emergency = () => {
		rows.filter((r) => r.is_on).forEach((r) => control.mutate({
			id: r.id,
			action: "emergency_stop"
		}));
		toast.warning("🚨 Emergency stop broadcast to all active actuators");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-end md:justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
					title: "Actuator Control Center",
					subtitle: "Fans, vents, heaters, coolers, alarms & lights — direct hardware control"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "destructive",
						size: "sm",
						className: "gap-1.5",
						onClick: emergency,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" }), " Emergency Stop"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: openCreate,
						className: "gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " New Actuator"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total Devices",
						value: stats.total,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-4 w-4" }),
						tone: "indigo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Currently On",
						value: stats.on,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: "h-4 w-4" }),
						tone: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Auto Mode",
						value: stats.auto,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
						tone: "blue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Offline / Error",
						value: stats.err,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" }),
						tone: "rose"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Search by name, ID or silo",
						className: "pl-9"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: typeFilter,
						onValueChange: setTypeFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full sm:w-40",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Type" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "All types"
						}), TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: t,
							children: t
						}, t))] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: statusFilter,
						onValueChange: setStatusFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full sm:w-40",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Status" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "active",
								children: "Active"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "offline",
								children: "Offline"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "error",
								children: "Error"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "maintenance",
								children: "Maintenance"
							})
						] })]
					})]
				})]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardsSkeleton, {}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "py-16 text-center text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "h-8 w-8 mx-auto mb-3 opacity-50" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium",
						children: "No actuators found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm",
						children: "Create one to start controlling hardware."
					})
				]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
				children: filtered.map((r) => {
					const Icon = typeIcon(r.actuator_type);
					const on = !!r.is_on;
					const pwm = pwmByRow[r.id] ?? r.power_level ?? 80;
					const authority = r.control_mode === "manual" ? "HUMAN" : r.control_mode === "failsafe" ? "FAILSAFE" : "ML_AUTO";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: `relative overflow-hidden border-2 transition-all ${on ? "border-emerald-400 shadow-lg shadow-emerald-100/50" : "border-transparent"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
							className: "pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "flex items-center justify-between text-base",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-2 min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `p-2 rounded-lg flex-shrink-0 ${on ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											className: `h-5 w-5 ${on && r.actuator_type === "fan" ? "animate-spin" : ""}`,
											style: on && r.actuator_type === "fan" ? { animationDuration: "1.2s" } : {}
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate",
										children: r.name
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: on ? "default" : "secondary",
									className: on ? "bg-emerald-500" : "",
									children: on ? "Running" : "Idle"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
								className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono",
										children: r.actuator_id
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "capitalize",
										children: r.actuator_type
									}),
									r.silos && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· ", r.silos.name] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: r.status })
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-3 gap-2 text-center",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg border p-2 bg-muted/30",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] uppercase text-muted-foreground",
												children: "Power"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-bold flex items-center justify-center gap-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "h-3 w-3" }),
													r.power_level ?? 0,
													"%"
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg border p-2 bg-muted/30",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] uppercase text-muted-foreground",
												children: "Mode"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-bold text-xs",
												children: authority === "HUMAN" ? "🧑 Manual" : authority === "FAILSAFE" ? "🛡️ Safe" : "🤖 Auto"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg border p-2 bg-muted/30",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] uppercase text-muted-foreground",
												children: "ML"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-bold text-xs capitalize truncate",
												children: r.ml_decision ?? "—"
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										className: "flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700",
										disabled: control.isPending,
										onClick: () => control.mutate({
											id: r.id,
											action: "turn_on",
											value: pwm
										}),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: "h-4 w-4" }),
											" Start (",
											pwm,
											"%)"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										className: "flex-1 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50",
										disabled: control.isPending,
										onClick: () => control.mutate({
											id: r.id,
											action: "turn_off"
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerOff, { className: "h-4 w-4" }), " Stop"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												className: "text-muted-foreground",
												children: "Power Level"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-bold",
												children: [pwm, "%"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
											value: [pwm],
											min: 0,
											max: 100,
											step: 5,
											onValueChange: ([v]) => setPwmByRow((s) => ({
												...s,
												[r.id]: v
											})),
											onValueCommit: ([v]) => control.mutate({
												id: r.id,
												action: "set_value",
												value: v
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex gap-1.5",
											children: [
												20,
												40,
												60,
												80,
												100
											].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: "outline",
												size: "sm",
												className: "flex-1 h-7 text-xs",
												onClick: () => {
													setPwmByRow((s) => ({
														...s,
														[r.id]: v
													}));
													control.mutate({
														id: r.id,
														action: "set_value",
														value: v
													});
												},
												children: [v, "%"]
											}, v))
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2 pt-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "outline",
											size: "sm",
											className: "flex-1 gap-1.5 text-xs",
											onClick: () => control.mutate({
												id: r.id,
												action: r.control_mode === "auto" ? "manual" : "auto"
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-3 w-3" }), r.control_mode === "auto" ? "Take Manual" : "Return to Auto"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: () => setViewing(r),
											title: "Details",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: () => openEdit(r),
											title: "Edit",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: () => setToDelete(r),
											title: "Delete",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-rose-500" })
										})
									]
								})
							]
						})]
					}, r.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2 text-base",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4 text-indigo-600" }), " Control Rules & Safety"]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-2 md:grid-cols-2 text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-blue-700 dark:text-blue-300",
							children: "Lid opens before fan starts"
						}), " — ESP32 opens lid, waits 3s, then starts the fan."] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-amber-700 dark:text-amber-300",
							children: "Manual override expires"
						}), " — After 10 minutes, control returns to Auto/ML."] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5 text-rose-500 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-rose-700 dark:text-rose-300",
							children: "Guardrails"
						}), " — Fan blocked if RH > 80%, dew-point gap < 1°C, or rainfall."] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThermometerSun, { className: "h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-emerald-700 dark:text-emerald-300",
							children: "Min run time"
						}), " — Fan runs 15s minimum to protect the motor."] })]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: dlgOpen,
				onOpenChange: setDlgOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit Actuator" : "New Actuator" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Register a controllable device attached to a silo." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Device ID *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.actuator_id,
										onChange: (e) => setForm({
											...form,
											actuator_id: e.target.value
										}),
										placeholder: "ACT-001"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.name,
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										}),
										placeholder: "Silo A Fan"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Type *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.actuator_type,
									onValueChange: (v) => setForm({
										...form,
										actuator_type: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: t,
										children: t
									}, t)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Silo *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.silo_id,
									onValueChange: (v) => setForm({
										...form,
										silo_id: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select silo" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: silos.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
										value: s.id,
										children: [
											s.name,
											" (",
											s.silo_id,
											")"
										]
									}, s.id)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Manufacturer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.manufacturer,
									onChange: (e) => setForm({
										...form,
										manufacturer: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Model" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.model,
									onChange: (e) => setForm({
										...form,
										model: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "MAC Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.mac_address,
									onChange: (e) => setForm({
										...form,
										mac_address: e.target.value
									}),
									placeholder: "AA:BB:CC:DD:EE:FF"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.status,
									onValueChange: (v) => setForm({
										...form,
										status: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "active",
											children: "Active"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "offline",
											children: "Offline"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "error",
											children: "Error"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "maintenance",
											children: "Maintenance"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Control Mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.control_mode,
									onValueChange: (v) => setForm({
										...form,
										control_mode: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "auto",
											children: "Auto (ML)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "manual",
											children: "Manual"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "failsafe",
											children: "Failsafe"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Default Power %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									min: 0,
									max: 100,
									value: form.power_level,
									onChange: (e) => setForm({
										...form,
										power_level: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Target Speed %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									min: 0,
									max: 100,
									value: form.target_fan_speed,
									onChange: (e) => setForm({
										...form,
										target_fan_speed: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Tags (comma-separated)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.tags,
										onChange: (e) => setForm({
											...form,
											tags: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: form.notes,
										onChange: (e) => setForm({
											...form,
											notes: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										id: "ena",
										checked: form.is_enabled,
										onCheckedChange: (v) => setForm({
											...form,
											is_enabled: !!v
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "ena",
										className: "cursor-pointer",
										children: "Enabled"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setDlgOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: submit,
							disabled: save.isPending,
							children: [save.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), " Save"]
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!viewing,
				onOpenChange: (o) => !o && setViewing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					className: "max-w-lg",
					children: viewing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2",
						children: [(() => {
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(typeIcon(viewing.actuator_type), { className: "h-5 w-5" });
						})(), viewing.name]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
						viewing.actuator_id,
						" · ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "capitalize",
							children: viewing.actuator_type
						})
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Silo",
								val: viewing.silos?.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Warehouse",
								val: viewing.silos?.warehouses?.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Status",
								val: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: viewing.status })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Control mode",
								val: viewing.control_mode ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "On",
								val: viewing.is_on ? "Yes" : "No"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Power",
								val: `${viewing.power_level ?? 0}%`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Target speed",
								val: `${viewing.target_fan_speed ?? 0}%`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "ML decision",
								val: viewing.ml_decision ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Manufacturer",
								val: viewing.manufacturer ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Model",
								val: viewing.model ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "MAC",
								val: viewing.mac_address ?? "—"
							}),
							viewing.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Notes",
								val: viewing.notes
							}),
							viewing.current_operation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded border bg-muted/30 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium mb-1",
									children: "Last operation"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: "whitespace-pre-wrap",
									children: JSON.stringify(viewing.current_operation, null, 2)
								})]
							})
						]
					})] })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!toDelete,
				onOpenChange: (o) => !o && setToDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete actuator?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: toDelete?.name }),
					". This action cannot be undone."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => toDelete && remove.mutate(toDelete.id),
					className: "bg-rose-600 hover:bg-rose-700",
					children: "Delete"
				})] })] })
			})
		]
	});
}
function StatCard({ label, value, icon, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-xl border p-3 bg-gradient-to-br ${{
			indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60",
			emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60",
			blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60",
			rose: "from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-200/60"
		}[tone]}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] uppercase tracking-wider font-medium opacity-80",
				children: label
			}), icon]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-2xl font-bold mt-1",
			children: value
		})]
	});
}
function Row({ label, val }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between border-b py-1.5 last:border-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium",
			children: val
		})]
	});
}
//#endregion
export { ActuatorsPage as component };
