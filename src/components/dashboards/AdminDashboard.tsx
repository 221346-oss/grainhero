import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { KpiSummary } from "./KpiSummary";
import { InsightsStrip } from "./InsightsStrip";
import {
  DashboardSiloCards, IncomingQueueCard, FieldIncidentsCard, RecentActivityCard,
  RecentBatchesCard, SupportTicketsCard,
} from "./DashboardBlocks";
import { DashboardSiloCards as AdminSilosCard } from "./DashboardBlocks";
import type { RangeKey } from "./RangeChip";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";

export function AdminDashboard({ name }: { name?: string }) {
  const [range, setRange] = useState<RangeKey>("mtd");
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);

  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({
    queryKey: ["dashboard-extras", range],
    queryFn: () => fn({ data: { range } }),
    refetchInterval: 30_000,
  });

  return (
    <TooltipProvider delayDuration={150}>
      {/* Main Container with padding and background */}
      <div className="w-full min-h-screen p-8 bg-neutral-100 dark:bg-neutral-900">
        {/* Welcome Banner */}
        <div className="mb-8">
          <WelcomeBanner name={name} />
        </div>

        {/* Grid Container - 12 columns with row gaps */}
        <div className="grid gap-6">
          {/* Row 1: KPI Summary */}
          <div className="w-full">
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
          </div>

          {/* Row 2: Insights Strip */}
          <div className="w-full">
            <InsightsStrip
              insights={extras?.insights}
              ordersOpen={extras?.installCounts?.pending}
              alertsOpen={extras?.deltas?.alerts?.cur}
              pipeline={extras?.pipeline}
            />
          </div>

          {/* Row 3: Metric Cards - 12 Column Grid
              - Health gauge card: 4 columns
              - Revenue trend metrics: 8 columns */}
          <div className="grid grid-cols-12 gap-6 w-full">
            {/* Health Gauge Card - 4 columns */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-foreground">System Health</h3>
                {/* Placeholder for health gauge component */}
                <div className="flex items-center justify-center h-40 bg-neutral-50 dark:bg-neutral-700 rounded text-muted-foreground">
                  Health Gauge Visualization
                </div>
              </div>
            </div>

            {/* Revenue Trend Metrics - 8 columns */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Revenue Trends</h3>
                {/* Placeholder for revenue metrics component */}
                <div className="flex items-center justify-center h-40 bg-neutral-50 dark:bg-neutral-700 rounded text-muted-foreground">
                  Revenue Trend Visualization
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Data Tables - 12 Column Stack
              - Silos List: Full width or 12 columns
              - Batches List: Full width or 12 columns */}
          <div className="grid grid-cols-12 gap-6 w-full">
            {/* Silos List Table */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-foreground">Silos</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <AdminSilosCard range={range} />
                </div>
              </div>
            </div>

            {/* Batches List Table */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-foreground">Recent Batches</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <RecentBatchesCard range={range} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Support Tickets */}
          <div className="w-full">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
              </div>
              <div className="p-6">
                <SupportTicketsCard
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
