import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as TrendingUp, d as Users, dn as Building2, m as UserPlus } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as adminListHubspotContacts } from "./hubspot.functions-XOaLLP_6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.leads-SA2krNar.js
var import_jsx_runtime = require_jsx_runtime();
function LeadsPage() {
	const listFn = useServerFn(adminListHubspotContacts);
	const { data, isLoading, error } = useQuery({
		queryKey: ["platform-leads"],
		queryFn: () => listFn()
	});
	const totalLeads = data?.results?.length ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold text-slate-900",
					children: "Leads"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-600 mt-1",
					children: "HubSpot contacts synced from GrainHero signups"
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-blue-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Total Leads"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-3xl font-bold mt-1 text-slate-900",
									children: totalLeads
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-8 w-8 text-blue-600" })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-emerald-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "This Month"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-3xl font-bold mt-1 text-slate-900",
									children: (data?.results ?? []).filter((c) => {
										const created = c.properties?.createdate ? new Date(c.properties.createdate) : null;
										if (!created) return false;
										const monthAgo = /* @__PURE__ */ new Date();
										monthAgo.setMonth(monthAgo.getMonth() - 1);
										return created >= monthAgo;
									}).length
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-8 w-8 text-emerald-600" })]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-purple-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold uppercase text-slate-500",
									children: "Companies"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-3xl font-bold mt-1 text-slate-900",
									children: new Set((data?.results ?? []).map((c) => c.properties?.company).filter(Boolean)).size
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-8 w-8 text-purple-600" })]
							})
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "border-b bg-gradient-to-r from-slate-50 to-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-lg",
						children: "All Contacts"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "View and manage your HubSpot lead database" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-0",
					children: [
						isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-8 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-slate-500",
								children: "Loading leads…"
							})]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-8 text-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-red-600",
								children: ["Error: ", error.message]
							})
						}),
						!isLoading && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-slate-50 border-b-2 border-slate-200",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600",
											children: "Name"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600",
											children: "Email"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600",
											children: "Company"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600",
											children: "Phone"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600",
											children: "Created"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
									className: "divide-y divide-slate-100",
									children: [(data?.results ?? []).map((c) => {
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
											className: "hover:bg-slate-50 transition-colors",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-3 px-4",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "font-medium text-slate-900",
														children: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" ") || "—"
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-3 px-4",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm text-slate-700",
														children: c.properties?.email ?? "—"
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-3 px-4",
													children: c.properties?.company ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "outline",
														className: "bg-purple-50 text-purple-700 border-purple-200",
														children: c.properties.company
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-slate-400",
														children: "—"
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-3 px-4 text-sm text-slate-600",
													children: c.properties?.phone ?? "—"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-3 px-4 text-sm text-slate-500",
													children: c.properties?.createdate ? new Date(c.properties.createdate).toLocaleDateString() : "—"
												})
											]
										}, c.id);
									}), (!data || data.results.length === 0) && !isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										colSpan: 5,
										className: "py-12 text-center",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "h-12 w-12 text-slate-300 mx-auto mb-3" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-slate-500 font-medium",
												children: "No leads yet."
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-slate-400 mt-1",
												children: "Leads will appear here when users sign up"
											})
										]
									}) })]
								})]
							})
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { LeadsPage as component };
