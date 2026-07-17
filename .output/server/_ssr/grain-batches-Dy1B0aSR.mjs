import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, Mt as Eye, Rt as DollarSign, S as Trash2, U as Search, X as QrCode, at as Package, dn as Building2, f as User, ht as LoaderCircle, ln as Calendar, s as Wheat, tt as Pen, v as Truck, xt as Inbox, y as TriangleAlert } from "../_libs/lucide-react.mjs";
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
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-BCrgGGf7.mjs";
import { t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { t as StatusBadge } from "./DataListPage-yAUru_pi.mjs";
import { C as logSpoilageEvent, D as upsertGrainBatch, h as listBuyers, o as deleteGrainBatch, u as dispatchGrainBatch, v as listGrainBatches, x as listSilos } from "./operations.functions-CdIfFwmK.mjs";
import { t as QRCodeDisplay } from "./QRCodeDisplay-DmEKwhs9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/grain-batches-Dy1B0aSR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var GRAIN_TYPES = [
	"Wheat",
	"Rice",
	"Maize",
	"Corn",
	"Barley",
	"Sorghum"
];
var STATUSES = [
	"stored",
	"dispatched",
	"sold",
	"damaged",
	"expired",
	"on_hold",
	"processing"
];
var emptyForm = {
	grain_type: "",
	variety: "",
	grade: "Standard",
	quantity_kg: "",
	silo_id: "",
	moisture_content: "",
	protein_content: "",
	test_weight: "",
	farmer_name: "",
	farmer_contact: "",
	source_location: "",
	harvest_date: "",
	expected_dispatch_date: "",
	purchase_price_per_kg: "",
	intake_temperature: "",
	intake_humidity: "",
	status: "stored",
	notes: ""
};
var emptyDispatch = {
	buyer_id: "",
	new_buyer_name: "",
	new_buyer_phone: "",
	new_buyer_email: "",
	sell_price_per_kg: "",
	dispatched_quantity_kg: "",
	vehicle_number: "",
	driver_name: "",
	driver_contact: "",
	destination: "",
	notes: ""
};
var emptySpoilage = {
	type: "pests",
	severity: "low",
	description: "",
	estimated_loss_kg: "",
	temperature: "",
	humidity: "",
	action_taken: ""
};
function GrainBatchesPage() {
	const listFn = useServerFn(listGrainBatches);
	const listSiloFn = useServerFn(listSilos);
	const listBuyerFn = useServerFn(listBuyers);
	const upsertFn = useServerFn(upsertGrainBatch);
	const deleteFn = useServerFn(deleteGrainBatch);
	const dispatchFn = useServerFn(dispatchGrainBatch);
	const spoilageFn = useServerFn(logSpoilageEvent);
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["grain-batches"],
		queryFn: () => listFn()
	});
	const { data: silosData } = useQuery({
		queryKey: ["silos"],
		queryFn: () => listSiloFn()
	});
	const { data: buyersData } = useQuery({
		queryKey: ["buyers"],
		queryFn: () => listBuyerFn()
	});
	const silos = silosData ?? [];
	const buyers = buyersData ?? [];
	const [q, setQ] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [grainFilter, setGrainFilter] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [viewOpen, setViewOpen] = (0, import_react.useState)(false);
	const [qrOpen, setQrOpen] = (0, import_react.useState)(false);
	const [dispatchOpen, setDispatchOpen] = (0, import_react.useState)(false);
	const [spoilageOpen, setSpoilageOpen] = (0, import_react.useState)(false);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [dispatch, setDispatch] = (0, import_react.useState)(emptyDispatch);
	const [spoilage, setSpoilage] = (0, import_react.useState)(emptySpoilage);
	const rows = (0, import_react.useMemo)(() => {
		return (data ?? []).filter((b) => {
			if (statusFilter !== "all" && b.status !== statusFilter) return false;
			if (grainFilter !== "all" && b.grain_type !== grainFilter) return false;
			if (!q.trim()) return true;
			const t = q.toLowerCase();
			return b.batch_id?.toLowerCase().includes(t) || b.grain_type?.toLowerCase().includes(t) || b.farmer_name?.toLowerCase().includes(t) || b.silos?.name?.toLowerCase().includes(t) || b.buyers?.name?.toLowerCase().includes(t);
		});
	}, [
		data,
		q,
		statusFilter,
		grainFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			total: rows.length,
			stored: rows.filter((r) => r.status === "stored" || r.status === "processing").length,
			dispatched: rows.filter((r) => r.status === "dispatched" || r.status === "sold").length,
			totalKg: rows.reduce((s, r) => s + Number(r.quantity_kg || 0), 0),
			risky: rows.filter((r) => (r.risk_score ?? 0) >= 40 || r.spoilage_label === "Risky" || r.spoilage_label === "Spoiled").length
		};
	}, [rows]);
	const saveMut = useMutation({
		mutationFn: (f) => upsertFn({ data: {
			id: f.id,
			grain_type: f.grain_type,
			variety: f.variety.trim() || null,
			grade: f.grade || "Standard",
			quantity_kg: Number(f.quantity_kg),
			silo_id: f.silo_id,
			moisture_content: f.moisture_content ? Number(f.moisture_content) : null,
			protein_content: f.protein_content ? Number(f.protein_content) : null,
			test_weight: f.test_weight ? Number(f.test_weight) : null,
			farmer_name: f.farmer_name.trim() || null,
			farmer_contact: f.farmer_contact.trim() || null,
			source_location: f.source_location.trim() || null,
			harvest_date: f.harvest_date || null,
			expected_dispatch_date: f.expected_dispatch_date || null,
			purchase_price_per_kg: f.purchase_price_per_kg ? Number(f.purchase_price_per_kg) : null,
			intake_temperature: f.intake_temperature ? Number(f.intake_temperature) : null,
			intake_humidity: f.intake_humidity ? Number(f.intake_humidity) : null,
			status: f.status,
			notes: f.notes.trim() || null
		} }),
		onSuccess: () => {
			toast.success(form.id ? "Batch updated" : "Batch created");
			qc.invalidateQueries({ queryKey: ["grain-batches"] });
			qc.invalidateQueries({ queryKey: ["silos"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setEditOpen(false);
			setForm(emptyForm);
		},
		onError: (e) => toast.error(e.message || "Save failed")
	});
	const deleteMut = useMutation({
		mutationFn: (id) => deleteFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Batch deleted");
			qc.invalidateQueries({ queryKey: ["grain-batches"] });
			qc.invalidateQueries({ queryKey: ["silos"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDeleteId(null);
		},
		onError: (e) => toast.error(e.message || "Delete failed")
	});
	const dispatchMut = useMutation({
		mutationFn: (payload) => {
			const useExisting = !!payload.d.buyer_id;
			return dispatchFn({ data: {
				id: payload.id,
				buyer_id: useExisting ? payload.d.buyer_id : null,
				new_buyer: useExisting ? null : {
					name: payload.d.new_buyer_name,
					contact_phone: payload.d.new_buyer_phone || null,
					contact_email: payload.d.new_buyer_email || null
				},
				sell_price_per_kg: Number(payload.d.sell_price_per_kg),
				dispatched_quantity_kg: Number(payload.d.dispatched_quantity_kg),
				vehicle_number: payload.d.vehicle_number || null,
				driver_name: payload.d.driver_name || null,
				driver_contact: payload.d.driver_contact || null,
				destination: payload.d.destination || null,
				notes: payload.d.notes || null
			} });
		},
		onSuccess: () => {
			toast.success("Batch dispatched");
			qc.invalidateQueries({ queryKey: ["grain-batches"] });
			qc.invalidateQueries({ queryKey: ["silos"] });
			qc.invalidateQueries({ queryKey: ["buyers"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDispatchOpen(false);
			setDispatch(emptyDispatch);
		},
		onError: (e) => toast.error(e.message || "Dispatch failed")
	});
	const spoilageMut = useMutation({
		mutationFn: (payload) => spoilageFn({ data: {
			id: payload.id,
			type: payload.s.type,
			severity: payload.s.severity,
			description: payload.s.description || null,
			estimated_loss_kg: payload.s.estimated_loss_kg ? Number(payload.s.estimated_loss_kg) : null,
			temperature: payload.s.temperature ? Number(payload.s.temperature) : null,
			humidity: payload.s.humidity ? Number(payload.s.humidity) : null,
			action_taken: payload.s.action_taken || null
		} }),
		onSuccess: () => {
			toast.success("Spoilage event logged");
			qc.invalidateQueries({ queryKey: ["grain-batches"] });
			qc.invalidateQueries({ queryKey: ["grain-alerts"] });
			setSpoilageOpen(false);
			setSpoilage(emptySpoilage);
		},
		onError: (e) => toast.error(e.message || "Log failed")
	});
	function openCreate() {
		setForm({ ...emptyForm });
		setEditOpen(true);
	}
	function openEdit(b) {
		setForm({
			id: b.id,
			grain_type: b.grain_type,
			variety: b.variety ?? "",
			grade: b.grade ?? "Standard",
			quantity_kg: String(b.quantity_kg ?? ""),
			silo_id: b.silos?.id ?? "",
			moisture_content: b.moisture_content != null ? String(b.moisture_content) : "",
			protein_content: b.protein_content != null ? String(b.protein_content) : "",
			test_weight: b.test_weight != null ? String(b.test_weight) : "",
			farmer_name: b.farmer_name ?? "",
			farmer_contact: b.farmer_contact ?? "",
			source_location: b.source_location ?? "",
			harvest_date: b.harvest_date ?? "",
			expected_dispatch_date: b.expected_dispatch_date ?? "",
			purchase_price_per_kg: b.purchase_price_per_kg != null ? String(b.purchase_price_per_kg) : "",
			intake_temperature: b.intake_conditions?.temperature != null ? String(b.intake_conditions.temperature) : "",
			intake_humidity: b.intake_conditions?.humidity != null ? String(b.intake_conditions.humidity) : "",
			status: b.status,
			notes: b.notes ?? ""
		});
		setEditOpen(true);
	}
	function openDispatch(b) {
		setSelected(b);
		const remaining = Number(b.quantity_kg) - Number(b.dispatched_quantity_kg ?? 0);
		setDispatch({
			...emptyDispatch,
			dispatched_quantity_kg: String(remaining)
		});
		setDispatchOpen(true);
	}
	function openSpoilage(b) {
		setSelected(b);
		setSpoilage(emptySpoilage);
		setSpoilageOpen(true);
	}
	const availableSilos = silos.filter((s) => (s.current_occupancy_kg ?? 0) < (s.capacity_kg ?? 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Grain Batches",
				subtitle: "Intake, storage tracking & dispatch",
				badge: isLoading ? "…" : `${rows.length}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-5 gap-3 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Package,
						label: "Total",
						value: stats.total,
						tint: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Wheat,
						label: "Stored",
						value: stats.stored,
						tint: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Truck,
						label: "Dispatched",
						value: stats.dispatched,
						tint: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: DollarSign,
						label: "Volume",
						value: `${(stats.totalKg / 1e3).toFixed(1)}t`,
						tint: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: TriangleAlert,
						label: "At Risk",
						value: stats.risky,
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
							placeholder: "Search batch, farmer, buyer…",
							className: "pl-9"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 sm:flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: grainFilter,
							onValueChange: setGrainFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Grain" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All grains"
							}), GRAIN_TYPES.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: g,
								children: g
							}, g))] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: statusFilter,
							onValueChange: setStatusFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Status" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All statuses"
							}), STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: s,
								children: s.replace("_", " ")
							}, s))] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: openCreate,
						className: "gap-2 whitespace-nowrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " New batch"]
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
							children: "No batches yet."
						}),
						availableSilos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/silos",
							className: "text-sm text-emerald-700 underline",
							children: "Create a silo first →"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: openCreate,
							size: "sm",
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " Add batch"]
						})
					]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
				children: rows.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BatchCard, {
					batch: b,
					onView: () => {
						setSelected(b);
						setViewOpen(true);
					},
					onEdit: () => openEdit(b),
					onDelete: () => setDeleteId(b.id),
					onQR: () => {
						setSelected(b);
						setQrOpen(true);
					},
					onDispatch: () => openDispatch(b),
					onSpoilage: () => openSpoilage(b)
				}, b.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editOpen,
				onOpenChange: (o) => {
					setEditOpen(o);
					if (!o) setForm(emptyForm);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl max-h-[92vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit batch" : "New grain batch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: form.id ? "Update batch details." : "Batch ID and QR code are generated automatically on intake." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
							id: "batch-form",
							className: "grid gap-4 py-2",
							onSubmit: (e) => {
								e.preventDefault();
								saveMut.mutate(form);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid sm:grid-cols-2 gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Grain type *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.grain_type,
										onValueChange: (v) => setForm({
											...form,
											grain_type: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select grain" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: GRAIN_TYPES.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: g,
											children: g
										}, g)) })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Variety" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.variety,
										onChange: (e) => setForm({
											...form,
											variety: e.target.value
										}),
										placeholder: "e.g. Basmati"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Quantity (kg) *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										min: 1,
										required: true,
										value: form.quantity_kg,
										onChange: (e) => setForm({
											...form,
											quantity_kg: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Grade" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.grade,
										onValueChange: (v) => setForm({
											...form,
											grade: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "Premium",
												children: "Premium"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "Standard",
												children: "Standard"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "Economy",
												children: "Economy"
											})
										] })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Silo *" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
												value: form.silo_id,
												onValueChange: (v) => setForm({
													...form,
													silo_id: v
												}),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Assign silo" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: (form.id ? silos : availableSilos).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
													value: s.id,
													children: [
														s.name,
														" (",
														s.silo_id,
														") — ",
														(s.capacity_kg ?? 0).toLocaleString(),
														" kg cap"
													]
												}, s.id)) })]
											}),
											silos.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-rose-600 mt-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
													to: "/silos",
													className: "underline",
													children: "Create a silo"
												}), " first."]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Moisture %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: form.moisture_content,
										onChange: (e) => setForm({
											...form,
											moisture_content: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Protein %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: form.protein_content,
										onChange: (e) => setForm({
											...form,
											protein_content: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Test weight" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: form.test_weight,
										onChange: (e) => setForm({
											...form,
											test_weight: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Purchase $/kg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.01",
										value: form.purchase_price_per_kg,
										onChange: (e) => setForm({
											...form,
											purchase_price_per_kg: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Farmer name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.farmer_name,
										onChange: (e) => setForm({
											...form,
											farmer_name: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Farmer contact" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.farmer_contact,
										onChange: (e) => setForm({
											...form,
											farmer_contact: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Source location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.source_location,
											onChange: (e) => setForm({
												...form,
												source_location: e.target.value
											}),
											placeholder: "Village, district, region"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Harvest date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "date",
										value: form.harvest_date,
										onChange: (e) => setForm({
											...form,
											harvest_date: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Expected dispatch" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "date",
										value: form.expected_dispatch_date,
										onChange: (e) => setForm({
											...form,
											expected_dispatch_date: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Intake temp °C" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: form.intake_temperature,
										onChange: (e) => setForm({
											...form,
											intake_temperature: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Intake humidity %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: form.intake_humidity,
										onChange: (e) => setForm({
											...form,
											intake_humidity: e.target.value
										})
									})] }),
									form.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.status,
											onValueChange: (v) => setForm({
												...form,
												status: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: s,
												children: s.replace("_", " ")
											}, s)) })]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
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
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setEditOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								form: "batch-form",
								type: "submit",
								disabled: saveMut.isPending || !form.grain_type || !form.quantity_kg || !form.silo_id,
								children: saveMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : form.id ? "Save changes" : "Create batch"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: viewOpen,
				onOpenChange: setViewOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					className: "max-w-lg max-h-[92vh] overflow-y-auto",
					children: selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-5 h-5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: selected.batch_id
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [selected.grain_type, selected.variety ? ` · ${selected.variety}` : ""] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 text-sm py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Status",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: selected.status })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Quality",
									children: [selected.spoilage_label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: selected.spoilage_label === "Spoiled" ? "destructive" : selected.spoilage_label === "Risky" ? "secondary" : "outline",
										className: "mr-1",
										children: selected.spoilage_label
									}), selected.risk_score != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-slate-500",
										children: ["Risk ", Math.round(Number(selected.risk_score))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Quantity",
									children: [Number(selected.quantity_kg).toLocaleString(), " kg"]
								}),
								selected.dispatched_quantity_kg ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Dispatched",
									children: [Number(selected.dispatched_quantity_kg).toLocaleString(), " kg"]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Grade",
									children: selected.grade ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Silo",
									children: selected.silos ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/silos",
										className: "text-emerald-700 underline",
										children: selected.silos.name
									}) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Warehouse",
									children: selected.warehouses ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/warehouses",
										className: "text-emerald-700 underline inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3.5 h-3.5" }), selected.warehouses.name]
									}) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Farmer",
									children: [selected.farmer_name ?? "—", selected.farmer_contact ? ` · ${selected.farmer_contact}` : ""]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Source",
									children: selected.source_location ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Harvest",
									children: selected.harvest_date ? new Date(selected.harvest_date).toLocaleDateString() : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Intake",
									children: selected.intake_date ? new Date(selected.intake_date).toLocaleDateString() : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Moisture",
									children: selected.moisture_content != null ? `${selected.moisture_content}%` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Protein",
									children: selected.protein_content != null ? `${selected.protein_content}%` : "—"
								}),
								selected.purchase_price_per_kg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Purchase",
									children: [
										"PKR ",
										selected.purchase_price_per_kg,
										"/kg · Total PKR ",
										Number(selected.total_purchase_value ?? 0).toLocaleString()
									]
								}),
								selected.sell_price_per_kg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Row, {
									label: "Sell",
									children: [
										"PKR ",
										selected.sell_price_per_kg,
										"/kg · Rev PKR ",
										Number(selected.revenue ?? 0).toLocaleString()
									]
								}),
								selected.buyers && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Buyer",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/buyers",
										className: "text-emerald-700 underline",
										children: selected.buyers.name
									})
								}),
								selected.actual_dispatch_date && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Dispatched at",
									children: new Date(selected.actual_dispatch_date).toLocaleString()
								}),
								selected.spoilage_events && selected.spoilage_events.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 border-t border-slate-100",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs uppercase tracking-wider text-slate-500 mb-1",
										children: [
											"Spoilage events (",
											selected.spoilage_events.length,
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "space-y-1 max-h-32 overflow-y-auto",
										children: selected.spoilage_events.slice(-5).reverse().map((e, i) => {
											const ev = e;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs bg-rose-50 border border-rose-100 rounded px-2 py-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium text-rose-900",
														children: ev.type
													}),
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "ml-1 text-[10px] h-4",
														children: ev.severity
													}),
													ev.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-rose-700 truncate",
														children: ev.description
													})
												]
											}, i);
										})
									})]
								}),
								selected.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 border-t border-slate-100",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs uppercase tracking-wider text-slate-500 mb-1",
										children: "Notes"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-slate-700 whitespace-pre-wrap",
										children: selected.notes
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "gap-2 flex-wrap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setQrOpen(true),
									className: "gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-4 h-4" }), " QR"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => {
										setViewOpen(false);
										openSpoilage(selected);
									},
									className: "gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-4 h-4" }), " Log spoilage"]
								}),
								selected.status !== "dispatched" && selected.status !== "sold" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									onClick: () => {
										setViewOpen(false);
										openDispatch(selected);
									},
									className: "gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "w-4 h-4" }), " Dispatch"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => {
										setViewOpen(false);
										openEdit(selected);
									},
									className: "gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-4 h-4" }), " Edit"]
								})
							]
						})
					] })
				})
			}),
			selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QRCodeDisplay, {
				qrCode: selected.qr_code || "",
				batchId: selected.batch_id,
				grainType: selected.grain_type,
				isOpen: qrOpen,
				onClose: () => setQrOpen(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: dispatchOpen,
				onOpenChange: (o) => {
					setDispatchOpen(o);
					if (!o) setDispatch(emptyDispatch);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg max-h-[92vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "w-5 h-5 text-emerald-600" }), " Dispatch batch"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							selected?.batch_id,
							" · ",
							selected?.grain_type
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							id: "dispatch-form",
							className: "grid gap-3 py-2",
							onSubmit: (e) => {
								e.preventDefault();
								if (selected) dispatchMut.mutate({
									id: selected.id,
									d: dispatch
								});
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Buyer" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: dispatch.buyer_id,
										onValueChange: (v) => setDispatch({
											...dispatch,
											buyer_id: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select existing buyer" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: buyers.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
											value: b.id,
											children: [b.name, b.company_name ? ` · ${b.company_name}` : ""]
										}, b.id)) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-slate-500 mt-1",
										children: "Or enter a new buyer below"
									})
								] }),
								!dispatch.buyer_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid sm:grid-cols-2 gap-2 rounded-md border border-slate-200 p-3 bg-slate-50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "sm:col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												className: "text-xs",
												children: "New buyer name"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: dispatch.new_buyer_name,
												onChange: (e) => setDispatch({
													...dispatch,
													new_buyer_name: e.target.value
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											className: "text-xs",
											children: "Phone"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.new_buyer_phone,
											onChange: (e) => setDispatch({
												...dispatch,
												new_buyer_phone: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											className: "text-xs",
											children: "Email"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.new_buyer_email,
											onChange: (e) => setDispatch({
												...dispatch,
												new_buyer_email: e.target.value
											})
										})] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Quantity (kg) *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											min: 1,
											required: true,
											value: dispatch.dispatched_quantity_kg,
											onChange: (e) => setDispatch({
												...dispatch,
												dispatched_quantity_kg: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Sell $/kg *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											step: "0.01",
											min: .01,
											required: true,
											value: dispatch.sell_price_per_kg,
											onChange: (e) => setDispatch({
												...dispatch,
												sell_price_per_kg: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Vehicle #" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.vehicle_number,
											onChange: (e) => setDispatch({
												...dispatch,
												vehicle_number: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Destination" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.destination,
											onChange: (e) => setDispatch({
												...dispatch,
												destination: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Driver" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.driver_name,
											onChange: (e) => setDispatch({
												...dispatch,
												driver_name: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Driver phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: dispatch.driver_contact,
											onChange: (e) => setDispatch({
												...dispatch,
												driver_contact: e.target.value
											})
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "col-span-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
												rows: 2,
												value: dispatch.notes,
												onChange: (e) => setDispatch({
													...dispatch,
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
								onClick: () => setDispatchOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								form: "dispatch-form",
								type: "submit",
								disabled: dispatchMut.isPending || !dispatch.sell_price_per_kg || !dispatch.dispatched_quantity_kg || !dispatch.buyer_id && !dispatch.new_buyer_name,
								children: dispatchMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Confirm dispatch"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: spoilageOpen,
				onOpenChange: (o) => {
					setSpoilageOpen(o);
					if (!o) setSpoilage(emptySpoilage);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-md max-h-[92vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-5 h-5 text-rose-600" }), " Log spoilage event"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: selected?.batch_id })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
							id: "spoilage-form",
							className: "grid gap-3 py-2",
							onSubmit: (e) => {
								e.preventDefault();
								if (selected) spoilageMut.mutate({
									id: selected.id,
									s: spoilage
								});
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: spoilage.type,
										onValueChange: (v) => setSpoilage({
											...spoilage,
											type: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "pests",
												children: "Pests"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "mold",
												children: "Mold"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "moisture",
												children: "Moisture"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "temperature",
												children: "Temperature"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "contamination",
												children: "Contamination"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "other",
												children: "Other"
											})
										] })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Severity" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: spoilage.severity,
										onValueChange: (v) => setSpoilage({
											...spoilage,
											severity: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "low",
												children: "Low"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "medium",
												children: "Medium"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "high",
												children: "High"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "critical",
												children: "Critical"
											})
										] })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Est. loss (kg)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: spoilage.estimated_loss_kg,
										onChange: (e) => setSpoilage({
											...spoilage,
											estimated_loss_kg: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Temp °C" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: spoilage.temperature,
										onChange: (e) => setSpoilage({
											...spoilage,
											temperature: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Humidity %" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.1",
										value: spoilage.humidity,
										onChange: (e) => setSpoilage({
											...spoilage,
											humidity: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											rows: 2,
											value: spoilage.description,
											onChange: (e) => setSpoilage({
												...spoilage,
												description: e.target.value
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Action taken" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											rows: 2,
											value: spoilage.action_taken,
											onChange: (e) => setSpoilage({
												...spoilage,
												action_taken: e.target.value
											})
										})]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setSpoilageOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								form: "spoilage-form",
								type: "submit",
								disabled: spoilageMut.isPending,
								children: spoilageMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Log event"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleteId,
				onOpenChange: (o) => !o && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete batch?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This permanently removes the batch and frees up its silo occupancy." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => deleteId && deleteMut.mutate(deleteId),
					className: "bg-rose-600 hover:bg-rose-700",
					children: deleteMut.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Delete"
				})] })] })
			})
		]
	});
}
function BatchCard({ batch, onView, onEdit, onDelete, onQR, onDispatch, onSpoilage }) {
	const dispatched = Number(batch.dispatched_quantity_kg ?? 0);
	const total = Number(batch.quantity_kg);
	const remaining = Math.max(0, total - dispatched);
	const canDispatch = batch.status !== "dispatched" && batch.status !== "sold" && remaining > 0;
	const risk = Number(batch.risk_score ?? 0);
	const riskTone = risk >= 60 ? "bg-rose-50 text-rose-700 border-rose-100" : risk >= 30 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";
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
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-slate-900 truncate",
								children: batch.batch_id
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-slate-500 truncate mt-0.5",
							children: [batch.grain_type, batch.variety ? ` · ${batch.variety}` : ""]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: batch.status })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] uppercase tracking-wider text-slate-500",
							children: "Quantity"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-semibold text-slate-900 tabular-nums",
							children: [total.toLocaleString(), " kg"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-md border px-2 py-1.5 ${riskTone}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] uppercase tracking-wider opacity-70",
							children: batch.spoilage_label ?? "Safe"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-semibold tabular-nums",
							children: ["Risk ", Math.round(risk)]
						})]
					})]
				}),
				batch.silos && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-slate-600 flex items-center gap-1 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "w-3 h-3 shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: batch.silos.name
						}),
						batch.warehouses && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-slate-400",
							children: "·"
						}),
						batch.warehouses && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "truncate inline-flex items-center gap-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3 h-3" }),
								" ",
								batch.warehouses.name
							]
						})
					]
				}),
				dispatched > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-slate-600",
					children: [
						"Dispatched ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium tabular-nums",
							children: dispatched.toLocaleString()
						}),
						" / ",
						total.toLocaleString(),
						" kg",
						batch.buyers && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/buyers",
							className: "text-emerald-700 underline",
							children: batch.buyers.name
						})] })
					]
				}),
				batch.farmer_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-slate-600 flex items-center gap-1 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "w-3 h-3 shrink-0" }),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: batch.farmer_name
						})
					]
				}),
				batch.intake_date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-[11px] text-slate-500 flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-3 h-3" }),
						" Intake ",
						new Date(batch.intake_date).toLocaleDateString()
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-4 gap-1 pt-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onView,
							className: "h-8 px-0",
							title: "View",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onQR,
							className: "h-8 px-0",
							title: "QR",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onEdit,
							className: "h-8 px-0",
							title: "Edit",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onDelete,
							className: "h-8 px-0 text-rose-600 hover:text-rose-700",
							title: "Delete",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: onSpoilage,
						className: "h-8 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3.5 h-3.5 mr-1" }), "Spoilage"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: onDispatch,
						disabled: !canDispatch,
						className: "h-8 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "w-3.5 h-3.5 mr-1" }), "Dispatch"]
					})]
				})
			]
		})
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
					violet: "text-violet-600 bg-violet-50",
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
export { GrainBatchesPage as component };
