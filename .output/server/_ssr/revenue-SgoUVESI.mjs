import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Ot as FileText, Qt as CircleCheck, Rt as DollarSign, U as Search, b as TrendingUp, en as CircleAlert, l as Wallet } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BgKcOzjx.mjs";
import { i as markInvoicePaid, r as getRevenueOverview } from "./billing.functions-CNrpoOgJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/revenue-SgoUVESI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function payBadge(s) {
	switch (s) {
		case "paid": return "bg-emerald-100 text-emerald-800 border-emerald-200";
		case "partial": return "bg-amber-100 text-amber-800 border-amber-200";
		case "overdue": return "bg-red-100 text-red-800 border-red-200";
		case "cancelled": return "bg-slate-100 text-slate-600 border-slate-200";
		default: return "bg-blue-100 text-blue-800 border-blue-200";
	}
}
function money(n, ccy) {
	return `${ccy ?? "PKR"} ${Number(n ?? 0).toLocaleString(void 0, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}`;
}
function RevenuePage() {
	const fn = useServerFn(getRevenueOverview);
	const markFn = useServerFn(markInvoicePaid);
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["revenue"],
		queryFn: () => fn()
	});
	const [q, setQ] = (0, import_react.useState)("");
	const markM = useMutation({
		mutationFn: (id) => markFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Invoice marked paid");
			qc.invalidateQueries({ queryKey: ["revenue"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed")
	});
	const invoices = data?.invoices ?? [];
	const payments = data?.payments ?? [];
	const totals = data?.totals ?? {
		invoiced: 0,
		paid: 0,
		outstanding: 0,
		overdue: 0,
		countInvoices: 0,
		countPayments: 0,
		collected: 0
	};
	const byStatus = data?.byStatus ?? {};
	const filteredInv = (0, import_react.useMemo)(() => {
		const term = q.trim().toLowerCase();
		if (!term) return invoices;
		return invoices.filter((i) => i.invoice_number?.toLowerCase().includes(term) || i.buyer_name?.toLowerCase().includes(term) || i.buyer_company?.toLowerCase().includes(term) || i.batch_ref?.toLowerCase().includes(term));
	}, [invoices, q]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-6 w-6 text-emerald-600" }), " Revenue"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Buyer invoices, collections and cash flow."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Invoiced"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold",
								children: money(totals.invoiced, "PKR")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: [totals.countInvoices, " invoices"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Collected"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold text-emerald-600",
								children: money(totals.paid, "PKR")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: [totals.countPayments, " payments"]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Outstanding"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: money(totals.outstanding, "PKR")
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-6 w-6 text-amber-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs uppercase text-slate-500 font-semibold",
								children: "Overdue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold text-red-600",
								children: totals.overdue
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-slate-500 mt-1",
								children: "past due"
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-6 w-6 text-red-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-sm",
				children: "By status"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "flex flex-wrap gap-2",
				children: [Object.entries(byStatus).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					className: payBadge(k),
					children: [
						k,
						": ",
						String(v)
					]
				}, k)), Object.keys(byStatus).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-slate-500",
					children: "No invoices yet."
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "invoices",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "invoices",
						children: "Invoices"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "payments",
						children: "Payments"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "invoices",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
							className: "flex flex-row justify-between items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Buyer invoices" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
								filteredInv.length,
								" of ",
								invoices.length
							] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: q,
									onChange: (e) => setQ(e.target.value),
									placeholder: "Search…",
									className: "pl-8 w-64"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "divide-y",
								children: [filteredInv.map((i) => {
									const remaining = Math.max(0, Number(i.total_amount) - Number(i.amount_paid ?? 0));
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 flex flex-col sm:flex-row sm:items-center gap-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 flex-wrap",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-semibold text-slate-900",
														children: i.invoice_number
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														className: payBadge(i.payment_status),
														children: i.payment_status ?? "pending"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-slate-500 mt-1",
													children: [
														i.buyer_name ?? "—",
														i.buyer_company ? ` · ${i.buyer_company}` : "",
														i.batch_ref ? ` · ${i.batch_ref}` : "",
														i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-right",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-bold",
													children: money(i.total_amount, i.currency)
												}), remaining > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs text-amber-600",
													children: [money(remaining, i.currency), " due"]
												})]
											}),
											remaining > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												variant: "outline",
												onClick: () => markM.mutate(i.id),
												disabled: markM.isPending,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-3.5 w-3.5 mr-1" }), " Mark paid"]
											})
										]
									}, i.id);
								}), filteredInv.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-8 text-center text-sm text-slate-500",
									children: "No invoices."
								})]
							})
						})] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "payments",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Recent payments" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [payments.length, " entries"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "divide-y",
								children: [payments.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 flex items-center justify-between text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium",
										children: p.payment_reference ?? p.id.slice(0, 8)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-slate-500",
										children: [p.payment_method, p.payment_date ? ` · ${new Date(p.payment_date).toLocaleDateString()}` : ""]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold",
											children: money(p.amount, p.currency)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "outline",
											children: p.status ?? "completed"
										})]
									})]
								}, p.id)), payments.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-8 text-center text-sm text-slate-500",
									children: "No payments recorded."
								})]
							})
						})] })
					})
				]
			})
		]
	});
}
//#endregion
export { RevenuePage as component };
