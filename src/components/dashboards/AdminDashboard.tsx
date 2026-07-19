import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, ActuatorsCard, SilosOccupancyCard } from "./DashboardBlocks";
import { Badge } from "@/components/ui/badge";
import { KpiStrip } from "./KpiStrip";
import { TeamMini, InstallOrdersMini, RevenueMini } from "./MiniBlocks";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { Users, Warehouse, Wheat, Container, Radio } from "lucide-react";

export function AdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  const fn = useServerFn(getDashboardExtras);
  const { data: extras } = useQuery({ queryKey: ["dashboard-extras"], queryFn: () => fn(), refetchInterval: 30_000 });
  const trends = extras?.trends;

  return (
    <AdminPageShell
      title={`Admin${name ? ` — ${name}` : ""}`}
      subtitle="Tenant overview: team, silos, revenue and operations"
      actions={<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Admin</Badge>}
    >
      <KpiStrip
        tiles={[
          { key: "buyers", label: "Buyers", value: s?.buyers ?? "—", to: "/buyers", icon: Users },
          { key: "wh", label: "Warehouses", value: s?.warehouses ?? "—", to: "/warehouses", icon: Warehouse },
          { key: "batches", label: "Active batches", value: s?.batches.active ?? "—", to: "/grain-batches", icon: Wheat, delta: trends?.newBatches7d ? `+${trends.newBatches7d} in 7d` : null },
          { key: "silos", label: "Silos", value: s?.silos ?? "—", to: "/silos", icon: Container },
          { key: "sensors", label: "Sensors online", value: s?.sensors.online ?? "—", to: "/sensors", icon: Radio, delta: trends?.newSensors7d ? `+${trends.newSensors7d} in 7d` : null },
        ]}
      />

      {/* Operations grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <SilosOccupancyCard />
          <ActuatorsCard />
        </div>
        <div className="space-y-3">
          <RecentAlertsCard />
          <RecentBatchesCard />
        </div>
      </div>

      {/* Secondary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TeamMini />
        <InstallOrdersMini />
        <RevenueMini />
      </div>

    </AdminPageShell>
  );
}