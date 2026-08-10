import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { HairlineGrid, NeonPanel } from "@/components/charts/neon";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const fmtPKR = new Intl.NumberFormat("en-PK", {
  style: "currency", currency: "PKR", maximumFractionDigits: 0,
});

type Row = { label: string; value: number | string; to: string; danger?: boolean };

export function SuperKpiSummary({
  mrr, mrrDeltaPct, mrrSpark, activeSubs,
  totalTenants, totalUsers, ordersOpen, criticalAlerts,
}: {
  mrr: number;
  mrrDeltaPct?: number;
  mrrSpark?: number[];
  activeSubs: number;
  totalTenants: number;
  totalUsers: number;
  ordersOpen: number;
  criticalAlerts: number;
}) {
  // Calculate platform health score
  const calculateHealthScore = () => {
    const revenueScore = Math.min(40, Math.max(0, 20 + (mrrDeltaPct ?? 0) * 0.5));
    const alertScore = criticalAlerts === 0 ? 30 : Math.max(0, 30 - (criticalAlerts * 5));
    const subsScore = Math.min(30, (activeSubs / Math.max(1, totalTenants)) * 30);
    return Math.round(revenueScore + alertScore + subsScore);
  };

  const healthScore = calculateHealthScore();
  const healthColor = healthScore >= 80 ? "text-success" : healthScore >= 60 ? "text-warning" : "text-severity-critical";
  const healthLabel = healthScore >= 90 ? "Excellent" : healthScore >= 80 ? "Very Good" : healthScore >= 70 ? "Good" : healthScore >= 60 ? "Fair" : "Needs Attention";

  const rows: Row[] = [
    { label: "Tenants", value: totalTenants, to: "/platform/users" },
    { label: "Users", value: totalUsers, to: "/platform/users" },
    { label: "Active subs", value: activeSubs, to: "/platform/plans" },
    { label: "Install orders", value: ordersOpen, to: "/platform/orders" },
    { label: "Critical alerts", value: criticalAlerts, to: "/platform/health", danger: criticalAlerts > 0 },
  ];
  const positive = (mrrDeltaPct ?? 0) >= 0;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <h2 className="text-sm font-semibold text-foreground">Platform Performance</h2>
        <InfoDot text="MRR, platform health, and key metrics." />
      </div>

      {/* Platform Health Score - Compact */}
      <div className="mb-2 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Health</span>
            <span className={`text-2xl font-bold tabular-nums ${healthColor}`}>{healthScore}</span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span className={`text-[11px] font-medium ${healthColor}`}>{healthLabel}</span>
          </div>
        </div>
        {/* Compact health bar */}
        <div className="flex items-center gap-0.5 mt-1.5">
          {Array.from({ length: 10 }).map((_, i) => {
            const filledSegments = Math.round((healthScore / 100) * 10);
            const isFilled = i < filledSegments;
            const bgClass = isFilled 
              ? (healthScore >= 80 ? "bg-success" : healthScore >= 60 ? "bg-warning" : "bg-severity-critical")
              : "bg-muted";
            
            return <div key={i} className={`h-1.5 flex-1 rounded-sm transition-all duration-500 ${bgClass}`} style={{ transitionDelay: `${i * 50}ms` }} />;
          })}
        </div>
      </div>

      {/* Main Grid - Compact */}
      <div className="grid gap-2 md:grid-cols-[1.2fr_1fr]">
        {/* Revenue Card - Compact */}
        <Link
          to="/platform/financials"
          className="group rounded-lg border border-border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Revenue</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success/10 text-success">
              {activeSubs} active
            </span>
          </div>
          
          <div className="text-3xl font-bold tabular-nums text-success leading-tight">
            {fmtPKR.format(mrr)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total Platform Revenue</p>

          {/* Compact Growth with Sparkline */}
          <div className="mt-2">
            <div className={`flex items-center gap-1 text-[11px] font-semibold ${positive ? "text-success" : "text-severity-critical"}`}>
              {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{positive ? "+" : ""}{mrrDeltaPct ?? 0}% vs last month</span>
            </div>

            {/* Compact Neon Sparkline */}
            {mrrSpark && mrrSpark.length > 1 && (
              <div className="h-8 -mx-0.5 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrSpark.map(v => ({ v }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="platformRevSparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={positive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={positive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="v" 
                      stroke={positive ? "hsl(var(--success))" : "hsl(var(--severity-critical))"} 
                      strokeWidth={1.5} 
                      fill="url(#platformRevSparkGrad)" 
                      dot={false} 
                      isAnimationActive={true} 
                      animationDuration={800} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Link>

        {/* Platform Metrics - Compact Hairline Grid (No Icons) */}
        <HairlineGrid cols="grid-cols-1">
          {rows.map((r) => {
            return (
              <Link key={r.label} to={r.to}>
                <NeonPanel className="hover:bg-muted/30 cursor-pointer transition-colors py-1.5 px-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">{r.label}</span>
                    <span className={`text-lg font-bold tabular-nums ${r.danger ? "text-severity-critical" : "text-foreground"}`}>
                      {r.value}
                    </span>
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