import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { at as Package, dt as MapPin, et as Phone, ht as LoaderCircle, ln as Calendar, r as Wrench } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { r as listMyHardwareOrders } from "./hardware-orders.functions-cPlHFJSi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders-Cg0I_eBf.js
var import_jsx_runtime = require_jsx_runtime();
var STATUS_STYLE = {
	pending_payment: "bg-slate-200 text-slate-700",
	new: "bg-amber-100 text-amber-800",
	approved: "bg-blue-100 text-blue-800",
	tech_assigned: "bg-indigo-100 text-indigo-800",
	installed: "bg-emerald-100 text-emerald-800",
	live: "bg-emerald-600 text-white",
	cancelled: "bg-red-100 text-red-700"
};
function MyOrdersPage() {
	const fetchFn = useServerFn(listMyHardwareOrders);
	const { data, isLoading } = useQuery({
		queryKey: ["my-hardware-orders"],
		queryFn: () => fetchFn()
	});
	const orders = data?.orders ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-5xl mx-auto space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-5 w-5 text-white" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold text-slate-900",
				children: "My install orders"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500",
				children: "Track the technician install for each subscription you purchased."
			})] })]
		}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-sm text-slate-500",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Loading…"]
		}) : orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-10 text-center text-slate-500 text-sm",
			children: "No install orders yet. Pick a plan on the pricing page to get started."
		}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4",
			children: orders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
					className: "text-base",
					children: [
						o.plan_name ?? o.plan_id,
						" · ",
						o.hardware_quantity,
						" sensor",
						Number(o.hardware_quantity) === 1 ? "" : "s"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, {
					className: "text-xs",
					children: ["Placed ", new Date(o.created_at).toLocaleString()]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					className: STATUS_STYLE[o.status] ?? "bg-slate-200 text-slate-700",
					children: String(o.status).replace("_", " ")
				})]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-3 md:grid-cols-2 text-sm text-slate-700",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-slate-400 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: o.install_address }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-slate-500",
							children: [
								o.install_city,
								", ",
								o.install_country
							]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-4 w-4 text-slate-400" }),
							" ",
							o.contact_phone ?? "—"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "h-4 w-4 text-slate-400" }), o.technician_name ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [o.technician_name, o.technician_phone ? ` · ${o.technician_phone}` : ""] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-slate-500",
							children: "Technician not yet assigned"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 text-slate-400" }), o.scheduled_install_date ? new Date(o.scheduled_install_date).toLocaleString() : o.preferred_install_date ? `Preferred: ${o.preferred_install_date}` : "Awaiting schedule"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "md:col-span-2 text-xs text-slate-500 border-t border-slate-100 pt-2",
						children: [
							"Rs. ",
							Number(o.hardware_total ?? 0).toLocaleString(),
							" in hardware · order id: ",
							o.id
						]
					})
				]
			})] }, o.id))
		})]
	});
}
//#endregion
export { MyOrdersPage as component };
