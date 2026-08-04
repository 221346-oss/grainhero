'use client';

import { useState } from "react";
import { Loader2, AlertOctagon, Megaphone, ArrowUpCircle, Flag, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getIncidents, reportIncident, assignIncident, escalateIncident } from "@/lib/monitoring.functions";
import { reportFieldIncident, closeFieldIncident } from "@/lib/field-incidents.functions";
import { listTeamMembers } from "@/lib/team-settings-insurance.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const emptyForm = { title: "", message: "", priority: "high" as const };
const emptyAdminForm = { title: "", description: "", recipientId: "" };

// Dialog for technician — uses reportIncident (manual source, high/critical)
function ReportIncidentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const reportFn = useServerFn(reportIncident);
  const [form, setForm] = useState(emptyForm);

  const mutation = useMutation({
    mutationFn: () => reportFn({ data: { title: form.title.trim(), message: form.message.trim(), priority: form.priority } }),
    onSuccess: () => {
      toast.success("Incident reported");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      setForm(emptyForm);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not report incident"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(emptyForm); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>Visible to your manager, who assigns it and can escalate to Super Admin.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 py-1" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required minLength={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>Severity</Label>
            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof form.priority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>What happened?</Label>
            <Textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required minLength={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || form.title.trim().length < 3 || form.message.trim().length < 3} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              {mutation.isPending ? "Reporting…" : "Report incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for admin/manager — uses reportFieldIncident (field_incident source, sent to a team member)
function ReportFieldIncidentDialog({
  open, onOpenChange, members,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; members: Array<{ id: string; name: string | null; email: string; role: string }>;
}) {
  const qc = useQueryClient();
  const reportFn = useServerFn(reportFieldIncident);
  const [form, setForm] = useState(emptyAdminForm);

  const mutation = useMutation({
    mutationFn: () => reportFn({ data: { title: form.title.trim(), description: form.description.trim(), recipientId: form.recipientId } }),
    onSuccess: () => {
      toast.success("Incident reported");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
      setForm(emptyAdminForm);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not report incident"),
  });

  const valid = form.title.trim().length >= 3 && form.description.trim().length >= 3 && !!form.recipientId;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(emptyAdminForm); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report a field incident</DialogTitle>
          <DialogDescription>Send to a team member — visible to everyone in your tenant.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 py-1" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required minLength={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>Assign to</Label>
            <Select value={form.recipientId} onValueChange={(v) => setForm((f) => ({ ...f, recipientId: v }))}>
              <SelectTrigger><SelectValue placeholder="Pick a team member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name ?? m.email} · {m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>What happened?</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required minLength={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !valid} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {mutation.isPending ? "Sending…" : "Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentsSection() {
  const getFn = useServerFn(getIncidents);
  const fetchRole = useServerFn(getMyRole);
  const listTeamFn = useServerFn(listTeamMembers);
  const assignFn = useServerFn(assignIncident);
  const escalateFn = useServerFn(escalateIncident);
  const closeFn = useServerFn(closeFieldIncident);
  const qc = useQueryClient();
  const [dlgOpen, setDlgOpen] = useState(false);
  const [adminDlgOpen, setAdminDlgOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: () => getFn() });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canReport = me?.role === "technician";
  const canManage = me?.role === "manager" || me?.role === "admin";
  const canReportAsAdmin = me?.role === "admin" || me?.role === "manager";

  const teamQ = useQuery({ queryKey: ["team-members"], queryFn: () => listTeamFn(), enabled: canManage });
  const technicians = ((teamQ.data ?? []) as Array<{ id: string; name: string | null; email: string; role: string }>)
    .filter((m) => m.role === "technician");

  const assignMut = useMutation({
    mutationFn: (v: { id: string; technicianId: string | null }) => assignFn({ data: v }),
    onSuccess: () => { toast.success("Assigned"); qc.invalidateQueries({ queryKey: ["incidents"] }); },
    onError: (e: Error) => toast.error(e.message || "Could not assign"),
  });
  const escalateMut = useMutation({
    mutationFn: (id: string) => escalateFn({ data: { id } }),
    onSuccess: () => { toast.success("Escalated to Super Admin"); qc.invalidateQueries({ queryKey: ["incidents"] }); },
    onError: (e: Error) => toast.error(e.message || "Could not escalate"),
  });
  const closeMut = useMutation({
    mutationFn: (id: string) => closeFn({ data: { id } }),
    onSuccess: () => { toast.success("Marked closed"); qc.invalidateQueries({ queryKey: ["incidents"] }); },
    onError: (e: Error) => toast.error(e.message || "Could not close"),
  });

  const incidents = data?.incidents ?? [];

  // Split for summary counts in header
  const systemCount = incidents.filter((i: any) => !i.isFieldIncident).length;
  const fieldCount  = incidents.filter((i: any) => i.isFieldIncident).length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {systemCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-500 font-medium">
              <AlertOctagon className="w-3.5 h-3.5" /> {systemCount} system alert{systemCount !== 1 ? "s" : ""}
            </span>
          )}
          {fieldCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
              <Flag className="w-3.5 h-3.5" /> {fieldCount} field incident{fieldCount !== 1 ? "s" : ""}
            </span>
          )}
          {incidents.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">No incidents reported yet.</p>
          )}
        </div>
        {canReport && (
          <Button size="sm" className="gap-1.5" onClick={() => setDlgOpen(true)}>
            <Megaphone className="w-3.5 h-3.5" /> Report incident
          </Button>
        )}
        {canReportAsAdmin && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdminDlgOpen(true)}>
            <Flag className="w-3.5 h-3.5" /> Report field incident
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-2">
          <AlertOctagon className="w-8 h-8 mx-auto opacity-20" />
          <p className="text-sm">No incidents reported.</p>
          {canReport && (
            <p className="text-xs">Use the button above to report a field incident.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(incidents as any[]).map((i) => (
            <div
              key={i.id}
              className={`border rounded-lg p-4 transition-colors ${
                i.isFieldIncident
                  ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {i.isFieldIncident
                  ? <Flag className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                  : <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{i.title}</h3>
                    {/* Type badge */}
                    <Badge className={i.isFieldIncident
                      ? "bg-amber-500/15 text-amber-600 border-0 text-[10px]"
                      : "bg-rose-500/15 text-rose-500 border-0 text-[10px]"
                    }>
                      {i.isFieldIncident ? "Field" : i.priority}
                    </Badge>
                    {/* Status badge */}
                    <Badge className={
                      i.status === "resolved" || i.status === "closed"
                        ? "bg-emerald-500/20 text-emerald-500 border-0"
                        : i.status === "escalated"
                          ? "bg-purple-500/20 text-purple-400 border-0"
                          : "bg-rose-500/20 text-rose-400 border-0"
                    }>
                      {i.status}
                    </Badge>
                    {i.status === "escalated" && (
                      <Badge className="bg-purple-500/20 text-purple-300 gap-1 border-0">
                        <ArrowUpCircle className="w-3 h-3" /> Escalated
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">{i.message}</p>

                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3">
                    {i.triggered_at && <span>{new Date(i.triggered_at).toLocaleString()}</span>}
                    {i.reportedByName && <span>From {i.reportedByName}</span>}
                    {i.isFieldIncident && i.recipientName && <span>To {i.recipientName}</span>}
                    {!i.isFieldIncident && i.assignedToName && <span>Assigned to {i.assignedToName}</span>}
                  </div>

                  {/* Actions for system alerts — manager/admin */}
                  {!i.isFieldIncident && canManage && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Select
                        value={i.assigned_to ?? "unassigned"}
                        onValueChange={(v) => assignMut.mutate({ id: i.id, technicianId: v === "unassigned" ? null : v })}
                      >
                        <SelectTrigger className="h-7 w-[180px] text-xs bg-muted/30 border-border text-foreground">
                          <SelectValue placeholder="Assign technician" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.name ?? t.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {i.status !== "escalated" && i.status !== "resolved" && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs gap-1 border-border text-muted-foreground hover:text-foreground"
                          disabled={escalateMut.isPending}
                          onClick={() => escalateMut.mutate(i.id)}
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Actions for field incidents — reporter or recipient can close */}
                  {i.isFieldIncident && i.status !== "closed" && i.status !== "resolved" && (i.isMine || i.isForMe) && (
                    <div className="mt-3">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        disabled={closeMut.isPending}
                        onClick={() => closeMut.mutate(i.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark closed
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportIncidentDialog open={dlgOpen} onOpenChange={setDlgOpen} />
      <ReportFieldIncidentDialog
        open={adminDlgOpen}
        onOpenChange={setAdminDlgOpen}
        members={(teamQ.data ?? []) as Array<{ id: string; name: string | null; email: string; role: string }>}
      />
    </div>
  );
}
