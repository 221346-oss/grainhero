import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { SuperKpiSummary } from "./SuperKpiSummary";
import { SuperInsightsStrip } from "./SuperInsightsStrip";
import { SuperBento } from "./SuperBento";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const revenueFn = useServerFn(getSaasRevenueAnalytics);

  const { data: m } = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => metricsFn(),
    refetchInterval: 30_000,
  });
  const { data: w } = useQuery({
    queryKey: ["platform-widgets"],
    queryFn: () => widgetsFn(),
  });
  const { data: revenueData } = useQuery({
    queryKey: ["saas-revenue-dashboard"],
    queryFn: () => revenueFn(),
  });

  const mrr = revenueData?.kpis?.mrr ?? m?.mrr ?? 0;
  const mrrSpark = (revenueData?.revenueSeries ?? []).map((r: { revenue?: number }) => Number(r.revenue ?? 0));
  const mrrDelta = (() => {
    if (mrrSpark.length < 2) return 0;
    const prev = mrrSpark[mrrSpark.length - 2] || 0;
    const cur = mrrSpark[mrrSpark.length - 1] || 0;
    if (!prev) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  const reporting = w?.reportingStats ?? { totalTickets: 0 };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <WelcomeBanner name={name} />

        <div className="space-y-3 mt-1">
          <SuperKpiSummary
            mrr={mrr}
            mrrDeltaPct={mrrDelta}
            mrrSpark={mrrSpark}
            activeSubs={m?.activeSubscriptions ?? 0}
            totalTenants={m?.totalTenants ?? 0}
            totalUsers={m?.totalUsers ?? 0}
            ordersOpen={w?.ordersTotal ?? 0}
            criticalAlerts={m?.criticalAlerts ?? 0}
          />
          <SuperInsightsStrip
            signupsTotal={w?.signupsTotal ?? 0}
            wowDelta={w?.wowDelta ?? 0}
            ticketsTotal={reporting.totalTickets ?? 0}
            pipelineTotal={w?.pipelineTotal ?? 0}
            criticalAlerts={m?.criticalAlerts ?? 0}
          />
          <SuperBento recentSignups={w?.recentSignups ?? []} />
        </div>
      </div>
    </TooltipProvider>
  );
}

function CompactMetric({
  label,
  value,
  to,
  accent,
}: {
  label: string;
  value: string | number;
  to?: string;
  accent?: "default" | "danger";
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border bg-white transition-colors",
        accent === "danger" ? "border-red-200/80" : "border-slate-200",
        to && "group-hover:border-emerald-400 group-hover:shadow-sm",
      )}
    >
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 block truncate">
          {label}
        </span>
      </div>
      <div className={cn("w-px h-8", accent === "danger" ? "bg-red-200" : "bg-slate-200")} />
      <div className="flex-shrink-0">
        <span
          className={cn(
            "text-xl font-bold tabular-nums",
            accent === "danger" ? "text-red-600" : "text-slate-900",
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block group">
        {inner}
      </Link>
    );
  }
  return inner;
}

function ClickablePanel({
  to,
  title,
  value,
  subtitle,
  children,
}: {
  to: string;
  title: string;
  value: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="block group h-full">
      <Card className="h-full border-slate-200 transition-all group-hover:border-emerald-400 group-hover:shadow-md cursor-pointer">
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
              {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 shrink-0 mt-1 transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="h-[160px] px-2 pb-3 pt-0">{children}</CardContent>
      </Card>
    </Link>
  );
}

type QuickLink = { 
  label: string; 
  to: string; 
  icon: LucideIcon; 
  value?: string | number;
  category: "sales" | "operations" | "monitoring";
};

const QUICK_LINKS: QuickLink[] = [
  // Sales & Growth
  { label: "Pipeline", to: "/platform/pipeline", icon: TrendingUp, category: "sales" },
  { label: "Leads", to: "/platform/leads", icon: UserPlus, category: "sales" },
  { label: "Plans", to: "/platform/plans", icon: CreditCard, category: "sales" },
  
  // Operations
  { label: "Orders", to: "/platform/orders", icon: Package, category: "operations" },
  { label: "Insurance", to: "/insurance", icon: Shield, category: "operations" },
  { label: "Subscription", to: "/subscription", icon: CreditCard, category: "operations" },
  
  // Monitoring & Logs
  { label: "Health", to: "/platform/health", icon: Activity, category: "monitoring" },
  { label: "Audit logs", to: "/platform/audit-logs", icon: ScrollText, category: "monitoring" },
  { label: "System logs", to: "/platform/logs", icon: ClipboardList, category: "monitoring" },
];

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "none",
  borderRadius: 6,
  color: "white",
  fontSize: 11,
};

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const revenueFn = useServerFn(getSaasRevenueAnalytics);

  const { data: m } = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => metricsFn(),
    refetchInterval: 30000,
  });
  const { data: w } = useQuery({
    queryKey: ["platform-widgets"],
    queryFn: () => widgetsFn(),
  });
  const { data: revenueData } = useQuery({
    queryKey: ["saas-revenue-dashboard"],
    queryFn: () => revenueFn(),
  });

  const mrrValue = revenueData?.kpis?.mrr ?? m?.mrr ?? 0;
  const reporting = w?.reportingStats ?? { hardwareIssues: 0, bugReports: 0, managerQueries: 0, totalTickets: 0 };
  const reportingSeries = w?.reportingSeries ?? [];
  const recentSignups = w?.recentSignups ?? [];

  const quickLinksWithValues: QuickLink[] = QUICK_LINKS.map((item) => {
    switch (item.to) {
      case "/platform/plans":
        return { ...item, value: m?.activeSubscriptions ?? 0 };
      case "/platform/health":
        return { ...item, value: m?.criticalAlerts ?? 0 };
      case "/platform/orders":
        return { ...item, value: w?.ordersTotal ?? 0 };
      case "/platform/leads":
        return { ...item, value: w?.leadsTotal ?? 0 };
      case "/platform/pipeline":
        return { ...item, value: w?.pipelineTotal ?? 0 };
      case "/platform/audit-logs":
      case "/platform/logs":
        return { ...item, value: m?.totalLogs ?? 0 };
      default:
        return item;
    }
  });

  const groupedLinks = {
    sales: quickLinksWithValues.filter((l) => l.category === "sales"),
    operations: quickLinksWithValues.filter((l) => l.category === "operations"),
    monitoring: quickLinksWithValues.filter((l) => l.category === "monitoring"),
  };

  return (
    <AdminPageShell
      title={`Welcome back, ${name || "Super Admin"}`}
      subtitle="Platform overview — jump to any page from here"
      actions={
        w && w.wowDelta !== 0 ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Signups {w.wowDelta >= 0 ? "+" : ""}
            {w.wowDelta}% WoW
          </Badge>
        ) : undefined
      }
    >
      {/* Compact metrics — label, line, number */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <CompactMetric label="Tenants" value={m?.totalTenants ?? 0} to="/platform/tenants" />
        <CompactMetric label="Users" value={m?.totalUsers ?? 0} to="/platform/users" />
        <CompactMetric label="Active subs" value={m?.activeSubscriptions ?? 0} to="/platform/plans" />
        <CompactMetric label="MRR" value={`PKR ${mrrValue.toLocaleString()}`} to="/revenue" />
        <CompactMetric
          label="Critical alerts"
          value={m?.criticalAlerts ?? 0}
          to="/platform/health"
          accent="danger"
        />
      </div>

      {/* Revenue graph | Reporting graph | Recent signups table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ClickablePanel
          to="/revenue"
          title="Revenue"
          value={`PKR ${mrrValue.toLocaleString()}`}
          subtitle={
            revenueData?.planSeries && revenueData.planSeries.length > 0
              ? `${revenueData.planSeries.map((p: any) => `${p.plan}: ${p.mrr}`).join(" • ")}`
              : `${revenueData?.kpis?.activeCount ?? m?.activeSubscriptions ?? 0} active subscriptions`
          }
        >
          {revenueData?.revenueSeries && revenueData.revenueSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData.revenueSeries}>
                <defs>
                  <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#64748b" fontSize={10} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  fill="url(#dashRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">No revenue data</div>
          )}
        </ClickablePanel>

        <ClickablePanel
          to="/platform/reporting"
          title="Reporting"
          value={String(reporting.totalTickets)}
          subtitle={`${reporting.hardwareIssues} hardware · ${reporting.bugReports} bugs · ${reporting.managerQueries} queries`}
        >
          {reportingSeries.some((s) => s.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportingSeries} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} />
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">No reports yet</div>
          )}
        </ClickablePanel>

        <Card className="border-slate-200 h-full">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">Recent signups</CardTitle>
              {w && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {w.signupsTotal} in last 30 days
                </p>
              )}
            </div>
            <Link to="/platform/users" className="text-[11px] text-emerald-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-0">
            <div className="overflow-auto max-h-[196px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-1.5 font-medium">User</th>
                    <th className="text-left px-2 py-1.5 font-medium hidden sm:table-cell">Plan</th>
                    <th className="text-right px-4 py-1.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSignups.slice(0, 6).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <Link to="/platform/users" className="block min-w-0">
                          <p className="font-medium text-slate-900 truncate text-xs">{s.name || s.email}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                        </Link>
                      </td>
                      <td className="px-2 py-2 hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] py-0 h-5">
                          {s.subscription_plan ?? "starter"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] text-slate-500 whitespace-nowrap">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {recentSignups.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-slate-400 py-10 text-xs">
                        No recent signups
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick access — organized by category */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Quick access</h2>
        
        {/* Sales & Growth */}
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Sales & Growth</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {groupedLinks.sales.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="group">
                  <div className="flex items-center justify-between h-[68px] px-3.5 py-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.value !== undefined ? item.value : "View"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Operations */}
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Operations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {groupedLinks.operations.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="group">
                  <div className="flex items-center justify-between h-[68px] px-3.5 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.value !== undefined ? item.value : "View"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Monitoring & Logs */}
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Monitoring & Logs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {groupedLinks.monitoring.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="group">
                  <div className="flex items-center justify-between h-[68px] px-3.5 py-3 rounded-lg border border-slate-200 bg-white hover:border-amber-400 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                        <Icon className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.value !== undefined ? item.value : "View"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
