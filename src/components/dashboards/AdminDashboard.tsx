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
  SupportTicketsCard,
} from "./DashboardBlocks";
import type { RangeKey } from "./RangeChip";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { useLocationScopeKey } from "@/components/app/location/LocationScope";

export function AdminDashboard({ name }: { name?: string }) {
  const [range, setRange] = useState<RangeKey>("mtd");
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);

  // The active location is part of the cache key, not just the request. Without
  // it React Query would serve one city's rows for another on switch — the same
  // cross-location bleed the server filter exists to prevent, but with no
  // server-side bug to find. Keying by it also lets each location's results
  // coexist, which is what makes switching back instant.
  const loc = useLocationScopeKey();

  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({
    queryKey: ["dashboard-extras", range, loc],
    queryFn: () => fn({ data: { range, loc: loc ?? undefined } }),
    refetchInterval: 30_000,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <WelcomeBanner name={name} />

        <div className="space-y-3 mt-1">
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
          <DashboardSiloCards range={range} />
          <div className="grid gap-3 lg:grid-cols-3">
            <IncomingQueueCard range={range} />
            <FieldIncidentsCard />
            <RecentActivityCard />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <RecentBatchesCard range={range} />
            <SupportTicketsCard
              onViewAll={() => setTicketPanelOpen(true)}
              ticketPanelOpen={ticketPanelOpen}
              onTicketPanelClose={() => setTicketPanelOpen(false)}
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
              <div className="bg-card dark:bg-neutral-800 rounded-lg p-6 shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-foreground">System Health</h3>
                {/* Placeholder for health gauge component */}
                <div className="flex items-center justify-center h-40 bg-neutral-50 dark:bg-neutral-700 rounded text-muted-foreground">
                  Health Gauge Visualization
                </div>
              </div>
            </div>

            {/* Revenue Trend Metrics - 8 columns */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-card dark:bg-neutral-800 rounded-lg p-6 shadow-md h-full">
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
              <div className="bg-card dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-foreground">Silos</h3>
                </div>
                <div className="flex-1 overflow-auto">
                  <DashboardSiloCards range={range} />
                </div>
              </div>
            </div>

            {/* Batches List Table */}
            <div className="col-span-12 lg:col-span-6">
              <div className="bg-card dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
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
            <div className="bg-card dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
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
