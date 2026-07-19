import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { DashTabs, type TabKey } from "./DashTabs";
import { KpiSummary } from "./KpiSummary";
import { InsightsStrip } from "./InsightsStrip";
import { BatchesTable } from "./BatchesTable";
import { SilosOccupancyCard, RecentAlertsCard } from "./DashboardBlocks";
import type { RangeKey } from "./RangeChip";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";

export function AdminDashboard({ name }: { name?: string }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<RangeKey>("mtd");

  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({
    queryKey: ["dashboard-extras", range],
    queryFn: () => fn({ data: { range } }),
    refetchInterval: 30_000,
  });

  const showKpi = tab === "overview";
  const showInsights = tab === "overview" || tab === "batches" || tab === "actuators";
  const showBatches = tab === "overview" || tab === "batches";
  const showSilos = tab === "overview" || tab === "silos";
  const showAlerts = tab === "overview" || tab === "alerts";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <LayoutGroup>
          <WelcomeBanner name={name} />
          <DashTabs active={tab} onChange={setTab} />

          <motion.div layout className="space-y-3 mt-1">
            {showKpi && (
              <KpiSummary
                range={range}
                onRange={setRange}
                deltaBatches={extras?.deltas?.batches?.pct}
                deltaAlerts={extras?.deltas?.alerts?.pct}
              />
            )}

            {showInsights && (
              <InsightsStrip range={range} onRange={setRange} insights={extras?.insights} />
            )}

            {showBatches && (
              <BatchesTable rows={(extras?.allBatches ?? []) as never} />
            )}

            {(showSilos || showAlerts) && (
              <div className="grid gap-3 lg:grid-cols-2">
                {showSilos && <SilosOccupancyCard />}
                {showAlerts && <RecentAlertsCard />}
              </div>
            )}
          </motion.div>
        </LayoutGroup>
      </div>
    </TooltipProvider>
  );
}