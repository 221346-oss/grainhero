import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, SilosOccupancyCard, ActuatorsCard } from "./DashboardBlocks";
import { Badge } from "@/components/ui/badge";

export function ManagerDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <AdminPageShell
      title={`Manager${name ? ` — ${name}` : ""}`}
      subtitle="Operational overview of batches, dispatch and grain quality"
      actions={<Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Manager</Badge>}
    >
      <AdminSummaryTiles
        columns={5}
        tiles={[
          { key: "t", label: "Total batches", value: s?.batches.total ?? "—" },
          { key: "a", label: "Active", value: s?.batches.active ?? "—" },
          { key: "s", label: "Silos", value: s?.silos ?? "—" },
          { key: "b", label: "Buyers", value: s?.buyers ?? "—" },
          { key: "o", label: "Open alerts", value: s?.alerts.open ?? "—" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <RecentBatchesCard />
        <RecentAlertsCard />
        <SilosOccupancyCard />
        <ActuatorsCard />
      </div>
    </AdminPageShell>
  );
}