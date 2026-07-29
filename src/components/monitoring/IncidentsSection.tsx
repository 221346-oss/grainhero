'use client';

import { useState } from "react";
import { Loader2, AlertOctagon, Megaphone, ArrowUpCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getIncidents, reportIncident, assignIncident, escalateIncident } from "@/lib/monitoring.functions";
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

export function IncidentsSection() {
  const getFn = useServerFn(getIncidents);
  const fetchRole = useServerFn(getMyRole);
  const listTeamFn = useServerFn(listTeamMembers);
  const assignFn = useServerFn(assignIncident);
  const escalateFn = useServerFn(escalateIncident);
  const qc = useQueryClient();
  const [dlgOpen, setDlgOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: () => getFn() });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canReport = me?.role === "technician";
  const canManage = me?.role === "manager" || me?.role === "admin";

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

  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-4">
      {canReport && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Spot something wrong on-site? Report it here.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setDlgOpen(true)}>
            <Megaphone className="w-3.5 h-3.5" /> Report incident
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No incidents reported.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(incidents as any[]).map((i) => (
            <div key={i.id} className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{i.title}</h3>
                    <Badge className={i.status !== "resolved" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}>{i.status}</Badge>
                    {i.status === "escalated" && (
                      <Badge className="bg-purple-500/20 text-purple-300 gap-1"><ArrowUpCircle className="w-3 h-3" /> Escalated to Super Admin</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{i.message}</p>
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3">
                    {i.triggered_at && <span>Triggered {new Date(i.triggered_at).toLocaleString()}</span>}
                    {i.reportedByName && <span>Reported by {i.reportedByName}</span>}
                    {i.assignedToName && <span>Assigned to {i.assignedToName}</span>}
                  </div>
                  {canManage && (
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
                          size="sm" variant="outline" className="h-7 text-xs gap-1 border-border text-muted-foreground hover:text-foreground"
                          disabled={escalateMut.isPending}
                          onClick={() => escalateMut.mutate(i.id)}
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportIncidentDialog open={dlgOpen} onOpenChange={setDlgOpen} />
    </div>
  );
}
