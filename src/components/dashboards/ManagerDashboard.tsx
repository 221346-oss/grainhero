import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeBanner } from "./WelcomeBanner";
import { ManagerKpiSummary } from "./ManagerKpiSummary";
import { ManagerBento } from "./ManagerBento";
import type { RangeKey } from "./RangeChip";
import { getManagerDashboard } from "@/lib/manager-dashboard.functions";

export function ManagerDashboard({ name }: { name?: string }) {
  const [range, setRange] = useState<RangeKey>("mtd");
  const fn = useServerFn(getManagerDashboard);
  const { data } = useQuery({
    queryKey: ["manager-dashboard", range],
    queryFn: () => fn({ data: { range } }),
    refetchInterval: 30_000,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
        <WelcomeBanner name={name} />
        <div className="mt-6 space-y-6">
          <ManagerKpiSummary
            range={range}
            onRange={setRange}
            kpis={data?.kpis}
            fillSpark={data?.fillSpark}
            silos={data?.silos}
          />
          <ManagerBento
            silos={(data?.silos ?? []) as never}
            alerts={(data?.alerts ?? []) as never}
            qcQueue={(data?.qcQueue ?? []) as never}
            dispatchQueue={(data?.dispatchQueue ?? []) as never}
            actuators={(data?.actuators ?? []) as never}
            buyers={(data?.buyers ?? []) as never}
            spoiledBatches={(data?.spoiledBatches ?? []) as never}
            technicians={(data?.technicians ?? []) as never}
          />

          {/* Removed ManagerTeamStrip as it's now in ManagerBento bottom row */}
        </div>
      </div>
    </TooltipProvider>
  );
}
