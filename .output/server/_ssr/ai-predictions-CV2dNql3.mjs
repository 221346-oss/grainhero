import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { J as RefreshCw, M as Sparkles, R as ShieldCheck, U as Search, b as TrendingUp, dn as Building2, ht as LoaderCircle, pn as Brain, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { c as stringType, o as objectType } from "../_libs/zod.mjs";
import { n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { i as getPlatformSpoilageOverview, n as getBatchPredictions } from "./analytics.functions-1IN0FmxS.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-predictions-CV2dNql3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var getSpoilageInsight = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ siloId: stringType().uuid() }).parse(d)).handler(createSsrRpc("7189c5f79d9925067abb88ead3cf25d99a7dd5237c7d9729752630e38f7746d3"));
function levelBadge(level) {
	switch (level) {
		case "critical": return "bg-red-100 text-red-800 border-red-200";
		case "high": return "bg-orange-100 text-orange-800 border-orange-200";
		case "moderate": return "bg-amber-100 text-amber-800 border-amber-200";
		default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
	}
}
function AIPredictionsPage() {
	const fetchRole = useServerFn(getMyRole);
	const roleQ = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole()
	});
	const role = roleQ.data?.role ?? "pending";
	const isSuperAdmin = role === "super_admin";
	const allowed = [
		"super_admin",
		"admin",
		"manager"
	].includes(role);
	if (!roleQ.isLoading && !allowed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-8 max-w-lg mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Access restricted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "AI Predictions are available to managers, admins and super admins." })] }) })
	});
	return isSuperAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformView, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TenantView, {});
}
function TenantView() {
	const fetchPredictions = useServerFn(getBatchPredictions);
	const { data, isFetching, refetch } = useQuery({
		queryKey: ["ai-predictions"],
		queryFn: () => fetchPredictions(),
		refetchInterval: 6e4
	});
	const [q, setQ] = (0, import_react.useState)("");
	const [insight, setInsight] = (0, import_react.useState)(null);
	const insightFn = useServerFn(getSpoilageInsight);
	const runInsight = useMutation({
		mutationFn: (v) => insightFn({ data: { siloId: v.siloId } }).then((r) => ({
			...r,
			batch_id: v.batch_id
		})),
		onSuccess: (d) => setInsight(d),
		onError: (e) => toast.error(e.message)
	});
	const preds = data?.predictions ?? [];
	const filtered = (0, import_react.useMemo)(() => {
		const term = q.trim().toLowerCase();
		if (!term) return preds;
		return preds.filter((p) => p.batch_id?.toLowerCase().includes(term) || p.grain_type?.toLowerCase().includes(term) || p.level.includes(term));
	}, [preds, q]);
	const counts = (0, import_react.useMemo)(() => ({
		critical: preds.filter((p) => p.level === "critical").length,
		high: preds.filter((p) => p.level === "high").length,
		moderate: preds.filter((p) => p.level === "moderate").length,
		low: preds.filter((p) => p.level === "low").length,
		avg: preds.length ? Math.round(preds.reduce((s, p) => s + p.score, 0) / preds.length) : 0
	}), [preds]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "h-6 w-6 text-emerald-600" }), " AI Spoilage Predictions"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-500 mt-1",
					children: "Real-time risk scoring per batch using live sensor telemetry and ML models."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => refetch(),
					disabled: isFetching,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}` }), " Refresh"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
				children: [
					{
						label: "Critical",
						value: counts.critical,
						cls: "text-red-600",
						icon: TriangleAlert
					},
					{
						label: "High",
						value: counts.high,
						cls: "text-orange-600",
						icon: TrendingUp
					},
					{
						label: "Moderate",
						value: counts.moderate,
						cls: "text-amber-600",
						icon: TrendingUp
					},
					{
						label: "Low",
						value: counts.low,
						cls: "text-emerald-600",
						icon: ShieldCheck
					},
					{
						label: "Avg risk",
						value: `${counts.avg}%`,
						cls: "text-slate-900",
						icon: Brain
					}
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-500 uppercase tracking-wider font-semibold",
						children: s.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `text-2xl font-bold ${s.cls}`,
						children: s.value
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: `h-6 w-6 ${s.cls}` })]
				}) }, s.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex flex-row items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Batch predictions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
					filtered.length,
					" of ",
					preds.length,
					" batches scored"
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search batch, grain, level...",
						className: "pl-8 w-64"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y",
					children: [filtered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 flex flex-col sm:flex-row sm:items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/traceability",
											className: "font-semibold text-slate-900 hover:text-emerald-600 truncate",
											children: p.batch_id
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "outline",
											className: "text-[10px]",
											children: p.grain_type
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: levelBadge(p.level) + " text-[10px] uppercase",
											children: p.level
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-xs text-slate-500",
									children: [
										p.quantity_kg,
										" kg · confidence ",
										(p.confidence * 100).toFixed(0),
										"% ·",
										" ",
										p.last_reading_at ? `updated ${new Date(p.last_reading_at).toLocaleString()}` : "no recent readings"
									]
								}),
								p.factors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 flex flex-wrap gap-1",
									children: p.factors.slice(0, 4).map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700",
										children: f
									}, i))
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-full sm:w-52 space-y-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-slate-500",
										children: "Risk score"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-semibold text-slate-900",
										children: [p.score, "%"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
									value: p.score,
									className: "h-2"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									variant: "outline",
									className: "w-full mt-2 gap-1.5",
									disabled: !p.silo_id || runInsight.isPending && runInsight.variables?.batch_id === p.batch_id,
									onClick: () => runInsight.mutate({
										siloId: p.silo_id,
										batch_id: p.batch_id
									}),
									children: [runInsight.isPending && runInsight.variables?.batch_id === p.batch_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5" }), "AI Insight"]
								})
							]
						})]
					}, p.id)), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-10 text-center text-sm text-slate-500",
						children: "No predictions yet. Add batches and connect sensors."
					})]
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!insight,
				onOpenChange: (o) => !o && setInsight(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-emerald-600" }), " AI Spoilage Insight"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							insight?.batch_id,
							" — risk level ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: levelBadge(insight?.risk_level ?? "low"),
								children: insight?.risk_level
							})
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-slate-700 whitespace-pre-wrap",
							children: insight?.insight
						}),
						insight?.recommendations && insight.recommendations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-slate-500 uppercase mb-1",
								children: "Recommendations"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "list-disc pl-5 space-y-1 text-sm text-slate-700",
								children: insight.recommendations.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: r }, i))
							})]
						})
					]
				})
			})
		]
	});
}
function PlatformView() {
	const fetchPlatform = useServerFn(getPlatformSpoilageOverview);
	const { data, isFetching, refetch } = useQuery({
		queryKey: ["ai-predictions", "platform"],
		queryFn: () => fetchPlatform(),
		refetchInterval: 12e4
	});
	const [q, setQ] = (0, import_react.useState)("");
	const tenants = data?.tenants ?? [];
	const dist = data?.distribution ?? {
		low: 0,
		moderate: 0,
		high: 0,
		critical: 0
	};
	const filtered = (0, import_react.useMemo)(() => {
		const term = q.trim().toLowerCase();
		if (!term) return tenants;
		return tenants.filter((t) => t.name?.toLowerCase().includes(term) || t.email?.toLowerCase().includes(term));
	}, [tenants, q]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "h-6 w-6 text-emerald-600" }), " Platform Spoilage Risk"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-500 mt-1",
					children: "Cross-tenant risk distribution and worst-offender tenants. Read-only."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => refetch(),
					disabled: isFetching,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}` }), " Refresh"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
				children: [
					{
						label: "Tenants",
						value: data?.totalTenants ?? 0,
						cls: "text-slate-900",
						icon: Building2
					},
					{
						label: "Batches scored",
						value: data?.totalBatches ?? 0,
						cls: "text-slate-900",
						icon: Brain
					},
					{
						label: "Critical",
						value: dist.critical,
						cls: "text-red-600",
						icon: TriangleAlert
					},
					{
						label: "High",
						value: dist.high,
						cls: "text-orange-600",
						icon: TrendingUp
					},
					{
						label: "Low",
						value: dist.low,
						cls: "text-emerald-600",
						icon: ShieldCheck
					}
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-500 uppercase tracking-wider font-semibold",
						children: s.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `text-2xl font-bold ${s.cls}`,
						children: s.value
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: `h-6 w-6 ${s.cls}` })]
				}) }, s.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex flex-row items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Worst offenders" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
					filtered.length,
					" of ",
					tenants.length,
					" tenant(s), ranked by critical + high batches"
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search tenant...",
						className: "pl-8 w-64"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y",
					children: [filtered.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 flex flex-col sm:flex-row sm:items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-slate-900 truncate",
										children: t.name
									}), t.business_type && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "text-[10px] capitalize",
										children: t.business_type
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-xs text-slate-500",
									children: [
										t.batches,
										" batches · ",
										Math.round(t.totalKg).toLocaleString(),
										" kg",
										t.email ? ` · ${t.email}` : ""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex flex-wrap gap-1",
									children: [
										t.critical > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: levelBadge("critical") + " text-[10px] uppercase",
											children: [t.critical, " critical"]
										}),
										t.high > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: levelBadge("high") + " text-[10px] uppercase",
											children: [t.high, " high"]
										}),
										t.moderate > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: levelBadge("moderate") + " text-[10px] uppercase",
											children: [t.moderate, " mod"]
										}),
										t.low > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: levelBadge("low") + " text-[10px] uppercase",
											children: [t.low, " low"]
										})
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-full sm:w-52 space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-slate-500",
									children: "Avg risk"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-semibold text-slate-900",
									children: [t.avgRisk, "%"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
								value: t.avgRisk,
								className: "h-2"
							})]
						})]
					}, t.admin_id)), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-10 text-center text-sm text-slate-500",
						children: isFetching ? "Loading tenant risk profiles..." : "No tenant batches scored yet."
					})]
				})
			})] })
		]
	});
}
//#endregion
export { AIPredictionsPage as component };
