import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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
    // Calculate overall capacity
    totalCapacity = silos.reduce((sum, s) => sum + s.capacity_kg, 0);
    currentFill = silos.reduce((sum, s) => sum + (s.current_occupancy_kg ?? 0), 0);
    fillPct = totalCapacity ? Math.round((currentFill / totalCapacity) * 100) : 0;
  }

  const formatCapacity = (value: number) => `${Math.round(value / 1000).toLocaleString()}t`;

  // Create data for semi-circle donut chart with range markers
  const chartData = [
    { name: 'Used', value: fillPct, color: fillPct > 80 ? '#ef4444' : fillPct > 60 ? '#f59e0b' : '#10b981' },
    { name: 'Available', value: 100 - fillPct, color: '#f1f5f9' }
  ];

  // Range markers for the chart
  const rangeMarkers = [0, 20, 40, 60, 80, 100];
  
  return (
    <Link
      to="/grain-operations"
      search={{ tab: "silos" }}
      className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Silo Fill
        </span>
        {fillPct > 80 ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
            high
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            stable
          </span>
        )}
      </div>

      {/* Semi-circle donut chart */}
      <div className="relative flex flex-col items-center">
        <div className="relative h-24 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="90%"
                startAngle={180}
                endAngle={0}
                innerRadius={35}
                outerRadius={48}
                paddingAngle={0}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center percentage display */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <div className="text-2xl font-bold tabular-nums text-emerald-600 leading-tight">
              {fillPct}%
            </div>
            <div className="text-[9px] font-medium text-muted-foreground text-center">
              {siloName}
            </div>
          </div>
        </div>

        {/* Range markers */}
        <div className="relative w-48 mt-1">
          <div className="flex justify-between items-center">
            {rangeMarkers.map((marker, index) => (
              <div key={marker} className="flex flex-col items-center">
                <div className="w-0.5 h-2 bg-muted-foreground/40"></div>
                <span className="text-[8px] text-muted-foreground mt-0.5">{marker}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity info */}
        <div className="flex items-center justify-between w-full mt-2 text-[10px]">
          <span className="text-muted-foreground">
            {formatCapacity(currentFill)} of {formatCapacity(totalCapacity)}
          </span>
          <span className="text-muted-foreground">
            {selectedSilo ? 'capacity' : 'total'}
          </span>
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
  const k = kpis;
  const fill = k?.fillPct ?? 0;
  const fmtKg = (n: number) => `${Math.round(n / 1000).toLocaleString()}t`;
  const rows = [
    { label: "Active batches", value: k?.batchesActive ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "QC pending", value: k?.qcPending ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "Ready to dispatch", value: k?.dispatchReady ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "Open alerts", value: k?.alertsOpen ?? "—", to: "/grain-alerts", search: undefined as { tab: string } | undefined },
    { label: "Open orders", value: k?.ordersOpen ?? "—", to: "/orders", search: undefined as { tab: string } | undefined },
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
                  <span className="font-medium">Overall Capacity</span>
                </SelectItem>
                {silos.map((silo) => {
                  const fillPct = silo.capacity_kg 
                    ? Math.round(((silo.current_occupancy_kg ?? 0) / silo.capacity_kg) * 100)
                    : 0;
                  const formatCapacity = (value: number) => `${Math.round(value / 1000).toLocaleString()}t`;
                  
                  return (
                    <SelectItem key={silo.id} value={silo.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{silo.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {silo.silo_id} • {formatCapacity(silo.current_occupancy_kg ?? 0)} / {formatCapacity(silo.capacity_kg)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                fillPct > 85 ? "bg-red-500" : 
                                fillPct > 60 ? "bg-amber-500" : 
                                "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, fillPct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">
                            {fillPct}%
                          </span>
                        </div>
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
                <Link
                  to={r.to}
                  search={r.search as never}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                >
                  <span className="text-xs text-foreground">{r.label}</span>
                  <span className="text-sm font-bold tabular-nums text-foreground w-10 text-right">{r.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}