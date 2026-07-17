import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Bt as CreditCard, M as Sparkles, Vt as Cpu, Xt as CircleX, at as Package, c as Warehouse, d as Users, dn as Building2, f as User, ft as Mail, ht as LoaderCircle, ln as Calendar, q as RotateCcw, yn as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { o as objectType, r as enumType } from "../_libs/zod.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Textarea } from "./textarea-1llmCJsE.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { t as Progress } from "./progress-BaJBfUMd.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { n as pricingData } from "./pricing-data-BA_Y9Elr.mjs";
import { t as createStripeBillingPortalSession } from "./stripe-checkout.functions-B_A1yuT4.mjs";
import { t as getAllSubscriptions } from "./platform-no-admin.functions-CqXBeWc_.mjs";
import { n as getMySubscription, t as cancelMySubscription } from "./billing.functions-CNrpoOgJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/subscription-DGrmLfnx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var changeMyPlan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ planId: enumType([
	"basic",
	"intermediate",
	"pro"
]) }).parse(d)).handler(createSsrRpc("6e6312feb9d61f98bb5aaf29081b9f0b41fe9d1bb49ca41394ec8b4cf7a911b7"));
var cancelAtPeriodEnd = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("971b65ef500cb962af48476c71dccd6a376b3d16d36ae10779453452608f23ca"));
var resumeSubscription = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4d44e7923c7f7699a67c5a96e944b77c3545c68353d4721aa67ff5e552fe4eed"));
function statusBadge(s) {
	switch (s) {
		case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
		case "trial": return "bg-blue-100 text-blue-800 border-blue-200";
		case "cancelled": return "bg-red-100 text-red-800 border-red-200";
		case "expired": return "bg-amber-100 text-amber-800 border-amber-200";
		default: return "bg-slate-100 text-slate-700 border-slate-200";
	}
}
function UsageRow({ icon: Icon, label, used, max }) {
	const limit = max ?? 0;
	const pct = limit > 0 ? Math.min(100, used / limit * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between text-sm mb-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-2 text-slate-700",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), label]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "font-medium text-slate-900",
			children: [used, limit > 0 ? ` / ${limit}` : ""]
		})]
	}), limit > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
		value: pct,
		className: "h-2"
	})] });
}
function SubscriptionPage() {
	const fn = useServerFn(getMySubscription);
	const cancelFn = useServerFn(cancelMySubscription);
	const portalFn = useServerFn(createStripeBillingPortalSession);
	const changeFn = useServerFn(changeMyPlan);
	const cancelPeriodFn = useServerFn(cancelAtPeriodEnd);
	const resumeFn = useServerFn(resumeSubscription);
	const roleFn = useServerFn(getMyRole);
	const allSubsFn = useServerFn(getAllSubscriptions);
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["my-subscription"],
		queryFn: () => fn()
	});
	const { data: roleData } = useQuery({
		queryKey: ["my-role"],
		queryFn: () => roleFn()
	});
	const isSuperAdmin = (roleData?.role ?? data?.role ?? "pending") === "super_admin";
	const { data: allSubs = [] } = useQuery({
		queryKey: ["all-subscriptions"],
		queryFn: () => allSubsFn(),
		enabled: isSuperAdmin
	});
	const [confirmOpen, setConfirmOpen] = (0, import_react.useState)(false);
	const [reason, setReason] = (0, import_react.useState)("");
	const [changeOpen, setChangeOpen] = (0, import_react.useState)(false);
	const [newPlan, setNewPlan] = (0, import_react.useState)("intermediate");
	const cancelM = useMutation({
		mutationFn: () => cancelFn({ data: { reason: reason || void 0 } }),
		onSuccess: () => {
			toast.success("Subscription cancelled");
			setConfirmOpen(false);
			qc.invalidateQueries({ queryKey: ["my-subscription"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed to cancel")
	});
	const portalM = useMutation({
		mutationFn: () => portalFn(),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
		onError: (e) => toast.error(e.message ?? "Could not open billing portal")
	});
	const changeM = useMutation({
		mutationFn: () => changeFn({ data: { planId: newPlan } }),
		onSuccess: () => {
			toast.success("Plan updated");
			setChangeOpen(false);
			qc.invalidateQueries({ queryKey: ["my-subscription"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed to change plan")
	});
	const cancelPeriodM = useMutation({
		mutationFn: () => cancelPeriodFn(),
		onSuccess: () => {
			toast.success("Will cancel at period end");
			qc.invalidateQueries({ queryKey: ["my-subscription"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed")
	});
	const resumeM = useMutation({
		mutationFn: () => resumeFn(),
		onSuccess: () => {
			toast.success("Subscription resumed");
			qc.invalidateQueries({ queryKey: ["my-subscription"] });
		},
		onError: (e) => toast.error(e.message ?? "Failed")
	});
	const role = data?.role ?? "pending";
	const sub = data?.subscription;
	const usage = data?.usage ?? {
		batches: 0,
		warehouses: 0,
		silos: 0,
		devices: 0,
		users: 0
	};
	const invoices = data?.invoices ?? [];
	const canManage = ["super_admin", "admin"].includes(role);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-6 w-6 text-emerald-600" }), " My Subscription"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-500 mt-1",
					children: "Manage your plan, usage and billing history."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [
						sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => portalM.mutate(),
							disabled: portalM.isPending,
							children: portalM.isPending ? "Opening…" : "Manage billing"
						}),
						sub && canManage && sub.status !== "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => {
								setNewPlan(sub.plan_name?.toLowerCase().includes("pro") ? "pro" : sub.plan_name?.toLowerCase().includes("inter") ? "intermediate" : "basic");
								setChangeOpen(true);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-4 w-4 mr-2" }), " Upgrade / Downgrade"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "outline",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/plans",
								children: "Browse plans"
							})
						})
					]
				})]
			}),
			!sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "p-8 text-center space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-10 w-10 text-emerald-600 mx-auto" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-lg font-semibold text-slate-900",
						children: "No active subscription"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-500 max-w-md mx-auto",
						children: "You're not on a paid plan yet. Pick one to unlock warehouses, silos and AI predictions at scale."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/plans",
							children: "Choose a plan"
						})
					})
				]
			}) }),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2 flex-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-xl",
						children: sub.plan_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, {
						className: "mt-1",
						children: sub.plan_description ?? "Your current plan"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						className: statusBadge(sub.status),
						children: sub.status
					})]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "grid gap-4 md:grid-cols-4 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Price"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-lg font-bold",
							children: [
								sub.currency ?? "PKR",
								" ",
								Number(sub.price_per_month).toFixed(2),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-slate-500",
									children: "/mo"
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Billing cycle"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-lg font-bold capitalize",
							children: sub.billing_cycle ?? "monthly"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-3 w-3" }), "Renews"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-lg font-bold",
							children: sub.next_payment_date ? new Date(sub.next_payment_date).toLocaleDateString() : "—"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Auto-renew"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-lg font-bold",
							children: sub.auto_renew ? "On" : "Off"
						})] })
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 lg:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Usage" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current consumption vs plan limits" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageRow, {
								icon: Package,
								label: "Batches",
								used: usage.batches,
								max: sub.max_batches
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageRow, {
								icon: Warehouse,
								label: "Silos",
								used: usage.silos,
								max: null
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageRow, {
								icon: Cpu,
								label: "Devices",
								used: usage.devices,
								max: sub.max_devices
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageRow, {
								icon: Users,
								label: "Team members",
								used: usage.users,
								max: sub.max_users
							})
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Included features" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "space-y-2 text-sm",
						children: [
							["AI features", sub.ai_features],
							["Advanced analytics", sub.advanced_analytics],
							["Priority support", sub.priority_support],
							["Custom integrations", sub.custom_integrations]
						].map(([label, on]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-700",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								className: on ? "border-emerald-200 text-emerald-700" : "text-slate-500",
								children: on ? "Enabled" : "—"
							})]
						}, label))
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Billing history" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [invoices.length, " recent invoice(s)"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "divide-y",
						children: [invoices.map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 flex items-center justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: inv.invoice_number ?? inv.id.slice(0, 8)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-slate-500",
								children: inv.billing_date ? new Date(inv.billing_date).toLocaleDateString() : "—"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-semibold",
									children: [
										inv.currency ?? "PKR",
										" ",
										Number(inv.amount).toFixed(2)
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: statusBadge(inv.status),
									children: inv.status ?? "pending"
								})]
							})]
						}, inv.id)), invoices.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-8 text-center text-sm text-slate-500",
							children: "No invoices yet."
						})]
					})
				})] }),
				canManage && sub.status !== "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [sub.cancel_at_period_end ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => resumeM.mutate(),
						disabled: resumeM.isPending,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4 mr-2" }), " Resume subscription"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => cancelPeriodM.mutate(),
						disabled: cancelPeriodM.isPending,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 mr-2" }), " Cancel at period end"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "destructive",
						onClick: () => setConfirmOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4 mr-2" }), " Cancel now"]
					})]
				})
			] }),
			isSuperAdmin && allSubs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-md border-2 border-purple-200",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "border-b bg-gradient-to-r from-purple-50 to-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "text-lg flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-5 w-5 text-purple-600" }), "All Platform Subscriptions"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "View all user subscriptions across the platform" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-slate-100",
						children: allSubs.map((s) => {
							const daysLeft = s.next_payment_date ? Math.ceil((new Date(s.next_payment_date).getTime() - Date.now()) / (1e3 * 60 * 60 * 24)) : null;
							const expiryText = daysLeft !== null ? daysLeft > 0 ? `${daysLeft} days` : "Expired" : "N/A";
							const expiryColor = daysLeft !== null && daysLeft <= 7 ? "text-red-600" : daysLeft !== null && daysLeft <= 30 ? "text-amber-600" : "text-slate-500";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 transition-colors",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shrink-0",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-5 w-5 text-purple-600" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-semibold text-slate-900 truncate",
												children: s.user_name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-sm text-slate-500 truncate flex items-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3" }), s.user_email]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-slate-400 mt-0.5 flex items-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3 w-3" }), s.business_type]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-start gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "outline",
											className: statusBadge(s.status),
											children: s.status
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-semibold text-slate-700",
											children: s.plan_name
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-end gap-1 min-w-[120px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-lg font-bold text-purple-600",
											children: [
												s.currency ?? "PKR",
												" ",
												Number(s.monthly_price ?? 0).toFixed(0),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs text-slate-500",
													children: "/mo"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: `text-xs font-medium flex items-center gap-1 ${expiryColor}`,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-3 w-3" }),
												"Expires: ",
												expiryText
											]
										})]
									})
								]
							}, s.id);
						})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: confirmOpen,
				onOpenChange: setConfirmOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Cancel subscription" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Your plan will stay active until the end of the current period. Optionally tell us why:" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: reason,
						onChange: (e) => setReason(e.target.value),
						placeholder: "Reason (optional)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setConfirmOpen(false),
						children: "Keep plan"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "destructive",
						onClick: () => cancelM.mutate(),
						disabled: cancelM.isPending,
						children: "Confirm cancel"
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: changeOpen,
				onOpenChange: setChangeOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Change plan" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "The change applies immediately with prorated billing on your next invoice." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: newPlan,
							onValueChange: (v) => setNewPlan(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: pricingData.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: p.id,
								children: [
									p.name,
									" — ",
									p.currency ?? "PKR",
									" ",
									p.price,
									"/mo"
								]
							}, p.id)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setChangeOpen(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => changeM.mutate(),
						disabled: changeM.isPending,
						children: [changeM.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Confirm change"]
					})] })
				] })
			})
		]
	});
}
//#endregion
export { SubscriptionPage as component };
