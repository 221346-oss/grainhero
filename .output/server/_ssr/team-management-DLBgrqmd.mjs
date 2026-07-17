import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, Jt as Clock, S as Trash2, U as Search, d as Users, en as CircleAlert, ft as Mail, g as UserCheck, ht as LoaderCircle, tt as Pen } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { i as ListSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./alert-dialog-BCrgGGf7.mjs";
import { n as StatCard, t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { c as removeTeamMember, i as inviteTeamMember, s as listTeamMembers, u as updateTeamMember } from "./team-settings-insurance.functions-B-NzOE-L.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-management-DLBgrqmd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROLE_BADGE = {
	super_admin: "bg-red-100 text-red-700 border-red-200",
	admin: "bg-purple-100 text-purple-700 border-purple-200",
	manager: "bg-blue-100 text-blue-700 border-blue-200",
	technician: "bg-emerald-100 text-emerald-700 border-emerald-200",
	pending: "bg-amber-100 text-amber-700 border-amber-200"
};
function TeamPage() {
	const qc = useQueryClient();
	const roleFn = useServerFn(getMyRole);
	const listFn = useServerFn(listTeamMembers);
	const inviteFn = useServerFn(inviteTeamMember);
	const updateFn = useServerFn(updateTeamMember);
	const removeFn = useServerFn(removeTeamMember);
	const { data: me } = useQuery({
		queryKey: ["my-role"],
		queryFn: () => roleFn()
	});
	const currentRole = me?.role ?? "pending";
	const canInvite = [
		"super_admin",
		"admin",
		"manager"
	].includes(currentRole);
	const canManage = ["super_admin", "admin"].includes(currentRole);
	const { data: members = [], isLoading } = useQuery({
		queryKey: ["team-members"],
		queryFn: () => listFn()
	});
	const [q, setQ] = (0, import_react.useState)("");
	const [roleFilter, setRoleFilter] = (0, import_react.useState)("all");
	const [inviteOpen, setInviteOpen] = (0, import_react.useState)(false);
	const [inviteForm, setInviteForm] = (0, import_react.useState)({
		email: "",
		name: "",
		role: "technician"
	});
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [editForm, setEditForm] = (0, import_react.useState)({
		name: "",
		phone: "",
		role: "technician"
	});
	const [deleting, setDeleting] = (0, import_react.useState)(null);
	const filtered = (0, import_react.useMemo)(() => members.filter((m) => {
		const t = q.toLowerCase();
		const hit = !t || (m.name ?? "").toLowerCase().includes(t) || (m.email ?? "").toLowerCase().includes(t);
		const rf = roleFilter === "all" || m.role === roleFilter;
		return hit && rf;
	}), [
		members,
		q,
		roleFilter
	]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			total: members.length,
			active: members.filter((m) => m.email_verified && m.role !== "pending" && !m.blocked).length,
			pending: members.filter((m) => m.role === "pending").length,
			blocked: members.filter((m) => m.blocked).length
		};
	}, [members]);
	const invite = useMutation({
		mutationFn: (v) => inviteFn(v),
		onSuccess: () => {
			toast.success("Invitation sent");
			setInviteOpen(false);
			setInviteForm({
				email: "",
				name: "",
				role: "technician"
			});
			qc.invalidateQueries({ queryKey: ["team-members"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const update = useMutation({
		mutationFn: (v) => updateFn(v),
		onSuccess: () => {
			toast.success("Member updated");
			setEditing(null);
			qc.invalidateQueries({ queryKey: ["team-members"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: (v) => removeFn(v),
		onSuccess: () => {
			toast.success("Member removed");
			setDeleting(null);
			qc.invalidateQueries({ queryKey: ["team-members"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const availableRoles = currentRole === "super_admin" ? [
		"admin",
		"manager",
		"technician"
	] : currentRole === "admin" ? ["manager", "technician"] : currentRole === "manager" ? ["technician"] : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Team Management",
				subtitle: "Invite teammates and manage roles across your tenant"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total",
						value: stats.total,
						icon: Users,
						accent: "sky"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Active",
						value: stats.active,
						icon: UserCheck,
						accent: "emerald"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Pending",
						value: stats.pending,
						icon: Clock,
						accent: "amber"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Blocked",
						value: stats.blocked,
						icon: CircleAlert,
						accent: "rose"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "mb-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: q,
								onChange: (e) => setQ(e.target.value),
								placeholder: "Search by name or email",
								className: "pl-9"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: roleFilter,
							onValueChange: setRoleFilter,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-full md:w-48",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All roles"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "admin",
									children: "Admin"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "manager",
									children: "Manager"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "technician",
									children: "Technician"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "pending",
									children: "Pending"
								})
							] })]
						}),
						canInvite && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => setInviteOpen(true),
							className: "bg-emerald-600 hover:bg-emerald-700",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Invite member"]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListSkeleton, { rows: 5 })
				}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-10 text-center text-slate-500",
					children: "No team members found"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-slate-100",
					children: filtered.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0",
								children: (m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium text-slate-900 truncate",
									children: m.name ?? "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-500 truncate",
									children: m.email
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-wrap",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: ROLE_BADGE[m.role] ?? ROLE_BADGE.pending,
										variant: "outline",
										children: m.role
									}),
									m.blocked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "bg-red-100 text-red-700 border-red-200",
										variant: "outline",
										children: "Blocked"
									}),
									!m.email_verified && m.role !== "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "bg-orange-100 text-orange-700 border-orange-200",
										variant: "outline",
										children: "Unverified"
									})
								]
							}),
							canManage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setEditing(m);
										setEditForm({
											name: m.name ?? "",
											phone: m.phone ?? "",
											role: m.role
										});
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "ghost",
									className: "text-red-600 hover:text-red-700 hover:bg-red-50",
									onClick: () => setDeleting(m),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})]
							})
						]
					}, m.id))
				})
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: inviteOpen,
				onOpenChange: setInviteOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Invite team member" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Send an email invitation to join your tenant." })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "email",
								value: inviteForm.email,
								onChange: (e) => setInviteForm({
									...inviteForm,
									email: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: inviteForm.name,
								onChange: (e) => setInviteForm({
									...inviteForm,
									name: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Role" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: inviteForm.role,
								onValueChange: (v) => setInviteForm({
									...inviteForm,
									role: v
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: availableRoles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: r,
									children: r
								}, r)) })]
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setInviteOpen(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => invite.mutate({ data: {
							email: inviteForm.email.trim(),
							name: inviteForm.name || void 0,
							role: inviteForm.role
						} }),
						disabled: invite.isPending || !inviteForm.email || inviteForm.role === "pending",
						className: "bg-emerald-600 hover:bg-emerald-700",
						children: [invite.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 mr-2" }), "Send invite"]
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!editing,
				onOpenChange: (o) => !o && setEditing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Edit member" }) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: editForm.name,
								onChange: (e) => setEditForm({
									...editForm,
									name: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: editForm.phone,
								onChange: (e) => setEditForm({
									...editForm,
									phone: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Role" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: editForm.role,
								onValueChange: (v) => setEditForm({
									...editForm,
									role: v
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "manager",
										children: "manager"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "technician",
										children: "technician"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pending",
										children: "pending"
									})
								] })]
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setEditing(null),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => editing && update.mutate({ data: {
							id: editing.id,
							name: editForm.name,
							phone: editForm.phone,
							role: editForm.role
						} }),
						disabled: update.isPending,
						className: "bg-emerald-600 hover:bg-emerald-700",
						children: update.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Save"
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleting,
				onOpenChange: (o) => !o && setDeleting(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Remove team member?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [deleting?.email, " will lose access permanently."] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => deleting && remove.mutate({ data: { id: deleting.id } }),
					className: "bg-red-600 hover:bg-red-700",
					children: remove.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Remove"
				})] })] })
			})
		]
	});
}
//#endregion
export { TeamPage as component };
