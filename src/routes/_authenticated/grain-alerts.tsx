import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import {
  AlertTriangle, AlertCircle, Bell, Activity, CheckCircle, Clock,
  ArrowUpRight, Search, Plus, Eye, Trash2, Loader2, Inbox, Shield,
  History, RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import {
  listGrainAlerts, upsertGrainAlert, deleteGrainAlert, actionGrainAlert,
  listSilos, listWarehouses,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/grain-alerts")({
  component: GrainAlertsPage,
});

type Priority = "low" | "medium" | "high" | "critical";
type Status = "pending" | "acknowledged" | "resolved" | "escalated";

type Alert = {
  id: string; alert_id: string; title: string; message: string;
  priority: Priority; status: Status | null;
  source: string; alert_type: string | null;
  triggered_at: string | null; acknowledged_at: string | null; resolved_at: string | null;
  acknowledged_by: string | null; resolved_by: string | null;
  escalation_level: number | null;
  escalation_history: Array<{ level: number; escalated_to: string | null; escalated_by: string; escalated_at: string; reason: string | null }> | null;
  resolution: { type?: string; notes?: string; at?: string; by?: string } | null;
  trigger_conditions: { threshold_type?: string; threshold_value?: number; actual_value?: number } | null;
  tags: string[] | null;
  silo_id: string | null; warehouse_id: string | null; batch_id: string | null;
  silos?: { id: string; silo_id: string; name: string } | null;
  warehouses?: { id: string; name: string; warehouse_id: string } | null;
  grain_batches?: { id: string; batch_id: string; grain_type: string } | null;
};

const PRIO_STYLES: Record<Priority, { badge: string; icon: React.ComponentType<{ className?: string }>; border: string; bg: string }> = {
  critical: { badge: "bg-rose-500 text-white", icon: AlertTriangle, border: "border-rose-300", bg: "bg-rose-50 dark:bg-rose-950/30" },
  high:     { badge: "bg-orange-500 text-white", icon: AlertCircle,   border: "border-orange-300", bg: "bg-orange-50 dark:bg-orange-950/30" },
  medium:   { badge: "bg-amber-500 text-white",  icon: Bell,          border: "border-amber-300",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  low:      { badge: "bg-blue-500 text-white",   icon: Activity,      border: "border-blue-300",   bg: "bg-blue-50 dark:bg-blue-950/30" },
};

const STATUS_STYLES: Record<Status, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:      { badge: "bg-rose-100 text-rose-800 border-rose-200",       icon: AlertTriangle },
  acknowledged: { badge: "bg-amber-100 text-amber-800 border-amber-200",    icon: Clock },
  escalated:    { badge: "bg-orange-100 text-orange-800 border-orange-200", icon: ArrowUpRight },
  resolved:     { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
};

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Form = {
  id?: string; alert_id: string; title: string; message: string;
  priority: Priority; status: Status; source: string; alert_type: string;
  silo_id: string; warehouse_id: string; batch_id: string; tags: string;
};
const emptyForm: Form = {
  alert_id: "", title: "", message: "",
  priority: "medium", status: "pending", source: "manual", alert_type: "",
  silo_id: "", warehouse_id: "", batch_id: "", tags: "",
};

function GrainAlertsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listGrainAlerts);
  useRealtimeInvalidate("grain_alerts", [["grain-alerts"]]);
  const silosFn = useServerFn(listSilos);
  const whFn = useServerFn(listWarehouses);
  const saveFn = useServerFn(upsertGrainAlert);
  const delFn = useServerFn(deleteGrainAlert);
  const actFn = useServerFn(actionGrainAlert);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["grain-alerts"],
    queryFn: () => listFn() as Promise<Alert[]>,
    refetchInterval: 20000,
  });
  const { data: silos = [] } = useQuery({
    queryKey: ["silos"],
    queryFn: () => silosFn() as unknown as Promise<Array<{ id: string; silo_id: string; name: string }>>,
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => whFn() as unknown as Promise<Array<{ id: string; name: string; warehouse_id: string }>>,
  });

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [viewing, setViewing] = useState<Alert | null>(null);
  const [toDelete, setToDelete] = useState<Alert | null>(null);
  const [resolveOf, setResolveOf] = useState<Alert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [escalateOf, setEscalateOf] = useState<Alert | null>(null);
  const [escalateData, setEscalateData] = useState({ to: "", reason: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
      if (statusFilter === "active") {
        if (a.status === "resolved") return false;
      } else if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.alert_id.toLowerCase().includes(q) ||
        (a.silos?.name ?? "").toLowerCase().includes(q) ||
        (a.source ?? "").toLowerCase().includes(q)
      );
    });
  }, [alerts, query, priorityFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((a) => a.status !== "resolved");
    const critical = open.filter((a) => a.priority === "critical").length;
    const pending = alerts.filter((a) => a.status === "pending").length;
    const resolvedToday = alerts.filter((a) => {
      if (!a.resolved_at) return false;
      const d = new Date(a.resolved_at); const n = new Date();
      return d.toDateString() === n.toDateString();
    }).length;
    const responseMins = alerts
      .filter((a) => a.acknowledged_at && a.triggered_at)
      .map((a) => (new Date(a.acknowledged_at!).getTime() - new Date(a.triggered_at!).getTime()) / 60000)
      .filter((v) => v >= 0);
    const avg = responseMins.length ? Math.round(responseMins.reduce((s, v) => s + v, 0) / responseMins.length) : 0;
    const rate = total ? Math.round(((total - open.length) / total) * 100) : 0;
    return { total, open: open.length, critical, pending, resolvedToday, avg, rate };
  }, [alerts]);

  const save = useMutation({
    mutationFn: (p: unknown) => saveFn({ data: p } as never),
    onSuccess: () => {
      toast.success("Alert saved");
      qc.invalidateQueries({ queryKey: ["grain-alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDlgOpen(false); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Alert deleted");
      qc.invalidateQueries({ queryKey: ["grain-alerts"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const act = useMutation({
    mutationFn: (v: { id: string; action: "acknowledge"|"resolve"|"escalate"|"reopen"; notes?: string; resolution_type?: string; escalated_to?: string; reason?: string }) =>
      actFn({ data: v } as never),
    onSuccess: (_d, v) => {
      toast.success(`Alert ${v.action}d`);
      qc.invalidateQueries({ queryKey: ["grain-alerts"] });
      setResolveOf(null); setResolveNotes("");
      setEscalateOf(null); setEscalateData({ to: "", reason: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.alert_id || !form.title || !form.message) {
      toast.error("Alert ID, title and message are required"); return;
    }
    save.mutate({
      id: form.id,
      alert_id: form.alert_id, title: form.title, message: form.message,
      priority: form.priority, status: form.status, source: form.source,
      alert_type: form.alert_type || null,
      silo_id: form.silo_id || null,
      warehouse_id: form.warehouse_id || null,
      batch_id: form.batch_id || null,
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <PageHeader
          title="Grain Alerts"
          subtitle="Environmental thresholds, spoilage risks and safety events"
        />
        <Button size="sm" onClick={() => { setForm(emptyForm); setDlgOpen(true); }} className="gap-1.5 self-start md:self-auto">
          <Plus className="h-4 w-4" /> New Alert
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard tone="indigo" label="Total" value={stats.total} icon={<Bell className="h-4 w-4" />} />
        <StatCard tone="rose"   label="Open"  value={stats.open}  icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard tone="rose"   label="Critical" value={stats.critical} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard tone="amber"  label="Pending" value={stats.pending} icon={<Clock className="h-4 w-4" />} />
        <StatCard tone="emerald" label="Resolved Today" value={stats.resolvedToday} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard tone="blue"    label="Avg Response" value={stats.avg} suffix="m" icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, message, silo, source" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (unresolved)</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading alerts…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <div className="font-medium">No alerts match your filters</div>
          <div className="text-sm">All quiet in the silos.</div>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const P = PRIO_STYLES[a.priority];
            const S = STATUS_STYLES[(a.status ?? "pending") as Status];
            const PIcon = P.icon; const SIcon = S.icon;
            const isResolved = a.status === "resolved";
            return (
              <Card key={a.id} className={`border-l-4 ${P.border} ${P.bg}`}>
                <CardContent className="p-3 md:p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${P.badge} flex-shrink-0`}>
                      <PIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm md:text-base truncate">{a.title}</h3>
                        <Badge className={P.badge}>{a.priority}</Badge>
                        <Badge variant="outline" className={S.badge}>
                          <SIcon className="h-3 w-3 mr-1" /> {a.status ?? "pending"}
                        </Badge>
                        {a.escalation_level ? (
                          <Badge variant="outline" className="text-orange-700 border-orange-300">
                            L{a.escalation_level}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{a.alert_id}</span>
                        <span>· {a.source}</span>
                        {a.silos && <span>· 🏗 {a.silos.name}</span>}
                        {a.warehouses && <span>· 🏢 {a.warehouses.name}</span>}
                        {a.grain_batches && <span>· 🌾 {a.grain_batches.batch_id}</span>}
                        <span>· {timeAgo(a.triggered_at ?? null)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t">
                    {a.status === "pending" && (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={act.isPending}
                        onClick={() => act.mutate({ id: a.id, action: "acknowledge" })}>
                        <Clock className="h-3 w-3" /> Acknowledge
                      </Button>
                    )}
                    {!isResolved && (
                      <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { setResolveOf(a); setResolveNotes(""); }}>
                        <CheckCircle className="h-3 w-3" /> Resolve
                      </Button>
                    )}
                    {!isResolved && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={() => { setEscalateOf(a); setEscalateData({ to: "", reason: "" }); }}>
                        <ArrowUpRight className="h-3 w-3" /> Escalate
                      </Button>
                    )}
                    {isResolved && (
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => act.mutate({ id: a.id, action: "reopen" })}>
                        <RotateCcw className="h-3 w-3" /> Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5 ml-auto" onClick={() => setViewing(a)}>
                      <Eye className="h-3 w-3" /> Details
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setToDelete(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Alert" : "New Alert"}</DialogTitle>
            <DialogDescription>Manually raise or edit a grain alert.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Alert ID *</Label><Input value={form.alert_id} onChange={(e) => setForm({ ...form, alert_id: e.target.value })} placeholder="ALT-001" /></div>
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: Priority) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["critical","high","medium","low"] as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pending","acknowledged","escalated","resolved"] as Status[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["sensor","ai","system","manual","batch","user"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Alert Type</Label><Input value={form.alert_type} onChange={(e) => setForm({ ...form, alert_type: e.target.value })} placeholder="temperature_high" /></div>
            <div>
              <Label>Warehouse</Label>
              <Select value={form.warehouse_id || "none"} onValueChange={(v) => setForm({ ...form, warehouse_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Silo</Label>
              <Select value={form.silo_id || "none"} onValueChange={(v) => setForm({ ...form, silo_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {silos.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!resolveOf} onOpenChange={(o) => !o && setResolveOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve alert</DialogTitle>
            <DialogDescription>{resolveOf?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Resolution notes</Label>
            <Textarea rows={4} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="What was done?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOf(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => resolveOf && act.mutate({ id: resolveOf.id, action: "resolve", notes: resolveNotes, resolution_type: "manual" })}>
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate dialog */}
      <Dialog open={!!escalateOf} onOpenChange={(o) => !o && setEscalateOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate alert</DialogTitle>
            <DialogDescription>{escalateOf?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Escalate to</Label><Input value={escalateData.to} onChange={(e) => setEscalateData({ ...escalateData, to: e.target.value })} placeholder="Manager, on-call, etc." /></div>
            <div><Label>Reason</Label><Textarea rows={3} value={escalateData.reason} onChange={(e) => setEscalateData({ ...escalateData, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOf(null)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700"
              onClick={() => escalateOf && act.mutate({ id: escalateOf.id, action: "escalate", escalated_to: escalateData.to, reason: escalateData.reason })}>
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> {viewing.title}
                </DialogTitle>
                <DialogDescription>{viewing.alert_id} · {viewing.source}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{viewing.message}</p>
                <Row label="Priority" val={<Badge className={PRIO_STYLES[viewing.priority].badge}>{viewing.priority}</Badge>} />
                <Row label="Status" val={viewing.status ?? "pending"} />
                <Row label="Type" val={viewing.alert_type ?? "—"} />
                <Row label="Triggered" val={viewing.triggered_at ? new Date(viewing.triggered_at).toLocaleString() : "—"} />
                <Row label="Acknowledged" val={viewing.acknowledged_at ? new Date(viewing.acknowledged_at).toLocaleString() : "—"} />
                <Row label="Resolved" val={viewing.resolved_at ? new Date(viewing.resolved_at).toLocaleString() : "—"} />
                <Row label="Silo" val={viewing.silos?.name ?? "—"} />
                <Row label="Warehouse" val={viewing.warehouses?.name ?? "—"} />
                <Row label="Batch" val={viewing.grain_batches?.batch_id ?? "—"} />
                {viewing.trigger_conditions && (
                  <div className="p-2 rounded border bg-muted/30 text-xs">
                    <div className="font-medium mb-1">Trigger</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(viewing.trigger_conditions, null, 2)}</pre>
                  </div>
                )}
                {viewing.resolution && (
                  <div className="p-2 rounded border bg-emerald-50 dark:bg-emerald-950/30 text-xs">
                    <div className="font-medium mb-1">Resolution</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(viewing.resolution, null, 2)}</pre>
                  </div>
                )}
                {viewing.escalation_history && viewing.escalation_history.length > 0 && (
                  <div className="p-2 rounded border bg-orange-50 dark:bg-orange-950/30 text-xs">
                    <div className="font-medium mb-1 flex items-center gap-1"><History className="h-3 w-3" /> Escalations</div>
                    <ul className="space-y-1">
                      {viewing.escalation_history.map((e, i) => (
                        <li key={i}>L{e.level} → {e.escalated_to ?? "—"} · {new Date(e.escalated_at).toLocaleString()}{e.reason ? ` — ${e.reason}` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete alert?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes <strong>{toDelete?.title}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon, tone, suffix }: { label: string; value: number; icon: React.ReactNode; tone: "indigo"|"emerald"|"blue"|"rose"|"amber"; suffix?: string }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-200/60",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-200/60",
  };
  return (
    <div className={`rounded-xl border p-3 bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider font-medium opacity-80">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold mt-1">{value}{suffix ?? ""}</div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm">{val}</span>
    </div>
  );
}