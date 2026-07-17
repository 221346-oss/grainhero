import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { B as Settings, Et as Funnel, I as Shield, J as RefreshCw, Jt as Clock, Lt as Download, Mt as Eye, Ot as FileText, Rt as DollarSign, U as Search, Xt as CircleX, at as Package, bt as Info, d as Users, en as CircleAlert, n as X, nn as ChevronRight, rn as ChevronLeft, sn as ChartColumn, v as Truck, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { s as TableSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { n as listActivityLogs } from "./notifications-audit.functions-CKHtmFpR.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/activity-logs-D5Zj6u3d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATEGORY = {
	batch: {
		label: "Batch",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-4 w-4" }),
		color: "text-blue-600",
		bg: "bg-blue-50 border-blue-200"
	},
	spoilage: {
		label: "Spoilage",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" }),
		color: "text-red-600",
		bg: "bg-red-50 border-red-200"
	},
	buyer: {
		label: "Buyer",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" }),
		color: "text-purple-600",
		bg: "bg-purple-50 border-purple-200"
	},
	dispatch: {
		label: "Dispatch",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-4 w-4" }),
		color: "text-emerald-600",
		bg: "bg-emerald-50 border-emerald-200"
	},
	payment: {
		label: "Payment",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-4 w-4" }),
		color: "text-emerald-700",
		bg: "bg-emerald-50 border-emerald-200"
	},
	insurance: {
		label: "Insurance",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
		color: "text-amber-600",
		bg: "bg-amber-50 border-amber-200"
	},
	invoice: {
		label: "Invoice",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }),
		color: "text-indigo-600",
		bg: "bg-indigo-50 border-indigo-200"
	},
	report: {
		label: "Report",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-4 w-4" }),
		color: "text-cyan-600",
		bg: "bg-cyan-50 border-cyan-200"
	},
	system: {
		label: "System",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }),
		color: "text-slate-600",
		bg: "bg-slate-50 border-slate-200"
	}
};
var SEVERITY = {
	info: {
		label: "Info",
		color: "bg-blue-100 text-blue-700 border-blue-300",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-3 w-3" })
	},
	warning: {
		label: "Warning",
		color: "bg-amber-100 text-amber-700 border-amber-300",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-3 w-3" })
	},
	critical: {
		label: "Critical",
		color: "bg-red-100 text-red-700 border-red-300",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3 w-3" })
	}
};
function fmtAbs(s) {
	return new Date(s).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function fmtRel(s) {
	const d = (Date.now() - new Date(s).getTime()) / 1e3;
	if (d < 60) return "just now";
	if (d < 3600) return `${Math.floor(d / 60)}m ago`;
	if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
	if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
	return fmtAbs(s);
}
function ActivityLogsPage() {
	const [page, setPage] = (0, import_react.useState)(1);
	const [search, setSearch] = (0, import_react.useState)("");
	const [searchInput, setSearchInput] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("all");
	const [severity, setSeverity] = (0, import_react.useState)("all");
	const [from, setFrom] = (0, import_react.useState)("");
	const [to, setTo] = (0, import_react.useState)("");
	const [entityFilter, setEntityFilter] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const fetchLogs = useServerFn(listActivityLogs);
	const { data, isLoading, refetch, isFetching } = useQuery({
		queryKey: [
			"activity-logs",
			page,
			search,
			category,
			severity,
			from,
			to,
			entityFilter
		],
		queryFn: () => fetchLogs({ data: {
			page,
			limit: 20,
			search: search || null,
			category: category === "all" ? null : category,
			severity: severity === "all" ? null : severity,
			from: from || null,
			to: to || null,
			entity_ref: entityFilter || null
		} })
	});
	const logs = data?.logs ?? [];
	const pagination = data?.pagination ?? {
		current_page: 1,
		total_pages: 1,
		total_items: 0,
		items_per_page: 20
	};
	const catCounts = data?.summary.categories ?? {};
	const total = Object.values(catCounts).reduce((s, n) => s + n, 0);
	const handleSearch = (e) => {
		e.preventDefault();
		setPage(1);
		setSearch(searchInput);
	};
	const exportCSV = () => {
		if (!logs.length) return toast.error("No logs to export");
		const csv = [[
			"Timestamp",
			"Action",
			"Category",
			"Severity",
			"User",
			"Role",
			"Entity",
			"Description"
		], ...logs.map((l) => [
			new Date(l.created_at).toISOString(),
			l.action,
			l.category,
			l.severity,
			l.user_name ?? "System",
			l.user_role ?? "",
			l.entity_ref ?? "",
			(l.description ?? "").replace(/"/g, "\"\"")
		])].map((r) => r.map((c) => `"${String(c)}"`).join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `activity-logs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Exported");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl sm:text-3xl font-black tracking-tight text-slate-900",
						children: "Activity Logs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-500 mt-1",
						children: "Complete audit trail of all system activities"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: exportCSV,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-2" }), " Export CSV"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => refetch(),
						disabled: isFetching,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}` }), " Refresh"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: `cursor-pointer transition-all hover:shadow-md ${category === "all" ? "ring-2 ring-emerald-400 shadow-md" : ""}`,
					onClick: () => {
						setCategory("all");
						setPage(1);
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-center gap-2 mb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-4 w-4 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-2xl font-bold text-slate-900",
								children: total
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 font-medium",
							children: "All Events"
						})]
					})
				}), Object.entries(CATEGORY).slice(0, 4).map(([key, cfg]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: `cursor-pointer transition-all hover:shadow-md ${category === key ? "ring-2 ring-emerald-400 shadow-md" : ""}`,
					onClick: () => {
						setCategory(category === key ? "all" : key);
						setPage(1);
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-center gap-2 mb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cfg.color,
								children: cfg.icon
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-2xl font-bold text-slate-900",
								children: catCounts[key] ?? 0
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 font-medium",
							children: cfg.label
						})]
					})
				}, key))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSearch,
					className: "flex flex-wrap gap-3 items-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-[200px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-slate-500 mb-1 block",
								children: "Search"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Search description, action, or ref…",
									value: searchInput,
									onChange: (e) => setSearchInput(e.target.value),
									className: "pl-10"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-slate-500 mb-1 block",
								children: "Category"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: category,
								onValueChange: (v) => {
									setCategory(v);
									setPage(1);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "All" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All Categories"
								}), Object.entries(CATEGORY).map(([k, c]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: k,
									children: c.label
								}, k))] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-36",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-slate-500 mb-1 block",
								children: "Severity"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: severity,
								onValueChange: (v) => {
									setSeverity(v);
									setPage(1);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "All" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "all",
										children: "All Severity"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "info",
										children: "Info"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "warning",
										children: "Warning"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "critical",
										children: "Critical"
									})
								] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-slate-500 mb-1 block",
								children: "From"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: from,
								onChange: (e) => {
									setFrom(e.target.value);
									setPage(1);
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-slate-500 mb-1 block",
								children: "To"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: to,
								onChange: (e) => {
									setTo(e.target.value);
									setPage(1);
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							className: "bg-emerald-600 hover:bg-emerald-700 text-white gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "h-4 w-4" }), " Filter"]
						})
					]
				})
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
						className: "pb-3 flex flex-row items-center justify-between",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
								className: "text-lg",
								children: "Event Timeline"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
								className: "flex flex-wrap items-center gap-2",
								children: [
									"Showing ",
									logs.length,
									" of ",
									pagination.total_items,
									" events",
									entityFilter && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1",
										children: [entityFilter, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
											className: "h-3 w-3 cursor-pointer",
											onClick: () => setEntityFilter("")
										})]
									})
								]
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-0",
						children: [isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableSkeleton, {
								rows: 8,
								cols: 4
							})
						}) : logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center justify-center py-16 text-slate-400",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-12 w-12 mb-3" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-lg font-medium",
									children: "No activity logs found"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm mt-1",
									children: "Logs will appear as actions are performed"
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative pl-8 pr-4 py-4 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-slate-300 before:to-slate-100 space-y-4",
							children: logs.map((log) => {
								const cc = CATEGORY[log.category] ?? CATEGORY.system;
								const sc = SEVERITY[log.severity] ?? SEVERITY.info;
								const isSel = selected?.id === log.id;
								let node = "bg-blue-400 border-blue-100";
								if (log.severity === "critical") node = "bg-red-500 border-red-100";
								else if (log.severity === "warning") node = "bg-amber-400 border-amber-100";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSel ? "bg-slate-50 ring-1 ring-slate-200" : "hover:bg-slate-50/60"}`,
									onClick: () => setSelected(log),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `absolute -left-5 top-4 w-3 h-3 rounded-full border-2 ${node} z-10 shadow-sm` }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `mt-0.5 flex items-center justify-center w-8 h-8 rounded border ${cc.bg}`,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: cc.color,
												children: cc.icon
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm font-medium text-slate-900 leading-snug",
													children: log.description
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs text-slate-400 whitespace-nowrap flex items-center gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }), fmtRel(log.created_at)]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 mt-2 flex-wrap",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
														variant: "outline",
														className: `text-[10px] px-1.5 py-0 ${sc.color}`,
														children: [sc.icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "ml-0.5",
															children: sc.label
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "text-[10px] px-1.5 py-0 text-slate-500",
														children: cc.label
													}),
													log.entity_ref && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "secondary",
														className: "text-[10px] px-1.5 py-0 cursor-pointer hover:bg-blue-100",
														onClick: (e) => {
															e.stopPropagation();
															setEntityFilter(log.entity_ref);
															setPage(1);
														},
														children: log.entity_ref
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-[10px] text-slate-400",
														children: [
															"by ",
															log.user_name ?? "System",
															" (",
															log.user_role ?? "—",
															")"
														]
													})
												]
											})]
										})
									]
								}, log.id);
							})
						}), pagination.total_pages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between p-4 border-t bg-slate-50/50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-slate-500",
								children: [
									"Page ",
									pagination.current_page,
									" of ",
									pagination.total_pages
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									disabled: page === 1,
									onClick: () => setPage(page - 1),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									disabled: page === pagination.total_pages,
									onClick: () => setPage(page + 1),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
								})]
							})]
						})]
					})] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:col-span-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "lg:sticky lg:top-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							className: "pb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "text-lg flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-5 w-5 text-slate-400" }), " Event Details"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Action"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium text-slate-900",
									children: selected.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Description"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-slate-700",
									children: selected.description
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
										className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
										children: "Category"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: CATEGORY[selected.category]?.bg ?? "",
										children: CATEGORY[selected.category]?.label ?? selected.category
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
										className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
										children: "Severity"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: SEVERITY[selected.severity]?.color ?? "",
										children: SEVERITY[selected.severity]?.label ?? selected.severity
									})] })]
								}),
								selected.entity_ref && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Entity"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-slate-700",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-slate-500",
											children: [selected.entity_type ?? "—", ":"]
										}),
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-medium",
											children: selected.entity_ref
										})
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Performed By"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-slate-700",
									children: [
										selected.user_name ?? "System",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-slate-400",
											children: [
												"(",
												selected.user_role ?? "—",
												")"
											]
										})
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Timestamp"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-slate-700",
									children: fmtAbs(selected.created_at)
								})] }),
								selected.metadata && typeof selected.metadata === "object" && Object.keys(selected.metadata).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1",
									children: "Details"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-slate-50 rounded-lg p-3 space-y-1",
									children: Object.entries(selected.metadata).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-xs gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-slate-500",
											children: k.replace(/_/g, " ")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-slate-800 font-medium truncate",
											children: String(v)
										})]
									}, k))
								})] })
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center justify-center py-12 text-slate-400",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-10 w-10 mb-3 opacity-30" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: "Select an event to view details"
							})]
						}) })]
					})
				})]
			})
		]
	});
}
//#endregion
export { ActivityLogsPage as component };
