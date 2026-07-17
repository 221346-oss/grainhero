import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { cn } from "@/lib/utils";

function InsightTile({
  to, label, value, hint,
}: { to: string; label: string; value: string | number; hint?: string }) {
  return (
    <Link to={to} className="group block">
      <Card
        className={cn(
          "transition-all border-slate-200/70",
          "group-hover:border-emerald-400 group-hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_20px_-12px_rgba(16,185,129,0.25)]",
          "cursor-pointer",
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 leading-tight">{value}</div>
          {hint && <div className="text-[10px] text-emerald-600 mt-0.5">{hint}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

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
  const mrrValue = (m as any)?.mrr ?? 0;

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
      {/* Primary KPIs — each click deep-links to its insight page */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <InsightTile to="/platform/tenants" label="Tenants" value={m?.totalTenants ?? 0} />
        <InsightTile to="/platform/users" label="Users" value={m?.totalUsers ?? 0} />
        <InsightTile to="/platform/plans" label="Active subs" value={m?.activeSubscriptions ?? 0} />
        <InsightTile to="/revenue" label="MRR" value={`PKR ${mrrValue.toLocaleString()}`} hint="Live" />
        <InsightTile to="/platform/health" label="Critical alerts" value={m?.criticalAlerts ?? 0} />
      </div>

      {/* Charts — 3 up */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

        <Card className="md:col-span-2 xl:col-span-1">
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

      {/* Deep-link grid + recent signups side by side to reduce scroll */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <div>
          <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.15em] mb-2">Jump to insights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <InsightTile to="/platform/tenants" label="Tenants" value={m?.totalTenants ?? "—"} />
            <InsightTile to="/platform/users" label="Users" value={m?.totalUsers ?? "—"} />
            <InsightTile to="/platform/pipeline" label="Pipeline" value={(w as any)?.pipelineTotal ?? "—"} />
            <InsightTile to="/platform/leads" label="Leads" value={(w as any)?.leadsTotal ?? "—"} />
            <InsightTile to="/platform/health" label="Health" value={(m as any)?.totalAlerts ?? "—"} />
            <InsightTile to="/platform/audit-logs" label="Audit logs" value={(m as any)?.totalLogs ?? "—"} />
            <InsightTile to="/platform/orders" label="Install orders" value={(w as any)?.ordersTotal ?? "—"} />
            <InsightTile to="/revenue" label="Revenue" value={`PKR ${mrrValue.toLocaleString()}`} />
          </div>
        </div>

        {w && (w as any).recentSignups && (w as any).recentSignups.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-slate-800">Recent signups</CardTitle>
              <Link to="/platform/users" className="text-[11px] text-emerald-700 hover:underline">View all →</Link>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="divide-y divide-slate-100 max-h-[220px] overflow-auto">
                {((w as any).recentSignups || []).slice(0, 5).map((s: any) => (
                  <Link
                    key={s.id}
                    to="/platform/users"
                    className="flex items-center gap-2 py-1.5 text-sm hover:bg-emerald-50/60 rounded px-1 transition-colors"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-[11px] font-bold">
                      {(s.name || s.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate leading-tight">{s.name || s.email}</p>
                      <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </AdminPageShell>
  );
}
