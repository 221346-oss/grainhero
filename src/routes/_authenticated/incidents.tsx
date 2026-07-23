import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertOctagon, Search, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { getIncidents, acknowledgeIncident, getPlatformIncidentsOverview } from "@/lib/monitoring.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";

export const Route = createFileRoute("/_authenticated/incidents")({
  component: IncidentsPage,
});

function priBadge(p: string) {
  return p === "critical" ? "bg-red-100 text-red-800 border-red-200" :
    p === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
      "bg-slate-100 text-slate-700 border-slate-200";
}
function statusBadge(s: string | null) {
  return s === "resolved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
    s === "acknowledged" ? "bg-blue-100 text-blue-800 border-blue-200" :
      "bg-amber-100 text-amber-800 border-amber-200";
}
function fmtMin(m: number) { return m > 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`; }

function IncidentsPage() {
  const { isSuperAdmin } = useIsSuperAdmin();
  if (isSuperAdmin) return <PlatformIncidentsView />;
  return <TenantIncidentsView />;
}

function TenantIncidentsView() {
  const fn = useServerFn(getIncidents);
  const ackFn = useServerFn(acknowledgeIncident);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: () => fn(), refetchInterval: 30_000 });
  useRealtimeInvalidate("grain_alerts", [["incidents"]]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const ackM = useMutation({
    mutationFn: (args: { id: string; resolve?: boolean }) => ackFn({ data: args }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["incidents"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const incidents = data?.incidents ?? [];
  const totals = data?.totals ?? { total: 0, open: 0, resolved: 0, acknowledged: 0 };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return incidents.filter((i: any) => {
      if (status !== "all" && (i.status ?? "open") !== status) return false;
      if (!term) return true;
      return i.title?.toLowerCase().includes(term) || i.alert_id?.toLowerCase().includes(term) || i.message?.toLowerCase().includes(term);
    });
  }, [incidents, q, status]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-red-600" /> Incidents</h1>
        <p className="text-sm text-slate-500 mt-1">Critical and high-priority alerts requiring attention.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Total</div><div className="text-2xl font-bold">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Open</div><div className="text-2xl font-bold text-red-600">{totals.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Acknowledged</div><div className="text-2xl font-bold text-blue-600">{totals.acknowledged}</div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Clock className="h-5 w-5 text-slate-500" /><div><div className="text-xs uppercase text-slate-500 font-semibold">MTTA</div><div className="text-xl font-bold">{fmtMin(data?.mtta ?? 0)}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-slate-500" /><div><div className="text-xs uppercase text-slate-500 font-semibold">MTTR</div><div className="text-xl font-bold">{fmtMin(data?.mttr ?? 0)}</div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div><CardTitle>Incident list</CardTitle><CardDescription>{filtered.length} of {incidents.length}</CardDescription></div>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 w-56" /></div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((i: any) => (
              <div key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{i.title}</span>
                    <Badge className={priBadge(i.priority) + " text-[10px] uppercase"}>{i.priority}</Badge>
                    <Badge className={statusBadge(i.status) + " text-[10px]"}>{i.status ?? "open"}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{i.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{i.alert_id} · {i.triggered_at ? new Date(i.triggered_at).toLocaleString() : "—"}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                    {!i.acknowledged_at && (
                      <Button size="sm" variant="outline" onClick={() => ackM.mutate({ id: i.id })} disabled={ackM.isPending}>Acknowledge</Button>
                    )}
                    {!i.resolved_at && (
                      <Button size="sm" onClick={() => ackM.mutate({ id: i.id, resolve: true })} disabled={ackM.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                      </Button>
                    )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No incidents match.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformIncidentsView() {
  const fn = useServerFn(getPlatformIncidentsOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-incidents"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
  const totals = data?.totals ?? { total: 0, open: 0, resolved: 0, acknowledged: 0 };
  const tenants = data?.tenants ?? [];
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PlatformScopeBanner label="Aggregate incident volume across every tenant. Read-only — no acknowledge or resolve." />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-red-600" /> Platform incidents</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-tenant alert load — worst offenders first.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Total</div><div className="text-2xl font-bold">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Open</div><div className="text-2xl font-bold text-red-600">{totals.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Acknowledged</div><div className="text-2xl font-bold text-blue-600">{totals.acknowledged}</div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Clock className="h-5 w-5 text-slate-500" /><div><div className="text-xs uppercase text-slate-500 font-semibold">MTTA</div><div className="text-xl font-bold">{fmtMin(data?.mtta ?? 0)}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-slate-500" /><div><div className="text-xs uppercase text-slate-500 font-semibold">MTTR</div><div className="text-xl font-bold">{fmtMin(data?.mttr ?? 0)}</div></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Worst-offender tenants</CardTitle><CardDescription>Ranked by open incidents, then critical severity.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">Failed to load: {(error as Error).message}</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No incidents across the platform.</div>
          ) : (
            <div className="divide-y">
              {tenants.map((t) => (
                <div key={t.adminId} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{t.tenantName}</div>
                    <div className="text-xs text-slate-500">Last triggered: {t.lastTriggeredAt ? new Date(t.lastTriggeredAt).toLocaleString() : "—"}</div>
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200">{t.open} open</Badge>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">{t.critical} critical</Badge>
                  <Badge variant="outline">{t.total} total</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}