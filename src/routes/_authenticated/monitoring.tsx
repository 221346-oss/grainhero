import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
// Hidden section imports — retained for when tabs are re-enabled
// import { SensorsSection } from "@/components/monitoring/SensorsSection";
// import { ActuatorsSection } from "@/components/monitoring/ActuatorsSection";
// import { AlertsSection } from "@/components/monitoring/AlertsSection";
// import { EnvironmentalSection } from "@/components/monitoring/EnvironmentalSection";
// import { DeviceHealthSection } from "@/components/monitoring/DeviceHealthSection";
// import { MaintenanceSection } from "@/components/monitoring/MaintenanceSection";
import { IncidentsSection } from "@/components/monitoring/IncidentsSection";
import {
  Cpu,
  Zap,
  AlertTriangle,
  Wind,
  Server,
  Wrench,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { listSensorDevices, listActuators, listGrainAlerts } from "@/lib/operations.functions";
import { getDeviceHealth, getMaintenanceOverview } from "@/lib/operations2.functions";
import { getIncidents } from "@/lib/monitoring.functions";
import { getMyRole } from "@/lib/roles.functions";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — Grain Hero" },
      {
        name: "description",
        content: "Monitoring workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Monitoring — Grain Hero" },
      { property: "og:description", content: "Monitoring workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MonitoringWorkspace,
});

type Tab =
  "sensors" | "actuators" | "alerts" | "environmental" | "health" | "maintenance" | "incidents";

// Only Incidents is shown for now. Other tabs hidden until IoT sensors are
// fully defined and integrated. Code retained for future use.
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "sensors", label: "Sensors", icon: Cpu },
  { key: "actuators", label: "Actuators", icon: Zap },
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
  { key: "environmental", label: "Environmental", icon: Wind },
  { key: "health", label: "Device Health", icon: Server },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "incidents", label: "Incidents", icon: AlertOctagon },
];

const BAR_COLORS = Array.from({ length: 12 }, () => "from-primary/70 to-primary");

function MonitoringWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("incidents");

  const getIncidentsFn = useServerFn(getIncidents);
  const getMaintenanceFn = useServerFn(getMaintenanceOverview);
  const getHealthFn = useServerFn(getDeviceHealth);
  const roleFn = useServerFn(getMyRole);
  const listSensorsFn = useServerFn(listSensorDevices);
  const listActuatorsFn = useServerFn(listActuators);
  const listAlertsFn = useServerFn(listGrainAlerts);

  const { data: sensors } = useQuery({
    queryKey: ["sensor-devices"],
    queryFn: () => listSensorsFn(),
  });
  const { data: actuators } = useQuery({
    queryKey: ["actuators"],
    queryFn: () => listActuatorsFn(),
  });
  const { data: alerts } = useQuery({ queryKey: ["grain-alerts"], queryFn: () => listAlertsFn() });
  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => getIncidentsFn(),
  });
  const { data: maintenance } = useQuery({
    queryKey: ["maintenance-overview"],
    queryFn: () => getMaintenanceFn(),
  });
  const { data: health } = useQuery({
    queryKey: ["device-health"],
    queryFn: () => getHealthFn(),
    refetchInterval: 15_000,
  });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });

  const userRole = roleData?.role ?? "pending";

  // Set default tab based on role
  useEffect(() => {
    if (userRole === "manager" && activeTab !== "incidents") {
      setActiveTab("incidents");
    }
  }, [userRole, activeTab]);

  if (!roleData) return <KpiChartHubSkeleton />;

  // Filter tabs based on role - manager only sees Incidents tab
  const visibleTabs = userRole === "manager" ? TABS.filter((t) => t.key === "incidents") : TABS;

  const counts = {
    sensors: Array.isArray(sensors) ? sensors.length : 0,
    actuators: Array.isArray(actuators) ? actuators.length : 0,
    alerts: Array.isArray(alerts) ? alerts.filter((a: any) => a.status === "pending").length : 0,
    environmental: 0,
    health: health?.totals?.total ?? 0,
    maintenance: Array.isArray(maintenance?.devices)
      ? maintenance.devices.filter((d: any) => d.next_maintenance_date || d.calibration_due_date)
          .length
      : 0,
    incidents: Array.isArray(incidents) ? incidents.length : 0,
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    {
      label: "Open Incidents",
      value: Array.isArray(incidents)
        ? incidents.filter((i: any) => i.status !== "resolved").length
        : 0,
      up: false,
    },
    { label: "Total Incidents", value: Array.isArray(incidents) ? incidents.length : 0, up: true },
    // Hidden until sensors are defined:
    // { label: "Online Devices", value: health?.totals?.online ?? 0, up: true },
    // { label: "Active Alerts",  value: counts.alerts ?? 0,          up: false },
    // { label: "Low Battery",    value: health?.totals?.lowBattery ?? 0, up: false },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            <VariableFontText text="Monitoring" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time device status, alerts, and operational insights
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Monitoring Overview
            </p>
            <div className="space-y-4">
              {visibleTabs.map((tab, i) => {
                const count = counts[tab.key];
                const pct = Math.max((count / maxCount) * 100, count > 0 ? 4 : 0);
                return (
                  <div key={tab.key} className="flex items-center gap-4">
                    <span className="w-24 text-xs text-muted-foreground font-mono truncate text-right shrink-0">
                      {tab.label.split(" ")[0]}…
                    </span>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                      <div
                        className={`h-full rounded-md bg-gradient-to-r ${BAR_COLORS[i]} transition-all duration-700`}
                        style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                          backgroundSize: "8px 8px",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground font-mono shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-card border border-border rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between relative h-full">
            <div className="flex justify-between items-start mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Key Metrics
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
                Last 12 Cycles
              </p>
            </div>
            <div className="space-y-6 flex-1 flex flex-col justify-center mt-2">
              {stats.map((s, idx) => (
                <div key={s.label} className="w-full">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center w-[45%] min-w-[120px]">
                      <div className="truncate">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <p className="text-base font-black text-foreground truncate">{s.value}</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-2">
                      <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 bottom-0 rounded-full ${s.up ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: "0%" }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-12 shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">0.0%</span>
                    </div>
                  </div>
                  {idx < stats.length - 1 && <div className="h-px w-full bg-border mt-6" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Tab Bar — variable-font hover nav */}
          <div className="border-b border-border px-4 md:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VariableFontText
                      text={tab.label}
                      base={isActive ? 850 : 350}
                      hover={850}
                      staggerMs={30}
                    />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground/60"
                      }`}
                    >
                      {counts[tab.key]}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="monitoring-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === "incidents" && <IncidentsSection />}
            {/* Hidden until IoT sensors are defined — code retained */}
            {/* {activeTab === "sensors"       && <SensorsSection />}       */}
            {/* {activeTab === "actuators"     && <ActuatorsSection />}     */}
            {/* {activeTab === "alerts"        && <AlertsSection />}        */}
            {/* {activeTab === "environmental" && <EnvironmentalSection />} */}
            {/* {activeTab === "health"        && <DeviceHealthSection />}  */}
            {/* {activeTab === "maintenance"   && <MaintenanceSection />}   */}
          </div>
        </div>
      </div>
    </div>
  );
}
