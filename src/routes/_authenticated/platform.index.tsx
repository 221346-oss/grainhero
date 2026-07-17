import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/platform/")({
  component: PlatformOverviewPage,
});

function PlatformOverviewPage() {
  const fetchMetrics = useServerFn(getPlatformMetrics);
  const fetchWidgets = useServerFn(getPlatformOverviewWidgets);

  const metricsQ = useQuery({ queryKey: ["platform-metrics"], queryFn: () => fetchMetrics() });
  const widgetsQ = useQuery({ queryKey: ["platform-widgets"], queryFn: () => fetchWidgets() });

  const m = metricsQ.data;
  const w = widgetsQ.data;

  const tiles = [
    { key: "tenants", label: "Tenants", value: m?.totalTenants ?? "—" },
    { key: "users", label: "Total users", value: m?.totalUsers ?? "—" },
    { key: "mrr", label: "MRR", value: m ? `$${Math.round(m.mrr).toLocaleString()}` : "—" },
    { key: "subs", label: "Active subs", value: m?.activeSubscriptions ?? "—" },
    { key: "alerts", label: "Critical alerts", value: m?.criticalAlerts ?? "—" },
  ];

  return (
    <AdminPageShell
      title="Platform overview"
      subtitle="Tenants, revenue, and health across every account."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to="/platform/plans" className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Plans
          </Link>
          <Link to="/platform/tenants" className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Tenants
          </Link>
          <Link to="/platform/health" className="text-sm px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Health
          </Link>
        </div>
      }
    >
      <AdminSummaryTiles tiles={tiles} columns={5} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminDataCard
          title="Recent signups"
          description={w ? `${w.signupsTotal} in last 30 days · ${w.wowDelta >= 0 ? "+" : ""}${w.wowDelta}% WoW` : "Loading…"}
          maxHeight="max-h-[360px]"
        >
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-2 py-2 font-medium">Business</th>
                <th className="text-left px-2 py-2 font-medium">Plan</th>
                <th className="text-right px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(w?.recentSignups ?? []).map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900 truncate max-w-[180px]">{s.name ?? "—"}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{s.email}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{s.business_type ?? "—"}</td>
                  <td className="px-2 py-2">
                    <Badge variant="outline" className="text-slate-600">{s.subscription_plan ?? "starter"}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {(!w || w.recentSignups.length === 0) && (
                <tr><td colSpan={4} className="text-center text-slate-400 py-8">No recent signups</td></tr>
              )}
            </tbody>
          </table>
        </AdminDataCard>

        <AdminDataCard
          title="System alerts"
          description={m ? `${m.criticalAlerts} critical of ${m.totalAlerts} total` : "Loading…"}
          maxHeight="max-h-[360px]"
        >
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Alert</th>
                <th className="text-left px-2 py-2 font-medium">Priority</th>
                <th className="text-right px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(w?.systemAlerts ?? []).map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900 truncate max-w-[240px]">{a.alert_type}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[240px]">{a.message}</div>
                  </td>
                  <td className="px-2 py-2">
                    <Badge
                      variant="outline"
                      className={a.priority === "critical" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}
                    >
                      {a.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {(!w || w.systemAlerts.length === 0) && (
                <tr><td colSpan={3} className="text-center text-slate-400 py-8">No system alerts</td></tr>
              )}
            </tbody>
          </table>
        </AdminDataCard>
      </div>
    </AdminPageShell>
  );
}