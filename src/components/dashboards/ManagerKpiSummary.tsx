import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { NEON, NeonPatternDefs, neonFill } from "@/components/charts/neon";
import { Eye, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ActiveBatchesSidebar } from "./ActiveBatchesSidebar";
import { QcPendingSidebar } from "./QcPendingSidebar";
import { DispatchReadySidebar } from "./DispatchReadySidebar";
import { OpenAlertsSidebar } from "./OpenAlertsSidebar";
import { OpenOrdersSidebar } from "./OpenOrdersSidebar";

function SiloCapacityChart({ 
  selectedSilo, 
  silos 
}: { 
  selectedSilo?: string; 
  silos: Array<{ id: string; silo_id: string; name: string; capacity_kg: number; current_occupancy_kg: number | null }>; 
}) {
  // Get the selected silo data or use overall data
  let fillPct = 0;
  let siloName = "Overall Capacity";
  let currentFill = 0;
  let totalCapacity = 0;
  
  if (selectedSilo) {
    const silo = silos.find(s => s.id === selectedSilo);
    if (silo) {
      fillPct = silo.capacity_kg ? Math.round(((silo.current_occupancy_kg ?? 0) / silo.capacity_kg) * 100) : 0;
      siloName = silo.name;
      currentFill = silo.current_occupancy_kg ?? 0;
      totalCapacity = silo.capacity_kg;
    }
  } else {
    // Calculate average capacity for "Overall Capacity" option
    const totalSilos = silos.length;
    if (totalSilos > 0) {
      const totalCapacitySum = silos.reduce((sum, s) => sum + s.capacity_kg, 0);
      const totalFillSum = silos.reduce((sum, s) => sum + (s.current_occupancy_kg ?? 0), 0);
      const averageCapacity = totalCapacitySum / totalSilos;
      const averageFill = totalFillSum / totalSilos;
      
      fillPct = averageCapacity ? Math.round((averageFill / averageCapacity) * 100) : 0;
      siloName = "Average Capacity";
      currentFill = averageFill;
      totalCapacity = averageCapacity;
    }
  }

  const formatCapacity = (value: number) => `${Math.round(value / 1000).toLocaleString()}t`;

  // Create data for semi-circle donut chart with 4-level color categorization
  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return NEON.critical; // Overflow/Critical (90%+)
    if (percentage >= 70) return NEON.warning; // Fully filled (70-89%)
    if (percentage >= 40) return NEON.info; // Half filled (40-69%)
    return NEON.success; // Stable/Less filled (0-39%)
  };

  const getCapacityLevel = (percentage: number) => {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    return 'Low';
  };

  const chartData = [
    { name: 'Used', value: fillPct, color: getCapacityColor(fillPct) },
    { name: 'Available', value: 100 - fillPct, color: NEON.neutral }
  ];
  
  return (
    <Link
      to="/grain-operations"
      search={{ tab: "silos" }}
      className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col min-h-[280px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-foreground">
          Silo Fill
        </span>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums" style={{ color: getCapacityColor(fillPct) }}>
            {fillPct}%
          </div>
          <div className="text-[9px] text-muted-foreground">
            {getCapacityLevel(fillPct)}
          </div>
        </div>
      </div>

      {/* Larger Centered Semi-circle donut chart */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative">
          <div className="relative h-40 w-80">
            <NeonPatternDefs colors={[getCapacityColor(fillPct), NEON.neutral]} />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="90%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={78}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} {...neonFill(entry.color)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center percentage display */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
              <div className="text-4xl font-bold tabular-nums leading-tight" style={{ color: getCapacityColor(fillPct) }}>
                {fillPct}%
              </div>
              <div className="text-sm font-medium text-muted-foreground text-center mt-1">
                {siloName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export type ManagerKpis = {
  fillPct: number; totalCap: number; totalOcc: number;
  batchesTotal: number; batchesActive: number;
  alertsOpen: number; alertsCritical: number;
  qcPending: number; dispatchReady: number;
  actuatorsOn: number; actuatorsTotal: number;
  ordersOpen: number;
};

export function ManagerKpiSummary({
  range, onRange, kpis, fillSpark, silos,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  kpis?: ManagerKpis;
  fillSpark?: number[];
  silos?: Array<{ id: string; silo_id: string; name: string; capacity_kg: number; current_occupancy_kg: number | null }>;
}) {
  const [selectedSilo, setSelectedSilo] = useState<string>("");
  const [activeBatchesSidebarOpen, setActiveBatchesSidebarOpen] = useState(false);
  const [qcPendingSidebarOpen, setQcPendingSidebarOpen] = useState(false);
  const [dispatchReadySidebarOpen, setDispatchReadySidebarOpen] = useState(false);
  const [openAlertsSidebarOpen, setOpenAlertsSidebarOpen] = useState(false);
  const [openOrdersSidebarOpen, setOpenOrdersSidebarOpen] = useState(false);
  const k = kpis;
  const fill = k?.fillPct ?? 0;
  const fmtKg = (n: number) => `${Math.round(n / 1000).toLocaleString()}t`;
  const rows = [
    { 
      label: "Active batches", 
      value: k?.batchesActive ?? "—", 
      to: "/grain-operations", 
      search: { tab: "batches" },
      onViewClick: () => setActiveBatchesSidebarOpen(true)
    },
    { 
      label: "QC pending", 
      value: k?.qcPending ?? "—", 
      to: "/grain-operations", 
      search: { tab: "batches" },
      onViewClick: () => setQcPendingSidebarOpen(true)
    },
    { 
      label: "Ready to dispatch", 
      value: k?.dispatchReady ?? "—", 
      to: "/grain-operations", 
      search: { tab: "batches" },
      onViewClick: () => setDispatchReadySidebarOpen(true)
    },
    { 
      label: "Open alerts", 
      value: k?.alertsOpen ?? "—", 
      to: "/grain-alerts", 
      search: undefined as { tab: string } | undefined,
      onViewClick: () => setOpenAlertsSidebarOpen(true)
    },
    { 
      label: "Open orders", 
      value: k?.ordersOpen ?? "—", 
      to: "/orders", 
      search: undefined as { tab: string } | undefined,
      onViewClick: () => setOpenOrdersSidebarOpen(true)
    },
  ];

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Operations Summary</h2>
          <InfoDot text="Live silo utilisation and operational queues. Use the dropdown to view individual silo details." />
        </div>
        <div className="flex items-center gap-2">
          {silos && silos.length > 0 && (
            <Select value={selectedSilo} onValueChange={setSelectedSilo}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Select silo to analyze..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="font-medium">Average Capacity</span>
                </SelectItem>
                {silos.map((silo) => {
                  return (
                    <SelectItem key={silo.id} value={silo.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{silo.name}</span>
                        <span className="text-xs text-muted-foreground">{silo.silo_id}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          <RangeChip value={range} onChange={onRange} />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_35%]">
        {/* Semi-circle Silo Fill Chart */}
        {silos && (
          <SiloCapacityChart 
            selectedSilo={selectedSilo} 
            silos={silos}
          />
        )}

        {/* Queues */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.label}>
                <div className="flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition">
                  <Link
                    to={r.to}
                    search={r.search as never}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="text-xs text-foreground">{r.label}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground w-10 text-right">{r.value}</span>
                  </Link>
                  {r.onViewClick && (
                    <button
                      onClick={r.onViewClick}
                      className="ml-2 p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded transition-colors"
                      title="View details"
                    >
                      <Eye className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Batches Sidebar */}
      <ActiveBatchesSidebar 
        isOpen={activeBatchesSidebarOpen}
        onClose={() => setActiveBatchesSidebarOpen(false)}
      />
      
      {/* QC Pending Sidebar */}
      <QcPendingSidebar 
        isOpen={qcPendingSidebarOpen}
        onClose={() => setQcPendingSidebarOpen(false)}
      />
      
      {/* Dispatch Ready Sidebar */}
      <DispatchReadySidebar 
        isOpen={dispatchReadySidebarOpen}
        onClose={() => setDispatchReadySidebarOpen(false)}
      />
      
      {/* Open Alerts Sidebar */}
      <OpenAlertsSidebar 
        isOpen={openAlertsSidebarOpen}
        onClose={() => setOpenAlertsSidebarOpen(false)}
      />
      
      {/* Open Orders Sidebar */}
      <OpenOrdersSidebar 
        isOpen={openOrdersSidebarOpen}
        onClose={() => setOpenOrdersSidebarOpen(false)}
      />
    </section>
  );
}