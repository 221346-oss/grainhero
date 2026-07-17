import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, $t as CircleCheckBig, Mt as Eye, S as Trash2, U as Search, Xt as CircleX, Zt as CirclePause, d as Users, dn as Building2, dt as MapPin, et as Phone, ft as Mail, ht as LoaderCircle, j as Star, s as Wheat, tt as Pen, xt as Inbox } from "../_libs/lucide-react.mjs";
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
import { T as upsertBuyer, h as listBuyers, i as deleteBuyer } from "./operations.functions-CdIfFwmK.mjs";
import { r as getPlatformBuyersOverview, t as PlatformOverviewTable } from "./PlatformOverviewTable-SNRUTVYA.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
import { t as useIsSuperAdmin } from "./useIsSuperAdmin-bJ_EKAEZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/buyers-DIJa-rPr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BUYER_TYPES = [
	"local_mill",
	"exporter",
	"wholesaler",
	"retailer",
	"government"
];
var GRAIN_TYPES = [
	"Wheat",
	"Rice",
	"Maize",
	"Corn",
	"Barley",
	"Sorghum"
];
var empty = {
	name: "",
	contact_name: "",
	contact_email: "",
	contact_phone: "",
	contact_designation: "",
	company_name: "",
	buyer_type: "",
	status: "active",
	address: "",
	city: "",
	state: "",
	country: "",
	preferred_grain_types: [],
	preferred_payment_terms: "",
	rating: "",
	tags: "",
	notes: ""
};
var STATUS_ICON = {
	active: CircleCheckBig,
	paused: CirclePause,
	inactive: CircleX
};
var STATUS_CLASS = {
	active: "bg-emerald-100 text-emerald-800 border-emerald-200",
	paused: "bg-amber-100 text-amber-800 border-amber-200",
	inactive: "bg-slate-100 text-slate-700 border-slate-200"
};
function BuyersPage() {
	const qc = useQueryClient();
	const { isSuperAdmin } = useIsSuperAdmin();
	const listFn = useServerFn(listBuyers);
	const saveFn = useServerFn(upsertBuyer);
	const delFn = useServerFn(deleteBuyer);
	const { data: buyers = [], isLoading } = useQuery({
		queryKey: ["buyers"],
		queryFn: () => listFn()
	});
	const fetchPlatformBuyers = useServerFn(getPlatformBuyersOverview);
	const platformBuyersQ = useQuery({
		queryKey: ["platform-buyers-overview"],
		queryFn: () => fetchPlatformBuyers(),
		enabled: isSuperAdmin
	});
	const [query, setQuery] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [typeFilter, setTypeFilter] = (0, import_react.useState)("all");
	const [dlgOpen, setDlgOpen] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [viewing, setViewing] = (0, import_react.useState)(null);
	const [toDelete, setToDelete] = (0, import_react.useState)(null);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return buyers.filter((b) => {
			if (statusFilter !== "all" && b.status !== statusFilter) return false;
			if (typeFilter !== "all" && b.buyer_type !== typeFilter) return false;
			if (!q) return true;
			return b.name.toLowerCase().includes(q) || b.contact_name.toLowerCase().includes(q) || (b.company_name ?? "").toLowerCase().includes(q) || (b.contact_email ?? "").toLowerCase().includes(q) || (b.city ?? "").toLowerCase().includes(q);
		});
	}, [
		buyers,
		query,
		statusFilter,
		typeFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			total: buyers.length,
			active: buyers.filter((b) => b.status === "active").length,
			paused: buyers.filter((b) => b.status === "paused").length,
			avgRating: (() => {
				const rs = buyers.filter((b) => typeof b.rating === "number").map((b) => b.rating);
				if (!rs.length) return 0;
				return Math.round(rs.reduce((s, v) => s + v, 0) / rs.length * 10) / 10;
			})()
		};
	}, [buyers]);
	const save = useMutation({
		mutationFn: (p) => saveFn({ data: p }),
		onSuccess: () => {
			toast.success("Buyer saved");
			qc.invalidateQueries({ queryKey: ["buyers"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDlgOpen(false);
			setForm(empty);
		},
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: (id) => delFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Buyer deleted");
			qc.invalidateQueries({ queryKey: ["buyers"] });
			setToDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const openCreate = () => {
		setForm(empty);
		setDlgOpen(true);
	};
	const openEdit = (b) => {
		setForm({
			id: b.id,
			name: b.name,
			contact_name: b.contact_name,
			contact_email: b.contact_email ?? "",
			contact_phone: b.contact_phone ?? "",
			contact_designation: b.contact_designation ?? "",
			company_name: b.company_name ?? "",
			buyer_type: b.buyer_type ?? "",
			status: b.status ?? "active",
			address: b.address ?? "",
			city: b.city ?? "",
			state: b.state ?? "",
			country: b.country ?? "",
			preferred_grain_types: b.preferred_grain_types ?? [],
			preferred_payment_terms: b.preferred_payment_terms ?? "",
			rating: b.rating != null ? String(b.rating) : "",
			tags: (b.tags ?? []).join(", "),
			notes: b.notes ?? ""
		});
		setDlgOpen(true);
	};
	const submit = () => {
		const missing = [!form.name && "buyer name", !form.contact_name && "contact name"].filter(Boolean);
		if (missing.length) {
			toast.error(`Missing: ${missing.join(", ")}`);
			return;
		}
		save.mutate({
			id: form.id,
			name: form.name.trim(),
			contact_name: form.contact_name.trim(),
			contact_email: form.contact_email.trim() || null,
			contact_phone: form.contact_phone.trim() || null,
			contact_designation: form.contact_designation.trim() || null,
			company_name: form.company_name.trim() || null,
			buyer_type: form.buyer_type || null,
			status: form.status,
			address: form.address.trim() || null,
			city: form.city.trim() || null,
			state: form.state.trim() || null,
			country: form.country.trim() || null,
			preferred_grain_types: form.preferred_grain_types.length ? form.preferred_grain_types : null,
			preferred_payment_terms: form.preferred_payment_terms.trim() || null,
			rating: form.rating ? Number(form.rating) : null,
			tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
			notes: form.notes.trim() || null
		});
	};
	const toggleGrain = (g) => {
		setForm((f) => ({
			...f,
			preferred_grain_types: f.preferred_grain_types.includes(g) ? f.preferred_grain_types.filter((x) => x !== g) : [...f.preferred_grain_types, g]
		}));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6",
		children: [
			isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Buyers across every tenant. New Buyer and edit actions still apply to your own tenant." }),
			isSuperAdmin && platformBuyersQ.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOverviewTable, {
				title: "Per-tenant buyer activity",
				description: `${platformBuyersQ.data.totals.buyers} buyers · ${platformBuyersQ.data.totals.invoices} invoices · $${platformBuyersQ.data.totals.revenue.toLocaleString()} invoiced`,
				rows: platformBuyersQ.data.rows,
				columns: [
					{
						key: "active",
						label: "Active",
						align: "right",
						render: (r) => `${r.active}/${r.buyers}`
					},
					{
						key: "avgRating",
						label: "Rating",
						align: "right",
						render: (r) => r.avgRating > 0 ? r.avgRating.toFixed(1) : "—"
					},
					{
						key: "invoices",
						label: "Invoices",
						align: "right",
						render: (r) => r.invoices
					},
					{
						key: "revenue",
						label: "Revenue",
						align: "right",
						render: (r) => `$${r.revenue.toLocaleString()}`
					},
					{
						key: "outstanding",
						label: "Outstanding",
						align: "right",
						render: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: r.outstanding > 0 ? "text-amber-700 font-medium" : "",
							children: ["$", r.outstanding.toLocaleString()]
						})
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-end md:justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
					title: "Buyers",
					subtitle: "Customers purchasing your grain — contacts, ratings & preferences"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: openCreate,
					className: "gap-1.5 self-start md:self-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " New Buyer"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "indigo",
						label: "Total Buyers",
						value: stats.total,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "emerald",
						label: "Active",
						value: stats.active,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "amber",
						label: "Paused",
						value: stats.paused,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CirclePause, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "blue",
						label: "Avg Rating",
						value: stats.avgRating,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-4 w-4" }),
						suffix: "/5"
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
						placeholder: "Search name, company, email, city",
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
						}), BUYER_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: t,
							children: t.replace("_", " ")
						}, t))] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: statusFilter,
						onValueChange: setStatusFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full sm:w-36",
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
								value: "paused",
								children: "Paused"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "inactive",
								children: "Inactive"
							})
						] })]
					})]
				})]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, {}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "py-16 text-center text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "h-8 w-8 mx-auto mb-3 opacity-50" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium",
						children: "No buyers found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm",
						children: "Add your first buyer to start tracking sales."
					})
				]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
				children: filtered.map((b) => {
					const SIcon = STATUS_ICON[b.status ?? "active"];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "hover:shadow-md transition-shadow",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-4 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-semibold truncate",
											children: b.name
										}), b.company_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-muted-foreground flex items-center gap-1 truncate",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3 w-3 flex-shrink-0" }),
												" ",
												b.company_name
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
										variant: "outline",
										className: STATUS_CLASS[b.status ?? "active"],
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SIcon, { className: "h-3 w-3 mr-1" }),
											" ",
											b.status ?? "active"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-3 w-3 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "truncate",
												children: [b.contact_name, b.contact_designation ? ` · ${b.contact_designation}` : ""]
											})]
										}),
										b.contact_email && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `mailto:${b.contact_email}`,
											className: "flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3 flex-shrink-0" }),
												" ",
												b.contact_email
											]
										}),
										b.contact_phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `tel:${b.contact_phone}`,
											className: "flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3 w-3 flex-shrink-0" }),
												" ",
												b.contact_phone
											]
										}),
										(b.city || b.country) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 text-muted-foreground truncate",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3 w-3 flex-shrink-0" }),
												" ",
												[
													b.city,
													b.state,
													b.country
												].filter(Boolean).join(", ")
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-1.5",
									children: [
										b.buyer_type && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "secondary",
											className: "text-[10px]",
											children: b.buyer_type.replace("_", " ")
										}),
										b.rating != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: "text-[10px] gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 fill-amber-400 text-amber-400" }),
												" ",
												b.rating
											]
										}),
										(b.preferred_grain_types ?? []).slice(0, 3).map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: "text-[10px] gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "h-3 w-3" }),
												" ",
												g
											]
										}, g))
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1 pt-1 border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "ghost",
											className: "flex-1 gap-1.5",
											onClick: () => setViewing(b),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3 w-3" }), " View"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											size: "sm",
											variant: "ghost",
											className: "flex-1 gap-1.5",
											onClick: () => openEdit(b),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "h-3 w-3" }), " Edit"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => setToDelete(b),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3 text-rose-500" })
										})
									]
								})
							]
						})
					}, b.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: dlgOpen,
				onOpenChange: setDlgOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit Buyer" : "New Buyer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Track a customer who buys your grain." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Buyer name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.name,
									onChange: (e) => setForm({
										...form,
										name: e.target.value
									}),
									placeholder: "Acme Mills"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Company" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.company_name,
									onChange: (e) => setForm({
										...form,
										company_name: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Contact name *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.contact_name,
									onChange: (e) => setForm({
										...form,
										contact_name: e.target.value
									}),
									placeholder: "Full name"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Designation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.contact_designation,
									onChange: (e) => setForm({
										...form,
										contact_designation: e.target.value
									}),
									placeholder: "Procurement Manager"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "email",
									value: form.contact_email,
									onChange: (e) => setForm({
										...form,
										contact_email: e.target.value
									}),
									placeholder: "contact@example.com"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.contact_phone,
									onChange: (e) => setForm({
										...form,
										contact_phone: e.target.value
									}),
									placeholder: "+91 …"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Buyer Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.buyer_type || "none",
									onValueChange: (v) => setForm({
										...form,
										buyer_type: v === "none" ? "" : v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "none",
										children: "—"
									}), BUYER_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: t,
										children: t.replace("_", " ")
									}, t))] })]
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
											value: "paused",
											children: "Paused"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "inactive",
											children: "Inactive"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.address,
										onChange: (e) => setForm({
											...form,
											address: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "City" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.city,
									onChange: (e) => setForm({
										...form,
										city: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "State" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.state,
									onChange: (e) => setForm({
										...form,
										state: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Country" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.country,
									onChange: (e) => setForm({
										...form,
										country: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Payment Terms" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.preferred_payment_terms,
									onChange: (e) => setForm({
										...form,
										preferred_payment_terms: e.target.value
									}),
									placeholder: "Net 30"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										className: "mb-1 block",
										children: "Preferred Grains"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: GRAIN_TYPES.map((g) => {
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => toggleGrain(g),
												className: `text-xs px-2 py-1 rounded border transition-colors ${form.preferred_grain_types.includes(g) ? "bg-emerald-600 text-white border-emerald-600" : "border-input hover:bg-muted"}`,
												children: g
											}, g);
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Rating (0-5)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									step: "0.1",
									min: 0,
									max: 5,
									value: form.rating,
									onChange: (e) => setForm({
										...form,
										rating: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Tags (comma-separated)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.tags,
									onChange: (e) => setForm({
										...form,
										tags: e.target.value
									})
								})] }),
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
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-end gap-1 w-full sm:w-auto",
							children: [(!form.name || !form.contact_name) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[11px] text-muted-foreground",
								children: ["Missing: ", [!form.name && "buyer name", !form.contact_name && "contact name"].filter(Boolean).join(", ")]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									onClick: () => setDlgOpen(false),
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: submit,
									disabled: save.isPending || !form.name || !form.contact_name,
									children: [save.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), " Save"]
								})]
							})]
						}) })
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
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-5 w-5" }),
							" ",
							viewing.name
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: viewing.company_name ?? "—" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Contact",
								val: `${viewing.contact_name}${viewing.contact_designation ? ` · ${viewing.contact_designation}` : ""}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Email",
								val: viewing.contact_email ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Phone",
								val: viewing.contact_phone ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Type",
								val: viewing.buyer_type ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Status",
								val: viewing.status ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Address",
								val: [
									viewing.address,
									viewing.city,
									viewing.state,
									viewing.country
								].filter(Boolean).join(", ") || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Preferred grains",
								val: (viewing.preferred_grain_types ?? []).join(", ") || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Payment terms",
								val: viewing.preferred_payment_terms ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Rating",
								val: viewing.rating != null ? `${viewing.rating}/5` : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Last order",
								val: viewing.last_order_at ? new Date(viewing.last_order_at).toLocaleDateString() : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Last contact",
								val: viewing.last_interaction_at ? new Date(viewing.last_interaction_at).toLocaleDateString() : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Since",
								val: viewing.created_at ? new Date(viewing.created_at).toLocaleDateString() : "—"
							}),
							viewing.tags && viewing.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1 pt-1",
								children: viewing.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-[10px]",
									children: t
								}, t))
							}),
							viewing.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground pt-2 border-t",
								children: viewing.notes
							})
						]
					})] })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!toDelete,
				onOpenChange: (o) => !o && setToDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete buyer?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"Permanently removes ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: toDelete?.name }),
					" and their contact info. Existing invoices remain."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => toDelete && remove.mutate(toDelete.id),
					className: "bg-rose-600 hover:bg-rose-700",
					children: "Delete"
				})] })] })
			})
		]
	});
}
function StatCard({ label, value, icon, tone, suffix }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-xl border p-3 bg-gradient-to-br ${{
			indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60",
			emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60",
			amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-200/60",
			blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60"
		}[tone]}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] uppercase tracking-wider font-medium opacity-80",
				children: label
			}), icon]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-2xl font-bold mt-1",
			children: [value, suffix ?? ""]
		})]
	});
}
function Row({ label, val }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between border-b py-1.5 last:border-0 gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground text-xs flex-shrink-0",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium text-sm text-right truncate",
			children: val
		})]
	});
}
//#endregion
export { BuyersPage as component };
