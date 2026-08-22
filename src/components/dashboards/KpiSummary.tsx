import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wheat, Container, ClipboardCheck, Wallet, Users, Building2, Package, Radio, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import { listGrainBatches, listSilos } from "@/lib/operations.functions";
import { listPendingApprovalBatches } from "@/lib/batch-qc.functions";
import { useDashboardStats } from "./useDashboardStats";
import { HairlineGrid, NeonPanel } from "@/components/charts/neon";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

const fmtPKR = new Intl.NumberFormat("en-PK", {
  style: "currency", currency: "PKR", maximumFractionDigits: 0,
});

type Row = { label: string; value: number | string; to: string; search?: { tab: string }; delta?: number; icon: LucideIcon };

export function KpiSummary({
  range, onRange,
  deltaBatches, deltaAlerts,
  revenueMtd, revenueDeltaPct, revenueSpark,
  planName,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  deltaBatches?: number;
  deltaAlerts?: number;
  revenueMtd?: number;
  revenueDeltaPct?: number;
  revenueSpark?: number[];
  planName?: string;
}) {
  const { data: s } = useDashboardStats();
  const listBatchesFn = useServerFn(listGrainBatches);
  const listSilosFn = useServerFn(listSilos);
  const listApprovalsFn = useServerFn(listPendingApprovalBatches);

  const { data: batchesData } = useQuery({ queryKey: ["grain-batches"], queryFn: () => listBatchesFn() });
  const { data: silosData } = useQuery({ queryKey: ["silos"], queryFn: () => listSilosFn() });
  const { data: approvalsData } = useQuery({ queryKey: ["pending-approvals"], queryFn: () => listApprovalsFn() });

  const batches = Array.isArray(batchesData) ? batchesData : [];
  const silos = Array.isArray(silosData) ? silosData : [];
  const approvals = approvalsData?.batches ?? [];

  const totalGrainKg = batches.reduce((sum, b: any) => sum + (b.quantity_kg ?? 0), 0);
  const activeSilos = silos.filter((s: any) => s.status === "active").length;
  const pendingApprovals = approvals.length;
  
  // Calculate business health score (0-100)
  const calculateHealthScore = () => {
    const revenueScore = Math.min(40, Math.max(0, 20 + (revenueDeltaPct ?? 0) * 0.5));
    const batchScore = Math.min(30, Math.max(0, 15 + (deltaBatches ?? 0) * 0.5));
    const sensorScore = s?.sensors.online && s.sensors.total 
      ? Math.min(30, (s.sensors.online / s.sensors.total) * 30)
      : 0;
    return Math.round(revenueScore + batchScore + sensorScore);
  };

  const healthScore = calculateHealthScore();
  const healthColor = healthScore >= 80 ? "text-success" : healthScore >= 60 ? "text-warning" : "text-severity-critical";
  const healthLabel = healthScore >= 90 ? "Excellent" : healthScore >= 80 ? "Very Good" : healthScore >= 70 ? "Good" : healthScore >= 60 ? "Fair" : "Needs Attention";

  const rev = revenueMtd ?? 0;
  const revPositive = (revenueDeltaPct ?? 0) >= 0;

  // KPI rows for the secondary metrics
  const rows: Row[] = [
    { label: "Total Grain (kg)", value: totalGrainKg.toLocaleString(), to: "/grain-operations", search: { tab: "batches" }, delta: deltaBatches, icon: Wheat },
    { label: "Active Silos", value: activeSilos, to: "/grain-operations", search: { tab: "silos" }, icon: Container },
    { label: "Pending Approvals", value: pendingApprovals, to: "/grain-operations", search: { tab: "batches" }, icon: ClipboardCheck },
  ];

  return (
    <section className="rounded-2xl bg-card/60 p-4 backdrop-blur-sm">
      {/* Header with Range Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Business Performance</h2>
          <InfoDot text="Revenue, operations metrics, and system health. Switch range to compare periods." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>

      {/* Health Score Bar */}
      <div className="mb-4 pb-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Business Health Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-bold tabular-nums ${healthColor}`}>{healthScore}</span>
              <span className="text-lg text-muted-foreground">/100</span>
              <span className={`text-[12px] font-medium ml-2 ${healthColor}`}>{healthLabel}</span>
            </div>
          </div>
        </div>
        {/* Health score segmented bar */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const filledSegments = Math.round((healthScore / 100) * 10);
            const isFilled = i < filledSegments;
            const bgClass = isFilled 
              ? (healthScore >= 80 ? "bg-success" : healthScore >= 60 ? "bg-warning" : "bg-severity-critical")
              : "bg-muted";
            
            return <div key={i} className={`h-2 flex-1 rounded-sm transition-all duration-500 ${bgClass}`} style={{ transitionDelay: `${i * 50}ms` }} />;
          })}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Revenue Card with Neon Sparkline */}
        <Link
          to="/subscription"
          className="group rounded-2xl bg-card p-4 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col justify-between min-h-[180px]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3 w-3" /> Monthly Revenue
            </span>
            {planName && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                {planName}
              </span>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-success leading-tight">
                {fmtPKR.format(rev)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total Revenue</p>
            </div>

            {/* Growth Indicator with Trend Icon */}
            <div className="mt-3">
              <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${revPositive ? "text-success" : "text-severity-critical"}`}>
                {revPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{revPositive ? "+" : ""}{revenueDeltaPct ?? 0}% vs prev period</span>
              </div>

              {/* Neon Sparkline */}
              {revenueSpark && revenueSpark.length > 1 && (
                <div className="h-10 -mx-1 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueSpark.map(v => ({ v }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={revPositive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={revPositive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="v" 
                        stroke={revPositive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} 
                        strokeWidth={1.5} 
                        fill="url(#revSparkGrad)" 
                        dot={false} 
                        isAnimationActive={true} 
                        animationDuration={800} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Operations Metrics - Hairline Grid */}
        <HairlineGrid cols="grid-cols-1">
          {rows.map((r) => {
            const positive = (r.delta ?? 0) >= 0;
            const Icon = r.icon;
            const hasDelta = typeof r.delta === "number";
            
            return (
              <Link
                key={r.label}
                to={r.to}
                search={r.search as never}
              >
                <NeonPanel className="hover:bg-muted/40 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-1.5 rounded bg-success/10 text-success">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-muted-foreground">{r.label}</p>
                        <p className="text-xl font-bold tabular-nums text-foreground leading-none mt-0.5">{r.value}</p>
                      </div>
                    </div>
                    
                    {hasDelta && (
                      <div className={`flex items-center gap-1 text-[11px] font-semibold ${positive ? "text-success" : "text-warning"}`}>
                        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{positive ? "+" : ""}{r.delta}%</span>
                      </div>
                    )}
                  </div>
                </NeonPanel>
              </Link>
            );
          })}
        </HairlineGrid>
      </div>
    </section>
  );
}