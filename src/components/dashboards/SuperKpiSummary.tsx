import { InfoDot } from "@/components/ui/InfoDot";
import { PlatformHealth } from "./super/PlatformHealth";
import { RevenueCard } from "./super/RevenueCard";
import { PlatformTotals } from "./super/PlatformTotals";

type HealthPoint = { date: string; score: number };
type MonthPoint = { month: string; revenue: number; lastYear: number };

/**
 * Platform Performance — health ring + 14-day trend (01), monthly revenue (02),
 * and the platform totals rail stack (03).
 */
export function SuperKpiSummary({
  mrr,
  mrrDeltaPct,
  activeSubs,
  totalTenants,
  totalUsers,
  ordersOpen,
  criticalAlerts,
  health,
  revenueSeries,
}: {
  mrr: number;
  mrrDeltaPct?: number;
  activeSubs: number;
  totalTenants: number;
  totalUsers: number;
  ordersOpen: number;
  criticalAlerts: number;
  health?: { score: number; trend: HealthPoint[]; peak: number; low: number; asOf?: string };
  revenueSeries?: MonthPoint[];
}) {
  // Fall back to the client-side formula until the analytics query resolves, so
  // the ring never renders empty on first paint.
  const fallbackScore = (() => {
    const revenueScore = Math.min(40, Math.max(0, 20 + (mrrDeltaPct ?? 0) * 0.5));
    const alertScore = criticalAlerts === 0 ? 30 : Math.max(0, 30 - criticalAlerts * 5);
    const subsScore = Math.min(30, (activeSubs / Math.max(1, totalTenants)) * 30);
    return Math.round(revenueScore + alertScore + subsScore);
  })();

  const score = health?.score ?? fallbackScore;
  const trend = health?.trend?.length ? health.trend : [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">Platform Performance</h2>
        <InfoDot text="Health score, revenue, and platform-wide totals." />
      </div>

      <PlatformHealth
        score={score}
        trend={trend}
        peak={health?.peak ?? score}
        low={health?.low ?? score}
        asOf={health?.asOf}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <RevenueCard
          mrr={mrr}
          deltaPct={mrrDeltaPct ?? 0}
          activeSubs={activeSubs}
          series={revenueSeries ?? []}
        />
        <PlatformTotals
          totalTenants={totalTenants}
          totalUsers={totalUsers}
          activeSubs={activeSubs}
          ordersOpen={ordersOpen}
          criticalAlerts={criticalAlerts}
        />
      </div>
    </section>
  );
}
