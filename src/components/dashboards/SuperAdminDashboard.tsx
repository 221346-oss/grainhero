import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { SuperKpiSummary } from "./SuperKpiSummary";
import { SuperInsightsStrip } from "./SuperInsightsStrip";
import { SuperBento } from "./SuperBento";
import { OnboardingFunnel } from "./super/OnboardingFunnel";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { getSuperDashboardAnalytics } from "@/lib/platform-dashboard.functions";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const revenueFn = useServerFn(getSaasRevenueAnalytics);
  const analyticsFn = useServerFn(getSuperDashboardAnalytics);
  const qc = useQueryClient();
  const [funnelWindow, setFunnelWindow] = useState(30);

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("superadmin-revenue")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-metrics"] });
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
        qc.invalidateQueries({ queryKey: ["saas-revenue-dashboard"] });
        qc.invalidateQueries({ queryKey: ["revenue-integrity"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-metrics"] });
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
        qc.invalidateQueries({ queryKey: ["saas-revenue-dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_thresholds" }, () => {
        qc.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
        qc.invalidateQueries({ queryKey: ["saas-revenue-dashboard"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

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
  const { data: analytics } = useQuery({
    queryKey: ["super-dashboard-analytics", funnelWindow],
    queryFn: () => analyticsFn({ data: { windowDays: funnelWindow } }),
    refetchInterval: 60_000,
  });

  const mrr = revenueData?.kpis?.mrr ?? m?.mrr ?? 0;
  const revenueMonthly = analytics?.revenueMonthly ?? [];
  const mrrSpark = (revenueMonthly.length
    ? revenueMonthly.map((r) => r.revenue)
    : (revenueData?.revenueSeries ?? []).map((r: { revenue?: number }) => Number(r.revenue ?? 0)));
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
      <div className="min-h-screen p-3 sm:p-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <WelcomeBanner name={name} />

        {/* Row 1: KPI Summary - Top */}
        <div className="mt-2">
          <SuperKpiSummary
            mrr={mrr}
            mrrDeltaPct={mrrDelta}
            health={analytics?.health}
            revenueSeries={revenueMonthly}
            activeSubs={m?.activeSubscriptions ?? 0}
            totalTenants={m?.totalTenants ?? 0}
            totalUsers={m?.totalUsers ?? 0}
            ordersOpen={w?.ordersTotal ?? 0}
            criticalAlerts={m?.criticalAlerts ?? 0}
          />
        </div>

        {/* Row 2: Insights strip - 4 KPIs */}
        <div className="mt-2">
          <SuperInsightsStrip
            signupsTotal={w?.signupsTotal ?? 0}
            wowDelta={w?.wowDelta ?? 0}
            ticketsTotal={reporting.totalTickets ?? 0}
            pipelineTotal={w?.pipelineTotal ?? 0}
            criticalAlerts={m?.criticalAlerts ?? 0}
            series={analytics?.insights}
          />
        </div>

        {/* Row 3: Recent signups + platform activity — SuperBento is already 2-up */}
        <div className="mt-2">
          <SuperBento recentSignups={w?.recentSignups ?? []} />
        </div>

        {/* Row 4: Onboarding funnel */}
        <div className="mt-2">
          <OnboardingFunnel
            data={analytics?.funnel}
            windowDays={funnelWindow}
            onWindowChange={setFunnelWindow}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
