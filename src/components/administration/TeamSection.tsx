import { ListSkeleton } from "@/components/app/skeletons";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Mail, Loader2, Users, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getMyRole } from "@/lib/roles.functions";
import { listTeamMembers, inviteTeamMember, updateTeamMember, removeTeamMember } from "@/lib/team-settings-insurance.functions";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

type Role = "admin" | "manager" | "technician" | "pending";
type Member = {
  id: string; name: string | null; email: string | null; phone: string | null;
  status: string | null; blocked: boolean | null; email_verified: boolean | null;
  department: string | null; created_at: string | null; role: string;
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  technician: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

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

  const filtered = useMemo(() => members.filter((m) => {
    const t = q.toLowerCase();
    const hit = !t || (m.name ?? "").toLowerCase().includes(t) || (m.email ?? "").toLowerCase().includes(t);
    const rf = roleFilter === "all" || m.role === roleFilter;
    return hit && rf;
  }), [members, q, roleFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.email_verified && m.role !== "pending" && !m.blocked).length;
    const pending = members.filter((m) => m.role === "pending").length;
    const blocked = members.filter((m) => m.blocked).length;
    return { total, active, pending, blocked };
  }, [members]);

  const invite = useMutation({
    mutationFn: (v: { data: { email: string; name?: string; role: "admin" | "manager" | "technician" } }) => inviteFn(v),
    onSuccess: () => { toast.success("Invitation sent"); setInviteOpen(false); setInviteForm({ email: "", name: "", role: "technician" }); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: { data: { id: string; name?: string; phone?: string; role?: Role } }) => updateFn(v),
    onSuccess: () => { toast.success("Member updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (v: { data: { id: string } }) => removeFn(v),
    onSuccess: () => { toast.success("Member removed"); setDeleting(null); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const availableRoles: Role[] = currentRole === "admin" ? ["manager", "technician"]
    : currentRole === "manager" ? ["technician"] : [];

  // Super admins manage users on the platform pages — no duplicate implementation here.
  if (isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <Users className="h-10 w-10 text-emerald-600 mx-auto" />
          <div className="text-lg font-semibold text-slate-900">Platform user management</div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            As a super admin, teams are managed from the platform users page across all tenants.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/platform/users">Open Platform Users <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Invite teammates and manage roles across your tenant.</p>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
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
            <Search className="absolute left-3 top-[calc(50%+8px)] -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" />
          </div>
          <div className="w-full md:w-48">
            <Label className="text-xs font-medium text-slate-500 mb-1 block">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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

      <AdminDataCard title="All members" description={`Showing ${filtered.length} of ${members.length}`}>
        {isLoading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                  {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{m.name ?? "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{m.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={ROLE_BADGE[m.role] ?? ROLE_BADGE.pending} variant="outline">{m.role}</Badge>
                  {m.blocked && <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">Blocked</Badge>}
                  {!m.email_verified && m.role !== "pending" && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200" variant="outline">Unverified</Badge>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setEditForm({ name: m.name ?? "", phone: m.phone ?? "", role: (m.role as Role) }); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminDataCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Send an email invitation to join your tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
            <div><Label>Name (optional)</Label><Input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => invite.mutate({ data: { email: inviteForm.email.trim(), name: inviteForm.name || undefined, role: inviteForm.role as "admin" | "manager" | "technician" } })} disabled={invite.isPending || !inviteForm.email || inviteForm.role === "pending"} className="bg-emerald-600 hover:bg-emerald-700">
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="technician">technician</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && update.mutate({ data: { id: editing.id, name: editForm.name, phone: editForm.phone, role: editForm.role } })} disabled={update.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.email} will lose access permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate({ data: { id: deleting.id } })} className="bg-red-600 hover:bg-red-700">
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
