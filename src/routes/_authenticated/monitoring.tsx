import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { SensorsSection } from "@/components/monitoring/SensorsSection";
import { ActuatorsSection } from "@/components/monitoring/ActuatorsSection";
import { AlertsSection } from "@/components/monitoring/AlertsSection";
import { EnvironmentalSection } from "@/components/monitoring/EnvironmentalSection";
import { DeviceHealthSection } from "@/components/monitoring/DeviceHealthSection";
import { MaintenanceSection } from "@/components/monitoring/MaintenanceSection";
import { IncidentsSection } from "@/components/monitoring/IncidentsSection";
import { Cpu, Zap, AlertTriangle, Wind, Server, Wrench, AlertOctagon, TrendingUp, TrendingDown } from "lucide-react";
import { listSensorDevices, listActuators, listGrainAlerts } from "@/lib/operations.functions";
import { getDeviceHealth, getMaintenanceOverview } from "@/lib/operations2.functions";
import { getIncidents } from "@/lib/monitoring.functions";

export const Route = createFileRoute("/_authenticated/monitoring")({
  component: MonitoringWorkspace,
});

type Tab = "sensors" | "actuators" | "alerts" | "environmental" | "health" | "maintenance" | "incidents";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "sensors",       label: "Sensors",        icon: Cpu },
  { key: "actuators",     label: "Actuators",      icon: Zap },
  { key: "alerts",        label: "Alerts",         icon: AlertTriangle },
  { key: "environmental", label: "Environmental",  icon: Wind },
  { key: "health",        label: "Device Health",  icon: Server },
  { key: "maintenance",   label: "Maintenance",    icon: Wrench },
  { key: "incidents",     label: "Incidents",      icon: AlertOctagon },
];

const BAR_COLORS = Array.from({ length: 12 }, () => "from-primary/70 to-primary");

function MonitoringWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("sensors");

  const listSensorsFn = useServerFn(listSensorDevices);
  const listActuatorsFn = useServerFn(listActuators);
  const listAlertsFn = useServerFn(listGrainAlerts);
  const getIncidentsFn = useServerFn(getIncidents);
  const getMaintenanceFn = useServerFn(getMaintenanceOverview);
  const getHealthFn = useServerFn(getDeviceHealth);

  const { data: sensors } = useQuery({ queryKey: ["sensor-devices"], queryFn: () => listSensorsFn() });
  const { data: actuators } = useQuery({ queryKey: ["actuators"], queryFn: () => listActuatorsFn() });
  const { data: alerts } = useQuery({ queryKey: ["grain-alerts"], queryFn: () => listAlertsFn() });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: () => getIncidentsFn() });
  const { data: maintenance } = useQuery({ queryKey: ["maintenance-overview"], queryFn: () => getMaintenanceFn() });
  const { data: health } = useQuery({ queryKey: ["device-health"], queryFn: () => getHealthFn(), refetchInterval: 15_000 });

  const counts = {
    sensors: Array.isArray(sensors) ? sensors.length : 0,
    actuators: Array.isArray(actuators) ? actuators.length : 0,
    alerts: Array.isArray(alerts) ? alerts.filter((a: any) => a.status === "pending").length : 0,
    environmental: 0,
    health: health?.totals?.total ?? 0,
    maintenance: Array.isArray(maintenance?.devices)
      ? maintenance.devices.filter((d: any) => d.next_maintenance_date || d.calibration_due_date).length
      : 0,
    incidents: Array.isArray(incidents) ? incidents.length : 0,
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    { label: "Online Devices", value: health?.totals?.online ?? 0, up: true },
    { label: "Active Alerts", value: counts.alerts.toString(), up: false },
    { label: "Low Battery", value: health?.totals?.lowBattery ?? 0, up: false },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
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
              {TABS.map((tab, i) => {
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
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Key Metrics
            </p>
            <div className="space-y-0 divide-y divide-border flex-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                    <span className="text-muted-foreground/60">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-foreground font-black text-base font-mono">{s.value}</span>
                    {s.up
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    }
                  </div>
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
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VariableFontText text={tab.label} base={isActive ? 850 : 350} hover={850} staggerMs={30} />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/60"
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
            {activeTab === "sensors" && <SensorsSection />}
            {activeTab === "actuators" && <ActuatorsSection />}
            {activeTab === "alerts" && <AlertsSection />}
            {activeTab === "environmental" && <EnvironmentalSection />}
            {activeTab === "health" && <DeviceHealthSection />}
            {activeTab === "maintenance" && <MaintenanceSection />}
            {activeTab === "incidents" && <IncidentsSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
