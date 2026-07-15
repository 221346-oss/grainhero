import { Users, Building2, DollarSign, TrendingUp, Package, Activity } from "lucide-react";
import { PageHeader, StatCard } from "./_shared";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, TeamCard, ActuatorsCard, SilosOccupancyCard } from "./DashboardBlocks";

export function AdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title={`Admin${name ? ` — ${name}` : ""}`}
        subtitle="Tenant overview: team, silos, revenue and operations"
        badge="Admin"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Buyers" value={s?.buyers ?? "—"} icon={Users} accent="emerald" />
        <StatCard label="Warehouses" value={s?.warehouses ?? "—"} icon={Building2} accent="sky" />
        <StatCard label="Active Batches" value={s?.batches.active ?? "—"} icon={Package} accent="violet" />
        <StatCard label="Silos" value={s?.silos ?? "—"} icon={DollarSign} accent="emerald" />
        <StatCard label="Sensors Online" value={s?.sensors.online ?? "—"} icon={TrendingUp} accent="amber" />
        <StatCard label="Open Alerts" value={s?.alerts.open ?? "—"} icon={Activity} accent="rose" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <RecentBatchesCard />
        <RecentAlertsCard />
        <TeamCard />
        <ActuatorsCard />
        <SilosOccupancyCard />
      </div>
    </div>
  );
}