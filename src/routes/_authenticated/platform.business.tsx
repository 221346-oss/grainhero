import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { sendExpiryReminder } from "@/lib/platform-no-admin.functions";
import { exportToCSV, exportToPDF } from "@/lib/table-export";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  NEON, NeonPatternDefs, useNeonCharts, neonFill, neonGrid, neonAxis,
  neonTooltipStyle, HairlineGrid, NeonPanel, NeonLegend, ChartEmpty,
} from "@/components/charts/neon";
import { Download, FileDown, RefreshCw, AlertCircle, Info, HardDrive, Package2, TrendingUp, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/business")({
  component: PlatformBusinessPage,
});

// ── Brand colours (matches --primary-green: #2FAC0C) ──────────────────────
const G  = "#2FAC0C";   // primary green
const G2 = "#1e7a08";   // darker green for active/highlight
const GL = "rgba(47,172,12,0.10)"; // soft green bg

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthLabel = (iso: string) => MONTHS[parseInt(iso.slice(5, 7), 10) - 1] ?? iso.slice(5);

// Plan colours — green-adjacent palette
const PLAN_META: Record<string, { color: string; label: string }> = {
  starter:      { color: NEON.brand, label: "Starter" },
  professional: { color: NEON.brand2, label: "Professional" },
  enterprise:   { color: NEON.accent, label: "Enterprise" },
};
const planColor = (p: string) => PLAN_META[p.toLowerCase()]?.color ?? NEON.neutral;
const planLabel = (p: string) => PLAN_META[p.toLowerCase()]?.label ?? (p.charAt(0).toUpperCase() + p.slice(1));

const ALL_PLANS = ["starter", "professional", "enterprise"] as const;

// ── Export button row ────────────────────────────────────────────────────────
function ExportRow({ data, filename, title }: {
  data: Array<Record<string, any>>; filename: string; title: string;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={() => exportToCSV(data, filename)}
        disabled={data.length === 0}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
      >
        <Download className="w-3 h-3" /> CSV
      </button>
      <button
        onClick={async () => { setBusy(true); await exportToPDF(data, title, filename).catch(console.error); setBusy(false); }}
        disabled={data.length === 0 || busy}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
      >
        <FileDown className="w-3 h-3" /> {busy ? "…" : "PDF"}
      </button>
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="border-r last:border-r-0 border-slate-100 px-5 py-4">
      <div className={`text-lg font-semibold tabular-nums leading-tight ${accent ?? "text-[#252d26]"}`}>{value}</div>
      <div className="text-xs text-[#404F44]/70 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function PlatformBusinessPage() {
  const revenueFn = useServerFn(getSaasRevenueAnalytics);
  const notifyFn  = useServerFn(sendExpiryReminder);
  const qc        = useQueryClient();
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
    refetchInterval: 60_000,
    retry: 2,
  });

  const kpis       = revenueQ.data?.kpis;
  const planSeries = revenueQ.data?.planSeries    ?? [];
  const revSeries  = revenueQ.data?.revenueSeries ?? [];
  const expiring   = revenueQ.data?.expiring      ?? [];
  const adminSubs  = (revenueQ.data?.adminSubs    ?? []) as
    Array<{ name: string; plan: string; mrr: number; joined: string | null }>;

  // ── Revenue chart data ───────────────────────────────────────────────────
  // Monthly: 12 bars, one per month
  const monthlyData = revSeries.length > 0
    ? revSeries.map((r) => ({ label: monthLabel(r.month), revenue: r.revenue }))
    : Array.from({ length: 12 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
        return { label: MONTHS[d.getMonth()], revenue: 0 };
      });

  // Yearly: aggregate monthly data into yearly buckets from revSeries
  const yearlyMap: Record<string, number> = {};
  for (const r of revSeries) {
    const yr = r.month.slice(0, 4);
    yearlyMap[yr] = (yearlyMap[yr] ?? 0) + r.revenue;
  }
  const yearlyData = Object.entries(yearlyMap).length > 0
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
  const salesPct    = kpis && salesTarget > 0 ? Math.min(100, Math.round((kpis.arr / salesTarget) * 100)) : 0;

  // ── Filtered subscribers — null means table is hidden ───────────────────
  const filteredSubs = planFilter === null
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
    const live  = planSeries.find((p) => p.plan.toLowerCase() === planId);
    const mrr   = live?.mrr ?? 0;
    const subs  = adminSubs.filter((a) => a.plan?.toLowerCase() === planId).length;
    const share = kpis?.mrr && mrr > 0 ? Math.round((mrr / kpis.mrr) * 100) : 0;
    return { Plan: planLabel(planId), Subscribers: subs, "MRR (PKR)": mrr > 0 ? fmt(mrr) : "0", "Share %": `${share}%` };
  });

  // ── Loading — skeleton that mirrors actual page layout ──────────────────
  if (revenueQ.isLoading) {
    const Sk = ({ className }: { className: string }) => (
      <div className={`animate-pulse rounded bg-slate-100 ${className}`} />
    );
    return (
      <AdminPageShell title="Business" subtitle="Subscription revenue and hardware sales">
        <div className="space-y-4">
          {/* 7-tile stat strip */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-slate-100">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="px-5 py-4 space-y-2">
                  <Sk className="h-6 w-20" />
                  <Sk className="h-3 w-14" />
                </div>
              ))}
            </div>
          </div>
          {/* Revenue Insights + Sales Overview */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Sk className="h-3 w-28" />
                  <Sk className="h-8 w-40" />
                  <Sk className="h-3 w-36" />
                </div>
                <Sk className="h-6 w-24 rounded-md" />
              </div>
              <Sk className="h-[150px] w-full rounded-lg" />
            </div>
            <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <Sk className="h-3 w-24" />
              <div className="flex justify-center">
                <Sk className="h-[148px] w-[148px] rounded-full" />
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Sk className="h-3 w-20" />
                    <Sk className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Plan breakdown table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between">
              <Sk className="h-3 w-32" />
              <div className="flex gap-2">
                <Sk className="h-6 w-12 rounded" />
                <Sk className="h-6 w-12 rounded" />
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Sk className="h-2.5 w-2.5 rounded-full" />
                    <Sk className="h-3.5 w-24" />
                  </div>
                  <Sk className="h-3.5 w-8" />
                  <Sk className="h-3.5 w-24" />
                  <div className="flex items-center gap-2 ml-auto">
                    <Sk className="h-1.5 w-24 rounded-full" />
                    <Sk className="h-3 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (revenueQ.isError) {
    return (
      <AdminPageShell title="Business" subtitle="Subscription revenue and hardware sales">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Failed to load analytics</p>
            <p className="text-xs text-red-600 mt-0.5">
              {revenueQ.error instanceof Error ? revenueQ.error.message : "Unknown error"}
            </p>
            <button onClick={() => revenueQ.refetch()}
              className="mt-2.5 inline-flex items-center gap-1 text-xs text-red-700 hover:underline">
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
        <button onClick={() => revenueQ.refetch()}
          className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      }
    >
      <NeonPatternDefs />
      {/* ── Flat stat strip ────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-slate-100 min-w-max lg:min-w-0">
          <Tile label="MRR"          value={`PKR ${fmt(kpis?.mrr ?? 0)}`} />
          <Tile label="ARR"          value={`PKR ${fmt(kpis?.arr ?? 0)}`} />
          <Tile label="Active subs"  value={kpis?.activeCount ?? 0} sub={`${kpis?.totalAdmins ?? 0} total admins`} />
          <Tile label="Trial"        value={kpis?.trialCount ?? 0} />
          <Tile label="Hardware"     value={`PKR ${fmt(kpis?.hardwareRevenue ?? 0)}`} sub={`${kpis?.hardwareOrders ?? 0} orders`} />
          <Tile label="Churn (30d)"  value={`${kpis?.churnRate ?? 0}%`}
            accent={kpis && kpis.churnRate > 5 ? "text-red-600" : "text-[#252d26]"} />
          <Tile label="Expiring /7d" value={kpis?.expiringCount ?? 0}
            accent={kpis && (kpis.expiringCount ?? 0) > 0 ? "text-amber-600" : "text-[#252d26]"} />
        </div>
      </div>

      {/* ── Hardware / IoT Revenue Breakdown ───────────────────────── */}
      {(kpis?.hardwareRevenue ?? 0) > 0 || (kpis?.hardwareOrders ?? 0) > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-[#404F44]/80 uppercase tracking-wider">Hardware / IoT Revenue</span>
              <span title="Revenue from silo hardware orders, tracked separately from subscription MRR"
                className="text-slate-400 hover:text-slate-600 cursor-default">
                <Info className="w-3.5 h-3.5" />
              </span>
            </div>
            <ExportRow
              data={[{
                "Hardware Revenue (PKR)": fmt(kpis?.hardwareRevenue ?? 0),
                "Total Orders": kpis?.hardwareOrders ?? 0,
                "Avg per Order (PKR)": kpis?.hardwareOrders
                  ? fmt(Math.round((kpis.hardwareRevenue ?? 0) / kpis.hardwareOrders))
                  : "—",
                "% of Total Revenue": kpis?.totalRevenue && kpis.totalRevenue > 0
                  ? `${Math.round(((kpis.hardwareRevenue ?? 0) / kpis.totalRevenue) * 100)}%`
                  : "—",
              }]}
              filename="hardware-revenue"
              title="Hardware Revenue — GrainHero"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            {/* Hardware revenue */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Package2 className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hardware Revenue</span>
              </div>
              <div className="text-xl font-bold text-[#252d26] tabular-nums">
                PKR {fmt(kpis?.hardwareRevenue ?? 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">one-time device sales</div>
            </div>
            {/* Orders */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Orders</span>
              </div>
              <div className="text-xl font-bold text-[#252d26] tabular-nums">
                {kpis?.hardwareOrders ?? 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">approved hardware orders</div>
            </div>
            {/* Avg order value */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Avg per Order</span>
              </div>
              <div className="text-xl font-bold text-[#252d26] tabular-nums">
                {kpis?.hardwareOrders
                  ? `PKR ${fmt(Math.round((kpis.hardwareRevenue ?? 0) / kpis.hardwareOrders))}`
                  : "—"}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">average order value</div>
            </div>
            {/* Share of total revenue */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">% of Total Revenue</span>
              </div>
              {(() => {
                const hwRev   = kpis?.hardwareRevenue ?? 0;
                const total   = kpis?.totalRevenue ?? 0;
                const pct     = total > 0 ? Math.round((hwRev / total) * 100) : 0;
                const subPct  = 100 - pct;
                return (
                  <div>
                    <div className="text-xl font-bold text-[#252d26] tabular-nums">{pct}%</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="h-full rounded-l-full" style={{ width: `${subPct}%`, background: "#2FAC0C" }} />
                      <div className="h-full rounded-r-full" style={{ width: `${pct}%`, background: "#0e7490" }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2FAC0C]" /> Subs {subPct}%
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0e7490]" /> HW {pct}%
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

        {/* Revenue Insights */}
        <NeonPanel
          className="lg:col-span-3"
          title="Revenue Insights"
          action={
            <div className="flex items-center rounded-md border border-border overflow-hidden text-[10px] font-medium">
              <button
                onClick={() => setRevenueView("monthly")}
                className="px-2.5 py-1 transition-colors"
                style={revenueView === "monthly"
                  ? { background: NEON.brand, color: "#fff" }
                  : { background: "transparent", color: "var(--muted-foreground)" }}
              >
                Monthly
              </button>
              <button
                onClick={() => setRevenueView("yearly")}
                className="px-2.5 py-1 transition-colors"
                style={revenueView === "yearly"
                  ? { background: NEON.brand, color: "#fff" }
                  : { background: "transparent", color: "var(--muted-foreground)" }}
              >
                Yearly
              </button>
            </div>
          }
        >
          {/* Large amount + delta */}
          <div className="pb-4">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
                PKR {fmt(kpis?.totalRevenue ?? 0)}
              </span>
              {(() => {
                const last = revenueBarData[revenueBarData.length - 1]?.revenue ?? 0;
                const prev = revenueBarData[revenueBarData.length - 2]?.revenue ?? 0;
                const pct  = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
                if (pct === null) return null;
                const up = pct >= 0;
                return (
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: up ? NEON.brand : NEON.critical, background: up ? "color-mix(in oklab, var(--chart-1) 12%, transparent)" : "color-mix(in oklab, var(--severity-critical) 12%, transparent)" }}
                  >
                    {up ? "+" : ""}{pct}%
                  </span>
                );
              })()}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              vs {revenueView === "monthly" ? "previous month" : "previous year"}
            </p>
          </div>

          {/* Bar chart — last bar highlighted */}
          {revenueBarData.every((d) => !d.revenue) ? (
            <ChartEmpty label="No revenue data yet" height={150} />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={revenueBarData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
                <CartesianGrid {...neonGrid} />
                <XAxis dataKey="label" {...neonAxis} />
                <YAxis {...neonAxis} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} width={28} />
                <Tooltip {...neonTooltipStyle} formatter={(v: number) => [`PKR ${fmt(v)}`, "Revenue"]} />
                <Bar dataKey="revenue" radius={0} maxBarSize={32}>
                  {revenueBarData.map((_, i) => (
                    <Cell key={i} {...neonFill(i === revenueBarData.length - 1 ? NEON.brand2 : NEON.brand)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </NeonPanel>

        {/* Sales Overview — donut */}
        <NeonPanel className="lg:col-span-2" title="Sales Overview">
          {donutData.length > 0 ? (
            <div className="flex flex-col items-center pb-1">
              <div className="relative w-[148px] h-[148px]">
                <ResponsiveContainer width={148} height={148}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((d, i) => <Cell key={i} {...neonFill(d.color)} />)}
                    </Pie>
                    <Tooltip {...neonTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-foreground">{donutTotal}</span>
                  <span className="text-[10px] text-muted-foreground">subscribers</span>
                </div>
              </div>
              <NeonLegend items={donutData.map((d) => ({ label: d.name, color: d.color, value: d.value }))} />
              <div className="mt-4 w-full border-t border-border pt-3">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-muted-foreground">ARR vs target</span>
                  <span className="font-semibold" style={{ color: NEON.brand }}>{salesPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${salesPct}%`, background: NEON.brand }} />
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
            <span title="Click a plan row to filter and show its subscribers below"
              className="text-muted-foreground hover:text-foreground cursor-default">
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>
          <ExportRow data={planExport} filename="plan-breakdown" title="Plan Breakdown — GrainHero" />
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Plan</th>
              <th className="text-right font-medium text-muted-foreground px-3 py-2">Subscribers</th>
              <th className="text-right font-medium text-muted-foreground px-3 py-2">MRR</th>
              <th className="text-right font-medium text-muted-foreground px-3 py-2 w-44">Revenue Share</th>
            </tr>
          </thead>
          <tbody>
            {ALL_PLANS.map((planId) => {
              const live   = planSeries.find((p) => p.plan.toLowerCase() === planId);
              const mrr    = live?.mrr ?? 0;
              // Count actual subscribers from adminSubs instead of estimating from MRR ratio
              const subs   = adminSubs.filter((a) => a.plan?.toLowerCase() === planId).length;
              const share  = kpis?.mrr && mrr > 0 ? Math.round((mrr / kpis.mrr) * 100) : 0;
              const col    = planColor(planId);
              const lbl    = planLabel(planId);
              const active = planFilter === planId;
              return (
                <tr
                  key={planId}
                  onClick={() => setPlanFilter(active ? null : planId)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  style={active ? { background: "color-mix(in oklab, " + col + " 8%, transparent)" } : undefined}
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col }} />
                      <span className="font-medium text-foreground">{lbl}</span>
                      {active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "color-mix(in oklab, " + col + " 15%, transparent)", color: col }}>
                          selected
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">{subs}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {mrr > 0 ? `PKR ${fmt(mrr)}` : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: col }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8 tabular-nums text-right">{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Active Subscribers — only shown when a plan is selected ─── */}
      {planFilter !== null && adminSubs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold text-[#404F44]/80 uppercase tracking-wider">Active Subscribers</span>
              {/* Plan filter pills */}
              <div className="flex gap-1.5">
                {planTabs.map((t) => {
                  const col   = t.id === "all" ? "#404F44" : planColor(t.id);
                  const isOn  = planFilter === t.id;
                  const count = t.id === "all"
                    ? adminSubs.length
                    : adminSubs.filter((a) => a.plan.toLowerCase() === t.id).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPlanFilter(t.id === planFilter ? null : t.id)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
                      style={isOn
                        ? { background: col, color: "#fff" }
                        : { background: "#f1f5f9", color: "#475569" }}
                    >
                      {t.label} <span className={isOn ? "opacity-80" : "opacity-60"}>{count}</span>
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
                <div key={i} className="rounded-md border border-slate-100 bg-white px-3.5 py-3 hover:border-slate-200 transition-colors">
                  <div className="text-sm font-medium text-[#252d26] truncate">{a.name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: col + "15", color: col }}>
                      {planLabel(a.plan)}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">PKR {fmt(a.mrr)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    {a.joined ? new Date(a.joined).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—"}
                  </div>
                </div>
              );
            })}
            {filteredSubs.length === 0 && (
              <div className="col-span-full text-center text-sm text-slate-400 py-8">
                No subscribers on {planFilter === "all" ? "any" : planLabel(planFilter)} plan yet.
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredSubs.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {filteredSubs.length} subscriber{filteredSubs.length !== 1 ? "s" : ""}
                {planFilter !== "all" ? ` · ${planLabel(planFilter)}` : ""}
              </span>
              <span className="text-xs font-semibold text-[#404F44] tabular-nums">
                PKR {fmt(filteredSubs.reduce((s, a) => s + a.mrr, 0))} / mo
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Expiring soon ───────────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Expiring within 7 days
            {expiring.length > 0 && ` · ${expiring.length}`}
          </span>
          {expiring.length > 0 && (
            <button
              onClick={() => exportToCSV(expiring.map((s: any) => ({
                Admin: s.admin_name ?? s.admin_id ?? "—",
                Plan: s.plan_name ?? "—",
                Expires: s.end_date ? new Date(s.end_date).toLocaleDateString() : "—",
              })), "expiring-subscriptions")}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
        {expiring.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No subscriptions expiring in the next 7 days.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left px-5 py-2.5 font-semibold">Tenant</th>
                <th className="text-left px-3 py-2.5 font-semibold">Plan</th>
                <th className="text-right px-3 py-2.5 font-semibold">Expires</th>
                <th className="text-right px-5 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(expiring as any[]).map((s) => {
                const days = s.end_date
                  ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86_400_000)
                  : null;
                const alreadyNotified = notified.has(s.admin_id);
                return (
                  <tr key={s.id} className="hover:bg-amber-50/30">
                    <td className="px-5 py-3 text-[#404F44] font-medium truncate max-w-[160px]">
                      {s.admin_name ?? s.admin_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{s.plan_name ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-medium text-amber-700">
                        {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}
                      </div>
                      {days !== null && (
                        <div className="text-[10px] text-amber-500">{days} day{days !== 1 ? "s" : ""} left</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => notifyMut.mutate(s.admin_id)}
                        disabled={notifyMut.isPending || alreadyNotified || !s.admin_id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
                          alreadyNotified
                            ? "bg-emerald-100 text-emerald-700 cursor-default"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        <Bell className="w-3 h-3" />
                        {alreadyNotified ? "Sent" : "Notify"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageShell>
  );
}
