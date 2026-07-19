import { motion, LayoutGroup } from "framer-motion";
import { useDashboardStats } from "./useDashboardStats";
import { RecentBatchesCard, RecentAlertsCard, ActuatorsCard, SilosOccupancyCard } from "./DashboardBlocks";
import { KpiStrip } from "./KpiStrip";
import { InstallOrdersMini, RevenueMini } from "./MiniBlocks";
import { WelcomeBanner } from "./WelcomeBanner";
import { Users, Warehouse, Wheat, Container, Radio } from "lucide-react";

export function AdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
      <LayoutGroup>
        <WelcomeBanner name={name} />
        <motion.div layout className="space-y-3">
          <KpiStrip
            tiles={[
              { key: "buyers", label: "Buyers", value: s?.buyers ?? "—", to: "/buyers", icon: Users },
              { key: "wh", label: "Warehouses", value: s?.warehouses ?? "—", to: "/warehouses", icon: Warehouse },
              { key: "batches", label: "Batches", value: s?.batches.active ?? "—", to: "/grain-batches", icon: Wheat },
              { key: "silos", label: "Silos", value: s?.silos ?? "—", to: "/silos", icon: Container },
              { key: "sensors", label: "Sensors", value: s?.sensors.online ?? "—", to: "/sensors", icon: Radio },
            ]}
          />

          <div className="grid gap-3 lg:grid-cols-2">
            <SilosOccupancyCard />
            <RecentAlertsCard />
            <ActuatorsCard />
            <RecentBatchesCard />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InstallOrdersMini />
            <RevenueMini />
          </div>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}