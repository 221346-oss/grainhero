import { Package, Truck, AlertTriangle, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { PageHeader, StatCard } from "./_shared";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, SilosOccupancyCard, ActuatorsCard } from "./DashboardBlocks";

export function ManagerDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Manager Dashboard${name ? ` — ${name}` : ""}`}
        subtitle="Operational overview of batches, dispatch and grain quality"
        badge="Manager"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Batches" value={s?.batches.total ?? "—"} icon={Package} accent="emerald" />
        <StatCard label="Active" value={s?.batches.active ?? "—"} icon={Activity} accent="sky" />
        <StatCard label="Silos" value={s?.silos ?? "—"} icon={Truck} accent="violet" />
        <StatCard label="Buyers" value={s?.buyers ?? "—"} icon={TrendingUp} accent="emerald" />
        <StatCard label="Open Alerts" value={s?.alerts.open ?? "—"} icon={AlertTriangle} accent="rose" />
        <StatCard label="Critical" value={s?.alerts.critical ?? "—"} icon={BarChart3} accent="amber" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <RecentBatchesCard />
        <RecentAlertsCard />
        <SilosOccupancyCard />
        <ActuatorsCard />
      </div>
    </div>
  );
}