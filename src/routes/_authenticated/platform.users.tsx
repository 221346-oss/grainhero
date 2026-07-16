import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform-no-admin.functions";

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
  const impersonateFn = useServerFn(startImpersonation);
  const router = useRouter();
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-users"], queryFn: () => fn() as Promise<Row[]> });
  const [q, setQ] = useState("");
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
  const impersonate = useMutation({
    mutationFn: (targetAdminId: string) => impersonateFn({ data: { targetAdminId } }),
    onSuccess: async (res) => {
      toast.success(`Viewing as ${res.tenantName}`);
      await qc.invalidateQueries();
      router.navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalUsers = data.length;
  const blockedUsers = data.filter((u) => u.blocked).length;
  const unverifiedUsers = data.filter((u) => !u.email_verified).length;
  const thisMonth = data.filter((u) => {
    if (!u.created_at) return false;
    const created = new Date(u.created_at);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Users</h1>
          <p className="text-sm text-slate-600 mt-1">Manage all users across tenants and organizations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Users</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">This Month</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">{thisMonth}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Blocked</p>
            <p className="text-3xl font-bold mt-1 text-red-600">{blockedUsers}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Unverified</p>
            <p className="text-3xl font-bold mt-1 text-amber-600">{unverifiedUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email..." />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles ({data.length})</SelectItem>
              <SelectItem value="super_admin">Super Admin ({data.filter(u => u.role === "super_admin").length})</SelectItem>
              <SelectItem value="admin">Admin ({data.filter(u => u.role === "admin").length})</SelectItem>
              <SelectItem value="manager">Manager ({data.filter(u => u.role === "manager").length})</SelectItem>
              <SelectItem value="technician">Technician ({data.filter(u => u.role === "technician").length})</SelectItem>
              <SelectItem value="pending">Pending ({data.filter(u => u.role === "pending").length})</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>View and manage user accounts, roles, and access</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Loading users…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 font-medium">No users found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{u.name ?? "Unnamed User"}</div>
                    <div className="text-sm text-slate-500 truncate">{u.email}</div>
                    {u.created_at && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={ROLE_BADGE[u.role] ?? ROLE_BADGE.pending}>
                      {u.role.replace("_", " ")}
                    </Badge>
                    {u.blocked && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Blocked</Badge>}
                  </div>
                  <Button 
                    size="sm" 
                    variant={u.blocked ? "default" : "outline"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                    className={u.blocked ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 hover:bg-red-50 border-red-200"}
                  >
                    {u.blocked ? "Unblock" : "Block"}
                  </Button>
                  {u.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={impersonate.isPending}
                      onClick={() => impersonate.mutate(u.id)}
                      className="gap-1.5"
                    >
                      <UserCog className="h-3.5 w-3.5" /> View as
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
