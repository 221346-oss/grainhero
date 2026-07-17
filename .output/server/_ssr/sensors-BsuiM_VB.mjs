import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { $ as Plus, Ft as Droplets, Mt as Eye, S as Trash2, U as Search, Vt as Cpu, Y as Radio, _n as Battery, a as Wifi, at as Package, dn as Building2, ht as LoaderCircle, i as Wind, o as WifiOff, tt as Pen, w as Thermometer, xt as Inbox, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { i as ListSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
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
import { O as upsertSensorDevice, S as listWarehouses, b as listSensorDevices, g as listDeviceReadings, s as deleteSensorDevice, x as listSilos, y as listLatestSensorReadings } from "./operations.functions-CdIfFwmK.mjs";
import { t as useRealtimeInvalidate } from "./use-realtime-invalidate-DId6JN-1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sensors-BsuiM_VB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SENSOR_TYPES = [
	"temperature",
	"humidity",
	"co2",
	"voc",
	"moisture",
	"pressure",
	"light",
	"ph"
];
var emptyForm = {
	device_name: "",
	mac_address: "",
	model: "",
	manufacturer: "",
	firmware_version: "",
	device_type: "environmental",
	category: "environmental",
	sensor_types: ["temperature", "humidity"],
	warehouse_id: "",
	silo_id: "",
	status: "active",
	power_source: "",
	data_transmission_interval: "60",
	calibration_interval_days: "365",
	last_calibration_date: "",
	is_enabled: true,
	notes: ""
};
function SensorsPage() {
	const listFn = useServerFn(listSensorDevices);
	const upsertFn = useServerFn(upsertSensorDevice);
	const deleteFn = useServerFn(deleteSensorDevice);
	const latestFn = useServerFn(listLatestSensorReadings);
	const historyFn = useServerFn(listDeviceReadings);
	const listWhFn = useServerFn(listWarehouses);
	const listSiloFn = useServerFn(listSilos);
	const qc = useQueryClient();
	useRealtimeInvalidate("sensor_readings", [["sensor-readings-latest"]]);
	useRealtimeInvalidate("actuators", [["actuators"]]);
	const { data, isLoading } = useQuery({
		queryKey: ["sensor-devices"],
		queryFn: () => listFn()
	});
	const { data: readings } = useQuery({
		queryKey: ["sensor-readings-latest"],
		queryFn: () => latestFn(),
		refetchInterval: 3e4
	});
	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses"],
		queryFn: () => listWhFn()
	});
	const { data: silosData } = useQuery({
		queryKey: ["silos"],
		queryFn: () => listSiloFn()
	});
	const warehouses = warehousesData ?? [];
	const silos = silosData ?? [];
	(0, import_react.useEffect)(() => {
		const ch = supabase.channel("sensor_readings_live").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "sensor_readings"
		}, () => {
			qc.invalidateQueries({ queryKey: ["sensor-readings-latest"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [qc]);
	const readingByDevice = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const r of readings ?? []) m.set(r.device_id, r);
		return m;
	}, [readings]);
	const [q, setQ] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [typeFilter, setTypeFilter] = (0, import_react.useState)("all");
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [viewOpen, setViewOpen] = (0, import_react.useState)(false);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const rows = (0, import_react.useMemo)(() => {
		return (data ?? []).filter((d) => {
			if (statusFilter !== "all" && d.status !== statusFilter) return false;
			if (typeFilter !== "all" && !(d.sensor_types ?? []).includes(typeFilter)) return false;
			if (!q.trim()) return true;
			const t = q.toLowerCase();
			return d.device_name?.toLowerCase().includes(t) || d.device_id?.toLowerCase().includes(t) || d.mac_address?.toLowerCase().includes(t) || d.silos?.name?.toLowerCase().includes(t);
		});
	}, [
		data,
		q,
		statusFilter,
		typeFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			total: rows.length,
			online: rows.filter((r) => r.status === "active").length,
			maint: rows.filter((r) => r.status === "maintenance").length,
			err: rows.filter((r) => r.status === "error" || r.status === "offline").length
		};
	}, [rows]);
	const saveMut = useMutation({
		mutationFn: (f) => upsertFn({ data: {
			id: f.id,
			device_name: f.device_name,
			mac_address: f.mac_address.trim() || null,
			model: f.model.trim() || null,
			manufacturer: f.manufacturer.trim() || null,
			firmware_version: f.firmware_version.trim() || null,
			device_type: f.device_type || null,
			category: f.category || null,
			sensor_types: f.sensor_types,
			warehouse_id: f.warehouse_id,
			silo_id: f.silo_id,
			status: f.status,
			power_source: f.power_source || null,
			data_transmission_interval: f.data_transmission_interval ? Number(f.data_transmission_interval) : null,
			calibration_interval_days: f.calibration_interval_days ? Number(f.calibration_interval_days) : null,
			last_calibration_date: f.last_calibration_date || null,
			is_enabled: f.is_enabled,
			notes: f.notes.trim() || null
		} }),
		onSuccess: () => {
			toast.success(form.id ? "Sensor updated" : "Sensor created");
			qc.invalidateQueries({ queryKey: ["sensor-devices"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setEditOpen(false);
			setForm(emptyForm);
		},
		onError: (e) => toast.error(e.message || "Save failed")
	});
	const deleteMut = useMutation({
		mutationFn: (id) => deleteFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Sensor deleted");
			qc.invalidateQueries({ queryKey: ["sensor-devices"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDeleteId(null);
		},
		onError: (e) => toast.error(e.message || "Delete failed")
	});
	function openCreate() {
		setForm({
			...emptyForm,
			warehouse_id: warehouses[0]?.id ?? "",
			silo_id: ""
		});
		setEditOpen(true);
	}
	function openEdit(d) {
		setForm({
			id: d.id,
			device_name: d.device_name,
			mac_address: d.mac_address ?? "",
			model: d.model ?? "",
			manufacturer: d.manufacturer ?? "",
			firmware_version: d.firmware_version ?? "",
			device_type: d.device_type ?? "environmental",
			category: d.device_type ?? "environmental",
			sensor_types: d.sensor_types ?? [],
			warehouse_id: d.warehouse_id,
			silo_id: d.silo_id ?? "",
			status: d.status,
			power_source: d.power_source ?? "",
			data_transmission_interval: d.data_transmission_interval != null ? String(d.data_transmission_interval) : "60",
			calibration_interval_days: d.calibration_interval_days != null ? String(d.calibration_interval_days) : "365",
			last_calibration_date: d.last_calibration_date ?? "",
			is_enabled: d.is_enabled ?? true,
			notes: d.notes ?? ""
		});
		setEditOpen(true);
	}
	const filteredSilos = form.warehouse_id ? silos.filter((s) => s.warehouse_id === form.warehouse_id) : silos;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Sensor Devices",
				subtitle: "IoT devices, live telemetry & health",
				badge: isLoading ? "…" : `${rows.length}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Cpu,
						label: "Devices",
						value: stats.total,
						tint: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Wifi,
						label: "Online",
						value: stats.online,
						tint: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Radio,
						label: "Maintenance",
						value: stats.maint,
						tint: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: WifiOff,
						label: "Offline / err",
						value: stats.err,
						tint: "rose"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row gap-2 mb-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value),
							placeholder: "Search device, MAC, silo…",
							className: "pl-9"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 sm:flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: typeFilter,
							onValueChange: setTypeFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Sensor type" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All types"
							}), SENSOR_TYPES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: s,
								children: s
							}, s))] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: statusFilter,
							onValueChange: setStatusFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Status" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All statuses"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "active",
									children: "Active"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "maintenance",
									children: "Maintenance"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "offline",
									children: "Offline"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "error",
									children: "Error"
								})
							] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: openCreate,
						className: "gap-2 whitespace-nowrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " New sensor"]
					})
				]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-dashed border-slate-300 bg-white/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "py-16 flex flex-col items-center text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "w-10 h-10 mb-3 opacity-40" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm mb-4",
							children: "No sensor devices."
						}),
						silos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/silos",
							className: "text-sm text-emerald-700 underline",
							children: "Create a silo first →"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: openCreate,
							size: "sm",
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " Add sensor"]
						})
					]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
				children: rows.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SensorCard, {
					device: d,
					reading: readingByDevice.get(d.id) ?? null,
					onView: () => {
						setSelected(d);
						setViewOpen(true);
					},
					onEdit: () => openEdit(d),
					onDelete: () => setDeleteId(d.id)
				}, d.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editOpen,
				onOpenChange: (o) => {
					setEditOpen(o);
					if (!o) setForm(emptyForm);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg max-h-[92vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit sensor" : "New sensor device" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Device ID is auto-generated if omitted." })] }),
						warehouses.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "You have no warehouses yet."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/warehouses",
									className: "underline",
									children: "Create a warehouse first"
								}),
								" — sensors must be attached to a silo inside a warehouse."
							] })]
						}),
						warehouses.length > 0 && form.warehouse_id && filteredSilos.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 mt-0.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "This warehouse has no silos."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/silos",
									className: "underline",
									children: "Add a silo"
								}),
								" before registering a sensor."
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							id: "sensor-form",
							className: "grid gap-3 py-2",
							onSubmit: (e) => {
								e.preventDefault();
								saveMut.mutate(form);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Device name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									required: true,
									value: form.device_name,
									onChange: (e) => setForm({
										...form,
										device_name: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warehouse *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.warehouse_id,
										onValueChange: (v) => setForm({
											...form,
											warehouse_id: v,
											silo_id: ""
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: warehouses.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: w.id,
											children: w.name
										}, w.id)) })]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Silo *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.silo_id,
										onValueChange: (v) => setForm({
											...form,
											silo_id: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: filteredSilos.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: s.id,
											children: s.name
										}, s.id)) })]
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "mb-1 block",
									children: "Sensor types"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-4 gap-1.5",
									children: SENSOR_TYPES.map((t) => {
										const on = form.sensor_types.includes(t);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setForm({
												...form,
												sensor_types: on ? form.sensor_types.filter((x) => x !== t) : [...form.sensor_types, t]
											}),
											className: `text-xs px-2 py-1 rounded border ${on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600"}`,
											children: t
										}, t);
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Model" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.model,
											onChange: (e) => setForm({
												...form,
												model: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Manufacturer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.manufacturer,
											onChange: (e) => setForm({
												...form,
												manufacturer: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "MAC address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.mac_address,
											onChange: (e) => setForm({
												...form,
												mac_address: e.target.value
											}),
											placeholder: "AA:BB:CC:…"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Firmware" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.firmware_version,
											onChange: (e) => setForm({
												...form,
												firmware_version: e.target.value
											}),
											placeholder: "v1.0.0"
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
													value: "maintenance",
													children: "Maintenance"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "offline",
													children: "Offline"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "error",
													children: "Error"
												})
											] })]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Power source" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.power_source || "none",
											onValueChange: (v) => setForm({
												...form,
												power_source: v === "none" ? "" : v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "none",
													children: "—"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "solar",
													children: "Solar"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "battery",
													children: "Battery"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "direct",
													children: "Direct"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "hybrid",
													children: "Hybrid"
												})
											] })]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Transmit every (s)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											min: 1,
											value: form.data_transmission_interval,
											onChange: (e) => setForm({
												...form,
												data_transmission_interval: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Calibration (days)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											min: 1,
											value: form.calibration_interval_days,
											onChange: (e) => setForm({
												...form,
												calibration_interval_days: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Last calibration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												type: "date",
												value: form.last_calibration_date,
												onChange: (e) => setForm({
													...form,
													last_calibration_date: e.target.value
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "col-span-2 flex items-center gap-2 text-sm text-slate-700",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
												checked: form.is_enabled,
												onCheckedChange: (v) => setForm({
													...form,
													is_enabled: !!v
												})
											}), " Device enabled"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
												rows: 2,
												value: form.notes,
												onChange: (e) => setForm({
													...form,
													notes: e.target.value
												})
											})]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setEditOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col items-end gap-1",
								children: [(!form.device_name || !form.warehouse_id || !form.silo_id) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] text-muted-foreground",
									children: [
										"Missing:",
										" ",
										[
											!form.device_name && "name",
											!form.warehouse_id && "warehouse",
											!form.silo_id && "silo"
										].filter(Boolean).join(", ")
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									form: "sensor-form",
									type: "submit",
									disabled: saveMut.isPending || !form.device_name || !form.warehouse_id || !form.silo_id,
									children: saveMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : form.id ? "Save changes" : "Create sensor"
								})]
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: viewOpen,
				onOpenChange: setViewOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					className: "max-w-xl max-h-[92vh] overflow-y-auto",
					children: selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeviceDetail, {
						device: selected,
						reading: readingByDevice.get(selected.id) ?? null,
						historyFn,
						onEdit: () => {
							setViewOpen(false);
							openEdit(selected);
						}
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleteId,
				onOpenChange: (o) => !o && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete sensor?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "Historical readings remain but the device link will be broken." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => deleteId && deleteMut.mutate(deleteId),
					className: "bg-rose-600 hover:bg-rose-700",
					children: deleteMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Delete"
				})] })] })
			})
		]
	});
}
function SensorCard({ device, reading, onView, onEdit, onDelete }) {
	const heartbeatAge = device.last_heartbeat ? Math.round((Date.now() - new Date(device.last_heartbeat).getTime()) / 6e4) : null;
	const live = reading ? Date.now() - new Date(reading.reading_timestamp).getTime() < 5 * 6e4 : false;
	const batt = reading?.battery_level ?? device.battery_level;
	const sig = reading?.signal_strength ?? device.signal_strength;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "border-slate-200/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-4 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-slate-900 truncate",
								children: device.device_name
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-slate-500 truncate mt-0.5",
							children: device.device_id
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: device.status }), live && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 text-[10px] text-emerald-700",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "relative flex h-1.5 w-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" })]
							}), " Live"]
						})]
					})]
				}),
				device.silos && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-slate-600 flex items-center gap-1 min-w-0 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "w-3 h-3 shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: device.silos.name
						}),
						device.warehouses && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-400",
								children: "·"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3 h-3" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: device.warehouses.name
							})
						] })
					]
				}),
				(device.sensor_types ?? []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1",
					children: (device.sensor_types ?? []).slice(0, 6).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "secondary",
						className: "text-[10px] h-4 px-1.5",
						children: t
					}, t))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-4 gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
							icon: Thermometer,
							value: reading?.temperature_value,
							unit: "°"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
							icon: Droplets,
							value: reading?.humidity_value,
							unit: "%"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
							icon: Wind,
							value: reading?.co2_value,
							unit: ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
							icon: TriangleAlert,
							value: reading?.voc_value,
							unit: "",
							tone: reading?.anomaly_detected ? "warn" : void 0
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "w-3 h-3" }),
								" ",
								batt != null ? `${Math.round(Number(batt))}%` : "—"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "w-3 h-3" }),
								" ",
								sig != null ? `${Math.round(Number(sig))} dBm` : "—"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: heartbeatAge != null ? `${heartbeatAge}m ago` : "no beat" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onView,
							className: "h-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5 mr-1" }), "View"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onEdit,
							className: "h-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-3.5 h-3.5 mr-1" }), "Edit"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onDelete,
							className: "h-8 text-rose-600 hover:text-rose-700",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
						})
					]
				})
			]
		})
	});
}
function DeviceDetail({ device, reading, historyFn, onEdit }) {
	const { data: history, isLoading } = useQuery({
		queryKey: ["device-readings", device.id],
		queryFn: () => historyFn({ data: {
			device_id: device.id,
			limit: 30
		} }),
		refetchInterval: 3e4
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
			className: "flex items-center gap-2 min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "w-5 h-5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: device.device_name
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [device.device_id, device.model ? ` · ${device.model}` : ""] })] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 text-sm py-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Status",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: device.status })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Silo",
					children: device.silos?.name ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Warehouse",
					children: device.warehouses?.name ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Manufacturer",
					children: device.manufacturer ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Firmware",
					children: device.firmware_version ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "MAC",
					children: device.mac_address ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Power",
					children: device.power_source ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Battery",
					children: reading?.battery_level ?? device.battery_level ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
					label: "Signal",
					children: [reading?.signal_strength ?? device.signal_strength ?? "—", " dBm"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Last heartbeat",
					children: device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString() : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Calibration due",
					children: device.calibration_due_date ? new Date(device.calibration_due_date).toLocaleDateString() : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-3 border-t border-slate-100",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase tracking-wider text-slate-500 mb-2",
						children: "Latest reading"
					}), reading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-4 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
								icon: Thermometer,
								value: reading.temperature_value,
								unit: "°C"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
								icon: Droplets,
								value: reading.humidity_value,
								unit: "%"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
								icon: Wind,
								value: reading.co2_value,
								unit: "ppm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniReading, {
								icon: TriangleAlert,
								value: reading.voc_value,
								unit: ""
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500",
						children: "No readings yet."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-3 border-t border-slate-100",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase tracking-wider text-slate-500 mb-2",
						children: "Recent history"
					}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin text-slate-400" }) : !history || history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500",
						children: "No history."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-56 overflow-y-auto rounded border border-slate-100 divide-y divide-slate-100 text-xs",
						children: history.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-5 items-center px-2 py-1 gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "col-span-2 text-slate-500",
									children: new Date(r.reading_timestamp).toLocaleTimeString()
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: r.temperature_value != null ? `${Number(r.temperature_value).toFixed(1)}°` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: r.humidity_value != null ? `${Number(r.humidity_value).toFixed(0)}%` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-right",
									children: r.anomaly_detected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "destructive",
										className: "text-[9px] h-4 px-1",
										children: "anom"
									}) : r.ml_risk_class ?? ""
								})
							]
						}, r.id))
					})]
				}),
				device.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-2 border-t border-slate-100",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase tracking-wider text-slate-500 mb-1",
						children: "Notes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-slate-700 whitespace-pre-wrap",
						children: device.notes
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, {
			className: "gap-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				onClick: onEdit,
				children: "Edit"
			})
		})
	] });
}
function MiniReading({ icon: Icon, value, unit, tone }) {
	const has = value != null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded border px-1.5 py-1 text-center ${!has ? "bg-slate-50 text-slate-400 border-slate-200" : tone === "warn" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3 h-3 mx-auto opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs font-semibold tabular-nums leading-tight",
			children: has ? `${Number(value).toFixed(unit === "" ? 0 : 1)}${unit}` : "—"
		})]
	});
}
function Row({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between gap-4 items-start",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs uppercase tracking-wider text-slate-500 pt-0.5",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-slate-800 text-right min-w-0 truncate",
			children
		})]
	});
}
function MiniStat({ icon: Icon, label, value, tint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-3 flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `w-8 h-8 rounded-md flex items-center justify-center ${{
					emerald: "text-emerald-600 bg-emerald-50",
					sky: "text-sky-600 bg-sky-50",
					amber: "text-amber-600 bg-amber-50",
					rose: "text-rose-600 bg-rose-50"
				}[tint]}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-4 h-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] uppercase tracking-wider text-slate-500",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold text-slate-900 truncate",
					children: value
				})]
			})]
		})
	});
}
//#endregion
export { SensorsPage as component };
