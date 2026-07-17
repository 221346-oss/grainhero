import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, $t as CircleCheckBig, I as Shield, Jt as Clock, Mt as Eye, S as Trash2, Sn as Activity, St as History, U as Search, en as CircleAlert, hn as Bell, ht as LoaderCircle, q as RotateCcw, xt as Inbox, y as TriangleAlert, yn as ArrowUpRight } from "../_libs/lucide-react.mjs";
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
import { E as upsertGrainAlert, S as listWarehouses, _ as listGrainAlerts, a as deleteGrainAlert, t as actionGrainAlert, x as listSilos } from "./operations.functions-CdIfFwmK.mjs";
import { t as useRealtimeInvalidate } from "./use-realtime-invalidate-DId6JN-1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/grain-alerts-CrGctzaY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PRIO_STYLES = {
	critical: {
		badge: "bg-rose-500 text-white",
		icon: TriangleAlert,
		border: "border-rose-300",
		bg: "bg-rose-50 dark:bg-rose-950/30"
	},
	high: {
		badge: "bg-orange-500 text-white",
		icon: CircleAlert,
		border: "border-orange-300",
		bg: "bg-orange-50 dark:bg-orange-950/30"
	},
	medium: {
		badge: "bg-amber-500 text-white",
		icon: Bell,
		border: "border-amber-300",
		bg: "bg-amber-50 dark:bg-amber-950/30"
	},
	low: {
		badge: "bg-blue-500 text-white",
		icon: Activity,
		border: "border-blue-300",
		bg: "bg-blue-50 dark:bg-blue-950/30"
	}
};
var STATUS_STYLES = {
	pending: {
		badge: "bg-rose-100 text-rose-800 border-rose-200",
		icon: TriangleAlert
	},
	acknowledged: {
		badge: "bg-amber-100 text-amber-800 border-amber-200",
		icon: Clock
	},
	escalated: {
		badge: "bg-orange-100 text-orange-800 border-orange-200",
		icon: ArrowUpRight
	},
	resolved: {
		badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
		icon: CircleCheckBig
	}
};
function timeAgo(iso) {
	if (!iso) return "—";
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 6e4);
	if (m < 1) return "just now";
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}
var emptyForm = {
	alert_id: "",
	title: "",
	message: "",
	priority: "medium",
	status: "pending",
	source: "manual",
	alert_type: "",
	silo_id: "",
	warehouse_id: "",
	batch_id: "",
	tags: ""
};
function GrainAlertsPage() {
	const qc = useQueryClient();
	const listFn = useServerFn(listGrainAlerts);
	useRealtimeInvalidate("grain_alerts", [["grain-alerts"]]);
	const silosFn = useServerFn(listSilos);
	const whFn = useServerFn(listWarehouses);
	const saveFn = useServerFn(upsertGrainAlert);
	const delFn = useServerFn(deleteGrainAlert);
	const actFn = useServerFn(actionGrainAlert);
	const { data: alerts = [], isLoading } = useQuery({
		queryKey: ["grain-alerts"],
		queryFn: () => listFn(),
		refetchInterval: 2e4
	});
	const { data: silos = [] } = useQuery({
		queryKey: ["silos"],
		queryFn: () => silosFn()
	});
	const { data: warehouses = [] } = useQuery({
		queryKey: ["warehouses"],
		queryFn: () => whFn()
	});
	const [query, setQuery] = (0, import_react.useState)("");
	const [priorityFilter, setPriorityFilter] = (0, import_react.useState)("all");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("active");
	const [dlgOpen, setDlgOpen] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [viewing, setViewing] = (0, import_react.useState)(null);
	const [toDelete, setToDelete] = (0, import_react.useState)(null);
	const [resolveOf, setResolveOf] = (0, import_react.useState)(null);
	const [resolveNotes, setResolveNotes] = (0, import_react.useState)("");
	const [escalateOf, setEscalateOf] = (0, import_react.useState)(null);
	const [escalateData, setEscalateData] = (0, import_react.useState)({
		to: "",
		reason: ""
	});
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return alerts.filter((a) => {
			if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
			if (statusFilter === "active") {
				if (a.status === "resolved") return false;
			} else if (statusFilter !== "all" && a.status !== statusFilter) return false;
			if (!q) return true;
			return a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.alert_id.toLowerCase().includes(q) || (a.silos?.name ?? "").toLowerCase().includes(q) || (a.source ?? "").toLowerCase().includes(q);
		});
	}, [
		alerts,
		query,
		priorityFilter,
		statusFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		const total = alerts.length;
		const open = alerts.filter((a) => a.status !== "resolved");
		const critical = open.filter((a) => a.priority === "critical").length;
		const pending = alerts.filter((a) => a.status === "pending").length;
		const resolvedToday = alerts.filter((a) => {
			if (!a.resolved_at) return false;
			const d = new Date(a.resolved_at);
			const n = /* @__PURE__ */ new Date();
			return d.toDateString() === n.toDateString();
		}).length;
		const responseMins = alerts.filter((a) => a.acknowledged_at && a.triggered_at).map((a) => (new Date(a.acknowledged_at).getTime() - new Date(a.triggered_at).getTime()) / 6e4).filter((v) => v >= 0);
		const avg = responseMins.length ? Math.round(responseMins.reduce((s, v) => s + v, 0) / responseMins.length) : 0;
		const rate = total ? Math.round((total - open.length) / total * 100) : 0;
		return {
			total,
			open: open.length,
			critical,
			pending,
			resolvedToday,
			avg,
			rate
		};
	}, [alerts]);
	const save = useMutation({
		mutationFn: (p) => saveFn({ data: p }),
		onSuccess: () => {
			toast.success("Alert saved");
			qc.invalidateQueries({ queryKey: ["grain-alerts"] });
			qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setDlgOpen(false);
			setForm(emptyForm);
		},
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: (id) => delFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Alert deleted");
			qc.invalidateQueries({ queryKey: ["grain-alerts"] });
			setToDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const act = useMutation({
		mutationFn: (v) => actFn({ data: v }),
		onSuccess: (_d, v) => {
			toast.success(`Alert ${v.action}d`);
			qc.invalidateQueries({ queryKey: ["grain-alerts"] });
			setResolveOf(null);
			setResolveNotes("");
			setEscalateOf(null);
			setEscalateData({
				to: "",
				reason: ""
			});
		},
		onError: (e) => toast.error(e.message)
	});
	const submit = () => {
		if (!form.alert_id || !form.title || !form.message) {
			toast.error("Alert ID, title and message are required");
			return;
		}
		save.mutate({
			id: form.id,
			alert_id: form.alert_id,
			title: form.title,
			message: form.message,
			priority: form.priority,
			status: form.status,
			source: form.source,
			alert_type: form.alert_type || null,
			silo_id: form.silo_id || null,
			warehouse_id: form.warehouse_id || null,
			batch_id: form.batch_id || null,
			tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-end md:justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
					title: "Grain Alerts",
					subtitle: "Environmental thresholds, spoilage risks and safety events"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: () => {
						setForm(emptyForm);
						setDlgOpen(true);
					},
					className: "gap-1.5 self-start md:self-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " New Alert"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-6 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "indigo",
						label: "Total",
						value: stats.total,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "rose",
						label: "Open",
						value: stats.open,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "rose",
						label: "Critical",
						value: stats.critical,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "amber",
						label: "Pending",
						value: stats.pending,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "emerald",
						label: "Resolved Today",
						value: stats.resolvedToday,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						tone: "blue",
						label: "Avg Response",
						value: stats.avg,
						suffix: "m",
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-4 w-4" })
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
						placeholder: "Search title, message, silo, source",
						className: "pl-9"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: priorityFilter,
						onValueChange: setPriorityFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full sm:w-36",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Priority" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All priorities"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "critical",
								children: "Critical"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "high",
								children: "High"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "medium",
								children: "Medium"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "low",
								children: "Low"
							})
						] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: statusFilter,
						onValueChange: setStatusFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full sm:w-36",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Status" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "active",
								children: "Active (unresolved)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "pending",
								children: "Pending"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "acknowledged",
								children: "Acknowledged"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "escalated",
								children: "Escalated"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "resolved",
								children: "Resolved"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All"
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
						children: "No alerts match your filters"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm",
						children: "All quiet in the silos."
					})
				]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: filtered.map((a) => {
					const P = PRIO_STYLES[a.priority];
					const S = STATUS_STYLES[a.status ?? "pending"];
					const PIcon = P.icon;
					const SIcon = S.icon;
					const isResolved = a.status === "resolved";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: `border-l-4 ${P.border} ${P.bg}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3 md:p-4 space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `p-2 rounded-lg ${P.badge} flex-shrink-0`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PIcon, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
													className: "font-semibold text-sm md:text-base truncate",
													children: a.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													className: P.badge,
													children: a.priority
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
													variant: "outline",
													className: S.badge,
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SIcon, { className: "h-3 w-3 mr-1" }),
														" ",
														a.status ?? "pending"
													]
												}),
												a.escalation_level ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
													variant: "outline",
													className: "text-orange-700 border-orange-300",
													children: ["L", a.escalation_level]
												}) : null
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2",
											children: a.message
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono",
													children: a.alert_id
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· ", a.source] }),
												a.silos && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· 🏗 ", a.silos.name] }),
												a.warehouses && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· 🏢 ", a.warehouses.name] }),
												a.grain_batches && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· 🌾 ", a.grain_batches.batch_id] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· ", timeAgo(a.triggered_at ?? null)] })
											]
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2 pt-1 border-t",
								children: [
									a.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										className: "gap-1.5",
										disabled: act.isPending,
										onClick: () => act.mutate({
											id: a.id,
											action: "acknowledge"
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }), " Acknowledge"]
									}),
									!isResolved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										className: "gap-1.5 bg-emerald-600 hover:bg-emerald-700",
										onClick: () => {
											setResolveOf(a);
											setResolveNotes("");
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-3 w-3" }), " Resolve"]
									}),
									!isResolved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										className: "gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50",
										onClick: () => {
											setEscalateOf(a);
											setEscalateData({
												to: "",
												reason: ""
											});
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-3 w-3" }), " Escalate"]
									}),
									isResolved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										className: "gap-1.5",
										onClick: () => act.mutate({
											id: a.id,
											action: "reopen"
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-3 w-3" }), " Reopen"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "ghost",
										className: "gap-1.5 ml-auto",
										onClick: () => setViewing(a),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3 w-3" }), " Details"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										className: "text-rose-600",
										onClick: () => setToDelete(a),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" })
									})
								]
							})]
						})
					}, a.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: dlgOpen,
				onOpenChange: setDlgOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: form.id ? "Edit Alert" : "New Alert" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Manually raise or edit a grain alert." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Alert ID *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.alert_id,
									onChange: (e) => setForm({
										...form,
										alert_id: e.target.value
									}),
									placeholder: "ALT-001"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Title *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.title,
									onChange: (e) => setForm({
										...form,
										title: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Message *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: form.message,
										onChange: (e) => setForm({
											...form,
											message: e.target.value
										}),
										rows: 3
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.priority,
									onValueChange: (v) => setForm({
										...form,
										priority: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
										"critical",
										"high",
										"medium",
										"low"
									].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: p,
										children: p
									}, p)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.status,
									onValueChange: (v) => setForm({
										...form,
										status: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
										"pending",
										"acknowledged",
										"escalated",
										"resolved"
									].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: s,
										children: s
									}, s)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Source" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.source,
									onValueChange: (v) => setForm({
										...form,
										source: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
										"sensor",
										"ai",
										"system",
										"manual",
										"batch",
										"user"
									].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: s,
										children: s
									}, s)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Alert Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.alert_type,
									onChange: (e) => setForm({
										...form,
										alert_type: e.target.value
									}),
									placeholder: "temperature_high"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warehouse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.warehouse_id || "none",
									onValueChange: (v) => setForm({
										...form,
										warehouse_id: v === "none" ? "" : v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "none",
										children: "—"
									}), warehouses.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: w.id,
										children: w.name
									}, w.id))] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Silo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.silo_id || "none",
									onValueChange: (v) => setForm({
										...form,
										silo_id: v === "none" ? "" : v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "none",
										children: "—"
									}), silos.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: s.id,
										children: s.name
									}, s.id))] })]
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
				open: !!resolveOf,
				onOpenChange: (o) => !o && setResolveOf(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Resolve alert" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: resolveOf?.title })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Resolution notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 4,
								value: resolveNotes,
								onChange: (e) => setResolveNotes(e.target.value),
								placeholder: "What was done?"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setResolveOf(null),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "bg-emerald-600 hover:bg-emerald-700",
							onClick: () => resolveOf && act.mutate({
								id: resolveOf.id,
								action: "resolve",
								notes: resolveNotes,
								resolution_type: "manual"
							}),
							children: "Resolve"
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!escalateOf,
				onOpenChange: (o) => !o && setEscalateOf(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Escalate alert" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: escalateOf?.title })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Escalate to" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: escalateData.to,
								onChange: (e) => setEscalateData({
									...escalateData,
									to: e.target.value
								}),
								placeholder: "Manager, on-call, etc."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reason" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 3,
								value: escalateData.reason,
								onChange: (e) => setEscalateData({
									...escalateData,
									reason: e.target.value
								})
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setEscalateOf(null),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "bg-orange-600 hover:bg-orange-700",
							onClick: () => escalateOf && act.mutate({
								id: escalateOf.id,
								action: "escalate",
								escalated_to: escalateData.to,
								reason: escalateData.reason
							}),
							children: "Escalate"
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!viewing,
				onOpenChange: (o) => !o && setViewing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
					className: "max-w-lg max-h-[90vh] overflow-y-auto",
					children: viewing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-5 w-5" }),
							" ",
							viewing.title
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
						viewing.alert_id,
						" · ",
						viewing.source
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground",
								children: viewing.message
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Priority",
								val: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: PRIO_STYLES[viewing.priority].badge,
									children: viewing.priority
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Status",
								val: viewing.status ?? "pending"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Type",
								val: viewing.alert_type ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Triggered",
								val: viewing.triggered_at ? new Date(viewing.triggered_at).toLocaleString() : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Acknowledged",
								val: viewing.acknowledged_at ? new Date(viewing.acknowledged_at).toLocaleString() : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Resolved",
								val: viewing.resolved_at ? new Date(viewing.resolved_at).toLocaleString() : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Silo",
								val: viewing.silos?.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Warehouse",
								val: viewing.warehouses?.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Batch",
								val: viewing.grain_batches?.batch_id ?? "—"
							}),
							viewing.trigger_conditions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded border bg-muted/30 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium mb-1",
									children: "Trigger"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: "whitespace-pre-wrap",
									children: JSON.stringify(viewing.trigger_conditions, null, 2)
								})]
							}),
							viewing.resolution && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded border bg-emerald-50 dark:bg-emerald-950/30 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium mb-1",
									children: "Resolution"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: "whitespace-pre-wrap",
									children: JSON.stringify(viewing.resolution, null, 2)
								})]
							}),
							viewing.escalation_history && viewing.escalation_history.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded border bg-orange-50 dark:bg-orange-950/30 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-medium mb-1 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "h-3 w-3" }), " Escalations"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "space-y-1",
									children: viewing.escalation_history.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"L",
										e.level,
										" → ",
										e.escalated_to ?? "—",
										" · ",
										new Date(e.escalated_at).toLocaleString(),
										e.reason ? ` — ${e.reason}` : ""
									] }, i))
								})]
							})
						]
					})] })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!toDelete,
				onOpenChange: (o) => !o && setToDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete alert?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: toDelete?.title }),
					"."
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
			blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60",
			rose: "from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-200/60",
			amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-200/60"
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
		className: "flex items-center justify-between border-b py-1.5 last:border-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground text-xs",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium text-sm",
			children: val
		})]
	});
}
//#endregion
export { GrainAlertsPage as component };
