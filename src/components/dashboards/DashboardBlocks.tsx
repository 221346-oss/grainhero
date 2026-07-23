import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ChevronDown, AlertTriangle } from "lucide-react";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";

function useExtras() {
  const fn = useServerFn(getDashboardExtras);
  return useQuery({ queryKey: ["dashboard-extras"], queryFn: () => fn(), refetchInterval: 30_000 });
}

function riskColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function priorityDot(p: string) {
  return p === "critical"
    ? "bg-red-500"
    : p === "high"
      ? "bg-orange-500"
      : p === "medium"
        ? "bg-amber-500"
        : "bg-slate-400";
}

function CardHeaderLink({ to, search, title, count }: { to: string; search?: Record<string, string>; title: string; count?: number }) {
  return (
    <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm flex items-center gap-2">
        {title}
        {typeof count === "number" && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono tabular-nums">{count}</Badge>
        )}
      </CardTitle>
      <Link to={to} search={search as never} aria-label={`Open ${title}`} className="text-emerald-600 hover:text-emerald-700">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </CardHeader>
  );
}

/**
 * Compact "latest 3" batches widget. No scroll — rows past the 3rd are
 * rendered blurred (not just hidden) with an expand affordance underneath,
 * so it's clear more exist. Nothing here opens a popup: the header arrow,
 * the expand affordance, and every row are all real links to the full
 * Batches tab on /grain-operations.
 */
export function RecentBatchesCard() {
  const { data } = useExtras();
  const rows = data?.recentBatches ?? [];
  const visible = rows.slice(0, 3);
  const overflow = rows.slice(3);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "batches" }} title="Batches" count={rows.length} />
      <CardContent className="p-2 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground p-2">No batches</p>}
        <div className="divide-y divide-border/40">
          {visible.map((b) => (
            <Link key={b.id} to="/grain-operations" search={{ tab: "batches" }} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1.5 text-xs hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition rounded">
              <span className="font-medium truncate">{b.batch_id}</span>
              <span className="tabular-nums text-muted-foreground text-[11px]">{Number(b.quantity_kg).toLocaleString()}kg</span>
              <span className={`h-2 w-2 rounded-full ${riskColor(Number(b.risk_score ?? 0))}`} title={`risk ${Number(b.risk_score ?? 0).toFixed(0)}`} />
            </Link>
          ))}
        </div>
        {overflow.length > 0 && (
          <Link
            to="/grain-operations"
            search={{ tab: "batches" }}
            aria-label={`View all ${rows.length} batches`}
            className="relative mt-1 block"
          >
            <div className="divide-y divide-border/40 blur-[3px] opacity-50 pointer-events-none select-none">
              {overflow.map((b) => (
                <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1.5 text-xs">
                  <span className="font-medium truncate">{b.batch_id}</span>
                  <span className="tabular-nums text-muted-foreground text-[11px]">{Number(b.quantity_kg).toLocaleString()}kg</span>
                  <span className={`h-2 w-2 rounded-full ${riskColor(Number(b.risk_score ?? 0))}`} />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-card via-card/60 to-transparent">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 transition">
                <ChevronDown className="h-3 w-3" />
                {rows.length - 3} more
              </span>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentAlertsCard() {
  const { data } = useExtras();
  const rows = data?.recentAlerts ?? [];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeaderLink to="/grain-alerts" title="Alerts" count={rows.length} />
      <CardContent className="p-2 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground p-2">All clear</p>}
        <div className="divide-y divide-border/40">
          {rows.slice(0, 5).map((a) => (
            <Link key={a.id} to="/grain-alerts" search={{ priority: "all" }} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition rounded">
              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot(String(a.priority))}`} />
              <span className="truncate flex-1">{a.title}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamCard() {
  const { data } = useExtras();
  const rows = data?.team ?? [];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeaderLink to="/team-management" title="Team" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No members yet</p>}
        {rows.slice(0, 4).map((u) => (
          <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40">
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
    <Card className="border-0 shadow-sm">
      <CardHeaderLink to="/actuators" title="Actuators" count={rows.length} />
      <CardContent className="p-3 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No devices</p>}
        <div className="flex flex-wrap gap-1.5">
          {rows.map((a) => (
            <Link
              key={a.id}
              to="/actuators"
              title={`${a.name} · ${a.is_on ? `On ${a.power_level ?? 0}%` : "Off"}`}
              className={`h-3 w-3 rounded-full transition hover:scale-125 ${a.is_on ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
        {rows.length > 0 && (
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />on {rows.filter(r => r.is_on).length}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/30" />off {rows.filter(r => !r.is_on).length}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SilosOccupancyCard() {
  const { data } = useExtras();
  const rows = data?.silos ?? [];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "silos" }} title="Silos" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No silos</p>}
        {rows.slice(0, 6).map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
          return (
            <Link key={s.id} to="/grain-operations" search={{ tab: "silos" }} title={`${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg`} className="flex items-center gap-2 group">
              <span className="text-[11px] w-16 truncate text-muted-foreground group-hover:text-foreground transition">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${bar} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums font-semibold w-8 text-right">{pct}%</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Admin-dashboard-only variant of the silos widget: same compact fill bars,
 * but folds each silo's active alerts in inline instead of a separate
 * alerts card next to it. Kept as its own export (not a prop on
 * SilosOccupancyCard) so TechnicianDashboard's layout/behavior is
 * untouched — see AdminDashboard.tsx for the only place this is used.
 */
export function AdminSilosCard() {
  const { data } = useExtras();
  const rows = data?.silos ?? [];
  const alerts = data?.siloAlerts ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "silos" }} title="Silos" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No silos</p>}
        {rows.slice(0, 6).map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
          const siloAlerts = alerts.filter((a) => a.silo_id === s.id);
          const topAlert = siloAlerts.find((a) => a.priority === "critical") ?? siloAlerts[0];
          return (
            <Link
              key={s.id}
              to="/grain-operations"
              search={{ tab: "silos" }}
              title={topAlert ? `${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg · ${topAlert.title}` : `${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg`}
              className="flex items-center gap-2 group"
            >
              <span className="text-[11px] w-16 truncate text-muted-foreground group-hover:text-foreground transition">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${bar} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums font-semibold w-8 text-right">{pct}%</span>
              {siloAlerts.length > 0 && (
                <span className={`inline-flex items-center gap-0.5 shrink-0 ${topAlert?.priority === "critical" ? "text-red-600" : "text-amber-600"}`}>
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-semibold tabular-nums">{siloAlerts.length}</span>
                </span>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}