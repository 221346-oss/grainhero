import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { SuperKpiSummary } from "./SuperKpiSummary";
import { SuperInsightsStrip } from "./SuperInsightsStrip";
import { SuperBento } from "./SuperBento";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { HairlineGrid, NeonPanel, NeonPatternDefs, NEON } from "@/components/charts/neon";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const revenueFn = useServerFn(getSaasRevenueAnalytics);
  const qc = useQueryClient();

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
    <AdminPageShell title="Dashboard" subtitle="Platform overview and key metrics">
      <TooltipProvider delayDuration={150}>
        {/* Mount NeonPatternDefs once per page */}
        <NeonPatternDefs />
        
        {/* Main Content Canvas */}
        <div className="w-full">
          {/* Welcome Banner - Only show on desktop */}
          <div className="mb-6 hidden md:block">
            <WelcomeBanner name={name} />
          </div>

          {/* Mobile Welcome - Simple version */}
          <div className="mb-4 md:hidden">
            <h1 className="text-lg font-semibold text-foreground">
              Welcome back{name ? `, ${name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">Here's what's happening with your platform</p>
          </div>
          {/* Grid Container with proper spacing */}
          <div className="space-y-4 md:space-y-8">
            {/* Row 1: Performance & Analytics using HairlineGrid and NeonPanel */}
            <HairlineGrid cols="grid-cols-1 lg:grid-cols-3">
              {/* Platform Performance */}
              <Link to="/platform/monitoring" className="group">
                <NeonPanel title="Platform Performance" subtitle="System health metrics" className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="p-2 md:p-4">
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-muted-foreground">System Health</span>
                          <span className="text-sm font-bold text-warning">85%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-warning rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-muted-foreground">API Uptime</span>
                          <span className="text-sm font-bold text-success">99.2%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: '99.2%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-muted-foreground">DB Performance</span>
                          <span className="text-sm font-bold text-info">92%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-info rounded-full" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </NeonPanel>
              </Link>

              {/* Monthly Revenue */}
              <Link to="/platform/business" className="group">
                <NeonPanel title="Monthly Revenue" subtitle="Total platform revenue" className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="p-2 md:p-6">
                    <div className="flex flex-col gap-1">
                      <div className="text-2xl md:text-3xl font-bold text-success">Rs 24,888</div>
                      <div className="relative h-8 md:h-13 rounded-md overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d="M 0 80 Q 75 40 150 30 T 300 60 L 300 100 L 0 100" fill="url(#revenueGradient)" stroke="none" />
                          <path d="M 0 80 Q 75 40 150 30 T 300 60" stroke="hsl(var(--success))" strokeWidth="1.5" fill="none" strokeOpacity="0.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </NeonPanel>
              </Link>

              {/* Operational Stats */}
              <NeonPanel title="Operational" subtitle="Key metrics">
                <div className="space-y-2">
                  <Link to="/platform/users" className="block">
                    <div className="flex items-center justify-between text-[13px] p-1 hover:bg-muted/30 rounded transition">
                      <span className="text-muted-foreground">Tenants</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {m?.totalTenants ?? 9}
                      </span>
                    </div>
                  </Link>
                  <Link to="/platform/users" className="block">
                    <div className="flex items-center justify-between text-[13px] p-1 hover:bg-muted/30 rounded transition">
                      <span className="text-muted-foreground">Users</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {m?.totalUsers ?? 28}
                      </span>
                    </div>
                  </Link>
                  <Link to="/platform/plans" className="block">
                    <div className="flex items-center justify-between text-[13px] p-1 hover:bg-muted/30 rounded transition">
                      <span className="text-muted-foreground">Active Subs</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                        {m?.activeSubscriptions ?? 26}
                      </span>
                    </div>
                  </Link>
                  <Link to="/platform/orders" className="block">
                    <div className="flex items-center justify-between text-[13px] p-1 hover:bg-muted/30 rounded transition">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                        {w?.ordersTotal ?? 28}
                      </span>
                    </div>
                  </Link>
                </div>
              </NeonPanel>
            </HairlineGrid>

            {/* Row 2: Platform Insights - Mobile 2x2, Desktop 4 columns */}
            <HairlineGrid cols="grid-cols-2 md:grid-cols-4">
              <Link to="/platform/users" className="group">
                <NeonPanel title="Signups" subtitle={`+${w?.wowDelta ?? 0}% WoW`} className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="pt-2">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{w?.signupsTotal ?? 0}</p>
                  </div>
                </NeonPanel>
              </Link>

              <Link to="/platform/reporting" search={{ tab: "hardware" }} className="group">
                <NeonPanel title="Support Tickets" subtitle="Open tickets" className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="pt-2">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{reporting.totalTickets ?? 0}</p>
                  </div>
                </NeonPanel>
              </Link>

              <Link to="/platform/pipeline" className="group">
                <NeonPanel title="Pipeline" subtitle="CRM contacts" className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="pt-2">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{w?.pipelineTotal ?? 0}</p>
                  </div>
                </NeonPanel>
              </Link>

              <Link to="/platform/health" className="group">
                <NeonPanel title="Critical Alerts" subtitle={m?.criticalAlerts && m.criticalAlerts > 0 ? 'Needs attention' : 'Healthy'} className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="pt-2">
                    <p className={`text-xl md:text-2xl font-bold ${m?.criticalAlerts && m.criticalAlerts > 0 ? 'text-severity-critical' : 'text-foreground'}`}>
                      {m?.criticalAlerts ?? 0}
                    </p>
                  </div>
                </NeonPanel>
              </Link>
            </HairlineGrid>

            {/* Row 3: Recent Activity - Hidden on mobile for simplicity */}
            <div className="hidden md:block">
              <HairlineGrid cols="grid-cols-1 lg:grid-cols-2">
                <Link to="/platform/users" className="group">
                  <NeonPanel title="Recent Signups" subtitle={`${(w?.recentSignups ?? []).length} total`} className="hover:bg-muted/40 cursor-pointer transition-colors">
                    <div className="p-4 space-y-1">
                      {(w?.recentSignups ?? []).slice(0, 6).map((signup) => (
                        <div key={signup.id} className="p-2 text-[13px] hover:bg-muted/20 transition rounded">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{signup.name || 'New User'}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{signup.email}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground whitespace-nowrap">
                              {signup.subscription_plan || 'Basic'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </NeonPanel>
                </Link>

                <Link to="/platform/audit-logs" className="group">
                  <NeonPanel title="Platform Activity" subtitle="Recent events" className="hover:bg-muted/40 cursor-pointer transition-colors">
                    <div className="p-4 space-y-3">
                      <HairlineGrid cols="grid-cols-3">
                        <div className="bg-muted/50 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{(w?.recentSignups ?? []).length}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">New Users</p>
                        </div>
                        <div className="bg-muted/50 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{w?.ordersTotal ?? 0}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Orders</p>
                        </div>
                        <div className="bg-muted/50 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{m?.criticalAlerts ?? 0}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Alerts</p>
                        </div>
                      </HairlineGrid>
                    </div>
                  </NeonPanel>
                </Link>
              </HairlineGrid>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </AdminPageShell>
  );
}
