import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, Ft as Droplets, Jt as Clock, Mt as Eye, S as Trash2, U as Search, at as Package, dn as Building2, ht as LoaderCircle, i as Wind, o as WifiOff, tt as Pen, un as CalendarDays, w as Thermometer, xt as Inbox } from "../_libs/lucide-react.mjs";
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
import { S as listWarehouses, c as deleteSilo, k as upsertSilo, x as listSilos } from "./operations.functions-CdIfFwmK.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { t as usePlanLimits } from "./usePlanLimits-BXFy88pf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/silos-DrNOXciA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var emptyForm = {
	warehouse_id: "",
	capacity_kg: "",
	location_description: "",
	status: "active",
	notes: ""
};
function SilosPage() {
	const list = useServerFn(listSilos);
	const listWh = useServerFn(listWarehouses);
	const upsert = useServerFn(upsertSilo);
	const del = useServerFn(deleteSilo);
	const qc = useQueryClient();
	const { canAddSilo, siloLimitMessage } = usePlanLimits();
	const { data, isLoading } = useQuery({
		queryKey: ["silos"],
		queryFn: () => list()
	});
	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses"],
		queryFn: () => listWh()
	});
	const warehouses = warehousesData ?? [];
	const [q, setQ] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [warehouseFilter, setWarehouseFilter] = (0, import_react.useState)("all");
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [viewOpen, setViewOpen] = (0, import_react.useState)(false);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [, setTick] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const t = setInterval(() => setTick((n) => n + 1), 6e4);
		return () => clearInterval(t);
	}, []);
	const rows = (0, import_react.useMemo)(() => {
		return (data ?? []).filter((s) => {
			if (statusFilter !== "all" && s.status !== statusFilter) return false;
			if (warehouseFilter !== "all" && s.warehouse_id !== warehouseFilter) return false;
			if (!q.trim()) return true;
			const t = q.toLowerCase();
			return s.name?.toLowerCase().includes(t) || s.silo_id?.toLowerCase().includes(t);
		});
	}, [
		data,
		q,
		statusFilter,
		warehouseFilter
	]);
	const totalCap = rows.reduce((s, x) => s + (x.capacity_kg ?? 0), 0);
	const totalStock = rows.reduce((s, x) => s + (x.current_occupancy_kg ?? 0), 0);
	const activeCount = rows.filter((x) => x.status === "active").length;
	const saveMutation = useMutation({
		mutationFn: (fs) => upsert({ data: {
			id: fs.id,
			warehouse_id: fs.warehouse_id,
			capacity_kg: Number(fs.capacity_kg),
			location_description: fs.location_description.trim() || null,
			status: fs.status,
			notes: fs.notes.trim() || null
		} }),
		onSuccess: () => {
			toast.success(form.id ? "Silo updated" : "Silo created");
			qc.invalidateQueries({ queryKey: ["silos"] });
			qc.invalidateQueries({ queryKey: ["warehouses"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setEditOpen(false);
			setForm(emptyForm);
		},
		onError: (e) => toast.error(e.message || "Save failed")
	});
	const deleteMutation = useMutation({
		mutationFn: (id) => del({ data: { id } }),
		onSuccess: () => {
			toast.success("Silo deleted");
			qc.invalidateQueries({ queryKey: ["silos"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDeleteId(null);
		},
		onError: (e) => toast.error(e.message || "Delete failed")
	});
	function openCreate() {
		setForm({
			...emptyForm,
			warehouse_id: warehouses[0]?.id ?? ""
		});
		setEditOpen(true);
	}
	function openEdit(s) {
		setForm({
			id: s.id,
			warehouse_id: s.warehouse_id ?? "",
			capacity_kg: s.capacity_kg ? String(s.capacity_kg) : "",
			location_description: s.location?.description ?? "",
			status: s.status ?? "active",
			notes: s.notes ?? ""
		});
		setEditOpen(true);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Silo Management",
				subtitle: "Storage units, live conditions, and batch tracking",
				badge: isLoading ? "…" : `${rows.length}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Package,
						label: "Silos",
						value: rows.length,
						tint: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Package,
						label: "Active",
						value: activeCount,
						tint: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Package,
						label: "Capacity",
						value: `${(totalCap / 1e3).toFixed(1)}t`,
						tint: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
						icon: Package,
						label: "Stock",
						value: `${(totalStock / 1e3).toFixed(1)}t`,
						tint: "amber"
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
							placeholder: "Search silo…",
							className: "pl-9"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 sm:flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: warehouseFilter,
							onValueChange: setWarehouseFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-40",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Warehouse" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All warehouses"
							}), warehouses.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: w.id,
								children: w.name
							}, w.id))] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: statusFilter,
							onValueChange: setStatusFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full sm:w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
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
						disabled: !canAddSilo,
						title: siloLimitMessage ?? "Create new silo",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " New silo"]
					})
				]
			}),
			siloLimitMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-amber-300 bg-amber-50 mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-5 w-5 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium text-amber-900",
							children: siloLimitMessage
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/subscription",
							className: "text-amber-700 underline text-xs",
							children: "View plans →"
						})]
					})]
				})
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-dashed border-slate-300 bg-white/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "py-16 flex flex-col items-center text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "w-10 h-10 mb-3 opacity-40" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm mb-4",
							children: "No silos match your filters."
						}),
						warehouses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/warehouses",
							className: "text-sm text-emerald-700 underline",
							children: "Create a warehouse first →"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: openCreate,
							size: "sm",
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " Add silo"]
						})
					]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
				children: rows.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiloCard, {
					silo: s,
					onView: () => {
						setSelected(s);
						setViewOpen(true);
					},
					onEdit: () => openEdit(s),
					onDelete: () => setDeleteId(s.id)
				}, s.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editOpen,
				onOpenChange: (o) => {
					setEditOpen(o);
					if (!o) setForm(emptyForm);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit silo" : "New silo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: form.id ? "Update silo settings. Silo ID and name are immutable." : "Silo ID and name are generated automatically." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							id: "silo-form",
							onSubmit: (e) => {
								e.preventDefault();
								saveMutation.mutate(form);
							},
							className: "grid gap-4 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warehouse" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.warehouse_id,
										onValueChange: (v) => setForm({
											...form,
											warehouse_id: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select warehouse" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: warehouses.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
											value: w.id,
											children: [
												w.name,
												" (",
												w.warehouse_id,
												")"
											]
										}, w.id)) })]
									}),
									warehouses.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-rose-600 mt-1",
										children: [
											"No warehouses yet. ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
												to: "/warehouses",
												className: "underline",
												children: "Create one"
											}),
											" first."
										]
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Capacity (kg)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										required: true,
										type: "number",
										min: 1,
										value: form.capacity_kg,
										onChange: (e) => setForm({
											...form,
											capacity_kg: e.target.value
										})
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
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
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Location description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.location_description,
									onChange: (e) => setForm({
										...form,
										location_description: e.target.value
									}),
									placeholder: "Row A, position 3"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 3,
									value: form.notes,
									onChange: (e) => setForm({
										...form,
										notes: e.target.value
									})
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setEditOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								form: "silo-form",
								type: "submit",
								disabled: saveMutation.isPending || !form.warehouse_id || !form.capacity_kg,
								children: saveMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : form.id ? "Save changes" : "Create silo"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: viewOpen,
				onOpenChange: setViewOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "w-5 h-5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: selected?.name
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: selected?.silo_id })] }),
						selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 text-sm py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Status",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: selected.status })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Warehouse",
									children: selected.warehouses ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/warehouses",
										className: "text-emerald-700 underline inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3.5 h-3.5" }), selected.warehouses.name]
									}) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Capacity",
									children: selected.capacity_kg ? `${selected.capacity_kg.toLocaleString()} kg` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Occupancy",
									children: selected.capacity_kg && selected.current_occupancy_kg != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										selected.current_occupancy_kg.toLocaleString(),
										" kg (",
										Math.round(selected.current_occupancy_kg / selected.capacity_kg * 100),
										"%)"
									] }) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Location",
									children: selected.location?.description ?? "—"
								}),
								selected.current_batch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Current batch",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/grain-batches",
										className: "text-emerald-700 underline",
										children: [
											selected.current_batch.batch_id,
											" · ",
											selected.current_batch.grain_type
										]
									})
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
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setViewOpen(false),
								children: "Close"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => {
									setViewOpen(false);
									if (selected) openEdit(selected);
								},
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-4 h-4" }), " Edit"]
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleteId,
				onOpenChange: (o) => !o && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete silo?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This removes the silo permanently. Sensors, batches and alerts referencing it will lose the link." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => deleteId && deleteMutation.mutate(deleteId),
					className: "bg-rose-600 hover:bg-rose-700",
					children: deleteMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Delete"
				})] })] })
			})
		]
	});
}
function SiloCard({ silo, onView, onEdit, onDelete }) {
	const cap = silo.capacity_kg ?? 0;
	const occ = silo.current_occupancy_kg ?? 0;
	const pct = cap > 0 ? Math.min(100, Math.round(occ / cap * 100)) : 0;
	const duration = getStorageDuration(silo);
	const t = silo.current_conditions?.temperature?.value;
	const h = silo.current_conditions?.humidity?.value;
	const c = silo.current_conditions?.co2?.value;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "border-slate-200/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-4 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold text-slate-900 truncate",
							children: silo.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-slate-500 truncate",
							children: silo.silo_id
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: silo.status })]
				}),
				silo.warehouses && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-slate-600 flex items-center gap-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3 h-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: silo.warehouses.name
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-xs text-slate-600 mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Occupancy" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-medium tabular-nums",
						children: [
							occ.toLocaleString(),
							" / ",
							cap.toLocaleString(),
							" kg"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
					value: pct,
					className: "h-1.5"
				})] }),
				silo.current_batch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md bg-sky-50 border border-sky-100 px-2.5 py-1.5 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-medium text-sky-900 truncate",
						children: ["Batch ", silo.current_batch.batch_id]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sky-700 truncate",
						children: silo.current_batch.grain_type
					})]
				}),
				duration && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `rounded-md px-2.5 py-1.5 text-xs border ${duration.isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1 text-slate-600 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3 h-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: "Storage"
								})]
							}), duration.isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 text-emerald-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "relative flex h-1.5 w-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" })]
								}), "Live"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "text-[10px] h-4 px-1",
								children: "Stopped"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `font-semibold tabular-nums mt-0.5 ${duration.isActive ? "text-emerald-800" : "text-slate-700"}`,
							children: [
								duration.days,
								"d ",
								duration.hours,
								"h ",
								duration.minutes,
								"m"
							]
						}),
						silo.batch_loaded_date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 text-[10px] text-slate-500 mt-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "w-2.5 h-2.5" }),
								"Since ",
								new Date(silo.batch_loaded_date).toLocaleDateString()
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-1 border-t border-slate-100",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-xs mb-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-slate-600 font-medium",
							children: "Conditions"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 text-slate-400",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px]",
								children: "no live feed"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reading, {
								icon: Thermometer,
								value: typeof t === "number" ? `${t.toFixed(1)}°` : "—",
								status: condStatus(t, "temperature")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reading, {
								icon: Droplets,
								value: typeof h === "number" ? `${h.toFixed(0)}%` : "—",
								status: condStatus(h, "humidity")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reading, {
								icon: Wind,
								value: typeof c === "number" ? `${c.toFixed(0)}` : "—",
								status: condStatus(c, "co2"),
								label: "ppb"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-1 pt-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onView,
							className: "flex-1 h-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5 mr-1" }), "View"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onEdit,
							className: "flex-1 h-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-3.5 h-3.5 mr-1" }), "Edit"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: onDelete,
							className: "h-8 w-8 p-0 text-rose-600 hover:text-rose-700 shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
						})
					]
				})
			]
		})
	});
}
function Reading({ icon: Icon, value, status, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-md border px-2 py-1.5 text-center ${{
			normal: "bg-emerald-50 text-emerald-700 border-emerald-100",
			warning: "bg-amber-50 text-amber-700 border-amber-100",
			critical: "bg-rose-50 text-rose-700 border-rose-100",
			unknown: "bg-slate-50 text-slate-500 border-slate-200"
		}[status]}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3 h-3 mx-auto mb-0.5 opacity-70" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs font-semibold tabular-nums leading-tight",
				children: value
			}),
			label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[9px] uppercase opacity-60",
				children: label
			})
		]
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
					amber: "text-amber-600 bg-amber-50"
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
function getStorageDuration(silo) {
	if (!silo.batch_loaded_date) return null;
	const start = new Date(silo.batch_loaded_date).getTime();
	const end = silo.batch_dispatched_date ? new Date(silo.batch_dispatched_date).getTime() : Date.now();
	const diff = Math.max(0, end - start);
	return {
		days: Math.floor(diff / 864e5),
		hours: Math.floor(diff % 864e5 / 36e5),
		minutes: Math.floor(diff % 36e5 / 6e4),
		isActive: !silo.batch_dispatched_date
	};
}
function condStatus(v, kind) {
	if (typeof v !== "number") return "unknown";
	if (kind === "temperature") {
		if (v > 35 || v < 15) return "critical";
		if (v > 30) return "warning";
		return "normal";
	}
	if (kind === "humidity") {
		if (v > 80 || v < 40) return "critical";
		if (v > 70) return "warning";
		return "normal";
	}
	if (v > 5e3) return "critical";
	if (v > 1e3) return "warning";
	return "normal";
}
//#endregion
export { SilosPage as component };
