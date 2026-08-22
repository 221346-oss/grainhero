import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import React from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformEnvironmentalOverview } from "@/lib/platform-monitoring.functions";
import { getPlatformIncidentsOverview } from "@/lib/monitoring.functions";
import { listMaintenanceRequests, updateMaintenanceRequest } from "@/lib/maintenance-requests.functions";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, CartesianGrid,
} from "recharts";
import {
  NEON, NeonPatternDefs, useNeonCharts, neonFill, neonGrid, neonAxis, neonTooltipStyle, neonAnim,
  HairlineGrid, NeonPanel, ChartEmpty, toneColor,
} from "@/components/charts/neon";

export const Route = createFileRoute("/_authenticated/platform/monitoring")({
  head: () => ({
    meta: [
      { title: "Platform · Monitoring — Grain Hero" },
      { name: "description", content: "Platform · Monitoring workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Monitoring — Grain Hero" },
      { property: "og:description", content: "Platform · Monitoring workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformMonitoringPage,
});

const MAINT_STATUSES = ["requested", "acknowledged", "in_progress", "completed", "cancelled"] as const;

function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} style={style} />;
}

// ── Donut widget — no icons, just number + label ──────────────────────────────
function DonutStat({
  label, sub, value, total, color,
}: {
  label: string; sub: string; value: number; total: number; color: string;
}) {
  const { getFill } = useNeonCharts();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [
    { v: value },
    { v: Math.max(0, total - value) },
  ];
  return (
    <div className="rounded-xl bg-card/50 p-4 flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={32} outerRadius={44}
              startAngle={90} endAngle={-270}
              paddingAngle={3}
              dataKey="v"
              {...neonAnim}
            >
              <Cell {...getFill(color)} />
              <Cell {...getFill(NEON.neutral)} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">/ {total}</span>
        </div>
      </div>
      <p className="text-[13px] font-medium text-foreground text-center">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub} · {pct}%</p>
    </div>
  );
}

// ── Spark area card — no icons ────────────────────────────────────────────────
function SparkCard({
  label, value, color, data,
}: {
  label: string; value: number; color: string;
  data: Array<{ x: string; y: number }>;
}) {
  return (
    <div className="rounded-xl bg-card/50 p-3 flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-medium tabular-nums" style={{ color }}>{value}</span>
      <div className="h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.5}
              fill={`url(#g${label.replace(/\s/g, "")})`} dot={false} {...neonAnim} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Tenant health bar row ─────────────────────────────────────────────────────
function TenantRow({ t, rank }: { t: any; rank: number }) {
  const total = t.online + t.offline;
  const pct = total > 0 ? Math.round((t.online / total) * 100) : 100;
  const bar = pct >= 80 ? NEON.success : pct >= 50 ? NEON.warning : NEON.critical;
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <span className="w-4 text-[9px] text-muted-foreground tabular-nums shrink-0 text-right">{rank}</span>
      <p className="flex-1 text-[12px] text-foreground truncate min-w-0">{t.tenantName}</p>
      <div className="w-20 h-1 rounded-full bg-muted overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bar }} />
      </div>
      <span className="w-7 text-[9px] tabular-nums text-right shrink-0" style={{ color: bar }}>{pct}%</span>
      <span className="w-12 text-[9px] text-muted-foreground tabular-nums text-right shrink-0">
        {t.silos}s · {t.online}↑
        {t.offline > 0 && <span style={{ color: NEON.critical }}> {t.offline}↓</span>}
      </span>
    </div>
  );
}

function maintTone(s: string) {
  if (s === "completed")  return "bg-[var(--success)]/15 text-[var(--success)]";
  if (s === "cancelled")  return "bg-muted text-muted-foreground";
  if (s === "in_progress") return "bg-[var(--info)]/15 text-[var(--info)]";
  return "bg-[var(--warning)]/15 text-[var(--warning)]";
}

// ── Page ──────────────────────────────────────────────────────────────────────
function PlatformMonitoringPage() {
  const qc = useQueryClient();
  const envFn      = useServerFn(getPlatformEnvironmentalOverview);
  const incFn      = useServerFn(getPlatformIncidentsOverview);
  const maintFn    = useServerFn(listMaintenanceRequests);
  const updateFn   = useServerFn(updateMaintenanceRequest);

  const envQ  = useQuery({ queryKey: ["platform-environmental"], queryFn: () => envFn(),  staleTime: 30_000, refetchInterval: 30_000 });
  const incQ  = useQuery({ queryKey: ["platform-incidents-all"], queryFn: () => incFn({ data: { scope: "all" } }), staleTime: 30_000, refetchInterval: 30_000 });
  const maintQ = useQuery({ queryKey: ["maintenance-requests"],  queryFn: () => maintFn(), staleTime: 30_000, refetchInterval: 30_000 });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; status: typeof MAINT_STATUSES[number] }) => updateFn({ data: v }),
    onSuccess: (updated: any) => {
      toast.success("Status updated");
      qc.setQueryData(["maintenance-requests"], (old: any) =>
        old ? { requests: old.requests.map((r: any) => r.id === updated.id ? { ...r, ...updated } : r) } : old
      );
      qc.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals    = envQ.data?.totals;
  const tenants   = envQ.data?.tenants ?? [];
  const incTotals = incQ.data?.totals;
  const incByTenant = incQ.data?.tenants ?? [];
  const maints    = (maintQ.data?.requests ?? []) as any[];
  const openMaint = maints.filter((r) => !["completed", "cancelled"].includes(r.status)).length;
  const totalDev  = (totals?.online ?? 0) + (totals?.offline ?? 0);

  // Spark data: distribution across tenants
  const sT = tenants.slice(0, 10).map((t, i) => ({ x: String(i), y: t.silos }));
  const oT = tenants.slice(0, 10).map((t, i) => ({ x: String(i), y: t.online }));
  const dT = tenants.slice(0, 10).map((t, i) => ({ x: String(i), y: t.offline }));
  const iT = incByTenant.slice(0, 10).map((t, i) => ({ x: String(i), y: t.open }));

  const actions = (
    <button
      onClick={() => { envQ.refetch(); incQ.refetch(); maintQ.refetch(); }}
      className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
    >
      Refresh
    </button>
  );

  const monitoringLoading = envQ.isLoading || incQ.isLoading;

  return (
    <AdminPageShell
      title="Monitoring"
      subtitle="Platform-wide health — devices, incidents and maintenance across every tenant"
      actions={monitoringLoading ? undefined : actions}
    >
      {monitoringLoading ? (
        <div className="space-y-4">

          {/* ── Row 1: 4 donut stat cards — rounded, circle centre ──── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className="rounded-2xl bg-card/50 p-4 flex flex-col items-center gap-2 relative">
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                <Sk className="w-20 h-20 rounded-full" />
                <Sk className="h-[13px] w-24" />
                <Sk className="h-[11px] w-16" />
              </div>
            ))}
          </div>

          {/* ── Row 2: 4 spark trend cards ─────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className="rounded-2xl bg-card/50 p-4 flex flex-col gap-2 relative">
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                <Sk className="h-[10px] w-24" />
                <Sk className="h-8 w-14" />
                {/* mini sparkline bars */}
                <div className="flex items-end gap-0.5 h-8">
                  {[50,70,40,80,55,90,65,75].map((h, j) => (
                    <Sk key={j} className="flex-1" style={{ height: `${h}%` } as React.CSSProperties} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Row 3: tenant health + incidents panels ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Tenant health */}
            <div className="rounded-2xl bg-card/50 overflow-hidden">
              <div className="px-4 h-11 border-b border-border/40 flex items-center justify-between">
                <Sk className="h-[13px] w-28" />
                <div className="flex gap-3">
                  <Sk className="h-[10px] w-16" />
                  <Sk className="h-[10px] w-16" />
                </div>
              </div>
              <div className="flex">
                <div className="w-24 flex items-center justify-center p-4 border-r border-border shrink-0">
                  <Sk className="w-16 h-16 rounded-full" />
                </div>
                <div className="flex-1">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0">
                      <Sk className="h-[11px] w-4 shrink-0" />
                      <Sk className="h-[12px] flex-1" />
                      <Sk className="h-1.5 w-20 rounded-full shrink-0" />
                      <Sk className="h-[10px] w-6 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Incidents panel */}
            <div className="rounded-2xl bg-card/50 overflow-hidden">
              <div className="px-4 h-11 border-b border-border/40 flex items-center justify-between">
                <Sk className="h-[13px] w-40" />
                <Sk className="h-[11px] w-32" />
              </div>
              <div className="p-3">
                <Sk className="h-10 w-full rounded-lg" />
              </div>
              <div>
                {[0,1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0">
                    <Sk className="h-[13px] flex-1" />
                    <Sk className="h-[13px] w-8 shrink-0" />
                    <Sk className="h-[13px] w-8 shrink-0" />
                    <Sk className="h-5 w-16 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Row 4: maintenance table ───────────────────────────── */}
          <div className="rounded-2xl bg-card/50 overflow-hidden">
            <div className="px-4 h-11 border-b border-border/40 flex items-center justify-between">
              <Sk className="h-[13px] w-44" />
              <Sk className="h-[11px] w-28" />
            </div>
            <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30 flex gap-6">
              {[24, 36, 16, 14, 20].map((w, i) => (
                <Sk key={i} className={`h-[10px] w-${w}`} />
              ))}
            </div>
            {[0,1,2,3].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-5 border-b border-border/40 last:border-0">
                <Sk className="h-[13px] w-28" />
                <Sk className="h-[13px] w-36" />
                <Sk className="h-5 w-16 rounded-full" />
                <Sk className="h-[12px] w-20" />
                <div className="ml-auto flex gap-2">
                  <Sk className="h-7 w-16 rounded-md" />
                  <Sk className="h-7 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
      <>
      <NeonPatternDefs />

      {/* ── 1. Donut status strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DonutStat
          label="Tenants Active"  sub="running"
          value={tenants.filter((t) => t.online > 0 || t.silos > 0).length}
          total={tenants.length || 1}  color={NEON.brand}
        />
        <DonutStat
          label="Devices Live"   sub="online"
          value={totals?.online ?? 0}  total={totalDev || 1}  color={NEON.success}
        />
        <DonutStat
          label="Devices Down"   sub="offline"
          value={totals?.offline ?? 0} total={totalDev || 1}  color={NEON.critical}
        />
        <DonutStat
          label="Open Incidents" sub="unresolved"
          value={incTotals?.open ?? 0} total={incTotals?.total || 1} color={NEON.warning}
        />
      </div>

      {/* ── 2. Spark trend row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SparkCard label="Total Silos"    value={totals?.silos ?? 0}    color={NEON.brand}     data={sT} />
        <SparkCard label="Online"         value={totals?.online ?? 0}   color={NEON.success}   data={oT} />
        <SparkCard label="Offline"        value={totals?.offline ?? 0}  color={NEON.critical}  data={dT} />
        <SparkCard label="Open Incidents" value={incTotals?.open ?? 0}  color={NEON.warning}   data={iT} />
      </div>

      {/* ── 3. Tenant health + Incidents side by side ─────────────── */}
      <HairlineGrid cols="grid-cols-1 lg:grid-cols-2">
        {/* Tenant health */}
        <NeonPanel
          title="Tenant Health"
          action={
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: NEON.success }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: NEON.success }} /> {totals?.online ?? 0} online
              </span>
              <span className="flex items-center gap-1" style={{ color: NEON.critical }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: NEON.critical }} /> {totals?.offline ?? 0} offline
              </span>
            </div>
          }
          bodyClassName="flex gap-0 -m-4 mt-0"
        >
          <TenantHealthBody totals={totals} tenants={tenants} />
        </NeonPanel>

        {/* Incidents by tenant */}
        <NeonPanel
          title="Incidents by Tenant"
          subtitle={
            incTotals
              ? `${incTotals.open} open · ${incTotals.total} total · MTTA ${Math.round(incQ.data?.mtta ?? 0)}m`
              : "—"
          }
          bodyClassName="-m-4 mt-0"
        >
          <IncidentsBody incByTenant={incByTenant} />
        </NeonPanel>
      </HairlineGrid>

      {/* ── 4. Maintenance requests ───────────────────────────────── */}
      <NeonPanel
        title="Maintenance Requests"
        subtitle={`${openMaint} open · ${maints.length} total`}
        className="border border-border rounded-md"
      >
        {maints.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-8">No maintenance requests yet.</p>
        ) : (
          <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border/40 bg-muted/30">
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Tenant / Title</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Priority</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Date</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {maints.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground truncate max-w-[160px] sm:max-w-none">{r.tenantName ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[160px] sm:max-w-none">{r.title}</div>
                      {/* Mobile: show priority + date */}
                      <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                        <span className="capitalize px-1 py-0.5 rounded border border-border">{r.priority}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span className="capitalize text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{r.priority}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateMut.mutate({ id: r.id, status: v as typeof MAINT_STATUSES[number] })}
                      >
                        <SelectTrigger className={`h-6 w-[100px] sm:w-[124px] text-[10px] border-0 font-medium ${maintTone(r.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MAINT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeonPanel>
      </>
      )}
    </AdminPageShell>
  );
}

function TenantHealthBody({ totals, tenants }: { totals: any; tenants: any[] }) {
  const { getFill } = useNeonCharts();
  return (
    <>
      {/* Mini donut */}
      <div className="w-24 shrink-0 flex items-center justify-center p-3 border-r border-border">
        <ResponsiveContainer width={72} height={72}>
          <PieChart>
            <Pie
              data={[{ v: totals?.online ?? 0 }, { v: totals?.offline ?? 0 }]}
              cx="50%" cy="50%"
              innerRadius={22} outerRadius={32}
              startAngle={90} endAngle={-270}
              paddingAngle={2} dataKey="v"
              {...neonAnim}
            >
              <Cell {...getFill(NEON.success)} />
              <Cell {...getFill(NEON.critical)} />
            </Pie>
            <Tooltip {...neonTooltipStyle} formatter={(v: number) => [v]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Tenant rows */}
      <div className="flex-1 overflow-y-auto max-h-52 min-w-0">
        {tenants.length === 0
          ? <p className="text-[12px] text-muted-foreground text-center py-10">No tenants yet.</p>
          : tenants.slice(0, 10).map((t, i) => <TenantRow key={t.adminId} t={t} rank={i + 1} />)
        }
      </div>
    </>
  );
}

function IncidentsBody({ incByTenant }: { incByTenant: any[] }) {
  const chartData = incByTenant.slice(0, 8).map((t) => ({
    name: t.tenantName.slice(0, 5),
    open: t.open,
    crit: t.critical,
  }));
  return (
    <>
      {/* Area chart */}
      {incByTenant.length === 0 ? (
        <div className="px-3 pt-3"><ChartEmpty label="No incidents" height={52} /></div>
      ) : (
        <div className="px-3 pt-3 pb-1 h-[52px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEON.warning} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={NEON.warning} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEON.critical} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={NEON.critical} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...neonGrid} />
              <XAxis dataKey="name" {...neonAxis} tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} />
              <Tooltip
                {...neonTooltipStyle}
                formatter={(v: number, n: string) => [v, n === "open" ? "Open" : "Critical"]}
              />
              <Area type="monotone" dataKey="open" stroke={NEON.warning} strokeWidth={1.5} fill="url(#gOpen)" dot={false} {...neonAnim} />
              <Area type="monotone" dataKey="crit" stroke={NEON.critical} strokeWidth={1.5} fill="url(#gCrit)" dot={false} {...neonAnim} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Table */}
      <div className="overflow-y-auto max-h-36 border-t border-border/40 mt-2">
        {incByTenant.filter((t) => t.open > 0).length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">All clear — no open incidents.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-muted/30 border-b border-border/40">
              <tr>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">Tenant</th>
                <th className="text-right font-medium text-muted-foreground px-2 py-2">Open</th>
                <th className="text-right font-medium text-muted-foreground px-2 py-2">Critical</th>
                <th className="text-right font-medium text-muted-foreground px-3 py-2">Last</th>
              </tr>
            </thead>
            <tbody>
              {incByTenant.filter((t) => t.open > 0).map((t) => (
                <tr key={t.adminId} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-foreground truncate max-w-[140px]">{t.tenantName}</td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums" style={{ color: NEON.warning }}>{t.open}</td>
                  <td className="px-2 py-2 text-right">
                    {t.critical > 0
                      ? <span className="font-medium tabular-nums" style={{ color: NEON.critical }}>{t.critical}</span>
                      : <span className="text-[11px] text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                    {t.lastTriggeredAt ? new Date(t.lastTriggeredAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
