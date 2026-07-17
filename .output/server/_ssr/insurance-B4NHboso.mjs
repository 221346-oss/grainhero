import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, $t as CircleCheckBig, I as Shield, Ot as FileText, Rt as DollarSign, S as Trash2, ht as LoaderCircle, tt as Pen, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { s as TableSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { t as Textarea } from "./textarea-1llmCJsE.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-BCrgGGf7.mjs";
import { n as StatCard, t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { i as getPlatformInsuranceOverview, t as PlatformOverviewTable } from "./PlatformOverviewTable-SNRUTVYA.mjs";
import { t as PlatformScopeBanner } from "./PlatformScopeBanner-DM73icyc.mjs";
import { t as useIsSuperAdmin } from "./useIsSuperAdmin-bJ_EKAEZ.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BgKcOzjx.mjs";
import { a as listClaims, d as upsertClaim, f as upsertPolicy, n as deletePolicy, o as listPolicies, t as deleteClaim } from "./team-settings-insurance.functions-B-NzOE-L.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/insurance-B4NHboso.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var POLICY_STATUS = {
	active: "bg-emerald-100 text-emerald-700 border-emerald-200",
	expired: "bg-slate-100 text-slate-700 border-slate-200",
	pending: "bg-amber-100 text-amber-700 border-amber-200",
	cancelled: "bg-red-100 text-red-700 border-red-200"
};
var CLAIM_STATUS = {
	filed: "bg-blue-100 text-blue-700 border-blue-200",
	investigating: "bg-amber-100 text-amber-700 border-amber-200",
	approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
	rejected: "bg-red-100 text-red-700 border-red-200",
	paid: "bg-purple-100 text-purple-700 border-purple-200"
};
var emptyPolicy = {
	policy_number: "",
	provider_name: "",
	coverage_type: "comprehensive",
	coverage_amount: "0",
	premium_amount: "0",
	deductible: "0",
	status: "active",
	start_date: "",
	end_date: "",
	renewal_date: "",
	notes: ""
};
var emptyClaim = {
	claim_number: "",
	policy_id: "",
	claim_type: "spoilage",
	description: "",
	amount_claimed: "0",
	amount_approved: "0",
	status: "filed",
	incident_date: "",
	notes: ""
};
function InsurancePage() {
	const qc = useQueryClient();
	const { isSuperAdmin } = useIsSuperAdmin();
	const listPoliciesFn = useServerFn(listPolicies);
	const savePolicyFn = useServerFn(upsertPolicy);
	const delPolicyFn = useServerFn(deletePolicy);
	const listClaimsFn = useServerFn(listClaims);
	const saveClaimFn = useServerFn(upsertClaim);
	const delClaimFn = useServerFn(deleteClaim);
	const { data: policies = [], isLoading: policiesLoading } = useQuery({
		queryKey: ["insurance-policies"],
		queryFn: () => listPoliciesFn()
	});
	const { data: claims = [], isLoading: claimsLoading } = useQuery({
		queryKey: ["insurance-claims"],
		queryFn: () => listClaimsFn()
	});
	const fetchPlatformIns = useServerFn(getPlatformInsuranceOverview);
	const platformInsQ = useQuery({
		queryKey: ["platform-insurance-overview"],
		queryFn: () => fetchPlatformIns(),
		enabled: isSuperAdmin
	});
	const [policyOpen, setPolicyOpen] = (0, import_react.useState)(false);
	const [policyForm, setPolicyForm] = (0, import_react.useState)(emptyPolicy);
	const [claimOpen, setClaimOpen] = (0, import_react.useState)(false);
	const [claimForm, setClaimForm] = (0, import_react.useState)(emptyClaim);
	const [deletePolicyId, setDeletePolicyId] = (0, import_react.useState)(null);
	const [deleteClaimId, setDeleteClaimId] = (0, import_react.useState)(null);
	const stats = (0, import_react.useMemo)(() => {
		return {
			active: policies.filter((p) => p.status === "active").length,
			totalCoverage: policies.reduce((s, p) => s + (p.coverage_amount ?? 0), 0),
			openClaims: claims.filter((c) => c.status !== "paid" && c.status !== "rejected").length,
			totalClaimed: claims.reduce((s, c) => s + (c.amount_claimed ?? 0), 0)
		};
	}, [policies, claims]);
	const savePolicy = useMutation({
		mutationFn: (v) => savePolicyFn({ data: {
			id: v.id,
			policy_number: v.policy_number,
			provider_name: v.provider_name,
			coverage_type: v.coverage_type,
			coverage_amount: Number(v.coverage_amount),
			premium_amount: Number(v.premium_amount),
			deductible: Number(v.deductible),
			status: v.status,
			start_date: v.start_date || null,
			end_date: v.end_date || null,
			renewal_date: v.renewal_date || null,
			notes: v.notes || null
		} }),
		onSuccess: () => {
			toast.success("Policy saved");
			setPolicyOpen(false);
			setPolicyForm(emptyPolicy);
			qc.invalidateQueries({ queryKey: ["insurance-policies"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const removePolicy = useMutation({
		mutationFn: (id) => delPolicyFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Policy deleted");
			setDeletePolicyId(null);
			qc.invalidateQueries({ queryKey: ["insurance-policies"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const saveClaim = useMutation({
		mutationFn: (v) => saveClaimFn({ data: {
			id: v.id,
			claim_number: v.claim_number,
			policy_id: v.policy_id || null,
			claim_type: v.claim_type,
			description: v.description || null,
			amount_claimed: Number(v.amount_claimed),
			amount_approved: Number(v.amount_approved),
			status: v.status,
			incident_date: v.incident_date || null,
			notes: v.notes || null
		} }),
		onSuccess: () => {
			toast.success("Claim saved");
			setClaimOpen(false);
			setClaimForm(emptyClaim);
			qc.invalidateQueries({ queryKey: ["insurance-claims"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const removeClaim = useMutation({
		mutationFn: (id) => delClaimFn({ data: { id } }),
		onSuccess: () => {
			toast.success("Claim deleted");
			setDeleteClaimId(null);
			qc.invalidateQueries({ queryKey: ["insurance-claims"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const openEditPolicy = (p) => {
		setPolicyForm({
			id: p.id,
			policy_number: p.policy_number,
			provider_name: p.provider_name,
			coverage_type: p.coverage_type,
			coverage_amount: String(p.coverage_amount),
			premium_amount: String(p.premium_amount),
			deductible: String(p.deductible),
			status: p.status,
			start_date: p.start_date ?? "",
			end_date: p.end_date ?? "",
			renewal_date: p.renewal_date ?? "",
			notes: p.notes ?? ""
		});
		setPolicyOpen(true);
	};
	const openEditClaim = (c) => {
		setClaimForm({
			id: c.id,
			claim_number: c.claim_number,
			policy_id: c.policy_id ?? "",
			claim_type: c.claim_type,
			description: c.description ?? "",
			amount_claimed: String(c.amount_claimed),
			amount_approved: String(c.amount_approved),
			status: c.status,
			incident_date: c.incident_date ?? "",
			notes: c.notes ?? ""
		});
		setClaimOpen(true);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-7xl mx-auto",
		children: [
			isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformScopeBanner, { label: "Policies and claims across every tenant. Totals reflect all insured value on the platform." })
			}),
			isSuperAdmin && platformInsQ.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOverviewTable, {
					title: "Per-tenant insurance",
					description: `Total coverage $${platformInsQ.data.totals.coverage.toLocaleString()} · ${platformInsQ.data.totals.openClaims} open claims`,
					rows: platformInsQ.data.rows,
					columns: [
						{
							key: "activePolicies",
							label: "Active",
							align: "right",
							render: (r) => `${r.activePolicies}/${r.policies}`
						},
						{
							key: "coverage",
							label: "Coverage",
							align: "right",
							render: (r) => `$${r.coverage.toLocaleString()}`
						},
						{
							key: "premium",
							label: "Premium",
							align: "right",
							render: (r) => `$${r.premium.toLocaleString()}`
						},
						{
							key: "openClaims",
							label: "Open claims",
							align: "right",
							render: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: r.openClaims > 0 ? "text-amber-700 font-medium" : "",
								children: r.openClaims
							})
						},
						{
							key: "claimRate",
							label: "Claim rate",
							align: "right",
							render: (r) => `${(r.claimRate * 100).toFixed(0)}%`
						}
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Insurance",
				subtitle: "Track your policies and claims across grain operations"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Active Policies",
						value: stats.active,
						icon: Shield,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total Coverage",
						value: `PKR ${stats.totalCoverage.toLocaleString()}`,
						icon: DollarSign,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open Claims",
						value: stats.openClaims,
						icon: TriangleAlert,
						accent: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Claimed Amount",
						value: `PKR ${stats.totalClaimed.toLocaleString()}`,
						icon: FileText,
						accent: "violet"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "policies",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "mb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "policies",
							children: "Policies"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "claims",
							children: "Claims"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "policies",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end mb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => {
									setPolicyForm(emptyPolicy);
									setPolicyOpen(true);
								},
								className: "bg-emerald-600 hover:bg-emerald-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " New policy"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: policiesLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableSkeleton, {
									rows: 5,
									cols: 4
								})
							}) : policies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-10 text-center text-slate-500",
								children: "No policies yet"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "divide-y divide-slate-100",
								children: policies.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-semibold text-slate-900",
												children: p.policy_number
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-slate-500",
												children: [
													p.provider_name,
													" · ",
													p.coverage_type
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm text-slate-700",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500",
													children: "Coverage: "
												}),
												"$",
												(p.coverage_amount ?? 0).toLocaleString()
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm text-slate-700",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500",
													children: "Premium: "
												}),
												"$",
												(p.premium_amount ?? 0).toLocaleString()
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: POLICY_STATUS[p.status] ?? POLICY_STATUS.pending,
											variant: "outline",
											children: p.status
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => openEditPolicy(p),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "h-4 w-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												className: "text-red-600 hover:text-red-700 hover:bg-red-50",
												onClick: () => setDeletePolicyId(p.id),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})]
										})
									]
								}, p.id))
							})
						}) })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "claims",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end mb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => {
									setClaimForm(emptyClaim);
									setClaimOpen(true);
								},
								className: "bg-emerald-600 hover:bg-emerald-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " New claim"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "p-0",
							children: claimsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableSkeleton, {
									rows: 5,
									cols: 4
								})
							}) : claims.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-10 text-center text-slate-500",
								children: "No claims yet"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "divide-y divide-slate-100",
								children: claims.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-semibold text-slate-900",
												children: c.claim_number
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-slate-500 truncate",
												children: [
													c.claim_type,
													" · ",
													c.description ?? "—"
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm text-slate-700",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500",
													children: "Claimed: "
												}),
												"$",
												(c.amount_claimed ?? 0).toLocaleString()
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm text-slate-700",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500",
													children: "Approved: "
												}),
												"$",
												(c.amount_approved ?? 0).toLocaleString()
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: CLAIM_STATUS[c.status] ?? CLAIM_STATUS.filed,
											variant: "outline",
											children: c.status
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												onClick: () => openEditClaim(c),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "h-4 w-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "ghost",
												className: "text-red-600 hover:text-red-700 hover:bg-red-50",
												onClick: () => setDeleteClaimId(c.id),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})]
										})
									]
								}, c.id))
							})
						}) })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: policyOpen,
				onOpenChange: setPolicyOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: policyForm.id ? "Edit policy" : "New policy" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid md:grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Policy Number" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: policyForm.policy_number,
									onChange: (e) => setPolicyForm({
										...policyForm,
										policy_number: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Provider" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: policyForm.provider_name,
									onChange: (e) => setPolicyForm({
										...policyForm,
										provider_name: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Coverage Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: policyForm.coverage_type,
									onValueChange: (v) => setPolicyForm({
										...policyForm,
										coverage_type: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "comprehensive",
											children: "Comprehensive"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "fire",
											children: "Fire"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "theft",
											children: "Theft"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "spoilage",
											children: "Spoilage"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "weather",
											children: "Weather"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: policyForm.status,
									onValueChange: (v) => setPolicyForm({
										...policyForm,
										status: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "active",
											children: "Active"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "pending",
											children: "Pending"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "expired",
											children: "Expired"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "cancelled",
											children: "Cancelled"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Coverage Amount ($)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: policyForm.coverage_amount,
									onChange: (e) => setPolicyForm({
										...policyForm,
										coverage_amount: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Premium ($)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: policyForm.premium_amount,
									onChange: (e) => setPolicyForm({
										...policyForm,
										premium_amount: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Deductible ($)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: policyForm.deductible,
									onChange: (e) => setPolicyForm({
										...policyForm,
										deductible: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Start Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: policyForm.start_date,
									onChange: (e) => setPolicyForm({
										...policyForm,
										start_date: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "End Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: policyForm.end_date,
									onChange: (e) => setPolicyForm({
										...policyForm,
										end_date: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Renewal Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: policyForm.renewal_date,
									onChange: (e) => setPolicyForm({
										...policyForm,
										renewal_date: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "md:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: policyForm.notes,
										onChange: (e) => setPolicyForm({
											...policyForm,
											notes: e.target.value
										})
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setPolicyOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => savePolicy.mutate(policyForm),
							disabled: savePolicy.isPending || !policyForm.provider_name,
							className: "bg-emerald-600 hover:bg-emerald-700",
							children: savePolicy.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-4 w-4 mr-2" }), "Save"] })
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: claimOpen,
				onOpenChange: setClaimOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: claimForm.id ? "Edit claim" : "New claim" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid md:grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Claim Number" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: claimForm.claim_number,
									onChange: (e) => setClaimForm({
										...claimForm,
										claim_number: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Policy" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: claimForm.policy_id,
									onValueChange: (v) => setClaimForm({
										...claimForm,
										policy_id: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select policy" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: policies.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
										value: p.id,
										children: [
											p.policy_number,
											" · ",
											p.provider_name
										]
									}, p.id)) })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Claim Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: claimForm.claim_type,
									onValueChange: (v) => setClaimForm({
										...claimForm,
										claim_type: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "spoilage",
											children: "Spoilage"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "fire",
											children: "Fire"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "theft",
											children: "Theft"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "weather",
											children: "Weather"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "pest",
											children: "Pest"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: claimForm.status,
									onValueChange: (v) => setClaimForm({
										...claimForm,
										status: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "filed",
											children: "Filed"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "investigating",
											children: "Investigating"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "approved",
											children: "Approved"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "rejected",
											children: "Rejected"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "paid",
											children: "Paid"
										})
									] })]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Amount Claimed ($)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: claimForm.amount_claimed,
									onChange: (e) => setClaimForm({
										...claimForm,
										amount_claimed: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Amount Approved ($)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: claimForm.amount_approved,
									onChange: (e) => setClaimForm({
										...claimForm,
										amount_approved: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Incident Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: claimForm.incident_date,
									onChange: (e) => setClaimForm({
										...claimForm,
										incident_date: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "md:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: claimForm.description,
										onChange: (e) => setClaimForm({
											...claimForm,
											description: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "md:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: claimForm.notes,
										onChange: (e) => setClaimForm({
											...claimForm,
											notes: e.target.value
										})
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setClaimOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => saveClaim.mutate(claimForm),
							disabled: saveClaim.isPending || !claimForm.claim_number,
							className: "bg-emerald-600 hover:bg-emerald-700",
							children: saveClaim.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "h-4 w-4 mr-2" }), "Save"] })
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deletePolicyId,
				onOpenChange: (o) => !o && setDeletePolicyId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete policy?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This cannot be undone." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-red-600 hover:bg-red-700",
					onClick: () => deletePolicyId && removePolicy.mutate(deletePolicyId),
					children: "Delete"
				})] })] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleteClaimId,
				onOpenChange: (o) => !o && setDeleteClaimId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete claim?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This cannot be undone." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-red-600 hover:bg-red-700",
					onClick: () => deleteClaimId && removeClaim.mutate(deleteClaimId),
					children: "Delete"
				})] })] })
			})
		]
	});
}
//#endregion
export { InsurancePage as component };
