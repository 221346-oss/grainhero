import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { KpiSummary } from "./KpiSummary";
import { InsightsStrip } from "./InsightsStrip";
import { AdminSilosCard, RecentBatchesCard, SupportTicketsCard } from "./DashboardBlocks";
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
          <div className="grid gap-3 lg:grid-cols-2">
            <AdminSilosCard range={range} />
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
