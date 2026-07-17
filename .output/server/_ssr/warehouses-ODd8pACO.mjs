import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, Mt as Eye, S as Trash2, U as Search, at as Package, d as Users, dn as Building2, dt as MapPin, ht as LoaderCircle, tt as Pen, xt as Inbox } from "../_libs/lucide-react.mjs";
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
import { A as upsertWarehouse, S as listWarehouses, l as deleteWarehouse } from "./operations.functions-CdIfFwmK.mjs";
import { t as usePlanLimits } from "./usePlanLimits-BXFy88pf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/warehouses-ODd8pACO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var emptyForm = {
	name: "",
	warehouse_id: "",
	location_description: "",
	address: "",
	total_capacity_kg: "",
	status: "active",
	notes: ""
};
function WarehousesPage() {
	const list = useServerFn(listWarehouses);
	const upsert = useServerFn(upsertWarehouse);
	const del = useServerFn(deleteWarehouse);
	const qc = useQueryClient();
	const { canAddWarehouse, warehouseLimitMessage } = usePlanLimits();
	const { data, isLoading, error } = useQuery({
		queryKey: ["warehouses"],
		queryFn: () => list()
	});
	const [q, setQ] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	const [viewOpen, setViewOpen] = (0, import_react.useState)(false);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const rows = (0, import_react.useMemo)(() => {
		return (data ?? []).filter((w) => {
			if (statusFilter !== "all" && w.status !== statusFilter) return false;
			if (!q.trim()) return true;
			const s = q.toLowerCase();
			return w.name?.toLowerCase().includes(s) || w.warehouse_id?.toLowerCase().includes(s) || w.location?.description?.toLowerCase().includes(s) || w.location?.address?.toLowerCase().includes(s);
		});
	}, [
		data,
		q,
		statusFilter
	]);
	const totalCapacity = rows.reduce((s, w) => s + (w.total_capacity_kg ?? 0), 0);
	const totalSilos = rows.reduce((s, w) => s + (w.silos?.length ?? 0), 0);
	const saveMutation = useMutation({
		mutationFn: async (fs) => {
			const payload = {
				id: fs.id,
				name: fs.name.trim(),
				warehouse_id: fs.warehouse_id.trim(),
				location_description: fs.location_description.trim() || null,
				address: fs.address.trim() || null,
				total_capacity_kg: fs.total_capacity_kg ? Number(fs.total_capacity_kg) : null,
				status: fs.status,
				notes: fs.notes.trim() || null
			};
			return upsert({ data: payload });
		},
		onSuccess: () => {
			toast.success(form.id ? "Warehouse updated" : "Warehouse created");
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
			toast.success("Warehouse deleted");
			qc.invalidateQueries({ queryKey: ["warehouses"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDeleteId(null);
		},
		onError: (e) => toast.error(e.message || "Delete failed")
	});
	function openCreate() {
		setForm({
			...emptyForm,
			warehouse_id: `WH-${Date.now().toString().slice(-6)}`
		});
		setEditOpen(true);
	}
	function openEdit(w) {
		setForm({
			id: w.id,
			name: w.name ?? "",
			warehouse_id: w.warehouse_id ?? "",
			location_description: w.location?.description ?? "",
			address: w.location?.address ?? "",
			total_capacity_kg: w.total_capacity_kg ? String(w.total_capacity_kg) : "",
			status: w.status ?? "active",
			notes: w.notes ?? ""
		});
		setEditOpen(true);
	}
	function openView(w) {
		setSelected(w);
		setViewOpen(true);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Warehouses",
				subtitle: "Physical facilities that hold your silos and grain",
				badge: isLoading ? "…" : `${rows.length}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatBox, {
						icon: Building2,
						label: "Facilities",
						value: rows.length,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatBox, {
						icon: Package,
						label: "Total capacity",
						value: `${(totalCapacity / 1e3).toFixed(1)} t`,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatBox, {
						icon: Users,
						label: "Silos across sites",
						value: totalSilos,
						accent: "violet"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row gap-3 mb-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value),
							placeholder: "Search by name, ID, or location…",
							className: "pl-9"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: statusFilter,
						onValueChange: setStatusFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full md:w-40",
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
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: openCreate,
						className: "gap-2",
						disabled: !canAddWarehouse,
						title: warehouseLimitMessage ?? "Create new warehouse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " New warehouse"]
					})
				]
			}),
			warehouseLimitMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-amber-300 bg-amber-50 mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-5 w-5 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium text-amber-900",
							children: warehouseLimitMessage
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/subscription",
							className: "text-amber-700 underline text-xs",
							children: "View plans →"
						})]
					})]
				})
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, {}) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-rose-200",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "py-8 text-center text-rose-600 text-sm",
					children: error.message
				})
			}) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-dashed border-slate-300 bg-white/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "py-16 flex flex-col items-center text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "w-10 h-10 mb-3 opacity-40" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm mb-4",
							children: "No warehouses yet."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: openCreate,
							size: "sm",
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " Add your first warehouse"]
						})
					]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-slate-200/70 shadow-sm overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-left font-semibold",
									children: "Warehouse"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-left font-semibold",
									children: "Location"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-left font-semibold",
									children: "Capacity"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-left font-semibold",
									children: "Silos"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-left font-semibold",
									children: "Status"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 text-right font-semibold",
									children: "Actions"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-slate-100",
							children: rows.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-slate-50/50",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "px-4 py-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-slate-900",
											children: w.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-slate-500",
											children: w.warehouse_id
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3 text-slate-700",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: w.location?.description ?? "—" }), w.location?.address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-slate-500",
												children: w.location.address
											})] })]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3 text-slate-700",
										children: w.total_capacity_kg ? `${(w.total_capacity_kg / 1e3).toLocaleString()} t` : "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/silos",
											className: "inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 hover:underline",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "w-3.5 h-3.5" }),
												" ",
												w.silos?.length ?? 0
											]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: w.status })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-end gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													onClick: () => openView(w),
													className: "h-8 w-8",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-4 h-4" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													onClick: () => openEdit(w),
													className: "h-8 w-8",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "w-4 h-4" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													size: "icon",
													variant: "ghost",
													onClick: () => setDeleteId(w.id),
													className: "h-8 w-8 text-rose-600 hover:text-rose-700",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-4 h-4" })
												})
											]
										})
									})
								]
							}, w.id))
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editOpen,
				onOpenChange: (o) => {
					setEditOpen(o);
					if (!o) setForm(emptyForm);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit warehouse" : "New warehouse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: form.id ? "Update this facility's details." : "Add a new physical facility." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							id: "warehouse-form",
							onSubmit: (e) => {
								e.preventDefault();
								saveMutation.mutate(form);
							},
							className: "grid gap-4 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										required: true,
										value: form.name,
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										}),
										placeholder: "North Facility"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warehouse ID" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										required: true,
										value: form.warehouse_id,
										onChange: (e) => setForm({
											...form,
											warehouse_id: e.target.value
										})
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.location_description,
									onChange: (e) => setForm({
										...form,
										location_description: e.target.value
									}),
									placeholder: "Main dry-storage site"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.address,
									onChange: (e) => setForm({
										...form,
										address: e.target.value
									}),
									placeholder: "Street, city"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Capacity (kg)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										min: 0,
										value: form.total_capacity_kg,
										onChange: (e) => setForm({
											...form,
											total_capacity_kg: e.target.value
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setEditOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							form: "warehouse-form",
							type: "submit",
							disabled: saveMutation.isPending,
							children: saveMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : form.id ? "Save changes" : "Create warehouse"
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: viewOpen,
				onOpenChange: setViewOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-5 h-5 text-emerald-600" }), selected?.name]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: selected?.warehouse_id })] }),
						selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 text-sm py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Status",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: selected.status })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Description",
									children: selected.location?.description ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Address",
									children: selected.location?.address ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Capacity",
									children: selected.total_capacity_kg ? `${(selected.total_capacity_kg / 1e3).toLocaleString()} t` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Silos",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										children: selected.silos?.length ?? 0
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Created",
									children: selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
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
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleteId,
				onOpenChange: (o) => !o && setDeleteId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete warehouse?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This will remove the warehouse permanently. Silos and batches linked to it will lose the reference." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => deleteId && deleteMutation.mutate(deleteId),
					className: "bg-rose-600 hover:bg-rose-700",
					children: deleteMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Delete"
				})] })] })
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
			className: "text-slate-800 text-right",
			children
		})]
	});
}
function StatBox({ icon: Icon, label, value, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: `border-slate-200/70 bg-gradient-to-br ${{
			emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-700",
			sky: "from-sky-500/10 to-sky-500/0 text-sky-700",
			violet: "from-violet-500/10 to-violet-500/0 text-violet-700"
		}[accent]} shadow-sm`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-4 flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-5 h-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs uppercase tracking-wider opacity-70",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xl font-semibold",
				children: value
			})] })]
		})
	});
}
//#endregion
export { WarehousesPage as component };
