import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { B as Settings, I as Shield, J as RefreshCw, Jt as Clock, Ot as FileText, Qt as CircleCheck, Rt as DollarSign, S as Trash2, Xt as CircleX, an as Check, at as Package, bt as Info, gn as BellOff, hn as Bell, v as Truck, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { i as ListSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as markNotificationRead, i as markAllNotificationsRead, r as listNotifications, t as deleteNotification } from "./notifications-audit.functions-CKHtmFpR.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as useRealtimeInvalidate } from "./use-realtime-invalidate-DId6JN-1.mjs";
import { a as Viewport, i as ScrollAreaThumb, n as Root, r as ScrollAreaScrollbar, t as Corner } from "../_libs/radix-ui__react-scroll-area.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-Dt8HUB-e.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ScrollArea = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
	ref,
	className: cn("relative overflow-hidden", className),
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full rounded-[inherit]",
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollBar, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Corner, {})
	]
}));
ScrollArea.displayName = Root.displayName;
var ScrollBar = import_react.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbar, {
	ref,
	orientation,
	className: cn("flex touch-none select-none transition-colors", orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]", orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
}));
ScrollBar.displayName = ScrollAreaScrollbar.displayName;
var TYPE_CONFIG = {
	info: {
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-5 w-5" }),
		color: "text-blue-600",
		bg: "bg-blue-50"
	},
	warning: {
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5" }),
		color: "text-amber-600",
		bg: "bg-amber-50"
	},
	critical: {
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-5 w-5" }),
		color: "text-red-600",
		bg: "bg-red-50"
	},
	success: {
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-5 w-5" }),
		color: "text-emerald-600",
		bg: "bg-emerald-50"
	}
};
var CATEGORY_ICON = {
	batch: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-3.5 w-3.5" }),
	spoilage: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5" }),
	dispatch: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-3.5 w-3.5" }),
	payment: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-3.5 w-3.5" }),
	insurance: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3.5 w-3.5" }),
	invoice: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-3.5 w-3.5" }),
	system: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-3.5 w-3.5" })
};
function formatTime(dateStr) {
	const d = new Date(dateStr);
	const diff = (Date.now() - d.getTime()) / 1e3;
	if (diff < 60) return "Just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric"
	});
}
function NotificationsPage() {
	const [filter, setFilter] = (0, import_react.useState)("all");
	const qc = useQueryClient();
	useRealtimeInvalidate("notifications", [["notifications"]]);
	const list = useServerFn(listNotifications);
	const markOne = useServerFn(markNotificationRead);
	const markAll = useServerFn(markAllNotificationsRead);
	const del = useServerFn(deleteNotification);
	const { data, isLoading, refetch, isFetching } = useQuery({
		queryKey: ["notifications", filter],
		queryFn: () => list({ data: {
			filter,
			limit: 50
		} })
	});
	const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });
	const readMut = useMutation({
		mutationFn: (id) => markOne({ data: { id } }),
		onSuccess: invalidate
	});
	const allMut = useMutation({
		mutationFn: () => markAll(),
		onSuccess: () => {
			invalidate();
			toast.success("All marked as read");
		}
	});
	const delMut = useMutation({
		mutationFn: (id) => del({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Notification removed");
		}
	});
	const notifications = data?.notifications ?? [];
	const unread = data?.unread_count ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl sm:text-3xl font-black tracking-tight text-slate-900",
						children: "Notifications"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-500 mt-1",
						children: unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All caught up!"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => refetch(),
						disabled: isFetching,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}` }), " Refresh"]
					}), unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: () => allMut.mutate(),
						disabled: allMut.isPending,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 mr-2" }), " Mark all read"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 flex-wrap",
				children: [
					"all",
					"unread",
					"read"
				].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: filter === f ? "default" : "outline",
					size: "sm",
					onClick: () => setFilter(f),
					className: filter === f ? "bg-emerald-600 hover:bg-emerald-700" : "",
					children: [
						f === "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 mr-1.5" }) : f === "unread" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, { className: "h-4 w-4 mr-1.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 mr-1.5" }),
						f[0].toUpperCase() + f.slice(1),
						f === "unread" && unread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: "ml-1.5 bg-red-500 text-white text-[10px] px-1.5",
							children: unread
						})
					]
				}, f))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-slate-200/70",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, { rows: 5 })
					}) : notifications.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center justify-center py-16 text-slate-400",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-12 w-12 mb-3 opacity-30" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg font-medium",
								children: "No notifications"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm mt-1",
								children: filter === "unread" ? "All notifications have been read" : "You have no notifications yet"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
						className: "max-h-[75vh]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "divide-y",
							children: notifications.map((n) => {
								const t = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
								const ci = CATEGORY_ICON[n.category] ?? CATEGORY_ICON.system;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `flex items-start gap-3 sm:gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? "bg-emerald-50/30 border-l-4 border-l-emerald-500" : "border-l-4 border-l-transparent"}`,
									onClick: () => !n.read && readMut.mutate(n.id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `mt-0.5 shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${t.bg}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: t.color,
											children: t.icon
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: `text-sm font-semibold leading-snug ${!n.read ? "text-slate-900" : "text-slate-600"}`,
													children: n.title
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5 shrink-0",
													children: [!n.read && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 bg-emerald-500 rounded-full" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-[11px] text-slate-400 flex items-center gap-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }), formatTime(n.created_at)]
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-slate-500 mt-0.5 line-clamp-2",
												children: n.message
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 mt-2 flex-wrap",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
														variant: "outline",
														className: "text-[10px] px-1.5 py-0 gap-1",
														children: [ci, n.category]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "text-[10px] px-1.5 py-0 capitalize",
														children: n.type
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: "ml-auto text-slate-400 hover:text-red-500 transition-colors",
														onClick: (e) => {
															e.stopPropagation();
															delMut.mutate(n.id);
														},
														title: "Delete",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
													})
												]
											})
										]
									})]
								}, n.id);
							})
						})
					})
				})
			})
		]
	});
}
//#endregion
export { NotificationsPage as component };
