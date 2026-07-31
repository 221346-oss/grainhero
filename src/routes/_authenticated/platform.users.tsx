import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform-no-admin.functions";
import { setUserRole } from "@/lib/platform.functions";
import { startImpersonation } from "@/lib/impersonation.functions";
import { saveImpersonationSession } from "@/components/app/ImpersonationBanner";
import { UserCog, ShieldCheck } from "lucide-react";
import { AdminFilterBar } from "@/components/app/admin/AdminFilterBar";

import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/platform/users")({ component: UsersPage });

type Row = { id: string; name: string | null; email: string | null; business_type: string | null; blocked: boolean | null; email_verified: boolean | null; created_at: string | null; last_login: string | null; role: string; admin_id: string | null };

const ROLE_TEXT: Record<string, string> = {
  super_admin: "text-destructive",
  admin: "text-primary",
  manager: "text-chart-3",
  technician: "text-chart-4",
  pending: "text-muted-foreground",
};

const ASSIGNABLE_ROLES = [
  { value: "technician", label: "Technician" },
  { value: "manager",    label: "Manager"    },
  { value: "admin",      label: "Admin"      },
  { value: "pending",    label: "Pending"    },
] as const;

interface ChangeRoleDialogProps {
  user: Row | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (userId: string, role: string) => void;
  isPending: boolean;
}

function ChangeRoleDialog({ user, open, onOpenChange, onConfirm, isPending }: ChangeRoleDialogProps) {
  const [newRole, setNewRole] = useState(user?.role ?? "pending");

  // Sync local state when user changes or dialog opens
  useEffect(() => {
    if (open && user) setNewRole(user.role);
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-slate-700">{user?.name ?? user?.email ?? "This user"}</span>
            &apos;s role will be updated immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">New role</label>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!user || newRole === user.role || isPending}
            onClick={() => user && onConfirm(user.id, newRole)}
          >
            {isPending ? "Saving…" : "Save role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(listAllUsers);
  const toggleFn = useServerFn(toggleUserBlocked);
  const impersonateFn = useServerFn(startImpersonation);
  const setRoleFn = useServerFn(setUserRole);
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-users"], queryFn: () => fn() as Promise<Row[]> });
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [role, setRole] = useState("all");
  const [roleTarget, setRoleTarget] = useState<Row | null>(null);

  const filtered = useMemo(() => data.filter((u) => {
    const s = q.toLowerCase();
    const hit = !s || (u.name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
    return hit && (role === "all" || u.role === role);
  }), [data, q, role]);

  const toggle = useMutation({
    mutationFn: (v: { id: string; blocked: boolean }) => toggleFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["platform-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const impersonate = useMutation({
    mutationFn: (adminId: string) => {
      console.log("Starting impersonation for adminId:", adminId);
      return impersonateFn({ data: { adminId } });
    },
    onSuccess: (data) => {
      console.log("Impersonation success:", data);
      // Persist session to localStorage so the banner picks it up
      saveImpersonationSession({
        adminId: data.adminId,
        adminName: data.adminName ?? "",
        adminEmail: data.adminEmail ?? null,
        businessType: data.businessType ?? null,
      });
      toast.success(`Now viewing as ${data.adminName}`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => {
      console.error("Impersonation error:", e);
      toast.error(e.message);
    },
  });

  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: string }) => setRoleFn({ data: v }),
    onSuccess: (_, v) => {
      toast.success(`Role updated to ${v.role}`);
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      setRoleTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalUsers = data.length;
  const blockedUsers = data.filter((u) => u.blocked).length;
  const thisMonth = data.filter((u) => {
    if (!u.created_at) return false;
    const created = new Date(u.created_at);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;

  // ── Full layout skeleton while loading ─────────────────────────────────
  if (isLoading) {
    return (
      <AdminPageShell title="Platform users" subtitle="All users across tenants and organizations">
        <div className="space-y-4">
          {/* 3-tile summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                <div className="h-7 w-10 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          {/* Filter bar */}
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          {/* Users table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            {/* Table header */}
            <div className="px-4 py-2.5 grid grid-cols-5 gap-4 border-b border-slate-100">
              {["User","Role","Joined","Status","Actions"].map((col) => (
                <div key={col} className="h-3 w-14 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
            {/* Table rows */}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-5 gap-4 items-center border-b border-slate-50">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-2.5 w-44 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-12 animate-pulse rounded bg-slate-100" />
                <div className="flex justify-end gap-2">
                  <div className="h-6 w-16 animate-pulse rounded bg-slate-100" />
                  <div className="h-6 w-12 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Platform users" subtitle="All users across tenants and organizations">
      <AdminSummaryTiles
        columns={3}
        tiles={[
          { key: "all", label: "Total users", value: totalUsers },
          { key: "month", label: "This month", value: thisMonth },
          { key: "blocked", label: "Blocked", value: blockedUsers },
        ]}
      />

      <AdminFilterBar onSubmit={() => setQ(qInput)}>
        <AdminFilterField label="Search" width="flex-1 min-w-[240px]">
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search by name or email…" />
        </AdminFilterField>
        <AdminFilterField label="Role" width="w-52">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles ({data.length})</SelectItem>
              <SelectItem value="super_admin">Super admin ({data.filter(u => u.role === "super_admin").length})</SelectItem>
              <SelectItem value="admin">Admin ({data.filter(u => u.role === "admin").length})</SelectItem>
              <SelectItem value="manager">Manager ({data.filter(u => u.role === "manager").length})</SelectItem>
              <SelectItem value="technician">Technician ({data.filter(u => u.role === "technician").length})</SelectItem>
              <SelectItem value="pending">Pending ({data.filter(u => u.role === "pending").length})</SelectItem>
            </SelectContent>
          </Select>
        </AdminFilterField>
      </AdminFilterBar>

      <AdminDataCard
        title="All users"
        description={`Showing ${filtered.length} of ${data.length}`}
      >
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={4} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="p-2">
            <Table className="border-separate border-spacing-0">
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 font-normal text-muted-foreground">User</TableHead>
                  <TableHead className="h-10 font-normal text-muted-foreground">Role</TableHead>
                  <TableHead className="h-10 font-normal text-muted-foreground">Joined</TableHead>
                  <TableHead className="h-10 font-normal text-muted-foreground">Status</TableHead>
                  <TableHead className="h-10 font-normal text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <tbody aria-hidden="true" className="h-2" />
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-0 hover:bg-muted/40 [&>td]:border-0 [&_td:first-child]:rounded-s-lg [&_td:last-child]:rounded-e-lg"
                  >
                    <TableCell className="py-3">
                      <div className="font-medium truncate">{u.name ?? "Unnamed user"}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${ROLE_TEXT[u.role] ?? ROLE_TEXT.pending}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {u.blocked ? (
                        <span className="text-sm font-medium text-destructive">Blocked</span>
                      ) : (
                        <span className="text-sm font-medium text-primary">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role === "admin" && !u.blocked && (
                          <Button
                            size="sm"
                            variant="link"
                            disabled={impersonate.isPending}
                            onClick={() => impersonate.mutate(u.id)}
                            className="h-auto p-0 text-primary"
                          >
                            <UserCog className="me-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
                            View as
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => setRoleTarget(u)}
                          className="h-auto p-0 text-slate-500 hover:text-slate-800"
                        >
                          <ShieldCheck className="me-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
                          Role
                        </Button>
                        <Button
                          size="sm"
                          variant="link"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                          className={`h-auto p-0 ${u.blocked ? "text-primary" : "text-destructive"}`}
                        >
                          {u.blocked ? "Unblock" : "Block"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminDataCard >

      <ChangeRoleDialog
        user={roleTarget}
        open={!!roleTarget}
        onOpenChange={(v) => !v && setRoleTarget(null)}
        onConfirm={(userId, role) => changeRole.mutate({ userId, role })}
        isPending={changeRole.isPending}
      />
    </AdminPageShell >
  );
}
