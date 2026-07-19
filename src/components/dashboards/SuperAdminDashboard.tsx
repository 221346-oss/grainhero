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
  const mrrSpark = (revenueData?.revenueSeries ?? []).map(
    (r: { revenue?: number }) => Number(r.revenue ?? 0),
  );
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