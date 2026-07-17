import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { At as Fan, P as Smartphone, Qt as CircleCheck, Rt as DollarSign, Sn as Activity, at as Package, b as TrendingUp, c as Warehouse, d as Users, dn as Building2, ot as OctagonAlert, sn as ChartColumn, t as Zap, v as Truck, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { n as DashboardSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as StatCard, t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { f as getDashboardStats } from "./operations.functions-CdIfFwmK.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { n as getPlatformMetrics, r as getPlatformOverviewWidgets } from "./platform-no-admin.functions-CqXBeWc_.mjs";
import { n as getImpersonationSession } from "./ImpersonationBanner-C2ZVGIRH.mjs";
import { a as YAxis, g as Tooltip, h as ResponsiveContainer, l as CartesianGrid, o as XAxis, r as BarChart, s as Area, t as AreaChart, u as Bar } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-BoxfCEbr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var getSaasRevenueAnalytics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("37fdafb32f1b4bd9cd03a4b79461d45fe2ba9bef368e96e08f3831290373f3a4"));
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("923da397c6a6053e75968bef1297eae1caab91ea192c9aab6564e7c4651df112"));
function SuperAdminDashboard({ name }) {
	const metricsFn = useServerFn(getPlatformMetrics);
	const widgetsFn = useServerFn(getPlatformOverviewWidgets);
	const revenueFn = useServerFn(getSaasRevenueAnalytics);
	const { data: m, isLoading: loadingMetrics } = useQuery({
		queryKey: ["platform-metrics"],
		queryFn: () => metricsFn(),
		refetchInterval: 3e4
	});
	const { data: w } = useQuery({
		queryKey: ["platform-widgets"],
		queryFn: () => widgetsFn()
	});
	const { data: revenueData } = useQuery({
		queryKey: ["saas-revenue-dashboard"],
		queryFn: () => revenueFn()
	});
	const usersGrowth = w?.wowDelta ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 max-w-[1600px] mx-auto space-y-4",
		style: {
			backgroundColor: "#EDE9D4",
			minHeight: "100vh"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold",
					style: { color: "#252d26" },
					children: "Super Admin Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs mt-0.5",
					style: { color: "#404F44" },
					children: name ? `Welcome back, ${name}` : "Platform Management Console"
				})] }), usersGrowth !== 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					className: "px-2 py-1 text-xs",
					style: {
						backgroundColor: "rgba(47, 172, 12, 0.15)",
						color: "#2FAC0C",
						border: "1px solid #2FAC0C"
					},
					children: [
						usersGrowth > 0 ? "+" : "",
						usersGrowth,
						"% Growth"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#2FAC0C"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "Tenants"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								style: { color: "#252d26" },
								children: m?.totalTenants ?? "0"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#2FAC0C"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "Users"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								style: { color: "#252d26" },
								children: m?.totalUsers ?? "0"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#2FAC0C"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "Active Subs"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								style: { color: "#252d26" },
								children: m?.activeSubscriptions ?? "0"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#2FAC0C"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "MRR"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-lg font-bold",
								style: { color: "#252d26" },
								children: ["PKR ", m?.mrr?.toLocaleString() ?? "0"]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#DC2626"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "Critical Alerts"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								style: { color: "#DC2626" },
								children: m?.criticalAlerts ?? "0"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "shadow-sm hover:shadow-md transition-all border-l-4",
						style: {
							backgroundColor: "#FFFFFF",
							borderLeftColor: "#2FAC0C"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase tracking-wide mb-1",
								style: { color: "#404F44" },
								children: "Activity Logs"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								style: { color: "#252d26" },
								children: m?.totalLogs ?? "0"
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						style: {
							backgroundColor: "#FFFFFF",
							borderColor: "#2FAC0C",
							borderWidth: "1px"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							className: "pb-2 pt-3 px-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "flex items-center justify-between text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: "#252d26" },
									children: "User Signups (30d)"
								}), usersGrowth !== 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									className: "text-xs px-1.5 py-0.5",
									style: {
										backgroundColor: "#2FAC0C",
										color: "#FFFFFF"
									},
									children: [
										usersGrowth > 0 ? "+" : "",
										usersGrowth,
										"%"
									]
								})]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "h-40 px-2 pt-0 pb-2",
							children: w?.signupsSeries && w.signupsSeries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: w.signupsSeries,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "userGrowth",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#2FAC0C",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#2FAC0C",
												stopOpacity: 0
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											stroke: "#404F44",
											opacity: .1
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "date",
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
											backgroundColor: "#252d26",
											border: "none",
											borderRadius: "4px",
											color: "white",
											fontSize: "11px",
											padding: "4px 8px"
										} }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "count",
											stroke: "#2FAC0C",
											fillOpacity: 1,
											fill: "url(#userGrowth)",
											strokeWidth: 2
										})
									]
								})
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full flex items-center justify-center text-xs text-slate-500",
								children: "No data"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						style: {
							backgroundColor: "#FFFFFF",
							borderColor: "#2FAC0C",
							borderWidth: "1px"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							className: "pb-2 pt-3 px-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
								className: "text-sm",
								style: { color: "#252d26" },
								children: "Revenue by Plan"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "h-40 px-2 pt-0 pb-2",
							children: revenueData?.planSeries && revenueData.planSeries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
									data: revenueData.planSeries,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											stroke: "#404F44",
											opacity: .1
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "plan",
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
											backgroundColor: "#252d26",
											border: "none",
											borderRadius: "4px",
											color: "white",
											fontSize: "11px",
											padding: "4px 8px"
										} }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
											dataKey: "mrr",
											fill: "#2FAC0C",
											radius: [
												4,
												4,
												0,
												0
											]
										})
									]
								})
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full flex items-center justify-center text-xs text-slate-500",
								children: "No data"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						style: {
							backgroundColor: "#FFFFFF",
							borderColor: "#2FAC0C",
							borderWidth: "1px"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							className: "pb-2 pt-3 px-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
								className: "text-sm",
								style: { color: "#252d26" },
								children: "Revenue Trend (12m)"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "h-40 px-2 pt-0 pb-2",
							children: revenueData?.revenueSeries && revenueData.revenueSeries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: revenueData.revenueSeries,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "revenue",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#2FAC0C",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#2FAC0C",
												stopOpacity: 0
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											stroke: "#404F44",
											opacity: .1
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "month",
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											stroke: "#404F44",
											fontSize: 9
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
											backgroundColor: "#252d26",
											border: "none",
											borderRadius: "4px",
											color: "white",
											fontSize: "11px",
											padding: "4px 8px"
										} }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "revenue",
											stroke: "#2FAC0C",
											fillOpacity: 1,
											fill: "url(#revenue)",
											strokeWidth: 2
										})
									]
								})
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full flex items-center justify-center text-xs text-slate-500",
								children: "No data"
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-base font-bold mb-2",
				style: { color: "#252d26" },
				children: "Platform Insights"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5",
				children: [
					{
						to: "/platform/tenants",
						label: "Tenants",
						value: m?.totalTenants ?? "—"
					},
					{
						to: "/platform/users",
						label: "Users",
						value: m?.totalUsers ?? "—"
					},
					{
						to: "/platform/pipeline",
						label: "Pipeline",
						value: "—"
					},
					{
						to: "/platform/leads",
						label: "Leads",
						value: "—"
					},
					{
						to: "/platform/health",
						label: "System Health",
						value: "—"
					},
					{
						to: "/platform/audit-logs",
						label: "Audit Logs",
						value: m?.totalLogs ?? "—"
					},
					{
						to: "/platform/orders",
						label: "Install Orders",
						value: "—"
					},
					{
						to: "/revenue",
						label: "Revenue",
						value: m ? `PKR ${m.mrr?.toLocaleString()}` : "—"
					}
				].map((item) => {
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: item.to,
						className: "group",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "hover:shadow-md transition-all cursor-pointer",
							style: {
								backgroundColor: "#FFFFFF",
								borderColor: "#2FAC0C",
								borderWidth: "1px"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "p-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold mb-1",
									style: { color: "#404F44" },
									children: item.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-base font-bold",
									style: { color: "#252d26" },
									children: item.value
								})]
							})
						})
					}, item.to);
				})
			})] }),
			w && w.recentSignups && w.recentSignups.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				style: {
					backgroundColor: "#FFFFFF",
					borderColor: "#2FAC0C",
					borderWidth: "1px"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold mb-2",
						style: { color: "#252d26" },
						children: "Recent Signups"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-1.5",
						children: (w.recentSignups || []).slice(0, 5).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between p-2 rounded text-sm",
							style: { backgroundColor: "rgba(47, 172, 12, 0.05)" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold truncate text-sm",
									style: { color: "#252d26" },
									children: s.name || s.email
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs truncate",
									style: {
										color: "#404F44",
										opacity: .7
									},
									children: s.email
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs ml-2 whitespace-nowrap",
								style: {
									color: "#404F44",
									opacity: .7
								},
								children: new Date(s.created_at).toLocaleDateString()
							})]
						}, s.id))
					})]
				})
			})
		]
	});
}
function useDashboardStats() {
	const fetch = useServerFn(getDashboardStats);
	return useQuery({
		queryKey: ["dashboard-stats"],
		queryFn: () => fetch()
	});
}
var getDashboardExtras = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("9039be0cf3aa5605e260b0a029dc1f7c1519925b3d71fbf487063178cdd2f981"));
function useExtras() {
	const fn = useServerFn(getDashboardExtras);
	return useQuery({
		queryKey: ["dashboard-extras"],
		queryFn: () => fn(),
		refetchInterval: 3e4
	});
}
function riskColor(score) {
	if (score >= 70) return "bg-red-100 text-red-800";
	if (score >= 40) return "bg-amber-100 text-amber-800";
	return "bg-emerald-100 text-emerald-800";
}
function priorityColor(p) {
	return p === "critical" ? "bg-red-100 text-red-800" : p === "high" ? "bg-orange-100 text-orange-800" : p === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
}
function RecentBatchesCard() {
	const { data } = useExtras();
	const rows = data?.recentBatches ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-4 w-4 text-emerald-600" }), " Recent Batches"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Latest 5 intake / dispatch" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/grain-batches",
					children: "View all"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-2",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 text-center py-6",
				children: "No batches yet"
			}), rows.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-between gap-3 p-2 rounded-md border hover:bg-slate-50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-sm truncate",
								children: b.batch_id
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								className: "text-[10px]",
								children: b.grain_type
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								className: `text-[10px] ${riskColor(Number(b.risk_score ?? 0))}`,
								children: ["risk ", Number(b.risk_score ?? 0).toFixed(0)]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-slate-500 mt-0.5",
						children: [
							Number(b.quantity_kg).toLocaleString(),
							" kg · ",
							b.status
						]
					})]
				})
			}, b.id))]
		})]
	});
}
function RecentAlertsCard() {
	const { data } = useExtras();
	const rows = data?.recentAlerts ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 text-rose-600" }), " Recent Alerts"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Latest 5 grain alerts" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/grain-alerts",
					children: "View all"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-2",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 text-center py-6",
				children: "No open alerts 🎉"
			}), rows.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2 rounded-md border",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: `text-[10px] uppercase ${priorityColor(String(a.priority))}`,
							children: a.priority
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium truncate",
							children: a.title
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500 line-clamp-2 mt-0.5",
						children: a.message
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-slate-400 mt-1",
						children: a.triggered_at ? new Date(a.triggered_at).toLocaleString() : ""
					})
				]
			}, a.id))]
		})]
	});
}
function TeamCard() {
	const { data } = useExtras();
	const rows = data?.team ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4 text-sky-600" }), " Team"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Recent activity" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/team-management",
					children: "Manage"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-2",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 text-center py-6",
				children: "No members yet"
			}), rows.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 p-2 rounded-md border",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-xs font-semibold",
						children: (u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium truncate",
							children: u.name ?? "—"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 truncate",
							children: u.email
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] text-slate-400",
						children: u.updated_at ? new Date(u.updated_at).toLocaleDateString() : "—"
					})
				]
			}, u.id))]
		})]
	});
}
function ActuatorsCard() {
	const { data } = useExtras();
	const rows = data?.actuators ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fan, { className: "h-4 w-4 text-indigo-600" }), " Actuators"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Live device state" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/actuators",
					children: "Control"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "grid gap-2 sm:grid-cols-2",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 text-center py-6 sm:col-span-2",
				children: "No actuators yet"
			}), rows.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between p-2 rounded-md border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium truncate",
						children: a.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-500 truncate",
						children: [
							a.actuator_type,
							" · ",
							a.silos?.name ?? "—"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					className: a.is_on ? "bg-emerald-500" : "bg-slate-200 text-slate-700",
					children: a.is_on ? `On ${a.power_level ?? 0}%` : "Off"
				})]
			}, a.id))]
		})]
	});
}
function SilosOccupancyCard() {
	const { data } = useExtras();
	const rows = data?.silos ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-slate-200/70 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Warehouse, { className: "h-4 w-4 text-amber-600" }), " Silo Occupancy"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Storage utilisation" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/silos",
					children: "Details"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 text-center py-6",
				children: "No silos yet"
			}), rows.map((s) => {
				const cap = Number(s.capacity_kg ?? 0);
				const occ = Number(s.current_occupancy_kg ?? 0);
				const pct = cap ? Math.round(occ / cap * 100) : 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-slate-700 truncate",
								children: [
									s.name,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-slate-400 text-xs",
										children: [
											"(",
											s.silo_id,
											")"
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-semibold text-slate-900",
								children: [pct, "%"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, { value: pct }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[10px] text-slate-500",
							children: [
								occ.toLocaleString(),
								" / ",
								cap.toLocaleString(),
								" kg · ",
								s.status
							]
						})
					]
				}, s.id);
			})]
		})]
	});
}
function AdminDashboard({ name }) {
	const { data: s } = useDashboardStats();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 md:p-6 max-w-7xl mx-auto space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: `Admin${name ? ` — ${name}` : ""}`,
				subtitle: "Tenant overview: team, silos, revenue and operations",
				badge: "Admin"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Buyers",
						value: s?.buyers ?? "—",
						icon: Users,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Warehouses",
						value: s?.warehouses ?? "—",
						icon: Building2,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Active Batches",
						value: s?.batches.active ?? "—",
						icon: Package,
						accent: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Silos",
						value: s?.silos ?? "—",
						icon: DollarSign,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Sensors Online",
						value: s?.sensors.online ?? "—",
						icon: TrendingUp,
						accent: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open Alerts",
						value: s?.alerts.open ?? "—",
						icon: Activity,
						accent: "rose"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2 xl:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentBatchesCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentAlertsCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActuatorsCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SilosOccupancyCard, {})
				]
			})
		]
	});
}
function ManagerDashboard({ name }) {
	const { data: s } = useDashboardStats();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: `Manager Dashboard${name ? ` — ${name}` : ""}`,
				subtitle: "Operational overview of batches, dispatch and grain quality",
				badge: "Manager"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total Batches",
						value: s?.batches.total ?? "—",
						icon: Package,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Active",
						value: s?.batches.active ?? "—",
						icon: Activity,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Silos",
						value: s?.silos ?? "—",
						icon: Truck,
						accent: "violet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Buyers",
						value: s?.buyers ?? "—",
						icon: TrendingUp,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open Alerts",
						value: s?.alerts.open ?? "—",
						icon: TriangleAlert,
						accent: "rose"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Critical",
						value: s?.alerts.critical ?? "—",
						icon: ChartColumn,
						accent: "amber"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 md:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentBatchesCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentAlertsCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SilosOccupancyCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActuatorsCard, {})
				]
			})
		]
	});
}
function TechnicianDashboard({ name }) {
	const { data: s } = useDashboardStats();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: `Technician Dashboard${name ? ` — ${name}` : ""}`,
				subtitle: "Sensor health, actuator status and open maintenance work",
				badge: "Technician"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Sensors Online",
						value: `${s?.sensors.online ?? 0}/${s?.sensors.total ?? 0}`,
						icon: Smartphone,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Actuators Active",
						value: `${s?.actuators.active ?? 0}/${s?.actuators.total ?? 0}`,
						icon: Zap,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open Alerts",
						value: s?.alerts.open ?? "—",
						icon: OctagonAlert,
						accent: "rose"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Critical",
						value: s?.alerts.critical ?? "—",
						icon: CircleCheck,
						accent: "violet"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 md:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActuatorsCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentAlertsCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SilosOccupancyCard, {})
				]
			})
		]
	});
}
var CHANGE_EVENT = "gh_impersonation_changed";
function DashboardPage() {
	const fetchRole = useServerFn(getMyRole);
	const { data, isLoading, error } = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole()
	});
	const [impersonating, setImpersonating] = (0, import_react.useState)(() => getImpersonationSession());
	(0, import_react.useEffect)(() => {
		const sync = () => setImpersonating(getImpersonationSession());
		window.addEventListener("storage", sync);
		window.addEventListener(CHANGE_EVENT, sync);
		return () => {
			window.removeEventListener("storage", sync);
			window.removeEventListener(CHANGE_EVENT, sync);
		};
	}, []);
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardSkeleton, {})
	});
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-8 text-red-600",
		children: ["Failed to load role: ", error.message]
	});
	const realRole = data?.role && data.role !== "pending" ? data.role : "admin";
	const role = realRole === "super_admin" && impersonating ? "admin" : realRole;
	const name = impersonating ? impersonating.adminName : data?.profile?.name ?? void 0;
	switch (role) {
		case "super_admin": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperAdminDashboard, { name });
		case "manager": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ManagerDashboard, { name });
		case "technician": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TechnicianDashboard, { name });
		default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDashboard, { name });
	}
}
//#endregion
export { DashboardPage as component };
