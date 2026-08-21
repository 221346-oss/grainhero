import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowActions, type RowAction } from "@/components/app/RowActions";
import {
  ShieldCheck,
  ShieldAlert,
  UserX,
  Users,
  AlertTriangle,
  ShieldOff,
  Mail,
  Eye,
  MessageSquareWarning,
  LogOut,
  KeyRound,
  UsersRound,
} from "lucide-react";
import { getSecurityOverview } from "@/lib/operations2.functions";
import { getMyRole } from "@/lib/roles.functions";
import { updateTeamMember } from "@/lib/team-settings-insurance.functions";
import {
  listTenantSecurityEvents,
  warnUserForSecurityEvent,
  logSecurityEvent,
} from "@/lib/security-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectOrigin } from "@/lib/app-url";
import { toast } from "sonner";
import { HairlineGrid, NeonPanel, NEON } from "@/components/charts/neon";

type TenantUser = {
  id: string;
  name: string | null;
  email: string | null;
  blocked: boolean;
  roles: string[];
};
type SecurityEvent = {
  id: string;
  user_id: string | null;
  event: string;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

function eventLabel(event: string): string {
  return event.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventSeverity(event: string): "critical" | "warning" | "info" {
  if (
    event === "role_escalation_attempt" ||
    event === "payment_mismatch" ||
    event === "unauthorized_access"
  )
    return "critical";
  if (
    event === "sign_in_failed" ||
    event === "batch_approval_override" ||
    event === "security_warning_issued"
  )
    return "warning";
  return "info";
}

function sevBadge(s: string) {
  switch (s) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function SecuritySection() {
  const qc = useQueryClient();
  const fnRole = useServerFn(getMyRole);
  const fnOverview = useServerFn(getSecurityOverview);
  const fnEvents = useServerFn(listTenantSecurityEvents);
  const updateFn = useServerFn(updateTeamMember);
  const warnFn = useServerFn(warnUserForSecurityEvent);
  const logFn = useServerFn(logSecurityEvent);

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fnRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin"].includes(role);

  const { data, error: overviewError } = useQuery({
    queryKey: ["security-center"],
    queryFn: () => fnOverview(),
    enabled: allowed,
  });
  const { data: eventsData } = useQuery({
    queryKey: ["security-events"],
    queryFn: () => fnEvents(),
    enabled: allowed,
  });

  const [viewEvent, setViewEvent] = useState<SecurityEvent | null>(null);
  const [quickAction, setQuickAction] = useState<
    null | "block-managers" | "force-logout" | "reset-password"
  >(null);
  const [pickedUserId, setPickedUserId] = useState<string>("");

  const toggle = useMutation({
    mutationFn: (v: { id: string; blocked: boolean }) => updateFn({ data: v }),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["security-center"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const warn = useMutation({
    mutationFn: (v: { userId: string; message: string }) => warnFn({ data: v }),
    onSuccess: () => {
      toast.success("Warning sent");
      qc.invalidateQueries({ queryKey: ["security-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blockAllManagers = useMutation({
    mutationFn: async () => {
      const managers = users.filter((u) => u.roles.includes("manager"));
      await Promise.all(managers.map((m) => updateFn({ data: { id: m.id, blocked: true } })));
      await logFn({ data: { event: "bulk_block_managers", meta: { count: managers.length } } });
      return managers.length;
    },
    onSuccess: (count) => {
      toast.success(`Blocked ${count} manager${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["security-center"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setQuickAction(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const forceLogout = useMutation({
    mutationFn: async (userId: string) => {
      await updateFn({ data: { id: userId, blocked: true } });
      await logFn({ data: { event: "force_logout_issued", meta: { targetUserId: userId } } });
    },
    onSuccess: () => {
      toast.success(
        "Account blocked — they'll be denied on their next request. Note: an already-open browser session stays valid until its token expires; there's no live session-revocation API in this Supabase project.",
      );
      qc.invalidateQueries({ queryKey: ["security-center"] });
      setQuickAction(null);
      setPickedUserId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      const target = users.find((u) => u.id === userId);
      if (!target?.email) throw new Error("User has no email on file");
      const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
        redirectTo: `${getAuthRedirectOrigin()}/auth/reset-password`,
      });
      if (error) throw error;
      await logFn({ data: { event: "password_reset_issued", meta: { targetUserId: userId } } });
    },
    onSuccess: () => {
      toast.success("Reset link emailed to the user");
      setQuickAction(null);
      setPickedUserId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!roleQ.isLoading && !allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            Security Center is available to admins and super admins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const users = (data?.users ?? []) as TenantUser[];
  const totalUsers = users.length;
  const adminsCount = users.filter(
    (u) => u.roles.includes("admin") || u.roles.includes("super_admin"),
  ).length;
  const pendingCount = users.filter(
    (u) => u.roles.length === 0 || u.roles.includes("pending"),
  ).length;
  const blockedCount = users.filter((u) => u.blocked).length;
  const events = (eventsData?.events ?? []) as SecurityEvent[];
  const recentIncidents = events.length;

  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          User access, privilege overview and real security events (sign-ins, unauthorized access,
          role changes, batch overrides, billing).
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setQuickAction("block-managers")}>
            <UsersRound className="h-3.5 w-3.5 mr-1.5" /> Block All Managers
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQuickAction("force-logout")}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Force Logout User
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQuickAction("reset-password")}>
            <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset Password
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Total users</div>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </div>
            <Users className="h-6 w-6 text-slate-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Admins</div>
              <div className="text-2xl font-bold text-emerald-600">{adminsCount}</div>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Pending</div>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Blocked</div>
              <div className="text-2xl font-bold text-red-600">{blockedCount}</div>
            </div>
            <UserX className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Security events</div>
              <div className="text-2xl font-bold">{recentIncidents}</div>
            </div>
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User access</CardTitle>
            <CardDescription>Roles and blocked accounts - manage user access</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {overviewError && (
              <div className="p-3 m-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                Couldn't load users: {(overviewError as Error).message}
              </div>
            )}
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="p-3 flex items-center justify-between text-sm gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">
                      {u.name ?? "Unnamed User"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {u.blocked && (
                      <Badge className="bg-red-100 text-red-800 text-[10px]">blocked</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {u.roles[0]?.replace("_", " ") ?? "pending"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={u.blocked ? "default" : "outline"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, blocked: !u.blocked })}
                    className={
                      u.blocked
                        ? "bg-success hover:bg-success/90 text-white text-xs h-7"
                        : "text-severity-critical hover:bg-severity-critical/10 border-severity-critical/30 text-xs h-7"
                    }
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
              {users.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">No users.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security events</CardTitle>
            <CardDescription>
              Real security_events feed — sign-ins, access denials, role &amp; batch overrides,
              billing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {events.map((ev) => {
                const target = ev.user_id ? userById.get(ev.user_id) : undefined;
                const sev = eventSeverity(ev.event);
                const actions: RowAction[] = [
                  { label: "View", icon: Eye, onClick: () => setViewEvent(ev) },
                  {
                    label: "Warn",
                    icon: MessageSquareWarning,
                    hidden: !ev.user_id,
                    onClick: () =>
                      ev.user_id &&
                      warn.mutate({
                        userId: ev.user_id,
                        message: `Security team flagged a "${eventLabel(ev.event)}" event on your account. Please review your recent activity.`,
                      }),
                  },
                  {
                    label: target?.blocked ? "Unblock" : "Block",
                    icon: ShieldOff,
                    hidden: !ev.user_id,
                    destructive: !target?.blocked,
                    onClick: () =>
                      ev.user_id && toggle.mutate({ id: ev.user_id, blocked: !target?.blocked }),
                  },
                ];
                return (
                  <div key={ev.id} className="p-3 text-sm flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={sevBadge(sev) + " text-[10px] uppercase"}>{sev}</Badge>
                        <span className="font-medium">{eventLabel(ev.event)}</span>
                        {target && (
                          <span className="text-xs text-slate-500">
                            · {target.name ?? target.email}
                          </span>
                        )}
                      </div>
                      {ev.ip && <div className="text-xs text-slate-600 mt-1">IP: {ev.ip}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(ev.created_at).toLocaleString()}
                      </div>
                    </div>
                    <RowActions actions={actions} visible={0} />
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No security events yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View — quick-view Sheet, per the side-panel convention (full raw event, not a confirmation) */}
      <Sheet open={!!viewEvent} onOpenChange={(o) => !o && setViewEvent(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{viewEvent ? eventLabel(viewEvent.event) : ""}</SheetTitle>
            <SheetDescription>
              {viewEvent ? new Date(viewEvent.created_at).toLocaleString() : ""}
            </SheetDescription>
          </SheetHeader>
          {viewEvent && (
            <div className="space-y-3 text-sm mt-4">
              {viewEvent.user_id && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground">User</div>
                  <div>
                    {userById.get(viewEvent.user_id)?.name ??
                      userById.get(viewEvent.user_id)?.email ??
                      viewEvent.user_id}
                  </div>
                </div>
              )}
              {viewEvent.ip && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground">IP</div>
                  <div>{viewEvent.ip}</div>
                </div>
              )}
              {viewEvent.user_agent && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground">User agent</div>
                  <div className="break-all text-xs">{viewEvent.user_agent}</div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase text-muted-foreground">Details</div>
                <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  {JSON.stringify(viewEvent.meta ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Quick actions — all 3 are confirmations, so Dialog, never Sheet */}
      <Dialog
        open={quickAction === "block-managers"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block all managers?</DialogTitle>
            <DialogDescription>
              This blocks every team member with the manager role (
              {users.filter((u) => u.roles.includes("manager")).length} user(s)). They can be
              unblocked individually afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={blockAllManagers.isPending}
              onClick={() => blockAllManagers.mutate()}
            >
              Block Managers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quickAction === "force-logout"}
        onOpenChange={(o) => {
          if (!o) {
            setQuickAction(null);
            setPickedUserId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force logout user</DialogTitle>
            <DialogDescription>
              There's no live session-revocation API available — this blocks the account so their
              next request is denied. An already-open browser tab stays signed in until its token
              expires naturally.
            </DialogDescription>
          </DialogHeader>
          <Select value={pickedUserId} onValueChange={setPickedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickAction(null);
                setPickedUserId("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!pickedUserId || forceLogout.isPending}
              onClick={() => forceLogout.mutate(pickedUserId)}
            >
              Force Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quickAction === "reset-password"}
        onOpenChange={(o) => {
          if (!o) {
            setQuickAction(null);
            setPickedUserId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send password reset</DialogTitle>
            <DialogDescription>
              Emails the selected user a secure reset link, same flow as the self-serve "Forgot
              password" page.
            </DialogDescription>
          </DialogHeader>
          <Select value={pickedUserId} onValueChange={setPickedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickAction(null);
                setPickedUserId("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!pickedUserId || resetPassword.isPending}
              onClick={() => resetPassword.mutate(pickedUserId)}
            >
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
