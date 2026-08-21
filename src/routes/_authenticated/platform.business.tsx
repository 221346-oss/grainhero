import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { sendExpiryReminder } from "@/lib/platform-no-admin.functions";
import { ExportMenu } from "@/components/app/ExportMenu";
import { InfoDot } from "@/components/ui/InfoDot";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RefreshCw, AlertCircle, HardDrive, Package2, TrendingUp, Bell } from "lucide-react";
import {
  NEON,
  NeonPatternDefs,
  useNeonCharts,
  neonFill,
  neonGrid,
  neonAxis,
  neonTooltipStyle,
  HairlineGrid,
  NeonPanel,
  NeonLegend,
  ChartEmpty,
} from "@/components/charts/neon";

export const Route = createFileRoute("/_authenticated/platform/business")({
  head: () => ({
    meta: [
      { title: "Platform · Business — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Business workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Business — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Business workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformBusinessPage,
});

// ── Brand colours (matches --primary-green: #2FAC0C) ──────────────────────
const G = "#2FAC0C"; // primary green
const G2 = "#1e7a08"; // darker green for active/highlight
const GL = "rgba(47,172,12,0.10)"; // soft green bg

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (iso: string) => MONTHS[parseInt(iso.slice(5, 7), 10) - 1] ?? iso.slice(5);

// Plan colours — green-adjacent palette
const PLAN_META: Record<string, { color: string; label: string }> = {
  starter: { color: NEON.brand, label: "Starter" },
  professional: { color: NEON.brand2, label: "Professional" },
  enterprise: { color: NEON.accent, label: "Enterprise" },
};
const planColor = (p: string) => PLAN_META[p.toLowerCase()]?.color ?? NEON.neutral;
const planLabel = (p: string) =>
  PLAN_META[p.toLowerCase()]?.label ?? p.charAt(0).toUpperCase() + p.slice(1);

const ALL_PLANS = ["starter", "professional", "enterprise"] as const;

// ── Export button row ────────────────────────────────────────────────────────
// Callers here build one-off, pre-shaped summary rows (friendly keys already
// as the object's own keys) rather than a fixed record type, so the column
// list is derived from those keys instead of a hand-written ExportColumn[].
function ExportRow({
  data,
  filename,
  title,
}: {
  data: Array<Record<string, any>>;
  filename: string;
  title: string;
}) {
  const columns: ExportColumn<Record<string, any>>[] =
    data.length > 0 ? Object.keys(data[0]).map((k) => ({ header: k, value: (row) => row[k] })) : [];
  return <ExportMenu filename={filename} title={title} rows={data} columns={columns} />;
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-950 border border-border px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 truncate">
        {label}
      </div>
      <div
        className={`text-[17px] font-semibold tabular-nums leading-tight ${accent ?? "text-foreground"}`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function PlatformBusinessPage() {
  const revenueFn = useServerFn(getSaasRevenueAnalytics);
  const notifyFn = useServerFn(sendExpiryReminder);
  const qc = useQueryClient();
  const [planFilter, setPlanFilter] = React.useState<string | null>(null);
  const [revenueView, setRevenueView] = React.useState<"monthly" | "yearly">("monthly");
  // Track which adminIds have been notified this session to avoid double-sends
  const [notified, setNotified] = React.useState<Set<string>>(new Set());

  const notifyMut = useMutation({
    mutationFn: (adminId: string) => notifyFn({ data: { adminId } }),
    onSuccess: (_data, adminId) => {
      toast.success("Renewal reminder sent");
      setNotified((prev) => new Set([...prev, adminId]));
      qc.invalidateQueries({ queryKey: ["platform-revenue"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to send reminder"),
  });

  const revenueQ = useQuery({
    queryKey: ["platform-revenue"],
    queryFn: () => revenueFn(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const kpis = revenueQ.data?.kpis;
  const planSeries = revenueQ.data?.planSeries ?? [];
  const revSeries = revenueQ.data?.revenueSeries ?? [];
  const expiring = revenueQ.data?.expiring ?? [];
  const adminSubs = (revenueQ.data?.adminSubs ?? []) as Array<{
    name: string;
    plan: string;
    mrr: number;
    joined: string | null;
  }>;

  // ── Revenue chart data ───────────────────────────────────────────────────
  // Monthly: 12 bars, one per month
  const monthlyData =
    revSeries.length > 0
      ? revSeries.map((r) => ({ label: monthLabel(r.month), revenue: r.revenue }))
      : Array.from({ length: 12 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (11 - i));
          return { label: MONTHS[d.getMonth()], revenue: 0 };
        });

  // Yearly: aggregate monthly data into yearly buckets from revSeries
  const yearlyMap: Record<string, number> = {};
  for (const r of revSeries) {
    const yr = r.month.slice(0, 4);
    yearlyMap[yr] = (yearlyMap[yr] ?? 0) + r.revenue;
  }
  const yearlyData =
    Object.entries(yearlyMap).length > 0
      ? Object.entries(yearlyMap).map(([yr, revenue]) => ({ label: yr, revenue }))
      : [{ label: String(new Date().getFullYear()), revenue: 0 }];

  const revenueBarData = revenueView === "monthly" ? monthlyData : yearlyData;

  // ── Donut data ───────────────────────────────────────────────────────────
  const donutData = planSeries
    .map((p) => ({
      name: planLabel(p.plan),
      // Use actual subscriber count from adminSubs, not MRR ratio
      value: adminSubs.filter((a) => a.plan?.toLowerCase() === p.plan.toLowerCase()).length,
      color: planColor(p.plan),
    }))
    .filter((d) => d.value > 0);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const salesTarget = kpis ? Math.round(kpis.arr * 1.25) : 1;
  const salesPct =
    kpis && salesTarget > 0 ? Math.min(100, Math.round((kpis.arr / salesTarget) * 100)) : 0;

  // ── Filtered subscribers — null means table is hidden ───────────────────
  const filteredSubs =
    planFilter === null
      ? []
      : planFilter === "all"
        ? adminSubs
        : adminSubs.filter((a) => a.plan.toLowerCase() === planFilter);

  const planTabs = [
    { id: "all", label: "All" },
    ...ALL_PLANS.map((id) => ({ id, label: planLabel(id) })),
  ];

  // ── Exports ──────────────────────────────────────────────────────────────
  const subExport = filteredSubs.map((a) => ({
    Admin: a.name,
    Plan: planLabel(a.plan),
    "MRR (PKR)": fmt(a.mrr),
    Since: a.joined ? new Date(a.joined).toLocaleDateString() : "—",
  }));

  const planExport = ALL_PLANS.map((planId) => {
    const live = planSeries.find((p) => p.plan.toLowerCase() === planId);
    const mrr = live?.mrr ?? 0;
    const subs = adminSubs.filter((a) => a.plan?.toLowerCase() === planId).length;
    const share = kpis?.mrr && mrr > 0 ? Math.round((mrr / kpis.mrr) * 100) : 0;
    return {
      Plan: planLabel(planId),
      Subscribers: subs,
      "MRR (PKR)": mrr > 0 ? fmt(mrr) : "0",
      "Share %": `${share}%`,
    };
  });

  // ── Loading — skeleton that mirrors actual page layout ──────────────────
  // ── Inline skeleton helper ────────────────────────────────────────────────
  const BSk = ({ className, style }: { className: string; style?: React.CSSProperties }) => (
    <div className={`animate-pulse rounded bg-muted ${className}`} style={style} />
  );

  function BusinessSkeleton() {
    return (
      <div className="space-y-4">
        {/* ── Row 1: 7 stat tiles ──────────────────────────────────── */}
        <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-background px-5 py-4 space-y-2">
              <BSk className="h-[18px] w-20" />
              <BSk className="h-[11px] w-14" />
            </div>
          ))}
        </div>

        {/* ── Row 2: Revenue chart (3/5) + Donut (2/5) ────────────── */}
        <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3 bg-background p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <BSk className="h-[11px] w-28" />
                <BSk className="h-9 w-40" />
                <BSk className="h-[11px] w-32" />
              </div>
              <BSk className="h-6 w-20 rounded" />
            </div>
            {/* Bar chart skeleton */}
            <div className="flex items-end gap-1.5 h-[150px]">
              {[...Array(12)].map((_, i) => {
                const h = [40, 55, 35, 65, 50, 80, 45, 70, 60, 55, 90, 75][i];
                return (
                  <BSk
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{ height: `${h}%` } as React.CSSProperties}
                  />
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-2 bg-background p-5 space-y-4">
            <BSk className="h-[13px] w-28" />
            {/* Donut skeleton */}
            <div className="flex justify-center py-2">
              <BSk className="w-36 h-36 rounded-full" />
            </div>
            {/* Legend items */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BSk className="h-2.5 w-2.5 rounded-full" />
                  <BSk className="h-[12px] w-20" />
                </div>
                <BSk className="h-[12px] w-8" />
              </div>
            ))}
            {/* ARR progress bar */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between">
                <BSk className="h-[11px] w-24" />
                <BSk className="h-[11px] w-8" />
              </div>
              <BSk className="h-1.5 w-full" />
            </div>
          </div>
        </div>

        {/* ── Row 3: Plan Breakdown table ──────────────────────────── */}
        <div className="rounded-md border border-border bg-background overflow-hidden">
          <div className="px-5 h-11 border-b border-border flex items-center justify-between">
            <BSk className="h-[13px] w-32" />
            <div className="flex gap-2">
              <BSk className="h-6 w-12 rounded" />
              <BSk className="h-6 w-12 rounded" />
            </div>
          </div>
          {/* table header */}
          <div className="px-3 py-2.5 border-b border-border bg-muted/30 grid grid-cols-4 gap-6">
            {[20, 12, 16, 24].map((w, i) => (
              <BSk key={i} className={`h-[10px] w-${w}`} />
            ))}
          </div>
          {/* plan rows */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="px-3 py-3 flex items-center gap-4 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <BSk className="w-2.5 h-2.5 rounded-full shrink-0" />
                <BSk className="h-[13px] w-24" />
              </div>
              <BSk className="h-[13px] w-8" />
              <BSk className="h-[13px] w-24" />
              <div className="flex items-center gap-2 w-44 justify-end">
                <BSk className="h-1.5 w-24 rounded-full" />
                <BSk className="h-[11px] w-8" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Row 4: Expiring soon table ───────────────────────────── */}
        <div className="rounded-md border border-border bg-background overflow-hidden">
          <div className="px-5 h-11 border-b border-border flex items-center justify-between">
            <BSk className="h-[13px] w-36" />
            <BSk className="h-6 w-12 rounded" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="px-3 py-3 flex items-center gap-4 border-b border-border last:border-0"
            >
              <BSk className="h-[13px] flex-1" />
              <BSk className="h-[12px] w-20" />
              <div className="text-right space-y-1">
                <BSk className="h-[13px] w-24" />
                <BSk className="h-[10px] w-16" />
              </div>
              <BSk className="h-7 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state (shown inline inside the shell) ───────────────────────────
  if (revenueQ.isError) {
    return (
      <AdminPageShell
        title="Business"
        subtitle="Subscription revenue and hardware sales across every tenant"
      >
        <div className="border border-severity-critical/20 bg-severity-critical/5 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-severity-critical mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-foreground">Failed to load analytics</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {revenueQ.error instanceof Error ? revenueQ.error.message : "Unknown error"}
            </p>
            <button
              onClick={() => revenueQ.refetch()}
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-severity-critical hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Business"
      subtitle="Subscription revenue and hardware sales across every tenant"
      actions={
        revenueQ.isLoading ? undefined : (
          <button
            onClick={() => revenueQ.refetch()}
            className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )
      }
    >
      <NeonPatternDefs />
      {revenueQ.isLoading ? (
        <BusinessSkeleton />
      ) : (
        <>
          {/* ── Flat stat strip — neon hairline grid ─────────────────── */}
          <div className="grid rounded-md overflow-hidden grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
            <Tile label="MRR" value={`PKR ${fmt(kpis?.mrr ?? 0)}`} />
            <Tile label="ARR" value={`PKR ${fmt(kpis?.arr ?? 0)}`} />
            <Tile
              label="Active subs"
              value={kpis?.activeCount ?? 0}
              sub={`${kpis?.totalAdmins ?? 0} total admins`}
            />
            <Tile label="Trial" value={kpis?.trialCount ?? 0} />
            <Tile
              label="Hardware"
              value={`PKR ${fmt(kpis?.hardwareRevenue ?? 0)}`}
              sub={`${kpis?.hardwareOrders ?? 0} orders`}
            />
            <Tile
              label="Churn (30d)"
              value={`${kpis?.churnRate ?? 0}%`}
              accent={kpis && kpis.churnRate > 5 ? "text-severity-critical" : "text-foreground"}
            />
            <Tile
              label="Expiring /7d"
              value={kpis?.expiringCount ?? 0}
              accent={kpis && (kpis.expiringCount ?? 0) > 0 ? "text-warning" : "text-foreground"}
            />
          </div>

          {/* ── Hardware / IoT Revenue Breakdown ───────────────────────── */}
          {(kpis?.hardwareRevenue ?? 0) > 0 || (kpis?.hardwareOrders ?? 0) > 0 ? (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Hardware / IoT Revenue
                  </span>
                  <InfoDot text="Revenue from silo hardware orders, tracked separately from subscription MRR" />
                </div>
                <ExportRow
                  data={[
                    {
                      "Hardware Revenue (PKR)": fmt(kpis?.hardwareRevenue ?? 0),
                      "Total Orders": kpis?.hardwareOrders ?? 0,
                      "Avg per Order (PKR)": kpis?.hardwareOrders
                        ? fmt(Math.round((kpis.hardwareRevenue ?? 0) / kpis.hardwareOrders))
                        : "—",
                      "% of Total Revenue":
                        kpis?.totalRevenue && kpis.totalRevenue > 0
                          ? `${Math.round(((kpis.hardwareRevenue ?? 0) / kpis.totalRevenue) * 100)}%`
                          : "—",
                    },
                  ]}
                  filename="hardware-revenue"
                  title="Hardware Revenue — GrainHero"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                {/* Hardware revenue */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Hardware Revenue
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    PKR {fmt(kpis?.hardwareRevenue ?? 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    one-time device sales
                  </div>
                </div>
                {/* Orders */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HardDrive className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Orders
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {kpis?.hardwareOrders ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    approved hardware orders
                  </div>
                </div>
                {/* Avg order value */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Avg per Order
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {kpis?.hardwareOrders
                      ? `PKR ${fmt(Math.round((kpis.hardwareRevenue ?? 0) / kpis.hardwareOrders))}`
                      : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    average order value
                  </div>
                </div>
                {/* Share of total revenue */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      % of Total Revenue
                    </span>
                  </div>
                  {(() => {
                    const hwRev = kpis?.hardwareRevenue ?? 0;
                    const total = kpis?.totalRevenue ?? 0;
                    const pct = total > 0 ? Math.round((hwRev / total) * 100) : 0;
                    const subPct = 100 - pct;
                    return (
                      <div>
                        <div className="text-xl font-bold text-foreground tabular-nums">{pct}%</div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden flex">
                          <div
                            className="h-full rounded-l-full"
                            style={{ width: `${subPct}%`, background: "#2FAC0C" }}
                          />
                          <div
                            className="h-full rounded-r-full"
                            style={{ width: `${pct}%`, background: "#0e7490" }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2FAC0C]" />{" "}
                            Subs {subPct}%
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0e7490]" />{" "}
                            HW {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Revenue Insights + Sales Overview ──────────────────────── */}
          <HairlineGrid cols="grid-cols-1 lg:grid-cols-5">
            {/* ── Revenue Insights — neon redesign ───────────────────────── */}
            <NeonPanel
              className="lg:col-span-3"
              title="Revenue Insights"
              action={
                <div className="flex items-center rounded-md border border-border overflow-hidden text-[10px] font-medium">
                  <button
                    onClick={() => setRevenueView("monthly")}
                    className="px-2.5 py-1 transition-colors"
                    style={
                      revenueView === "monthly"
                        ? { background: NEON.brand, color: "#fff" }
                        : { background: "transparent", color: "var(--muted-foreground)" }
                    }
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setRevenueView("yearly")}
                    className="px-2.5 py-1 transition-colors"
                    style={
                      revenueView === "yearly"
                        ? { background: NEON.brand, color: "#fff" }
                        : { background: "transparent", color: "var(--muted-foreground)" }
                    }
                  >
                    Yearly
                  </button>
                </div>
              }
            >
              {/* ── KPI row: total, MRR, ARR ────────────────────────── */}
              <div className="grid grid-cols-3 gap-px bg-border/60 rounded mb-4 overflow-hidden">
                {(() => {
                  const last = revenueBarData[revenueBarData.length - 1]?.revenue ?? 0;
                  const prev = revenueBarData[revenueBarData.length - 2]?.revenue ?? 0;
                  const pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
                  const up = (pct ?? 0) >= 0;
                  return (
                    <>
                      <div className="bg-background px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Total Revenue
                        </p>
                        <p
                          className="text-[22px] font-bold tabular-nums leading-none"
                          style={{ color: NEON.brand }}
                        >
                          PKR {fmt(kpis?.totalRevenue ?? 0)}
                        </p>
                        {pct !== null && (
                          <span
                            className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                            style={{
                              color: up ? NEON.brand : NEON.critical,
                              background: up
                                ? "color-mix(in oklab, var(--chart-1) 12%, transparent)"
                                : "color-mix(in oklab, var(--severity-critical) 12%, transparent)",
                            }}
                          >
                            {up ? "▲" : "▼"} {up ? "+" : ""}
                            {pct}% vs prev
                          </span>
                        )}
                      </div>
                      <div className="bg-background px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          MRR
                        </p>
                        <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
                          PKR {fmt(kpis?.mrr ?? 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">monthly recurring</p>
                      </div>
                      <div className="bg-background px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          ARR
                        </p>
                        <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
                          PKR {fmt(kpis?.arr ?? 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          annualised run rate
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ── Neon area + bar combo chart ─────────────────────── */}
              {revenueBarData.every((d) => !d.revenue) ? (
                <ChartEmpty label="No revenue data yet" height={170} />
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart
                    data={revenueBarData}
                    margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    barCategoryGap="30%"
                  >
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.brand} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={NEON.brand} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...neonGrid} />
                    <XAxis dataKey="label" {...neonAxis} />
                    <YAxis
                      {...neonAxis}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M`
                          : v >= 1000
                            ? `${Math.round(v / 1000)}k`
                            : String(v)
                      }
                      width={36}
                    />
                    <Tooltip
                      {...neonTooltipStyle}
                      formatter={(v: number) => [`PKR ${fmt(v)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={0} maxBarSize={28}>
                      {revenueBarData.map((d, i) => {
                        const isLast = i === revenueBarData.length - 1;
                        const isPeak =
                          d.revenue === Math.max(...revenueBarData.map((r) => r.revenue));
                        const color = isLast ? NEON.brand2 : isPeak ? NEON.accent : NEON.brand;
                        return <Cell key={i} {...neonFill(color)} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* ── Growth progress bar ─────────────────────────────── */}
              {(() => {
                const last = revenueBarData[revenueBarData.length - 1]?.revenue ?? 0;
                const prev = revenueBarData[revenueBarData.length - 2]?.revenue ?? 0;
                const pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
                if (pct === null) return null;
                const up = pct >= 0;
                const barW = Math.min(100, Math.abs(pct));
                return (
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        Growth vs {revenueView === "monthly" ? "last month" : "last year"}
                      </span>
                      <span
                        className="text-[12px] font-bold tabular-nums"
                        style={{ color: up ? NEON.brand : NEON.critical }}
                      >
                        {up ? "+" : ""}
                        {pct}%
                      </span>
                    </div>
                    {/* Segmented neon progress track */}
                    <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${barW}%`,
                          background: up
                            ? `linear-gradient(90deg, ${NEON.brand} 0%, ${NEON.brand2} 100%)`
                            : `linear-gradient(90deg, ${NEON.critical} 0%, hsl(var(--severity-high)) 100%)`,
                          boxShadow: up
                            ? `0 0 8px 0 color-mix(in oklab, var(--chart-1) 60%, transparent)`
                            : `0 0 8px 0 color-mix(in oklab, var(--severity-critical) 60%, transparent)`,
                        }}
                      />
                      {/* tick marks every 25% */}
                      {[25, 50, 75].map((t) => (
                        <span
                          key={t}
                          className="absolute inset-y-0 w-px bg-background/50"
                          style={{ left: `${t}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </NeonPanel>

            {/* Sales Overview — donut */}
            <NeonPanel className="lg:col-span-2" title="Sales Overview">
              {donutData.length > 0 ? (
                <div className="flex flex-col items-center pb-1">
                  {/* Fixed square container so the chart is always a perfect circle */}
                  <div className="relative" style={{ width: 160, height: 160, flexShrink: 0 }}>
                    <PieChart width={160} height={160}>
                      <Pie
                        data={donutData}
                        cx={80}
                        cy={80}
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {donutData.map((d, i) => (
                          <Cell key={i} {...neonFill(d.color)} />
                        ))}
                      </Pie>
                      <Tooltip {...neonTooltipStyle} />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-foreground tabular-nums">
                        {donutTotal}
                      </span>
                      <span className="text-[10px] text-muted-foreground">subscribers</span>
                    </div>
                  </div>
                  <NeonLegend
                    items={donutData.map((d) => ({
                      label: d.name,
                      color: d.color,
                      value: d.value,
                    }))}
                  />
                  <div className="mt-4 w-full border-t border-border pt-3">
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-muted-foreground">ARR vs target</span>
                      <span className="font-semibold" style={{ color: NEON.brand }}>
                        {salesPct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${salesPct}%`, background: NEON.brand }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <ChartEmpty label="No plan data yet" height={160} />
              )}
            </NeonPanel>
          </HairlineGrid>

          {/* ── Plan Breakdown — click a row to show/hide subscribers ────── */}
          <div className="rounded-md border border-border bg-background overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">Plan Breakdown</span>
                <InfoDot text="Click a plan row to filter and show its subscribers below" />
              </div>
              <ExportRow
                data={planExport}
                filename="plan-breakdown"
                title="Plan Breakdown — GrainHero"
              />
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Plan</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Subs</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">
                    MRR
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALL_PLANS.map((planId) => {
                  const live = planSeries.find((p) => p.plan.toLowerCase() === planId);
                  const mrr = live?.mrr ?? 0;
                  const subs = adminSubs.filter((a) => a.plan?.toLowerCase() === planId).length;
                  const share = kpis?.mrr && mrr > 0 ? Math.round((mrr / kpis.mrr) * 100) : 0;
                  const col = planColor(planId);
                  const lbl = planLabel(planId);
                  const active = planFilter === planId;
                  return (
                    <tr
                      key={planId}
                      onClick={() => setPlanFilter(active ? null : planId)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      style={
                        active
                          ? { background: "color-mix(in oklab, " + col + " 8%, transparent)" }
                          : undefined
                      }
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: col }}
                          />
                          <span className="font-medium text-foreground">{lbl}</span>
                          {active && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium hidden sm:inline"
                              style={{
                                background: "color-mix(in oklab, " + col + " 15%, transparent)",
                                color: col,
                              }}
                            >
                              selected
                            </span>
                          )}
                        </span>
                        {/* Mobile: show MRR inline */}
                        <div className="sm:hidden text-[11px] text-muted-foreground mt-0.5">
                          {mrr > 0 ? `PKR ${fmt(mrr)}` : "—"} · {share}%
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                        {subs}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                        {mrr > 0 ? (
                          `PKR ${fmt(mrr)}`
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${share}%`, background: col }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground w-7 tabular-nums text-right">
                            {share}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Active Subscribers — only shown when a plan is selected ─── */}
          {planFilter !== null && adminSubs.length > 0 && (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Active Subscribers
                  </span>
                  {/* Plan filter pills */}
                  <div className="flex gap-1.5">
                    {planTabs.map((t) => {
                      const col = t.id === "all" ? "#404F44" : planColor(t.id);
                      const isOn = planFilter === t.id;
                      const count =
                        t.id === "all"
                          ? adminSubs.length
                          : adminSubs.filter((a) => a.plan.toLowerCase() === t.id).length;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setPlanFilter(t.id === planFilter ? null : t.id)}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
                          style={
                            isOn
                              ? { background: col, color: "#fff" }
                              : { background: "#f1f5f9", color: "#475569" }
                          }
                        >
                          {t.label}{" "}
                          <span className={isOn ? "opacity-80" : "opacity-60"}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ExportRow
                  data={subExport}
                  filename={`subscribers-${planFilter}`}
                  title={`Active Subscribers — ${planFilter === "all" ? "All Plans" : planLabel(planFilter)} — GrainHero`}
                />
              </div>

              {/* Subscriber cards */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredSubs.map((a, i) => {
                  const col = planColor(a.plan);
                  return (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-background px-3.5 py-3 hover:border-border transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground truncate">{a.name}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: col + "15", color: col }}
                        >
                          {planLabel(a.plan)}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          PKR {fmt(a.mrr)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1.5">
                        {a.joined
                          ? new Date(a.joined).toLocaleDateString("en-PK", {
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                    No subscribers on {planFilter === "all" ? "any" : planLabel(planFilter)} plan
                    yet.
                  </div>
                )}
              </div>

              {/* Footer */}
              {filteredSubs.length > 0 && (
                <div className="px-5 py-2.5 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filteredSubs.length} subscriber{filteredSubs.length !== 1 ? "s" : ""}
                    {planFilter !== "all" ? ` · ${planLabel(planFilter)}` : ""}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    PKR {fmt(filteredSubs.reduce((s, a) => s + a.mrr, 0))} / mo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Expiring soon ───────────────────────────────────────────── */}
          <div className="rounded-md border border-border bg-background overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-medium" style={{ color: NEON.warning }}>
                Expiring within 7 days
                {expiring.length > 0 && ` · ${expiring.length}`}
              </span>
              {expiring.length > 0 && (
                <ExportMenu
                  filename="expiring-subscriptions"
                  title="Expiring Subscriptions — GrainHero"
                  rows={expiring}
                  columns={[
                    { header: "Admin", value: (s: any) => s.admin_name ?? s.admin_id ?? "—" },
                    { header: "Plan", value: (s: any) => s.plan_name ?? "—" },
                    {
                      header: "Expires",
                      value: (s: any) =>
                        s.end_date ? new Date(s.end_date).toLocaleDateString() : "—",
                    },
                  ]}
                />
              )}
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Tenant</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">
                    Plan
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">
                    Expires
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {expiring.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No subscriptions expiring in the next 7 days.
                    </td>
                  </tr>
                ) : (
                  (expiring as any[]).map((s) => {
                    const days = s.end_date
                      ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86_400_000)
                      : null;
                    const alreadyNotified = notified.has(s.admin_id);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground truncate max-w-[140px] sm:max-w-none">
                            {s.admin_name ?? s.admin_id?.slice(0, 8) ?? "—"}
                          </div>
                          {/* Mobile: show plan + expiry inline */}
                          <div className="sm:hidden text-[11px] text-muted-foreground mt-0.5">
                            {s.plan_name ?? "—"}
                            {days !== null && (
                              <span style={{ color: NEON.warning }}> · {days}d left</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {s.plan_name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right hidden sm:table-cell">
                          <div className="font-medium tabular-nums" style={{ color: NEON.warning }}>
                            {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}
                          </div>
                          {days !== null && (
                            <div className="text-[10px]" style={{ color: NEON.warning }}>
                              {days} day{days !== 1 ? "s" : ""} left
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => notifyMut.mutate(s.admin_id)}
                            disabled={notifyMut.isPending || alreadyNotified || !s.admin_id}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
                              alreadyNotified
                                ? "bg-emerald-100 text-emerald-700 cursor-default"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            <Bell className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              {alreadyNotified ? "Sent" : "Notify"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
