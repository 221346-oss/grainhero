import { ListSkeleton } from "@/components/app/skeletons";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Loader2,
  Users,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions, type RowAction } from "@/components/app/RowActions";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getMyRole } from "@/lib/roles.functions";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
} from "@/lib/team-settings-insurance.functions";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

type Role = "admin" | "manager" | "technician" | "pending";
type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  blocked: boolean | null;
  email_verified: boolean | null;
  department: string | null;
  created_at: string | null;
  role: string;
};

const PAGE_SIZES = [10, 25, 50] as const;

// One derived status per row (Blocked > Pending > Unverified > Active) instead
// of stacking Role + Blocked + Unverified badges side by side.
function memberStatus(m: Member): { label: string; cls: string } {
  if (m.blocked) return { label: "Blocked", cls: "bg-red-100 text-red-700 border-red-200" };
  if (m.role === "pending")
    return { label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (!m.email_verified)
    return { label: "Unverified", cls: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

const teamExportColumns: ExportColumn<Member>[] = [
  { header: "Name", value: (m) => m.name ?? "" },
  { header: "Email", value: (m) => m.email ?? "" },
  { header: "Role", value: (m) => m.role },
  { header: "Status", value: (m) => memberStatus(m).label },
  { header: "Phone", value: (m) => m.phone ?? "" },
  {
    header: "Joined",
    value: (m) => (m.created_at ? new Date(m.created_at).toLocaleDateString() : ""),
  },
];

export function TeamSection() {
  const qc = useQueryClient();
  const roleFn = useServerFn(getMyRole);
  const listFn = useServerFn(listTeamMembers);
  const inviteFn = useServerFn(inviteTeamMember);
  const updateFn = useServerFn(updateTeamMember);
  const removeFn = useServerFn(removeTeamMember);

  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });
  const currentRole = me?.role ?? "pending";
  const isSuperAdmin = currentRole === "super_admin";
  const canInvite = ["admin", "manager"].includes(currentRole);
  const canManage = ["admin"].includes(currentRole);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn() as Promise<Member[]>,
    enabled: !isSuperAdmin,
  });

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "technician" as Role });
  const [editing, setEditing] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "technician" as Role });
  const [deleting, setDeleting] = useState<Member | null>(null);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const t = q.toLowerCase();
        const hit =
          !t ||
          (m.name ?? "").toLowerCase().includes(t) ||
          (m.email ?? "").toLowerCase().includes(t);
        const rf = roleFilter === "all" || m.role === roleFilter;
        return hit && rf;
      }),
    [members, q, roleFilter],
  );

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(
      (m) => m.email_verified && m.role !== "pending" && !m.blocked,
    ).length;
    const pending = members.filter((m) => m.role === "pending").length;
    const blocked = members.filter((m) => m.blocked).length;
    return { total, active, pending, blocked };
  }, [members]);

  // ── Table redesign: sort, pagination, multi-select ──────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"name" | "joined">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "joined") {
        return (
          dir * (new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
        );
      }
      return dir * (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  );

  // Search/filter/page-size changes invalidate the current page.
  useEffect(() => {
    setPage(1);
  }, [q, roleFilter, pageSize]);

  function toggleSort(key: "name" | "joined") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const pageIds = useMemo(() => paged.map((m) => m.id), [paged]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const selectedMembers = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected],
  );

  const invite = useMutation({
    mutationFn: (v: {
      data: { email: string; name?: string; role: "admin" | "manager" | "technician" };
    }) => inviteFn(v),
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteForm({ email: "", name: "", role: "technician" });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: {
      data: { id: string; name?: string; phone?: string; role?: Role; blocked?: boolean };
    }) => updateFn(v),
    onSuccess: (_r, v) => {
      toast.success(
        v.data.blocked !== undefined
          ? v.data.blocked
            ? "Member blocked"
            : "Member unblocked"
          : "Member updated",
      );
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (v: { data: { id: string } }) => removeFn(v),
    onSuccess: () => {
      toast.success("Member removed");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const availableRoles: Role[] = useMemo(
    () =>
      currentRole === "admin"
        ? ["manager", "technician"]
        : currentRole === "manager"
          ? ["technician"]
          : [],
    [currentRole],
  );

  // Ensure form role is valid when available roles change
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteForm.role)) {
      setInviteForm((prev) => ({ ...prev, role: availableRoles[0] }));
    }
  }, [availableRoles, inviteForm.role]);

  // Super admins manage users on the platform pages — no duplicate implementation here.
  if (isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <Users className="h-10 w-10 text-emerald-600 mx-auto" />
          <div className="text-lg font-semibold text-foreground">Platform user management</div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            As a super admin, teams are managed from the platform users page across all tenants.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/platform/users">
              Open Platform Users <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Invite teammates and manage roles across your tenant.
        </p>
        {canInvite && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Invite member
          </Button>
        )}
      </div>

      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "t", label: "Total", value: stats.total },
          { key: "a", label: "Active", value: stats.active },
          { key: "p", label: "Pending", value: stats.pending },
          { key: "b", label: "Blocked", value: stats.blocked },
        ]}
      />

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-end">
          <div className="relative flex-1">
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Search</Label>
            <Search className="absolute left-3 top-[calc(50%+8px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-48">
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border-emerald-200 bg-emerald-50 px-4 py-2">
          <span className="text-sm text-emerald-800 font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="team-members"
              title="Team Members (selected)"
              rows={selectedMembers}
              columns={teamExportColumns}
            />
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <AdminDataCard
        title="All members"
        description={`Showing ${paged.length} of ${filtered.length} (${members.length} total)`}
      >
        {isLoading ? (
          <div className="p-4">
            <ListSkeleton rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          <div>
            {/* Sticky column header — sticks to AdminDataCard's own scroll container. */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-card px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={toggleSelectAllOnPage}
                aria-label="Select all on page"
              />
              <button
                className="flex-1 min-w-0 flex items-center gap-1 text-left hover:text-slate-600"
                onClick={() => toggleSort("name")}
              >
                Member{" "}
                {sortKey === "name" &&
                  (sortDir === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  ))}
              </button>
              <span className="w-20 hidden sm:block">Role</span>
              <span className="w-20">Status</span>
              <button
                className="w-24 hidden md:flex items-center gap-1 hover:text-slate-600"
                onClick={() => toggleSort("joined")}
              >
                Joined{" "}
                {sortKey === "joined" &&
                  (sortDir === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  ))}
              </button>
              {canManage && <span className="w-8" />}
            </div>

            <div className="divide-y divide-slate-100">
              {paged.map((m) => {
                const status = memberStatus(m);
                const expanded = expandedId === m.id;
                const rowActions: RowAction[] = canManage
                  ? [
                      {
                        label: "Edit",
                        icon: Edit2,
                        onClick: () => {
                          setEditing(m);
                          setEditForm({
                            name: m.name ?? "",
                            phone: m.phone ?? "",
                            role: m.role as Role,
                          });
                        },
                      },
                      {
                        label: m.blocked ? "Unblock" : "Block",
                        icon: m.blocked ? ShieldCheck : ShieldOff,
                        onClick: () => update.mutate({ data: { id: m.id, blocked: !m.blocked } }),
                      },
                      {
                        label: "Remove",
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setDeleting(m),
                      },
                    ]
                  : [];
                return (
                  <div key={m.id}>
                    <div
                      className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                    >
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleSelectOne(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${m.name ?? m.email}`}
                      />
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                        {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{m.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                      </div>
                      <span className="w-20 hidden sm:block text-sm text-muted-foreground capitalize truncate">
                        {m.role}
                      </span>
                      <span className="w-20">
                        <Badge className={status.cls} variant="outline">
                          {status.label}
                        </Badge>
                      </span>
                      <span className="w-24 hidden md:block text-xs text-muted-foreground">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                      </span>
                      <div className="w-8 flex justify-end" onClick={(e) => e.stopPropagation()}>
                        {canManage ? (
                          <RowActions actions={rowActions} visible={0} />
                        ) : expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-4 pb-3 pl-16 -mt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground bg-muted/20">
                        <div>
                          <span className="text-muted-foreground block">Phone</span>
                          {m.phone ?? "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Department</span>
                          {m.department ?? "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Email verified</span>
                          {m.email_verified ? "Yes" : "No"}
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Joined</span>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AdminDataCard>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Send an email invitation to join your tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                invite.mutate({
                  data: {
                    email: inviteForm.email.trim(),
                    name: inviteForm.name || undefined,
                    role: inviteForm.role as "admin" | "manager" | "technician",
                  },
                })
              }
              disabled={
                invite.isPending ||
                !inviteForm.email.trim() ||
                !availableRoles.includes(inviteForm.role)
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="technician">technician</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing &&
                update.mutate({
                  data: {
                    id: editing.id,
                    name: editForm.name,
                    phone: editForm.phone,
                    role: editForm.role,
                  },
                })
              }
              disabled={update.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.email} will lose access permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate({ data: { id: deleting.id } })}
              className="bg-red-600 hover:bg-red-700"
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
