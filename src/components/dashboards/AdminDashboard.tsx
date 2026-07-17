import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, TeamCard, ActuatorsCard, SilosOccupancyCard } from "./DashboardBlocks";
import { Badge } from "@/components/ui/badge";

export function AdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <AdminPageShell
      title={`Welcome back, ${name || "Admin"}`}
      subtitle="Tenant overview: team, silos, revenue and operations"
      actions={<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Admin</Badge>}
    >
      <AdminSummaryTiles
        columns={5}
        tiles={[
          { key: "buyers", label: "Buyers", value: s?.buyers ?? "—" },
          { key: "wh", label: "Warehouses", value: s?.warehouses ?? "—" },
          { key: "batches", label: "Active batches", value: s?.batches.active ?? "—" },
          { key: "silos", label: "Silos", value: s?.silos ?? "—" },
          { key: "sensors", label: "Sensors online", value: s?.sensors.online ?? "—" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RecentBatchesCard />
        <RecentAlertsCard />
        <TeamCard />
        <ActuatorsCard />
        <SilosOccupancyCard />
      </div>
    </AdminPageShell>
  );
}