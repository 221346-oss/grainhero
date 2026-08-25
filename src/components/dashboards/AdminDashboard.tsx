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
import { useLocationScopeQuery } from "@/components/app/location/LocationScope";

export function AdminDashboard({ name }: { name?: string }) {
  const [range, setRange] = useState<RangeKey>("mtd");
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);

  // The active location is part of the cache key, not just the request. Without
  // it React Query would serve one city's rows for another on switch — the same
  // cross-location bleed the server filter exists to prevent, but with no
  // server-side bug to find. Keying by it also lets each location's results
  // coexist, which is what makes switching back instant.
  const { key: loc, params: locParams } = useLocationScopeQuery();

  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({
    queryKey: ["dashboard-extras", range, loc],
    queryFn: () => fn({ data: { range, ...locParams } }),
    refetchInterval: 30_000,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background p-4 sm:p-6">
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
        </div>
      </div>
    </TooltipProvider>
  );
}
