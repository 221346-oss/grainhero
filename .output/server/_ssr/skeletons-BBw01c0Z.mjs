import { t as cn } from "./utils-C_uf36nf.mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/skeletons-BBw01c0Z.js
var import_jsx_runtime = require_jsx_runtime();
function Bar({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("animate-pulse rounded-md bg-slate-200/80", className) });
}
function StatsSkeleton({ count = 4, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid grid-cols-2 md:grid-cols-4 gap-4", className),
		children: Array.from({ length: count }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-slate-200 bg-white p-4 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3 w-20" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-7 w-24" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-2 w-16" })
			]
		}, i))
	});
}
function ListSkeleton({ rows = 5, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("space-y-2", className),
		children: Array.from({ length: rows }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-9 rounded-full" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3 w-1/3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-2 w-1/2" })]
			})]
		}, i))
	});
}
function TableSkeleton({ rows = 6, cols = 4, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-2 p-3 border-b border-slate-100",
			style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
			children: Array.from({ length: cols }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3" }, i))
		}), Array.from({ length: rows }).map((_, r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-2 p-3 border-b border-slate-50",
			style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
			children: Array.from({ length: cols }).map((_, c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3" }, c))
		}, r))]
	});
}
function CardsSkeleton({ count = 3, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className),
		children: Array.from({ length: count }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-slate-200 bg-white p-4 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-24 w-full" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-4 w-2/3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3 w-1/2" })
			]
		}, i))
	});
}
function FormSkeleton({ fields = 4, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("space-y-4", className),
		children: Array.from({ length: fields }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3 w-24" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-full" })]
		}, i))
	});
}
function DashboardSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardsSkeleton, { count: 2 })]
	});
}
function ChartSkeleton({ className, height = "h-56" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-xl border border-slate-200 bg-white p-4 space-y-3", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-3 w-32" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("flex items-end gap-2", height),
				children: Array.from({ length: 14 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 rounded-md bg-slate-200/70 animate-pulse",
					style: { height: `${20 + i * 37 % 80}%` }
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-2 w-10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-2 w-10" })]
			})
		]
	});
}
/**
* Unified per-page loading skeleton — pick the variant that matches the page shape:
* - dashboard: header + stat tiles + widget cards (used by /dashboard, super-admin, manager, technician).
* - table:    filter bar + tabular rows (used by list pages: silos, batches, sensors, tenants, users…).
* - insight:  stat strip + charts (analytics, revenue, pipeline, health…).
* - form:     labelled fields + supporting cards (settings, plans editor, subscription…).
*/
function PageSkeleton({ variant = "dashboard", className }) {
	if (variant === "table") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("p-4 md:p-6 space-y-4", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-6 w-40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-32 rounded-md" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-64 rounded-md" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-28 rounded-md" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableSkeleton, {
				rows: 8,
				cols: 5
			})
		]
	});
	if (variant === "insight") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("p-4 md:p-6 space-y-4", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-6 w-48" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, { count: 4 }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartSkeleton, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartSkeleton, {})]
			})
		]
	});
	if (variant === "form") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("p-4 md:p-6 grid gap-4 lg:grid-cols-3", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, { fields: 6 })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardsSkeleton, { count: 2 })
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("p-4 md:p-6 space-y-4", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-9 w-9 rounded-lg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-4 w-40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { className: "h-2 w-24" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, { count: 6 }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardsSkeleton, { count: 3 })
		]
	});
}
//#endregion
export { PageSkeleton as a, ListSkeleton as i, DashboardSkeleton as n, StatsSkeleton as o, FormSkeleton as r, TableSkeleton as s, CardsSkeleton as t };
