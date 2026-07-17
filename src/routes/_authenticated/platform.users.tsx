import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform-no-admin.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/platform/users")({ component: UsersPage });

type Row = { id: string; name: string | null; email: string | null; business_type: string | null; blocked: boolean | null; email_verified: boolean | null; created_at: string | null; last_login: string | null; role: string; admin_id: string | null };

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  technician: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

function UsersPage() {
  const qc = useQueryClient();
  const fn = useServerFn(listAllUsers);
  const toggleFn = useServerFn(toggleUserBlocked);
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-users"], queryFn: () => fn() as Promise<Row[]> });
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [role, setRole] = useState("all");

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
 
  const totalUsers = data.length;
  const blockedUsers = data.filter((u) => u.blocked).length;
  const thisMonth = data.filter((u) => {
    if (!u.created_at) return false;
    const created = new Date(u.created_at);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;

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
          <div className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{u.name ?? "Unnamed user"}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {u.email}
                    {u.created_at && <span className="ml-2 text-slate-400">• Joined {new Date(u.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Badge variant="outline" className={ROLE_BADGE[u.role] ?? ROLE_BADGE.pending}>
                  {u.role.replace("_", " ")}
                </Badge>
                {u.blocked && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Blocked</Badge>}
                <Button
                  size="sm"
                  variant={u.blocked ? "default" : "outline"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                  className={u.blocked ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 hover:bg-red-50 border-red-200"}
                >
                  {u.blocked ? "Unblock" : "Block"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </AdminDataCard>
    </AdminPageShell>
  );
}
