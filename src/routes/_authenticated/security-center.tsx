import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, UserX, Users, AlertTriangle, ShieldOff, User as UserIcon, Mail, Loader2 } from "lucide-react";
import { getSecurityOverview } from "@/lib/operations2.functions";
import { getMyRole } from "@/lib/roles.functions";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform-no-admin.functions";
import { toast } from "sonner";
import { CommandConsoleSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/security-center")({
  head: () => ({
    meta: [
      { title: "Security Center — Grain Hero" },
      { name: "description", content: "Security Center workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Security Center — Grain Hero" },
      { property: "og:description", content: "Security Center workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SecurityCenterPage,
});

function sevBadge(s: string | null) {
  switch (s) {
    case "critical": return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300";
    case "error":    return "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300";
    case "warning":  return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
    default:         return "bg-muted text-muted-foreground";
  }
}

function SecurityCenterPage() {
  const qc = useQueryClient();
  const fnRole = useServerFn(getMyRole);
  const fn = useServerFn(getSecurityOverview);
  const usersListFn = useServerFn(listAllUsers);
  const toggleFn = useServerFn(toggleUserBlocked);
  
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fnRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin"].includes(role);
  const isSuperAdmin = role === "super_admin";

  const { data } = useQuery({
    queryKey: ["security-center"],
    queryFn: () => fn(),
    enabled: allowed,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["security-users"],
    queryFn: () => usersListFn() as Promise<any[]>,
    enabled: allowed,
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; blocked: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["security-users"] });
      qc.invalidateQueries({ queryKey: ["security-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!roleQ.isLoading && !allowed) {
    return <div className="p-8 max-w-lg mx-auto"><Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Security Center is available to admins and super admins.</CardDescription></CardHeader></Card></div>;
  }

  if (roleQ.isLoading) return <CommandConsoleSkeleton />;

  // Calculate stats from allUsers data
  const totalUsers = allUsers.length;
  const adminsCount = allUsers.filter((u: any) => u.role === "admin").length;
  const pendingCount = allUsers.filter((u: any) => u.role === "pending").length;
  const blockedCount = allUsers.filter((u: any) => u.blocked).length;
  const recentIncidents = data?.totals?.recentIncidents ?? 0;
  
  const users = data?.users ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-6 w-6 text-primary" /> Security Center
        </h1>
        <p className="text-sm mt-1 text-muted-foreground">User access, privilege overview and recent security events.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Total users</div><div className="text-2xl font-bold">{totalUsers}</div></div><Users className="h-6 w-6 text-slate-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Admins</div><div className="text-2xl font-bold text-emerald-600">{adminsCount}</div></div><ShieldCheck className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Pending</div><div className="text-2xl font-bold text-amber-600">{pendingCount}</div></div><AlertTriangle className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Blocked</div><div className="text-2xl font-bold text-red-600">{blockedCount}</div></div><UserX className="h-6 w-6 text-red-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Incidents</div><div className="text-2xl font-bold">{recentIncidents}</div></div><ShieldAlert className="h-6 w-6 text-red-600" /></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User access</CardTitle><CardDescription>Roles and blocked accounts - manage user access</CardDescription></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {allUsers.map((u: any) => (
                <div key={u.id} className="p-3 flex items-center justify-between text-sm gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{u.name ?? "Unnamed User"}</div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {u.blocked && <Badge className="bg-red-100 text-red-800 text-[10px]">blocked</Badge>}
                    <Badge variant="outline" className="text-[10px]">{u.role?.replace("_", " ") ?? "pending"}</Badge>
                  </div>
                  <Button 
                    size="sm" 
                    variant={u.blocked ? "default" : "outline"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                    className={u.blocked ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7" : "text-red-600 hover:bg-red-50 border-red-200 text-xs h-7"}
                  >
                    {u.blocked ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Unblock
                      </>
                    ) : (
                      <>
                        <ShieldOff className="h-3 w-3 mr-1" />
                        Block
                      </>
                    )}
                  </Button>
                </div>
              ))}
              {allUsers.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No users.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Security events</CardTitle><CardDescription>Recent warnings and errors from the audit log</CardDescription></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {logs.map((l: any) => (
                <div key={l.id} className="p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={sevBadge(l.severity) + " text-[10px] uppercase"}>{l.severity ?? "info"}</Badge>
                    <span className="font-medium">{l.action}</span>
                    {l.entity_type && <span className="text-xs text-slate-500">· {l.entity_type}</span>}
                  </div>
                  {l.message && <div className="text-xs text-slate-600 mt-1">{l.message}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{l.created_at ? new Date(l.created_at).toLocaleString() : ""}</div>
                </div>
              ))}
              {logs.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No recent events.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}