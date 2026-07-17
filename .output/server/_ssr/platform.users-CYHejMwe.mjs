import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { h as UserCog } from "../_libs/lucide-react.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as listAllUsers, o as toggleUserBlocked } from "./platform-no-admin.functions-CqXBeWc_.mjs";
import { i as startImpersonation, r as saveImpersonationSession } from "./ImpersonationBanner-C2ZVGIRH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform.users-CYHejMwe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROLE_BADGE = {
	super_admin: "bg-red-100 text-red-700 border-red-200",
	admin: "bg-purple-100 text-purple-700 border-purple-200",
	manager: "bg-blue-100 text-blue-700 border-blue-200",
	technician: "bg-emerald-100 text-emerald-700 border-emerald-200",
	pending: "bg-amber-100 text-amber-700 border-amber-200"
};
function UsersPage() {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const fn = useServerFn(listAllUsers);
	const toggleFn = useServerFn(toggleUserBlocked);
	const impersonateFn = useServerFn(startImpersonation);
	const { data = [], isLoading } = useQuery({
		queryKey: ["platform-users"],
		queryFn: () => fn()
	});
	const [q, setQ] = (0, import_react.useState)("");
	const [role, setRole] = (0, import_react.useState)("all");
	const filtered = (0, import_react.useMemo)(() => data.filter((u) => {
		const s = q.toLowerCase();
		return (!s || (u.name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s)) && (role === "all" || u.role === role);
	}), [
		data,
		q,
		role
	]);
	const toggle = useMutation({
		mutationFn: (v) => toggleFn({ data: v }),
		onSuccess: () => {
			toast.success("Updated");
			qc.invalidateQueries({ queryKey: ["platform-users"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const impersonate = useMutation({
		mutationFn: (adminId) => {
			console.log("Starting impersonation for adminId:", adminId);
			return impersonateFn({ data: { adminId } });
		},
		onSuccess: (data) => {
			console.log("Impersonation success:", data);
			saveImpersonationSession({
				adminId: data.adminId,
				adminName: data.adminName ?? "",
				adminEmail: data.adminEmail ?? null,
				businessType: data.businessType ?? null
			});
			toast.success(`Now viewing as ${data.adminName}`);
			navigate({ to: "/dashboard" });
		},
		onError: (e) => {
			console.error("Impersonation error:", e);
			toast.error(e.message);
		}
	});
	const totalUsers = data.length;
	const blockedUsers = data.filter((u) => u.blocked).length;
	const thisMonth = data.filter((u) => {
		if (!u.created_at) return false;
		const created = new Date(u.created_at);
		const monthAgo = /* @__PURE__ */ new Date();
		monthAgo.setMonth(monthAgo.getMonth() - 1);
		return created >= monthAgo;
	}).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-start justify-between gap-4 flex-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold text-slate-900",
					children: "Platform Users"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-600 mt-1",
					children: "Manage all users across tenants and organizations"
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-purple-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase text-slate-500",
								children: "Total Users"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-3xl font-bold mt-1 text-slate-900",
								children: totalUsers
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-emerald-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase text-slate-500",
								children: "This Month"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-3xl font-bold mt-1 text-slate-900",
								children: thisMonth
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "border-l-4 border-l-red-500 shadow-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold uppercase text-slate-500",
								children: "Blocked"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-3xl font-bold mt-1 text-red-600",
								children: blockedUsers
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "shadow-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex flex-col md:flex-row gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value),
							placeholder: "Search by name or email..."
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: role,
						onValueChange: setRole,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full md:w-52",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Filter by role" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "all",
								children: [
									"All roles (",
									data.length,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "super_admin",
								children: [
									"Super Admin (",
									data.filter((u) => u.role === "super_admin").length,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "admin",
								children: [
									"Admin (",
									data.filter((u) => u.role === "admin").length,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "manager",
								children: [
									"Manager (",
									data.filter((u) => u.role === "manager").length,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "technician",
								children: [
									"Technician (",
									data.filter((u) => u.role === "technician").length,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: "pending",
								children: [
									"Pending (",
									data.filter((u) => u.role === "pending").length,
									")"
								]
							})
						] })]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "shadow-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "border-b bg-gradient-to-r from-slate-50 to-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-lg",
						children: "All Users"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "View and manage user accounts, roles, and access" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-8 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-slate-500",
							children: "Loading users…"
						})]
					}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-12 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-500 font-medium",
							children: "No users found"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-slate-400 mt-1",
							children: "Try adjusting your search or filter"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-slate-100",
						children: filtered.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 transition-colors",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-semibold text-slate-900 truncate",
											children: u.name ?? "Unnamed User"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm text-slate-500 truncate",
											children: u.email
										}),
										u.created_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-slate-400 mt-0.5",
											children: ["Joined ", new Date(u.created_at).toLocaleDateString()]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: ROLE_BADGE[u.role] ?? ROLE_BADGE.pending,
										children: u.role.replace("_", " ")
									}), u.blocked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "bg-red-100 text-red-700 border-red-200",
										children: "Blocked"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [u.role === "admin" && !u.blocked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "outline",
										disabled: impersonate.isPending,
										onClick: () => impersonate.mutate(u.id),
										className: "text-blue-600 hover:bg-blue-50 border-blue-200",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserCog, { className: "h-3 w-3 mr-1" }), "View as"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: u.blocked ? "default" : "outline",
										disabled: toggle.isPending,
										onClick: () => toggle.mutate({
											id: u.id,
											blocked: !u.blocked
										}),
										className: u.blocked ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 hover:bg-red-50 border-red-200",
										children: u.blocked ? "Unblock" : "Block"
									})]
								})
							]
						}, u.id))
					})
				})]
			})
		]
	});
}
//#endregion
export { UsersPage as component };
