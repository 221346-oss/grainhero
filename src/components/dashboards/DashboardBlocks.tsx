import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Package, Users, Fan, Warehouse } from "lucide-react";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";

function useExtras() {
  const fn = useServerFn(getDashboardExtras);
  return useQuery({ queryKey: ["dashboard-extras"], queryFn: () => fn(), refetchInterval: 30_000 });
}

function riskColor(score: number) {
  if (score >= 70) return "bg-red-100 text-red-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function priorityColor(p: string) {
  return p === "critical"
    ? "bg-red-100 text-red-800"
    : p === "high"
      ? "bg-orange-100 text-orange-800"
      : p === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
}

export function RecentBatchesCard() {
  const { data } = useExtras();
  const rows = data?.recentBatches ?? [];
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-emerald-600" /> Recent Batches</CardTitle>
          <CardDescription>Latest 5 intake / dispatch</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/grain-batches">View all</Link></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No batches yet</p>}
        {rows.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 p-2 rounded-md border hover:bg-slate-50">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{b.batch_id}</span>
                <Badge variant="outline" className="text-[10px]">{b.grain_type}</Badge>
                <Badge className={`text-[10px] ${riskColor(Number(b.risk_score ?? 0))}`}>risk {Number(b.risk_score ?? 0).toFixed(0)}</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{Number(b.quantity_kg).toLocaleString()} kg · {b.status}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentAlertsCard() {
  const { data } = useExtras();
  const rows = data?.recentAlerts ?? [];
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" /> Recent Alerts</CardTitle>
          <CardDescription>Latest 5 grain alerts</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/grain-alerts">View all</Link></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No open alerts 🎉</p>}
        {rows.map((a) => (
          <div key={a.id} className="p-2 rounded-md border">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-[10px] uppercase ${priorityColor(String(a.priority))}`}>{a.priority}</Badge>
              <span className="text-sm font-medium truncate">{a.title}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.message}</p>
            <p className="text-[10px] text-slate-400 mt-1">{a.triggered_at ? new Date(a.triggered_at).toLocaleString() : ""}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TeamCard() {
  const { data } = useExtras();
  const rows = data?.team ?? [];
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-sky-600" /> Team</CardTitle>
          <CardDescription>Recent activity</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/team-management">Manage</Link></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No members yet</p>}
        {rows.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-2 rounded-md border">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-xs font-semibold">{(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{u.name ?? "—"}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            <span className="text-[10px] text-slate-400">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "never"}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ActuatorsCard() {
  const { data } = useExtras();
  const rows = data?.actuators ?? [];
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Fan className="h-4 w-4 text-indigo-600" /> Actuators</CardTitle>
          <CardDescription>Live device state</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/actuators">Control</Link></Button>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6 sm:col-span-2">No actuators yet</p>}
        {rows.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded-md border">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{a.name}</p>
              <p className="text-xs text-slate-500 truncate">{a.actuator_type} · {a.silos?.name ?? "—"}</p>
            </div>
            <Badge className={a.is_on ? "bg-emerald-500" : "bg-slate-200 text-slate-700"}>{a.is_on ? `On ${a.power_level ?? 0}%` : "Off"}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SilosOccupancyCard() {
  const { data } = useExtras();
  const rows = data?.silos ?? [];
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Warehouse className="h-4 w-4 text-amber-600" /> Silo Occupancy</CardTitle>
          <CardDescription>Storage utilisation</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/silos">Details</Link></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No silos yet</p>}
        {rows.map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          return (
            <div key={s.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 truncate">{s.name} <span className="text-slate-400 text-xs">({s.silo_id})</span></span>
                <span className="font-semibold text-slate-900">{pct}%</span>
              </div>
              <Progress value={pct} />
              <p className="text-[10px] text-slate-500">{occ.toLocaleString()} / {cap.toLocaleString()} kg · {s.status}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}