import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { L as ShieldOff, R as ShieldCheck, d as Users, ft as Mail, p as UserX, y as TriangleAlert, z as ShieldAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { a as listAllUsers, o as toggleUserBlocked } from "./platform-no-admin.functions-CqXBeWc_.mjs";
import { i as getSecurityOverview } from "./operations2.functions-Dlnt5BX1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/security-center-TChcDTIQ.js
var import_jsx_runtime = require_jsx_runtime();
function sevBadge(s) {
	switch (s) {
		case "critical": return "bg-red-100 text-red-800";
		case "error": return "bg-orange-100 text-orange-800";
		case "warning": return "bg-amber-100 text-amber-800";
		default: return "bg-slate-100 text-slate-700";
	}
}
function SecurityCenterPage() {
	const qc = useQueryClient();
	const fnRole = useServerFn(getMyRole);
	const fn = useServerFn(getSecurityOverview);
	const usersListFn = useServerFn(listAllUsers);
	const toggleFn = useServerFn(toggleUserBlocked);
	const roleQ = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fnRole()
	});
	const role = roleQ.data?.role ?? "pending";
	const allowed = ["super_admin", "admin"].includes(role);
	const { data } = useQuery({
		queryKey: ["security-center"],
		queryFn: () => fn(),
		enabled: allowed
	});
	const { data: allUsers = [], isLoading: usersLoading } = useQuery({
		queryKey: ["security-users"],
		queryFn: () => usersListFn(),
		enabled: allowed
	});
	const toggle = useMutation({
		mutationFn: (v) => toggleFn({ data: v }),
		onSuccess: () => {
			toast.success("User status updated");
			qc.invalidateQueries({ queryKey: ["security-users"] });
			qc.invalidateQueries({ queryKey: ["security-center"] });
		},
		onError: (e) => toast.error(e.message)
	});
	if (!roleQ.isLoading && !allowed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-8 max-w-lg mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Access restricted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Security Center is available to admins and super admins." })] }) })
	});
	const totalUsers = allUsers.length;
	const adminsCount = allUsers.filter((u) => u.role === "admin").length;
	const pendingCount = allUsers.filter((u) => u.role === "pending").length;
	const blockedCount = allUsers.filter((u) => u.blocked).length;
	const recentIncidents = data?.totals?.recentIncidents ?? 0;
	data?.users;
	const logs = data?.logs ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		style: {
			backgroundColor: "#EDE9D4",
			minHeight: "100vh"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl font-bold flex items-center gap-2",
				style: { color: "#252d26" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
					className: "h-6 w-6",
					style: { color: "#2FAC0C" }
				}), " Security Center"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm mt-1",
				style: { color: "#404F44" },
				children: "User access, privilege overview and recent security events."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Total users"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: totalUsers
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-6 w-6 text-slate-500" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Admins"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-emerald-600",
							children: adminsCount
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-emerald-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Pending"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-amber-600",
							children: pendingCount
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-6 w-6 text-amber-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Blocked"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold text-red-600",
							children: blockedCount
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserX, { className: "h-6 w-6 text-red-600" })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4 flex justify-between items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase text-slate-500 font-semibold",
							children: "Incidents"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-2xl font-bold",
							children: recentIncidents
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "h-6 w-6 text-red-600" })]
					}) })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "User access" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Roles and blocked accounts - manage user access" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "divide-y max-h-[500px] overflow-y-auto",
						children: [allUsers.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 flex items-center justify-between text-sm gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium truncate",
										children: u.name ?? "Unnamed User"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-slate-500 truncate flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3" }), u.email]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1 flex-wrap justify-end",
									children: [u.blocked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "bg-red-100 text-red-800 text-[10px]",
										children: "blocked"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "text-[10px]",
										children: u.role?.replace("_", " ") ?? "pending"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: u.blocked ? "default" : "outline",
									disabled: toggle.isPending,
									onClick: () => toggle.mutate({
										id: u.id,
										blocked: !u.blocked
									}),
									className: u.blocked ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7" : "text-red-600 hover:bg-red-50 border-red-200 text-xs h-7",
									children: u.blocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3 w-3 mr-1" }), "Unblock"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "h-3 w-3 mr-1" }), "Block"] })
								})
							]
						}, u.id)), allUsers.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-8 text-center text-sm text-slate-500",
							children: "No users."
						})]
					})
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Security events" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Recent warnings and errors from the audit log" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "divide-y max-h-[400px] overflow-y-auto",
						children: [logs.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: sevBadge(l.severity) + " text-[10px] uppercase",
											children: l.severity ?? "info"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: l.action
										}),
										l.entity_type && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-slate-500",
											children: ["· ", l.entity_type]
										})
									]
								}),
								l.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-600 mt-1",
									children: l.message
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-slate-400 mt-1",
									children: l.created_at ? new Date(l.created_at).toLocaleString() : ""
								})
							]
						}, l.id)), logs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-8 text-center text-sm text-slate-500",
							children: "No recent events."
						})]
					})
				})] })]
			})
		]
	});
}
//#endregion
export { SecurityCenterPage as component };
