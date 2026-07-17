import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { t as Textarea } from "./textarea-1llmCJsE.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as DialogTrigger, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { a as updateHardwareOrder, i as sendOrderMessage, n as listAllHardwareOrders } from "./hardware-orders.functions-cPlHFJSi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.orders-BYZu6-yh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUSES = [
	"pending_payment",
	"new",
	"approved",
	"tech_assigned",
	"installed",
	"live",
	"cancelled"
];
var STATUS_STYLE = {
	pending_payment: "bg-slate-200 text-slate-700",
	new: "bg-amber-100 text-amber-800",
	approved: "bg-blue-100 text-blue-800",
	tech_assigned: "bg-indigo-100 text-indigo-800",
	installed: "bg-emerald-100 text-emerald-800",
	live: "bg-emerald-600 text-white",
	cancelled: "bg-red-100 text-red-700"
};
function PlatformOrdersPage() {
	const qc = useQueryClient();
	const fetchFn = useServerFn(listAllHardwareOrders);
	const updateFn = useServerFn(updateHardwareOrder);
	const messageFn = useServerFn(sendOrderMessage);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const { data, isLoading } = useQuery({
		queryKey: ["platform-orders"],
		queryFn: () => fetchFn()
	});
	const orders = (data?.orders ?? []).filter((o) => filter === "all" || o.status === filter);
	const update = useMutation({
		mutationFn: (v) => updateFn({ data: v }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["platform-orders"] });
			toast.success("Order updated");
		},
		onError: (e) => toast.error(e.message)
	});
	const sendMsg = useMutation({
		mutationFn: (v) => messageFn({ data: v }),
		onSuccess: (r) => toast.success(r.emailed ? "Message sent + emailed" : "Message sent"),
		onError: (e) => toast.error(e.message)
	});
	const counts = (data?.orders ?? []).reduce((acc, o) => {
		const s = String(o.status);
		acc[s] = (acc[s] ?? 0) + 1;
		return acc;
	}, {});
	const totalRevenue = (data?.orders ?? []).reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);
	const completedRevenue = (data?.orders ?? []).filter((o) => o.status === "installed" || o.status === "live").reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);
	const pendingRevenue = (data?.orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "installed" && o.status !== "live").reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 max-w-7xl mx-auto space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold text-slate-900",
					children: "Install Orders"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-600 mt-1",
					children: "Manage hardware installation requests from customers"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs font-semibold",
						children: "Filter"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: filter,
						onValueChange: setFilter,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-9 w-52",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
							value: "all",
							children: [
								"All Orders (",
								data?.orders.length ?? 0,
								")"
							]
						}), STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
							value: s,
							children: [
								s.replace("_", " "),
								" (",
								counts[s] ?? 0,
								")"
							]
						}, s))] })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-emerald-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Total Revenue"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-2xl font-bold mt-1 text-slate-900",
									children: ["PKR ", totalRevenue.toLocaleString()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-slate-500 mt-1",
									children: [data?.orders.length ?? 0, " orders"]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-green-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Completed"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-2xl font-bold mt-1 text-green-700",
									children: ["PKR ", completedRevenue.toLocaleString()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-slate-500 mt-1",
									children: [(data?.orders ?? []).filter((o) => o.status === "installed" || o.status === "live").length, " installed"]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-amber-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Pending"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-2xl font-bold mt-1 text-amber-700",
									children: ["PKR ", pendingRevenue.toLocaleString()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-slate-500 mt-1",
									children: [(data?.orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "installed" && o.status !== "live").length, " in progress"]
								})
							]
						})
					})
				]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2 text-sm text-slate-500",
				children: "Loading orders…"
			}) : orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "p-8 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-slate-500 font-medium",
					children: "No orders match this filter"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-400 mt-1",
					children: "Orders will appear here when customers purchase hardware"
				})]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3",
				children: orders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderRow, {
					order: o,
					onUpdate: (v) => update.mutate({
						orderId: o.id,
						...v
					}),
					onMessage: (v) => sendMsg.mutate({
						orderId: o.id,
						...v
					}),
					busy: update.isPending || sendMsg.isPending
				}, o.id))
			})
		]
	});
}
function OrderRow({ order, onUpdate, onMessage, busy }) {
	const [status, setStatus] = (0, import_react.useState)(order.status);
	const [techName, setTechName] = (0, import_react.useState)(order.technician_name ?? "");
	const [techPhone, setTechPhone] = (0, import_react.useState)(order.technician_phone ?? "");
	const [scheduled, setScheduled] = (0, import_react.useState)(order.scheduled_install_date ? new Date(order.scheduled_install_date).toISOString().slice(0, 16) : "");
	const [message, setMessage] = (0, import_react.useState)("");
	const [emailBuyer, setEmailBuyer] = (0, import_react.useState)(true);
	const [cancelReason, setCancelReason] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
		className: "pb-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3 flex-wrap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base",
				children: [
					order.plan_name ?? order.plan_id,
					" · ",
					order.hardware_quantity,
					" sensor",
					order.hardware_quantity === 1 ? "" : "s"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
				className: "text-xs",
				children: [
					order.buyer?.name ?? "—",
					" · ",
					order.buyer?.email ?? "—",
					" · placed ",
					new Date(order.created_at).toLocaleString()
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
				className: STATUS_STYLE[order.status] ?? "",
				children: String(order.status).replace("_", " ")
			})]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 md:grid-cols-2 text-slate-700",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Address:" }),
						" ",
						order.install_address,
						", ",
						order.install_city,
						", ",
						order.install_country
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Phone:" }),
						" ",
						order.contact_phone ?? "—"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Preferred:" }),
						" ",
						order.preferred_install_date ?? "—"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Hardware total:" }),
						" Rs. ",
						Number(order.hardware_total ?? 0).toLocaleString()
					] }),
					order.business_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Business:" }),
						" ",
						order.business_name
					] }),
					order.tax_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Tax ID:" }),
						" ",
						order.tax_id
					] }),
					order.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "md:col-span-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Notes:" }),
							" ",
							order.notes
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 md:grid-cols-4 border-t border-slate-100 pt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Status"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: status,
						onValueChange: (v) => setStatus(v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-9 text-xs",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: s,
							children: s.replace("_", " ")
						}, s)) })]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Technician name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "h-9 text-xs",
						value: techName,
						onChange: (e) => setTechName(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Technician phone"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "h-9 text-xs",
						value: techPhone,
						onChange: (e) => setTechPhone(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Scheduled install"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "datetime-local",
						className: "h-9 text-xs",
						value: scheduled,
						onChange: (e) => setScheduled(e.target.value)
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						disabled: busy,
						onClick: () => onUpdate({
							status,
							technicianName: techName,
							technicianPhone: techPhone,
							scheduledInstallDate: scheduled ? new Date(scheduled).toISOString() : null
						}),
						children: "Save assignment"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						disabled: busy,
						onClick: () => onUpdate({ status: "installed" }),
						children: "Mark installed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						disabled: busy,
						onClick: () => onUpdate({ status: "live" }),
						children: "Mark live"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							children: "Message buyer"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Send message to buyer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							"Goes to their in-app notifications",
							emailBuyer ? " and email inbox" : "",
							"."
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							rows: 5,
							value: message,
							onChange: (e) => setMessage(e.target.value),
							maxLength: 2e3,
							placeholder: "Hi, our technician will arrive at…"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: emailBuyer,
								onChange: (e) => setEmailBuyer(e.target.checked)
							}), "Also send by email"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							disabled: busy || message.trim().length === 0,
							onClick: () => onMessage({
								message: message.trim(),
								emailBuyer
							}),
							children: "Send"
						}) })
					] })] }),
					order.status !== "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "destructive",
							children: "Cancel"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Cancel this install order?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "The buyer will be notified. Refunds are handled separately in Stripe." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							rows: 3,
							value: cancelReason,
							onChange: (e) => setCancelReason(e.target.value),
							placeholder: "Reason (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "destructive",
							disabled: busy,
							onClick: () => onUpdate({
								status: "cancelled",
								cancelReason
							}),
							children: "Confirm cancel"
						}) })
					] })] })
				]
			})
		]
	})] });
}
//#endregion
export { PlatformOrdersPage as component };
