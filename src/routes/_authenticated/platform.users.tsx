import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Loader2, ShieldOff, ShieldCheck, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform.functions";

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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users..." className="pl-9" />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No users found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><UserIcon className="h-4 w-4 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{u.name ?? "—"}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </div>
                  <Badge variant="outline" className={ROLE_BADGE[u.role] ?? ROLE_BADGE.pending}>{u.role}</Badge>
                  {u.blocked && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Blocked</Badge>}
                  {!u.email_verified && <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Unverified</Badge>}
                  <Button size="sm" variant="ghost" disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                    className={u.blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"}>
                    {u.blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}