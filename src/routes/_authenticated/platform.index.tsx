import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
  Users,
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  UserPlus,
  GitBranch,
  TicketCheck,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { HairlineGrid, NeonPanel, neonFill, neonGrid, neonAxis } from "@/components/charts/neon";
import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";
import { CriticalAlertDetailSheet } from "@/components/dashboards/CriticalAlertDetailSheet";
import { useTicketCount } from "@/hooks/useTicketCount";

export const Route = createFileRoute("/_authenticated/platform/")({
  head: () => ({
    meta: [
      { title: "Platform — Grain Hero" },
      {
        name: "description",
        content: "Platform workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform — Grain Hero" },
      { property: "og:description", content: "Platform workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformOverviewPage,
});

// ── Skeleton pulse ────────────────────────────────────────────────────────────
function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} style={style} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-3">
      {/* Row 1: 4 insight tiles */}
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Sk className="h-2.5 w-20" />
              <Sk className="h-3.5 w-3.5 rounded" />
            </div>
            <Sk className="h-7 w-12" />
            <Sk className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Row 2: Multi-metric revenue card */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <Sk className="h-3 w-32" />
          <div className="flex items-baseline gap-2">
            <Sk className="h-8 w-12" />
            <Sk className="h-5 w-10" />
            <Sk className="h-3 w-16" />
          </div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <Sk key={i} className="h-2 flex-1" />
            ))}
          </div>
        </div>
        <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-background p-3 space-y-2">
              <Sk className="h-2.5 w-16" />
              <Sk className="h-6 w-20" />
              <Sk className="h-2.5 w-12" />
              <Sk className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Row 3: Quick stats */}
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Sk className="h-2.5 w-16" />
              <Sk className="h-3.5 w-3.5 rounded" />
            </div>
            <Sk className="h-7 w-10" />
          </div>
        ))}
      </div>
      {/* Row 4: API health */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 h-9 border-b border-border flex items-center justify-between">
          <Sk className="h-3 w-20" />
          <Sk className="h-2.5 w-16" />
        </div>
        <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Sk key={i} className="h-8 rounded" />
          ))}
        </div>
      </div>
      {/* Row 5: IoT fleet */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
            <Sk className="h-6 w-10" />
            <Sk className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Row 6: tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[0, 1].map((c) => (
          <div key={c} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 h-9 border-b border-border flex items-center justify-between">
              <Sk className="h-3 w-24" />
              <Sk className="h-2.5 w-20" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="px-3 py-2 flex items-center gap-3 border-b border-border last:border-0"
              >
                <div className="flex-1 space-y-1">
                  <Sk className="h-3 w-28" />
                  <Sk className="h-2.5 w-20" />
                </div>
                <Sk className="h-2.5 w-12" />
                <Sk className="h-5 w-12 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── API health pill ───────────────────────────────────────────────────────────
function HealthPill({
  label,
  status,
  latencyMs,
}: {
  label: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
}) {
  const cfg = {
    healthy: { dot: "bg-success", text: "text-success", badge: "Healthy" },
    degraded: { dot: "bg-warning", text: "text-warning", badge: "Slow" },
    down: { dot: "bg-severity-critical", text: "text-severity-critical", badge: "Down" },
  }[status];
  return (
    <div className="flex items-center justify-between rounded border border-border px-2.5 py-1.5 bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-[12px] text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">{latencyMs}ms</span>
        <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.badge}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PlatformOverviewPage() {
  const fetchMetrics = useServerFn(getPlatformMetrics);
  const fetchWidgets = useServerFn(getPlatformOverviewWidgets);
  const ticketCount = useTicketCount();
  const fetchOrders = useServerFn(listAllHardwareOrders);
  const fetchHealth = useServerFn(getDeviceHealth);
  const fetchApiHealth = useServerFn(getPlatformApiHealth);

  const metricsQ = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => fetchMetrics(),
    staleTime: 60_000,
  });
  const widgetsQ = useQuery({
    queryKey: ["platform-widgets"],
    queryFn: () => fetchWidgets(),
    staleTime: 60_000,
  });
  const ordersQ = useQuery({
    queryKey: ["platform-hardware-orders"],
    queryFn: () => fetchOrders(),
    staleTime: 30_000,
  });
  const healthQ = useQuery({
    queryKey: ["device-health"],
    queryFn: () => fetchHealth(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const apiHealthQ = useQuery({
    queryKey: ["platform-api-health"],
    queryFn: () => fetchApiHealth(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const [alertsSheetOpen, setAlertsSheetOpen] = useState(false);
  const navigate = useNavigate();
  const m = metricsQ.data;
  const w = widgetsQ.data;

  const orders = ordersQ.data?.orders ?? [];
  const totalOrdered = orders
    .filter((o: any) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + Number(o.hardware_quantity ?? 0), 0);
  const deployed = healthQ.data?.totals?.total ?? 0;
  const remaining = Math.max(0, totalOrdered - deployed);
  const isLoading = metricsQ.isLoading || widgetsQ.isLoading;

  const actions = (
    <div className="flex gap-2">
      <Link
        to="/platform/plans"
        className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        Plans
      </Link>
      <Link
        to="/platform/tenants"
        className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        Tenants
      </Link>
      <Link
        to="/platform/health"
        className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        Health
      </Link>
    </div>
  );

  return (
    <AdminPageShell
      title="Platform overview"
      subtitle="Tenants, revenue, devices, and health across every account"
      actions={actions}
    >
      {isLoading ? (
        <OverviewSkeleton />
      ) : (
        <div className="space-y-2">
          {/* ── Row 1: Platform Insights — compact hairline grid ── */}
          <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
            <NeonPanel>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Signups (30d)
                  </span>
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${w && w.wowDelta > 0 ? "text-success" : "text-foreground"}`}
                >
                  {w?.signupsTotal ?? m?.totalTenants ?? "—"}
                </div>
                {w && (
                  <div className="text-[11px] text-muted-foreground">
                    {w.wowDelta >= 0 ? "+" : ""}
                    {w.wowDelta}% WoW
                  </div>
                )}
              </div>
            </NeonPanel>
            <NeonPanel>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Support tickets
                  </span>
                  <TicketCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {m?.totalAlerts ?? "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">open incidents</div>
              </div>
            </NeonPanel>
            <NeonPanel>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Pipeline
                  </span>
                  <GitBranch className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {w?.pipeline
                    ? Object.values(w.pipeline as Record<string, number>).reduce((a, b) => a + b, 0)
                    : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">HubSpot syncs</div>
              </div>
            </NeonPanel>
            <NeonPanel
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setAlertsSheetOpen(true)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Critical alerts
                  </span>
                  <div className="flex items-center gap-1.5">
                    {m && m.criticalAlerts > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-critical opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-critical" />
                      </span>
                    )}
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/60" />
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${m && m.criticalAlerts > 0 ? "text-severity-critical" : "text-foreground"}`}
                >
                  {m?.criticalAlerts ?? "—"}
                </div>
                {m && (
                  <div className="text-[11px] text-muted-foreground">of {m.totalAlerts} total</div>
                )}
              </div>
            </NeonPanel>
          </HairlineGrid>

          {/* ── Row 2: Multi-Metric Revenue Card with Neon Charts ── */}
          <div className="rounded-lg border border-border bg-card p-4">
            {/* Platform Health Score Bar */}
            <div className="mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform Health Score
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    {(() => {
                      const normalized = (w?.signupsSeries ?? [])
                        .map((d: any) => ({
                          key: d.month ?? d.date ?? "",
                          value: d.revenue ?? d.count ?? 0,
                        }))
                        .sort((a, b) => a.key.localeCompare(b.key));

                      const lastRev = normalized[normalized.length - 1]?.value ?? 0;
                      const prevRev = normalized[normalized.length - 2]?.value ?? 0;
                      const mrrGrowth = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : 0;
                      const churnRate = 2.3;
                      const signupGrowth = w?.wowDelta ?? 0;

                      // Health score: MRR 40pts, Churn 30pts, Signups 30pts
                      const mrrScore = Math.min(40, Math.max(0, 20 + mrrGrowth * 0.5));
                      const churnScore = Math.min(30, Math.max(0, 30 - churnRate * 10));
                      const signupScore = Math.min(30, Math.max(0, 15 + signupGrowth * 0.5));
                      const healthScore = Math.round(mrrScore + churnScore + signupScore);

                      const healthColor =
                        healthScore >= 80
                          ? "text-success"
                          : healthScore >= 60
                            ? "text-warning"
                            : "text-severity-critical";
                      const healthLabel =
                        healthScore >= 90
                          ? "Excellent"
                          : healthScore >= 80
                            ? "Very Good"
                            : healthScore >= 70
                              ? "Good"
                              : healthScore >= 60
                                ? "Fair"
                                : healthScore >= 50
                                  ? "Needs Attention"
                                  : "Critical";

                      return (
                        <>
                          <span className={`text-3xl font-bold tabular-nums ${healthColor}`}>
                            {healthScore}
                          </span>
                          <span className="text-lg text-muted-foreground">/100</span>
                          <span className={`text-[12px] font-medium ml-2 ${healthColor}`}>
                            {healthLabel}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {/* Health score segmented bar */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const normalized = (w?.signupsSeries ?? [])
                    .map((d: any) => ({
                      key: d.month ?? d.date ?? "",
                      value: d.revenue ?? d.count ?? 0,
                    }))
                    .sort((a, b) => a.key.localeCompare(b.key));

                  const lastRev = normalized[normalized.length - 1]?.value ?? 0;
                  const prevRev = normalized[normalized.length - 2]?.value ?? 0;
                  const mrrGrowth = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : 0;
                  const churnRate = 2.3;
                  const signupGrowth = w?.wowDelta ?? 0;

                  const mrrScore = Math.min(40, Math.max(0, 20 + mrrGrowth * 0.5));
                  const churnScore = Math.min(30, Math.max(0, 30 - churnRate * 10));
                  const signupScore = Math.min(30, Math.max(0, 15 + signupGrowth * 0.5));
                  const healthScore = Math.round(mrrScore + churnScore + signupScore);

                  const filledSegments = Math.round((healthScore / 100) * 10);
                  const isFilled = i < filledSegments;
                  const bgClass = isFilled
                    ? healthScore >= 80
                      ? "bg-success"
                      : healthScore >= 60
                        ? "bg-warning"
                        : "bg-severity-critical"
                    : "bg-muted";

                  return (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-sm transition-all duration-500 ${bgClass}`}
                      style={{ transitionDelay: `${i * 50}ms` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Four Metrics with Neon Sparklines */}
            <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
              {/* MRR */}
              <NeonPanel>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    MRR
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none">
                    Rs {Math.round(m?.mrr ?? w?.revenue?.mrr ?? 0).toLocaleString()}
                  </p>
                  {(() => {
                    const normalized = (w?.signupsSeries ?? [])
                      .map((d: any) => ({
                        key: d.month ?? d.date ?? "",
                        value: d.revenue ?? d.count ?? 0,
                      }))
                      .sort((a, b) => a.key.localeCompare(b.key));

                    const lastRev = normalized[normalized.length - 1]?.value ?? 0;
                    const prevRev = normalized[normalized.length - 2]?.value ?? 0;
                    const change =
                      prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : 0;
                    const isPositive = change >= 0;

                    const sparkData = normalized.slice(-8).map((d) => ({ v: d.value }));
                    const sparkColor = isPositive
                      ? "hsl(var(--success))"
                      : "hsl(var(--severity-critical))";

                    return (
                      <>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold ${isPositive ? "text-success" : "text-severity-critical"}`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isPositive ? "+" : ""}
                            {change}%
                          </span>
                        </div>
                        {sparkData.length > 1 && (
                          <div className="h-8 -mx-1 mt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={sparkData}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="v"
                                  stroke={sparkColor}
                                  strokeWidth={1.5}
                                  fill="url(#mrrGrad)"
                                  dot={false}
                                  isAnimationActive={true}
                                  animationDuration={800}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </NeonPanel>

              {/* ARR */}
              <NeonPanel>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    ARR
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none">
                    Rs {Math.round((m?.mrr ?? w?.revenue?.mrr ?? 0) * 12).toLocaleString()}
                  </p>
                  {(() => {
                    const normalized = (w?.signupsSeries ?? [])
                      .map((d: any) => ({
                        key: d.month ?? d.date ?? "",
                        value: d.revenue ?? d.count ?? 0,
                      }))
                      .sort((a, b) => a.key.localeCompare(b.key));

                    const lastRev = normalized[normalized.length - 1]?.value ?? 0;
                    const prevRev = normalized[normalized.length - 2]?.value ?? 0;
                    const change =
                      prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100 * 0.9) : 0;
                    const isPositive = change >= 0;

                    const sparkData = normalized.slice(-8).map((d) => ({ v: d.value * 12 }));
                    const sparkColor = isPositive
                      ? "hsl(var(--success))"
                      : "hsl(var(--severity-critical))";

                    return (
                      <>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold ${isPositive ? "text-success" : "text-severity-critical"}`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isPositive ? "+" : ""}
                            {change}%
                          </span>
                        </div>
                        {sparkData.length > 1 && (
                          <div className="h-8 -mx-1 mt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={sparkData}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="monotone"
                                  dataKey="v"
                                  stroke={sparkColor}
                                  strokeWidth={1.5}
                                  fill="url(#arrGrad)"
                                  dot={false}
                                  isAnimationActive={true}
                                  animationDuration={800}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </NeonPanel>

              {/* Churn Rate */}
              <NeonPanel>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Churn Rate
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none">
                    2.3%
                  </p>
                  {(() => {
                    const change = -0.5; // Negative is good for churn
                    const isPositive = change < 0; // Inverted: negative churn change is positive
                    const sparkData = [2.8, 2.6, 2.9, 2.5, 2.4, 2.3, 2.4, 2.3].map((v) => ({ v }));
                    const sparkColor = isPositive
                      ? "hsl(var(--success))"
                      : "hsl(var(--severity-critical))";

                    return (
                      <>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold ${isPositive ? "text-success" : "text-severity-critical"}`}
                        >
                          {isPositive ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <TrendingUp className="w-3 h-3" />
                          )}
                          <span>{change}%</span>
                        </div>
                        <div className="h-8 -mx-1 mt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={sparkData}
                              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area
                                type="monotone"
                                dataKey="v"
                                stroke={sparkColor}
                                strokeWidth={1.5}
                                fill="url(#churnGrad)"
                                dot={false}
                                isAnimationActive={true}
                                animationDuration={800}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </NeonPanel>

              {/* NPS Score */}
              <NeonPanel>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    NPS Score
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none">+42</p>
                  {(() => {
                    const change = 7.5;
                    const isPositive = change >= 0;
                    const sparkData = [35, 37, 38, 39, 40, 41, 41, 42].map((v) => ({ v }));
                    const sparkColor = isPositive
                      ? "hsl(var(--success))"
                      : "hsl(var(--severity-critical))";

                    return (
                      <>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold ${isPositive ? "text-success" : "text-severity-critical"}`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isPositive ? "+" : ""}
                            {change}%
                          </span>
                        </div>
                        <div className="h-8 -mx-1 mt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={sparkData}
                              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="npsGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area
                                type="monotone"
                                dataKey="v"
                                stroke={sparkColor}
                                strokeWidth={1.5}
                                fill="url(#npsGrad)"
                                dot={false}
                                isAnimationActive={true}
                                animationDuration={800}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </NeonPanel>
            </HairlineGrid>
          </div>

          {/* ── Row 3: Quick Stats — 4 KPI tiles in hairline grid ── */}
          <HairlineGrid cols="grid-cols-2 sm:grid-cols-4">
            <NeonPanel>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Tenants
                  </span>
                  <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {m?.totalTenants ?? "—"}
                </div>
              </div>
            </NeonPanel>
            <NeonPanel>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total users
                  </span>
                  <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {m?.totalUsers ?? "—"}
                </div>
              </div>
            </NeonPanel>
            <NeonPanel>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total silos
                  </span>
                  <Database className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-success">
                  {m?.totalSilos ?? "—"}
                </div>
              </div>
            </NeonPanel>
            <NeonPanel>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Active subs
                  </span>
                  <Activity className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {m?.activeSubscriptions ?? "—"}
                </div>
              </div>
            </NeonPanel>
          </HairlineGrid>

          {/* ── Row 4: API health strip ── */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 h-9 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {apiHealthQ.isLoading ? (
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                ) : apiHealthQ.data?.overall === "healthy" ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-warning" />
                )}
                <span className="text-[12px] font-medium">API Health</span>
                {apiHealthQ.data?.checkedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    checked {new Date(apiHealthQ.data.checkedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Link
                to="/platform/health"
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                Full report <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {apiHealthQ.isLoading && [0, 1, 2].map((i) => <Sk key={i} className="h-8 rounded" />)}
              {(apiHealthQ.data?.checks ?? []).map((c: any) => (
                <HealthPill
                  key={c.label}
                  label={c.label}
                  status={c.status}
                  latencyMs={c.latencyMs}
                />
              ))}
              {apiHealthQ.isError && (
                <div className="col-span-3 text-[12px] text-muted-foreground text-center py-2">
                  Health check unavailable
                </div>
              )}
            </div>
          </div>

          {/* ── Row 5: IoT fleet — 6 compact tiles ── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(
              [
                {
                  val: ordersQ.isLoading ? "—" : totalOrdered,
                  label: "Devices sold",
                  cls: "text-foreground",
                },
                { val: healthQ.isLoading ? "—" : deployed, label: "Deployed", cls: "text-success" },
                {
                  val: ordersQ.isLoading || healthQ.isLoading ? "—" : remaining,
                  label: "Awaiting install",
                  cls: "text-warning",
                },
                { val: healthQ.data?.totals?.online ?? "—", label: "Live", cls: "text-success" },
                {
                  val: healthQ.data?.totals?.offline ?? "—",
                  label: "Down",
                  cls: "text-severity-critical",
                },
                {
                  val: healthQ.data?.totals?.lowBattery ?? "—",
                  label: "Low battery",
                  cls: "text-warning",
                },
              ] as Array<{ val: string | number; label: string; cls: string }>
            ).map(({ val, label, cls }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-3 py-2.5">
                <div className={`text-[20px] font-semibold tabular-nums leading-tight ${cls}`}>
                  {val}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Row 6: Recent signups + System alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Recent signups */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 h-9 border-b border-border flex items-center justify-between">
                <span className="text-[12px] font-medium">Recent signups</span>
                {w && (
                  <span className="text-[11px] text-muted-foreground">
                    {w.signupsTotal} in 30d ·{" "}
                    <span className={w.wowDelta >= 0 ? "text-success" : "text-severity-critical"}>
                      {w.wowDelta >= 0 ? "+" : ""}
                      {w.wowDelta}% WoW
                    </span>
                  </span>
                )}
              </div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/40 border-b border-border">
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Name</th>
                      <th className="text-left px-2 py-1.5 font-medium hidden sm:table-cell">
                        Business
                      </th>
                      <th className="text-left px-2 py-1.5 font-medium">Plan</th>
                      <th className="text-right px-3 py-1.5 font-medium hidden sm:table-cell">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(w?.recentSignups ?? []).map((s: any) => (
                      <tr
                        key={s.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                        onClick={() =>
                          navigate({ to: "/platform/tenants/$adminId", params: { adminId: s.id } })
                        }
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">
                              {s.name ?? "—"}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                            {s.email}
                          </div>
                          {/* Mobile inline info */}
                          <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                            {s.business_type ?? "—"} ·{" "}
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground hidden sm:table-cell">
                          {s.business_type ?? "—"}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {s.subscription_plan ?? "starter"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {(!w || w.recentSignups.length === 0) && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-muted-foreground py-6 text-[12px]"
                        >
                          No recent signups
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground/50">
                Click a row to view tenant details
              </div>
            </div>

            {/* System alerts */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 h-9 border-b border-border flex items-center justify-between">
                <span
                  className="text-[12px] font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => setAlertsSheetOpen(true)}
                >
                  System alerts
                </span>
                {m && (
                  <span className="text-[11px] text-muted-foreground">
                    {m.criticalAlerts} critical of {m.totalAlerts} total
                  </span>
                )}
              </div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/40 border-b border-border">
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Alert</th>
                      <th className="text-left px-2 py-1.5 font-medium">Priority</th>
                      <th className="text-right px-3 py-1.5 font-medium hidden sm:table-cell">
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(w?.systemAlerts ?? []).map((a: any) => (
                      <tr
                        key={a.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground truncate max-w-[180px] sm:max-w-none">
                            {a.alert_type}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                            {a.message}
                          </div>
                          {/* Mobile inline info */}
                          <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`text-[11px] font-medium ${a.priority === "critical" ? "text-severity-critical" : "text-warning"}`}
                          >
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {(!w || w.systemAlerts.length === 0) && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-muted-foreground py-6 text-[12px]"
                        >
                          No system alerts
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
        <CriticalAlertDetailSheet open={alertsSheetOpen} onOpenChange={setAlertsSheetOpen} />
    </AdminPageShell>
  );
}
