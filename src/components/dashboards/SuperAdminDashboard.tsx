import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";

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
    <div className="p-4 max-w-[1600px] mx-auto space-y-4" style={{ backgroundColor: "#EDE9D4", minHeight: "100vh" }}>
      {/* Header - Compact */}
      <header className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#252d26" }}>Super Admin Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#404F44" }}>
            {name ? `Welcome back, ${name}` : "Platform Management Console"}
          </p>
        </div>
        {usersGrowth !== 0 && (
          <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: "rgba(47, 172, 12, 0.15)", color: "#2FAC0C", border: "1px solid #2FAC0C" }}>
            {usersGrowth > 0 ? '+' : ''}{usersGrowth}% Growth
          </Badge>
        )}
      </header>

      {/* Main Metrics - Compact 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#2FAC0C" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>Tenants</p>
            <p className="text-2xl font-bold" style={{ color: "#252d26" }}>{m?.totalTenants ?? "0"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#2FAC0C" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>Users</p>
            <p className="text-2xl font-bold" style={{ color: "#252d26" }}>{m?.totalUsers ?? "0"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#2FAC0C" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>Active Subs</p>
            <p className="text-2xl font-bold" style={{ color: "#252d26" }}>{m?.activeSubscriptions ?? "0"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#2FAC0C" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>MRR</p>
            <p className="text-lg font-bold" style={{ color: "#252d26" }}>PKR {(m as any)?.mrr?.toLocaleString() ?? "0"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#DC2626" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>Critical Alerts</p>
            <p className="text-2xl font-bold" style={{ color: "#DC2626" }}>{m?.criticalAlerts ?? "0"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-l-4" style={{ backgroundColor: "#FFFFFF", borderLeftColor: "#2FAC0C" }}>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#404F44" }}>Activity Logs</p>
            <p className="text-2xl font-bold" style={{ color: "#252d26" }}>{(m as any)?.totalLogs ?? "0"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts - Compact 3 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#2FAC0C", borderWidth: "1px" }}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span style={{ color: "#252d26" }}>User Signups (30d)</span>
              {usersGrowth !== 0 && (
                <Badge className="text-xs px-1.5 py-0.5" style={{ backgroundColor: "#2FAC0C", color: "#FFFFFF" }}>
                  {usersGrowth > 0 ? '+' : ''}{usersGrowth}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {w?.signupsSeries && w.signupsSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={w.signupsSeries}>
                  <defs>
                    <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2FAC0C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2FAC0C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404F44" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#404F44" fontSize={9} />
                  <YAxis stroke="#404F44" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#252d26", border: "none", borderRadius: "4px", color: "white", fontSize: "11px", padding: "4px 8px" }} />
                  <Area type="monotone" dataKey="count" stroke="#2FAC0C" fillOpacity={1} fill="url(#userGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No data</div>
            )}
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#2FAC0C", borderWidth: "1px" }}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm" style={{ color: "#252d26" }}>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {revenueData?.planSeries && revenueData.planSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.planSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404F44" opacity={0.1} />
                  <XAxis dataKey="plan" stroke="#404F44" fontSize={9} />
                  <YAxis stroke="#404F44" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#252d26", border: "none", borderRadius: "4px", color: "white", fontSize: "11px", padding: "4px 8px" }} />
                  <Bar dataKey="mrr" fill="#2FAC0C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No data</div>
            )}
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#2FAC0C", borderWidth: "1px" }}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm" style={{ color: "#252d26" }}>Revenue Trend (12m)</CardTitle>
          </CardHeader>
          <CardContent className="h-40 px-2 pt-0 pb-2">
            {revenueData?.revenueSeries && revenueData.revenueSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData.revenueSeries}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2FAC0C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2FAC0C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404F44" opacity={0.1} />
                  <XAxis dataKey="month" stroke="#404F44" fontSize={9} />
                  <YAxis stroke="#404F44" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#252d26", border: "none", borderRadius: "4px", color: "white", fontSize: "11px", padding: "4px 8px" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#2FAC0C" fillOpacity={1} fill="url(#revenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Insight Cards - Compact */}
      <div>
        <h2 className="text-base font-bold mb-2" style={{ color: "#252d26" }}>Platform Insights</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5">
          {[
            { to: "/platform/tenants", label: "Tenants", value: m?.totalTenants ?? "—" },
            { to: "/platform/users", label: "Users", value: m?.totalUsers ?? "—" },
            { to: "/platform/pipeline", label: "Pipeline", value: "—" },
            { to: "/platform/leads", label: "Leads", value: "—" },
            { to: "/platform/health", label: "System Health", value: "—" },
            { to: "/platform/audit-logs", label: "Audit Logs", value: (m as any)?.totalLogs ?? "—" },
            { to: "/platform/orders", label: "Install Orders", value: "—" },
            { to: "/revenue", label: "Revenue", value: m ? `PKR ${(m as any).mrr?.toLocaleString()}` : "—" },
          ].map((item) => {
            return (
              <Link key={item.to} to={item.to} className="group">
                <Card 
                  className="hover:shadow-md transition-all cursor-pointer" 
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#2FAC0C", borderWidth: "1px" }}
                >
                  <CardContent className="p-2.5">
                    <p className="text-xs font-semibold mb-1" style={{ color: "#404F44" }}>{item.label}</p>
                    <p className="text-base font-bold" style={{ color: "#252d26" }}>{item.value}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity - Compact */}
      {w && (w as any).recentSignups && (w as any).recentSignups.length > 0 && (
        <Card style={{ backgroundColor: "#FFFFFF", borderColor: "#2FAC0C", borderWidth: "1px" }}>
          <CardContent className="p-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "#252d26" }}>Recent Signups</h3>
            <div className="space-y-1.5">
              {((w as any).recentSignups || []).slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded text-sm" style={{ backgroundColor: "rgba(47, 172, 12, 0.05)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm" style={{ color: "#252d26" }}>{s.name || s.email}</p>
                    <p className="text-xs truncate" style={{ color: "#404F44", opacity: 0.7 }}>{s.email}</p>
                  </div>
                  <p className="text-xs ml-2 whitespace-nowrap" style={{ color: "#404F44", opacity: 0.7 }}>{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
