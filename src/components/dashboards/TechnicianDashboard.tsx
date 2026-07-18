import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { useDashboardStats } from "./useDashboardStats";
import { ActuatorsCard, RecentAlertsCard, SilosOccupancyCard } from "./DashboardBlocks";
import { Badge } from "@/components/ui/badge";
import { CustomWidgetsBand } from "@/components/app/analytics/CustomWidgetsBand";

export function TechnicianDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <AdminPageShell
      title={`Technician${name ? ` — ${name}` : ""}`}
      subtitle="Sensor health, actuator status and open maintenance work"
      actions={<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Technician</Badge>}
    >
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "so", label: "Sensors online", value: `${s?.sensors.online ?? 0}/${s?.sensors.total ?? 0}` },
          { key: "aa", label: "Actuators active", value: `${s?.actuators.active ?? 0}/${s?.actuators.total ?? 0}` },
          { key: "oa", label: "Open alerts", value: s?.alerts.open ?? "—" },
          { key: "ca", label: "Critical", value: s?.alerts.critical ?? "—" },
        ]}
      />
      <CustomWidgetsBand />
      <div className="grid gap-4 md:grid-cols-2">
        <ActuatorsCard />
        <RecentAlertsCard />
        <SilosOccupancyCard />
      </div>
    </AdminPageShell>
  );
}