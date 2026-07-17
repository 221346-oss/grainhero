import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const revenueFn = useServerFn(getSaasRevenueAnalytics);

  const { data: m, isLoading: loadingMetrics } = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => metricsFn(),
    refetchInterval: 30000
  });
  const { data: w } = useQuery({ queryKey: ["platform-widgets"], queryFn: () => widgetsFn() });
  const { data: revenueData } = useQuery({
    queryKey: ["saas-revenue-dashboard"],
    queryFn: () => revenueFn()
  });

  const usersGrowth = w?.wowDelta ?? 0;

  return (
    <AdminPageShell
      title={`Super admin${name ? ` — ${name}` : ""}`}
      subtitle="Platform management console"
      actions={usersGrowth !== 0 ? (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {usersGrowth > 0 ? "+" : ""}{usersGrowth}% growth
        </Badge>
      ) : undefined}
    >
      <AdminSummaryTiles
        columns={5}
        tiles={[
          { key: "t", label: "Tenants", value: m?.totalTenants ?? 0 },
          { key: "u", label: "Users", value: m?.totalUsers ?? 0 },
          { key: "s", label: "Active subs", value: m?.activeSubscriptions ?? 0 },
          { key: "mrr", label: "MRR", value: `PKR ${((m as any)?.mrr ?? 0).toLocaleString()}` },
          { key: "ca", label: "Critical alerts", value: m?.criticalAlerts ?? 0 },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-800">User signups (30d)</CardTitle>
          </CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {w?.signupsSeries && w.signupsSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={w.signupsSeries}>
                  <defs>
                    <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 6, color: "white", fontSize: 11 }} />
                  <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#userGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-800">Revenue by plan</CardTitle></CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {revenueData?.planSeries && revenueData.planSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.planSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                  <XAxis dataKey="plan" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 6, color: "white", fontSize: 11 }} />
                  <Bar dataKey="mrr" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-800">Revenue trend (12m)</CardTitle></CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {revenueData?.revenueSeries && revenueData.revenueSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData.revenueSeries}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 6, color: "white", fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#revenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Platform sections</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { to: "/platform/tenants", label: "Tenants", value: m?.totalTenants ?? "—" },
            { to: "/platform/users", label: "Users", value: m?.totalUsers ?? "—" },
            { to: "/platform/pipeline", label: "Pipeline", value: "—" },
            { to: "/platform/leads", label: "Leads", value: "—" },
            { to: "/platform/health", label: "System health", value: "—" },
            { to: "/platform/audit-logs", label: "Audit logs", value: (m as any)?.totalLogs ?? "—" },
            { to: "/platform/orders", label: "Install orders", value: "—" },
            { to: "/revenue", label: "Revenue", value: m ? `PKR ${((m as any).mrr ?? 0).toLocaleString()}` : "—" },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-base font-bold text-slate-900">{item.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {w && (w as any).recentSignups && (w as any).recentSignups.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-800">Recent signups</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-slate-100">
              {((w as any).recentSignups || []).slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{s.name || s.email}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap ml-2">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminPageShell>
  );
}
