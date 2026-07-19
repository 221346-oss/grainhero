import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight } from "lucide-react";
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

function CardHeaderLink({ to, title, description, count }: { to: string; title: string; description: string; count?: number }) {
  return (
    <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
      <div className="min-w-0">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          {typeof count === "number" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono tabular-nums">{count}</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </div>
      <Link to={to} className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 text-xs font-medium">
        View <ArrowUpRight className="h-3 w-3" />
      </Link>
    </CardHeader>
  );
}

export function RecentBatchesCard() {
  const { data } = useExtras();
  const rows = data?.recentBatches ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-batches" title="Recent batches" description="Latest intake / dispatch" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No batches yet</p>}
        {rows.slice(0, 4).map((b) => (
          <Link key={b.id} to="/grain-batches" className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/50 hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-xs truncate">{b.batch_id}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1">{b.grain_type}</Badge>
                <Badge className={`text-[9px] h-4 px-1 ${riskColor(Number(b.risk_score ?? 0))}`}>risk {Number(b.risk_score ?? 0).toFixed(0)}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{Number(b.quantity_kg).toLocaleString()} kg · {b.status}</div>
            </div>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentAlertsCard() {
  const { data } = useExtras();
  const rows = data?.recentAlerts ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-alerts" title="Recent alerts" description="Latest grain alerts" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No open alerts 🎉</p>}
        {rows.slice(0, 4).map((a) => (
          <Link key={a.id} to="/grain-alerts" className="block px-2 py-1.5 rounded-md border border-border/50 hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`text-[9px] h-4 px-1 uppercase ${priorityColor(String(a.priority))}`}>{a.priority}</Badge>
              <span className="text-xs font-medium truncate">{a.title}</span>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{a.message}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function TeamCard() {
  const { data } = useExtras();
  const rows = data?.team ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/team-management" title="Team" description="Recent activity" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No members yet</p>}
        {rows.slice(0, 4).map((u) => (
          <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50">
            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-[10px] font-semibold shrink-0">{(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{u.name ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            </div>
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
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/actuators" title="Actuators" description="Live device state" count={rows.length} />
      <CardContent className="p-3 pt-0 grid gap-1.5 sm:grid-cols-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2 sm:col-span-2">No actuators yet</p>}
        {rows.map((a) => (
          <Link key={a.id} to="/actuators" className="flex items-center justify-between px-2 py-1.5 rounded-md border border-border/50 hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{a.actuator_type} · {a.silos?.name ?? "—"}</p>
            </div>
            <Badge className={`text-[9px] h-4 px-1.5 ${a.is_on ? "bg-emerald-500" : "bg-muted text-muted-foreground"}`}>{a.is_on ? `On ${a.power_level ?? 0}%` : "Off"}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function SilosOccupancyCard() {
  const { data } = useExtras();
  const rows = data?.silos ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/silos" title="Silo occupancy" description="Storage utilisation" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No silos yet</p>}
        {rows.slice(0, 5).map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          return (
            <Link key={s.id} to="/silos" className="block space-y-1 px-2 py-1.5 rounded-md hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
              <div className="flex justify-between text-xs">
                <span className="text-foreground truncate">{s.name} <span className="text-muted-foreground text-[10px]">({s.silo_id})</span></span>
                <span className="font-semibold tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">{occ.toLocaleString()} / {cap.toLocaleString()} kg · {s.status}</p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}