import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Package, Warehouse, OctagonAlert, CreditCard, DollarSign, ClipboardList, UserPlus, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboards/_shared";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform.functions";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/platform/")({ component: PlatformOverview });

function PlatformOverview() {
  const fn = useServerFn(getPlatformMetrics);
  const { data, isLoading } = useQuery({ queryKey: ["platform-metrics"], queryFn: () => fn() });
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const { data: widgets } = useQuery({ queryKey: ["platform-widgets"], queryFn: () => widgetsFn() });

  if (isLoading || !data) return <div className="p-6"><DashboardSkeleton /></div>;

  const maxCount = Math.max(1, ...(widgets?.signupsSeries.map((p) => p.count) ?? [1]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tenants" value={data.totalTenants} icon={Building2} accent="sky" />
        <StatCard label="Total Users" value={data.totalUsers} icon={Users} accent="violet" />
        <StatCard label="Active Subs" value={data.activeSubscriptions} icon={CreditCard} accent="emerald" />
        <StatCard label="MRR" value={`$${data.mrr.toLocaleString()}`} icon={DollarSign} accent="emerald" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Grain Batches" value={data.totalBatches} icon={Package} accent="amber" />
        <StatCard label="Silos" value={data.totalSilos} icon={Warehouse} accent="sky" />
        <StatCard label="Critical Alerts" value={data.criticalAlerts} icon={OctagonAlert} accent="rose" trend={`${data.totalAlerts} total`} />
        <StatCard label="Activity Logs" value={data.totalLogs} icon={ClipboardList} accent="violet" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Role distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.roleDistribution).map(([role, n]) => (
              <div key={role} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">{role}</div>
                <div className="text-lg font-bold text-slate-900">{n as number}</div>
              </div>
            ))}
            {data.blockedUsers > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
                <div className="text-[11px] uppercase tracking-widest text-red-600 font-semibold">Blocked</div>
                <div className="text-lg font-bold text-red-700">{data.blockedUsers}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" /> Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!widgets ? <div className="text-sm text-slate-400">Loading…</div> :
              widgets.recentSignups.length === 0 ? <div className="text-sm text-slate-400">No signups yet.</div> :
              <ul className="divide-y divide-slate-100">
                {widgets.recentSignups.map((s: any) => (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{s.name || s.email}</div>
                      <div className="text-xs text-slate-500 truncate">{s.email} · {s.business_type ?? "—"}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </div>
                  </li>
                ))}
              </ul>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!widgets ? <div className="text-sm text-slate-400">Loading…</div> :
              widgets.systemAlerts.length === 0 ? <div className="text-sm text-slate-400">No critical alerts.</div> :
              <ul className="divide-y divide-slate-100">
                {widgets.systemAlerts.map((a: any) => (
                  <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{a.alert_type ?? "Alert"}</div>
                      <div className="text-xs text-slate-500 truncate">{a.message ?? ""}</div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {a.severity}
                    </span>
                  </li>
                ))}
              </ul>
            }
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-600" /> Global Analytics — Signups (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!widgets ? <div className="text-sm text-slate-400">Loading…</div> :
            <div className="flex items-end gap-1 h-32">
              {widgets.signupsSeries.map((p: any) => (
                <div key={p.date} className="flex-1 group relative">
                  <div
                    className="bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t"
                    style={{ height: `${(p.count / maxCount) * 100}%`, minHeight: 2 }}
                    title={`${p.date}: ${p.count}`}
                  />
                </div>
              ))}
            </div>
          }
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{widgets?.signupsSeries[0]?.date}</span>
            <span>{widgets?.signupsSeries[widgets.signupsSeries.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}