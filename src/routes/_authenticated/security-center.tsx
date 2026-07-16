import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, UserX, Users, AlertTriangle } from "lucide-react";
import { getSecurityOverview } from "@/lib/operations2.functions";
import { getMyRole } from "@/lib/roles.functions";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";

export const Route = createFileRoute("/_authenticated/security-center")({
  component: SecurityCenterPage,
});

function sevBadge(s: string | null) {
  switch (s) {
    case "critical": return "bg-red-100 text-red-800";
    case "error": return "bg-orange-100 text-orange-800";
    case "warning": return "bg-amber-100 text-amber-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function SecurityCenterPage() {
  const fnRole = useServerFn(getMyRole);
  const fn = useServerFn(getSecurityOverview);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fnRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin"].includes(role);
  const isSuperAdmin = role === "super_admin";

  const { data } = useQuery({
    queryKey: ["security-center"],
    queryFn: () => fn(),
    enabled: allowed,
  });

  if (!roleQ.isLoading && !allowed) {
    return <div className="p-8 max-w-lg mx-auto"><Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Security Center is available to admins and super admins.</CardDescription></CardHeader></Card></div>;
  }

  const totals = data?.totals ?? { users: 0, blocked: 0, admins: 0, pending: 0, recentIncidents: 0 };
  const users = data?.users ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Access and audit events across every tenant. Read-only." />
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-600" /> Security Center</h1>
        <p className="text-sm text-slate-500 mt-1">User access, privilege overview and recent security events.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Total users</div><div className="text-2xl font-bold">{totals.users}</div></div><Users className="h-6 w-6 text-slate-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Admins</div><div className="text-2xl font-bold text-emerald-600">{totals.admins}</div></div><ShieldCheck className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Pending</div><div className="text-2xl font-bold text-amber-600">{totals.pending}</div></div><AlertTriangle className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Blocked</div><div className="text-2xl font-bold text-red-600">{totals.blocked}</div></div><UserX className="h-6 w-6 text-red-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Incidents</div><div className="text-2xl font-bold">{totals.recentIncidents}</div></div><ShieldAlert className="h-6 w-6 text-red-600" /></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User access</CardTitle><CardDescription>Roles and blocked accounts</CardDescription></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {users.map((u: any) => (
                <div key={u.id} className="p-3 flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{u.name ?? u.email}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {u.blocked && <Badge className="bg-red-100 text-red-800 text-[10px]">blocked</Badge>}
                    {(u.roles.length ? u.roles : ["pending"]).map((r: string) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No users.</div>}
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