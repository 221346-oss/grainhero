import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformEnvironmentalOverview } from "@/lib/platform-monitoring.functions";
import { getPlatformIncidentsOverview } from "@/lib/monitoring.functions";
import { listMaintenanceRequests, updateMaintenanceRequest } from "@/lib/maintenance-requests.functions";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/platform/monitoring")({
  component: PlatformMonitoringPage,
});

const G = "#2FAC0C";
const MAINT_STATUSES = ["requested", "acknowledged", "in_progress", "completed", "cancelled"] as const;

function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

// ── Donut widget — no icons, just number + label ──────────────────────────────
function DonutStat({
  label, sub, value, total, color,
}: {
  label: string; sub: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [
    { v: value },
    { v: Math.max(0, total - value) },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col items-center gap-1">
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
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
          <span className="text-[9px] text-slate-400 mt-0.5">/ {total}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-700 text-center">{label}</p>
      <p className="text-[10px] text-slate-400">{sub} · {pct}%</p>
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
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
              fill={`url(#g${label.replace(/\s/g, "")})`} dot={false} />
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
  const bar = pct >= 80 ? G : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
      <span className="w-4 text-[9px] text-slate-400 tabular-nums shrink-0 text-right">{rank}</span>
      <p className="flex-1 text-xs text-slate-700 truncate min-w-0">{t.tenantName}</p>
      <div className="w-20 h-1 rounded-full bg-slate-100 overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bar }} />
      </div>
      <span className="w-7 text-[9px] tabular-nums text-right shrink-0" style={{ color: bar }}>{pct}%</span>
      <span className="w-12 text-[9px] text-slate-400 tabular-nums text-right shrink-0">
        {t.silos}s · {t.online}↑
        {t.offline > 0 && <span className="text-red-400"> {t.offline}↓</span>}
      </span>
    </div>
  );
}

function maintTone(s: string) {
  if (s === "completed")  return "bg-emerald-100 text-emerald-800";
  if (s === "cancelled")  return "bg-slate-100 text-slate-500";
  if (s === "in_progress") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}

// ── Page ──────────────────────────────────────────────────────────────────────
function PlatformMonitoringPage() {
  const qc = useQueryClient();
  const envFn      = useServerFn(getPlatformEnvironmentalOverview);
  const incFn      = useServerFn(getPlatformIncidentsOverview);
  const maintFn    = useServerFn(listMaintenanceRequests);
  const updateFn   = useServerFn(updateMaintenanceRequest);

  const envQ  = useQuery({ queryKey: ["platform-environmental"], queryFn: () => envFn(),  refetchInterval: 30_000 });
  const incQ  = useQuery({ queryKey: ["platform-incidents-all"], queryFn: () => incFn({ data: { scope: "all" } }), refetchInterval: 30_000 });
  const maintQ = useQuery({ queryKey: ["maintenance-requests"],  queryFn: () => maintFn(), refetchInterval: 30_000 });

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
      className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
    >
      Refresh
    </button>
  );

  if (envQ.isLoading || incQ.isLoading) {
    return (
      <AdminPageShell title="Monitoring" subtitle="Platform-wide health across every tenant" actions={actions}>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-36 rounded-lg" />)}</div>
          <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-20 rounded-lg" />)}</div>
          <div className="grid grid-cols-2 gap-3">   {[...Array(2)].map((_, i) => <Sk key={i} className="h-56 rounded-lg" />)}</div>
          <Sk className="h-40 rounded-lg" />
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Monitoring"
      subtitle="Platform-wide health — devices, incidents and maintenance across every tenant"
      actions={actions}
    >
      {/* ── 1. Donut status strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DonutStat
          label="Tenants Active"  sub="running"
          value={tenants.filter((t) => t.online > 0 || t.silos > 0).length}
          total={tenants.length || 1}  color={G}
        />
        <DonutStat
          label="Devices Live"   sub="online"
          value={totals?.online ?? 0}  total={totalDev || 1}  color="#0ea5e9"
        />
        <DonutStat
          label="Devices Down"   sub="offline"
          value={totals?.offline ?? 0} total={totalDev || 1}  color="#ef4444"
        />
        <DonutStat
          label="Open Incidents" sub="unresolved"
          value={incTotals?.open ?? 0} total={incTotals?.total || 1} color="#f59e0b"
        />
      </div>

      {/* ── 2. Spark trend row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SparkCard label="Total Silos"    value={totals?.silos ?? 0}    color={G}        data={sT} />
        <SparkCard label="Online"         value={totals?.online ?? 0}   color="#0ea5e9"  data={oT} />
        <SparkCard label="Offline"        value={totals?.offline ?? 0}  color="#ef4444"  data={dT} />
        <SparkCard label="Open Incidents" value={incTotals?.open ?? 0}  color="#f59e0b"  data={iT} />
      </div>

      {/* ── 3. Tenant health + Incidents side by side ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Tenant health */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenant Health</p>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FAC0C] inline-block" /> {totals?.online ?? 0} online
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {totals?.offline ?? 0} offline
              </span>
            </div>
          </div>

          {/* Donut + list side by side */}
          <div className="flex gap-0">
            {/* Mini donut */}
            <div className="w-24 shrink-0 flex items-center justify-center p-3 border-r border-slate-50">
              <ResponsiveContainer width={72} height={72}>
                <PieChart>
                  <Pie
                    data={[{ v: totals?.online ?? 0 }, { v: totals?.offline ?? 0 }]}
                    cx="50%" cy="50%"
                    innerRadius={22} outerRadius={32}
                    startAngle={90} endAngle={-270}
                    paddingAngle={2} dataKey="v" stroke="none"
                  >
                    <Cell fill={G} />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [v]}
                    contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0", borderRadius: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Tenant rows */}
            <div className="flex-1 overflow-y-auto max-h-52 min-w-0">
              {tenants.length === 0
                ? <p className="text-xs text-slate-400 text-center py-10">No tenants yet.</p>
                : tenants.slice(0, 10).map((t, i) => <TenantRow key={t.adminId} t={t} rank={i + 1} />)
              }
            </div>
          </div>
        </div>

        {/* Incidents by tenant */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Incidents by Tenant</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {incTotals
                ? `${incTotals.open} open · ${incTotals.total} total · MTTA ${Math.round(incQ.data?.mtta ?? 0)}m`
                : "—"}
            </p>
          </div>
          {/* Area chart */}
          {incByTenant.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <ResponsiveContainer width="100%" height={52}>
                <AreaChart
                  data={incByTenant.slice(0, 8).map((t) => ({
                    name: t.tenantName.slice(0, 5),
                    open: t.open,
                    crit: t.critical,
                  }))}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 10, border: "1px solid #e2e8f0", borderRadius: 4 }}
                    formatter={(v: number, n: string) => [v, n === "open" ? "Open" : "Critical"]}
                  />
                  <Area type="monotone" dataKey="open" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gOpen)" dot={false} />
                  <Area type="monotone" dataKey="crit" stroke="#ef4444" strokeWidth={1.5} fill="url(#gCrit)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Table */}
          <div className="overflow-y-auto max-h-36">
            {incByTenant.filter((t) => t.open > 0).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">All clear — no open incidents.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr className="text-[9px] text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-1.5 font-semibold">Tenant</th>
                    <th className="text-right px-2 py-1.5 font-semibold">Open</th>
                    <th className="text-right px-2 py-1.5 font-semibold">Critical</th>
                    <th className="text-right px-4 py-1.5 font-semibold">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {incByTenant.filter((t) => t.open > 0).map((t) => (
                    <tr key={t.adminId} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-1.5 text-xs text-slate-700 truncate max-w-[140px]">{t.tenantName}</td>
                      <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums text-amber-600">{t.open}</td>
                      <td className="px-2 py-1.5 text-right">
                        {t.critical > 0
                          ? <span className="text-xs font-bold tabular-nums text-red-500">{t.critical}</span>
                          : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-1.5 text-right text-[10px] text-slate-400 whitespace-nowrap">
                        {t.lastTriggeredAt ? new Date(t.lastTriggeredAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Maintenance requests ───────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Maintenance Requests</p>
          <span className="text-[10px] text-slate-400">{openMaint} open · {maints.length} total</span>
        </div>
        {maints.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No maintenance requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[9px] text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-semibold">Tenant</th>
                  <th className="text-left px-3 py-2 font-semibold">Title</th>
                  <th className="text-left px-3 py-2 font-semibold">Priority</th>
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-right px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {maints.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-medium text-slate-700 truncate max-w-[130px]">{r.tenantName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[180px]">{r.title}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="capitalize text-[9px] px-1.5 py-0">{r.priority}</Badge>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateMut.mutate({ id: r.id, status: v as typeof MAINT_STATUSES[number] })}
                      >
                        <SelectTrigger className={`h-6 w-[124px] text-[10px] border-0 font-medium ${maintTone(r.status)}`}>
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
      </div>

    </AdminPageShell>
  );
}
