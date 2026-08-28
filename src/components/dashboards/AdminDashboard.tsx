import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { KpiSummary } from "./KpiSummary";
import { InsightsStrip } from "./InsightsStrip";
import {
  DashboardSiloCards,
  IncomingQueueCard,
  FieldIncidentsCard,
  RecentActivityCard,
  RecentBatchesCard,
  IncidentsCard,
} from "./DashboardBlocks";
import type { RangeKey } from "./RangeChip";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { useTranslation } from "@/i18n";

export function AdminDashboard({ name }: { name?: string }) {
  const [range, setRange] = useState<RangeKey>("mtd");
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);
  const { t } = useTranslation();

  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({
    queryKey: ["dashboard-extras", range],
    queryFn: () => fn({ data: { range } }),
    refetchInterval: 30_000,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <WelcomeBanner name={name} />

        <div className="space-y-3 mt-1 min-w-0">
          <KpiSummary
            range={range}
            onRange={setRange}
            deltaBatches={extras?.deltas?.batches?.pct}
            deltaAlerts={extras?.deltas?.alerts?.pct}
            revenueMtd={extras?.revenueMtd}
            revenueDeltaPct={extras?.revenueDeltaPct}
            revenueSpark={extras?.revenueSpark}
            planName={extras?.subscription?.plan_name}
          />
          <InsightsStrip
            insights={extras?.insights}
            ordersOpen={extras?.installCounts?.pending}
            alertsOpen={extras?.deltas?.alerts?.cur}
            pipeline={extras?.pipeline}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            <IncomingQueueCard range={range} />
            <FieldIncidentsCard />
            <RecentActivityCard />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <RecentBatchesCard range={range} />
            <IncidentsCard
              onViewAll={() => setTicketPanelOpen(true)}
              ticketPanelOpen={ticketPanelOpen}
              onTicketPanelClose={() => setTicketPanelOpen(false)}
            />
          </div>

          {/* Row 3: Metric Cards - 12 Column Grid
              - Health gauge card: 4 columns
              - Revenue trend metrics: 8 columns */}
          <div className="grid gap-3 sm:grid-cols-12 w-full">
            {/* Health Gauge Card - 4 columns */}
            <div className="sm:col-span-12 lg:col-span-4">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 sm:p-6 shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-foreground">{t("adminDash.systemHealth")}</h3>
                <div className="flex items-center justify-center h-40 bg-neutral-50 dark:bg-neutral-700 rounded text-muted-foreground">
                  {t("adminDash.healthGauge")}
                </div>
              </div>
            </div>

            {/* Revenue Trend Metrics - 8 columns */}
            <div className="sm:col-span-12 lg:col-span-8">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 sm:p-6 shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-foreground">{t("adminDash.revenueTrends")}</h3>
                <div className="flex items-center justify-center h-40 bg-neutral-50 dark:bg-neutral-700 rounded text-muted-foreground">
                  {t("adminDash.revenueTrendViz")}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Data Tables */}
          <div className="grid gap-3 sm:grid-cols-2 w-full">
            {/* Silos List Table */}
            <div className="w-full">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-foreground">{t("adminDash.silos")}</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <DashboardSiloCards range={range} />
                </div>
              </div>
            </div>

            {/* Batches List Table */}
            <div className="w-full">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-foreground">{t("adminDash.recentBatches")}</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <RecentBatchesCard range={range} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Incidents */}
          <div className="w-full">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-foreground">{t("adminDash.incidents")}</h3>
              </div>
              <div className="p-4 sm:p-6">
                <IncidentsCard
                  onViewAll={() => setTicketPanelOpen(true)}
                  ticketPanelOpen={ticketPanelOpen}
                  onTicketPanelClose={() => setTicketPanelOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
