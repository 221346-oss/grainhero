import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPlatformMetrics,
  getPlatformOverviewWidgets,
  getPlatformApiHealth,
} from "@/lib/platform.functions";
import { listAllHardwareOrders } from "@/lib/hardware-orders.functions";
import { getDeviceHealth } from "@/lib/operations2.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  Activity, Database, CheckCircle2, AlertCircle, Loader2,
  ChevronRight,
} from "lucide-react";
import React from "react";

export const Route = createFileRoute("/_authenticated/platform/")({
  component: PlatformOverviewPage,
});

// ── Skeleton pulse ───────────────────────────────────────────────────────────
function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex justify-between"><Sk className="h-3 w-16" /><Sk className="h-4 w-4 rounded" /></div>
            <Sk className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Sk className="h-4 w-4 rounded-full" />
            <Sk className="h-3 w-28" />
            <Sk className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
            <Sk className="h-6 w-10" /><Sk className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0, 1].map((col) => (
          <div key={col} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
              <Sk className="h-3 w-28" /><Sk className="h-3 w-20" />
            </div>
            <div className="divide-y divide-slate-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-3.5 w-32" /><Sk className="h-2.5 w-24" />
                  </div>
                  <Sk className="h-5 w-14 rounded-full" /><Sk className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function Stat({
  label, value, icon, trend,
}: {
  label: string; value: string | number;
  icon?: React.ReactNode; trend?: "up" | "down";
}) {
  return (
    <div className="py-3 px-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">{value}</div>
        {trend === "up"   && <TrendingUp   className="w-4 h-4 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  );
}

// ── API health status pill ───────────────────────────────────────────────────
function HealthPill({
  label, status, latencyMs,
}: {
  label: string; status: "healthy" | "degraded" | "down"; latencyMs: number;
}) {
  const cfg = {
    healthy:  { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", badge: "Healthy"  },
    degraded: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     badge: "Slow"     },
    down:     { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 border-red-200",         badge: "Down"     },
  }[status];

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${cfg.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 tabular-nums">{latencyMs}ms</span>
        <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.badge}</span>
      </div>
    </div>
  );
}

// ── Main page component ──────────────────────────────────────────────────────
function PlatformOverviewPage() {
  const fetchMetrics  = useServerFn(getPlatformMetrics);
  const fetchWidgets  = useServerFn(getPlatformOverviewWidgets);
  const fetchOrders   = useServerFn(listAllHardwareOrders);
  const fetchHealth   = useServerFn(getDeviceHealth);
  const fetchApiHealth = useServerFn(getPlatformApiHealth);

  const metricsQ  = useQuery({ queryKey: ["platform-metrics"],  queryFn: () => fetchMetrics()  });
  const widgetsQ  = useQuery({ queryKey: ["platform-widgets"],  queryFn: () => fetchWidgets()  });
  const ordersQ   = useQuery({ queryKey: ["platform-hardware-orders"], queryFn: () => fetchOrders()  });
  const healthQ   = useQuery({
    queryKey: ["device-health"],
    queryFn:  () => fetchHealth(),
    refetchInterval: 30_000,
  });
  const apiHealthQ = useQuery({
    queryKey: ["platform-api-health"],
    queryFn:  () => fetchApiHealth(),
    refetchInterval: 60_000,
  });

  const navigate = useNavigate();

  const m = metricsQ.data;
  const w = widgetsQ.data;

  const orders = ordersQ.data?.orders ?? [];
  const totalOrdered = orders
    .filter((o: any) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + Number(o.hardware_quantity ?? 0), 0);
  const deployed  = healthQ.data?.totals?.total ?? 0;
  const remaining = Math.max(0, totalOrdered - deployed);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link to="/platform/plans"   className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Plans</Link>
      <Link to="/platform/tenants" className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Tenants</Link>
      <Link to="/platform/health"  className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Health</Link>
    </div>
  );

  if (metricsQ.isLoading || widgetsQ.isLoading) {
    return (
      <AdminPageShell title="Platform overview" subtitle="Tenants, revenue, devices, and health across every account" actions={actions}>
        <OverviewSkeleton />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Platform overview" subtitle="Tenants, revenue, devices, and health across every account" actions={actions}>

      {/* ── KPI strip — 6 tiles (added Total Silos) ────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="Tenants"       value={m?.totalTenants    ?? "—"} icon={<Users       className="w-4 h-4" />} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="Total users"   value={m?.totalUsers      ?? "—"} icon={<Users       className="w-4 h-4" />} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="Total silos"   value={m?.totalSilos      ?? "—"} icon={<Database    className="w-4 h-4" />} trend="up" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="MRR"           value={m ? `PKR ${Math.round(m.mrr).toLocaleString()}` : "—"} icon={<DollarSign  className="w-4 h-4" />} trend="up" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="Active subs"   value={m?.activeSubscriptions ?? "—"} icon={<Activity    className="w-4 h-4" />} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Stat label="Critical alerts" value={m?.criticalAlerts ?? "—"} icon={<AlertTriangle className="w-4 h-4" />}
            trend={m && m.criticalAlerts > 0 ? "down" : undefined} />
        </div>
      </div>

      {/* ── API Health panel ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {apiHealthQ.isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            ) : apiHealthQ.data?.overall === "healthy" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">API Health</span>
            {apiHealthQ.data?.checkedAt && (
              <span className="text-[10px] text-slate-400">
                checked {new Date(apiHealthQ.data.checkedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <Link to="/platform/health" className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1">
            Full report <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {apiHealthQ.isLoading && (
            <>
              <Sk className="h-10 rounded-lg" />
              <Sk className="h-10 rounded-lg" />
              <Sk className="h-10 rounded-lg" />
            </>
          )}
          {(apiHealthQ.data?.checks ?? []).map((c: any) => (
            <HealthPill key={c.label} label={c.label} status={c.status} latencyMs={c.latencyMs} />
          ))}
          {apiHealthQ.isError && (
            <div className="col-span-3 text-xs text-slate-400 text-center py-2">
              Health check unavailable
            </div>
          )}
        </div>
      </div>

      {/* ── IoT device fleet tiles ───────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { val: ordersQ.isLoading ? "—" : totalOrdered,                  label: "Devices sold",    cls: "text-slate-900" },
          { val: healthQ.isLoading ? "—" : deployed,                       label: "Deployed",        cls: "text-emerald-600" },
          { val: ordersQ.isLoading || healthQ.isLoading ? "—" : remaining, label: "Awaiting install", cls: "text-amber-600" },
          { val: healthQ.data?.totals?.online  ?? "—",                     label: "Live",            cls: "text-emerald-600" },
          { val: healthQ.data?.totals?.offline ?? "—",                     label: "Down",            cls: "text-red-600" },
          { val: healthQ.data?.totals?.lowBattery ?? "—",                  label: "Low battery",     cls: "text-amber-600" },
        ].map(({ val, label, cls }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className={`text-lg font-bold tabular-nums ${cls}`}>{val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Recent signups + System alerts ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent signups — click a row to see their team */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Recent signups</span>
            {w && (
              <span className="text-xs text-slate-400">
                {w.signupsTotal} in 30d ·{" "}
                <span className={w.wowDelta >= 0 ? "text-emerald-600" : "text-red-500"}>
                  {w.wowDelta >= 0 ? "+" : ""}{w.wowDelta}% WoW
                </span>
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Business</th>
                  <th className="text-left px-3 py-2 font-medium">Plan</th>
                  <th className="text-right px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(w?.recentSignups ?? []).map((s: any) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/60 cursor-pointer group"
                    onClick={() => navigate({ to: "/platform/tenants/$adminId", params: { adminId: s.id } })}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="font-medium text-slate-900 truncate max-w-[120px]">{s.name ?? "—"}</div>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{s.email}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{s.business_type ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-slate-600 text-[10px]">
                        {s.subscription_plan ?? "starter"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400 whitespace-nowrap">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {(!w || w.recentSignups.length === 0) && (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8 text-sm">No recent signups</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-50 text-[10px] text-slate-400">
            Click a row to view tenant details
          </div>
        </div>

        {/* System alerts */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">System alerts</span>
            {m && (
              <span className="text-xs text-slate-400">
                {m.criticalAlerts} critical of {m.totalAlerts} total
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Alert</th>
                  <th className="text-left px-3 py-2 font-medium">Priority</th>
                  <th className="text-right px-4 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(w?.systemAlerts ?? []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]">{a.alert_type}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{a.message}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={
                        a.priority === "critical"
                          ? "border-red-200 text-red-700 text-[10px]"
                          : "border-amber-200 text-amber-700 text-[10px]"
                      }>
                        {a.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400 whitespace-nowrap">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {(!w || w.systemAlerts.length === 0) && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400 py-8 text-sm">No system alerts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </AdminPageShell>
  );
}
