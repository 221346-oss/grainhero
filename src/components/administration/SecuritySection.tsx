import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, UserX, Users, AlertTriangle, ShieldOff, Mail } from "lucide-react";
import { getSecurityOverview } from "@/lib/operations2.functions";
import { getMyRole } from "@/lib/roles.functions";
import { listAllUsers, toggleUserBlocked } from "@/lib/platform-no-admin.functions";
import { toast } from "sonner";
import { HairlineGrid, NeonPanel, NEON } from "@/components/charts/neon";

function sevBadge(s: string | null) {
  switch (s) {
    case "critical": return "bg-severity-critical/15 text-severity-critical border-severity-critical/30";
    case "error": return "bg-severity-high/15 text-severity-high border-severity-high/30";
    case "warning": return "bg-warning/15 text-warning border-warning/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function SecuritySection() {
  const qc = useQueryClient();
  const fnRole = useServerFn(getMyRole);
  const fn = useServerFn(getSecurityOverview);
  const usersListFn = useServerFn(listAllUsers);
  const toggleFn = useServerFn(toggleUserBlocked);

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fnRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin"].includes(role);

  const { data } = useQuery({
    queryKey: ["security-center"],
    queryFn: () => fn(),
    enabled: allowed,
  });

  const { data: allUsers = [] } = useQuery({
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
    return <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Security Center is available to admins and super admins.</CardDescription></CardHeader></Card>;
  }

  // Calculate stats from allUsers data
  const totalUsers = allUsers.length;
  const adminsCount = allUsers.filter((u: any) => u.role === "admin").length;
  const pendingCount = allUsers.filter((u: any) => u.role === "pending").length;
  const blockedCount = allUsers.filter((u: any) => u.blocked).length;
  const recentIncidents = data?.totals?.recentIncidents ?? 0;
  const managerActions = data?.totals?.managerActions ?? 0;

  const logs = data?.logs ?? [];
  const managerActionLogs = data?.managerActionLogs ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">User access, privilege overview and recent security events.</p>

      {/* Stats - Neon hairline grid */}
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-5">
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-foreground">{totalUsers}</span>
        </div>
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admins</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-success">{adminsCount}</span>
        </div>
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pending</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-warning">{pendingCount}</span>
        </div>
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserX className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocked</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-severity-critical">{blockedCount}</span>
        </div>
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manager Actions</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-warning">{managerActions}</span>
        </div>
      </div>

      <HairlineGrid cols="grid-cols-1 lg:grid-cols-3">
        {/* User access */}
        <NeonPanel className="lg:col-span-2" title="User access" subtitle="Roles and blocked accounts - manage user access">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {allUsers.map((u: any) => (
                <div key={u.id} className="p-3 flex items-center justify-between text-sm gap-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">{u.name ?? "Unnamed User"}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {u.blocked && <Badge className="bg-severity-critical/15 text-severity-critical border-severity-critical/30 text-[10px]">blocked</Badge>}
                    <Badge variant="outline" className="text-[10px] capitalize">{u.role?.replace("_", " ") ?? "pending"}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={u.blocked ? "default" : "outline"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                    className={u.blocked ? "bg-success hover:bg-success/90 text-white text-xs h-7" : "text-severity-critical hover:bg-severity-critical/10 border-severity-critical/30 text-xs h-7"}
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
              {allUsers.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No users.</div>}
            </div>
          </div>
        </NeonPanel>

        {/* Manager actions */}
        <NeonPanel title="Manager actions" subtitle="Recent manager activity requiring oversight">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {managerActionLogs.map((l: any) => (
                <div key={l.id} className="p-3 text-sm hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] uppercase">Action</Badge>
                    <span className="font-medium text-foreground">{l.action?.replace(/_/g, " ")}</span>
                  </div>
                  {l.metadata && typeof l.metadata === "object" && (l.metadata as Record<string, any>).batchId && (
                    <div className="text-xs text-muted-foreground mt-1">Batch: <span className="font-mono font-medium">{(l.metadata as Record<string, any>).batchId}</span></div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">{l.created_at ? new Date(l.created_at).toLocaleString() : ""}</div>
                </div>
              ))}
              {managerActionLogs.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No manager actions.</div>}
            </div>
          </div>
        </NeonPanel>
      </HairlineGrid>

      {/* Security events */}
      <NeonPanel title="Security events" subtitle="Recent warnings and errors from the audit log">
        <div className="border border-border rounded-md overflow-hidden">
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {logs.map((l: any) => (
              <div key={l.id} className="p-3 text-sm hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={sevBadge(l.severity) + " text-[10px] uppercase border"}>{l.severity ?? "info"}</Badge>
                  <span className="font-medium text-foreground">{l.action}</span>
                  {l.entity_type && <span className="text-xs text-muted-foreground">· {l.entity_type}</span>}
                </div>
                {l.message && <div className="text-xs text-muted-foreground mt-1">{l.message}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{l.created_at ? new Date(l.created_at).toLocaleString() : ""}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No recent events.</div>}
          </div>
        </div>
      </NeonPanel>
    </div>
  );
}
