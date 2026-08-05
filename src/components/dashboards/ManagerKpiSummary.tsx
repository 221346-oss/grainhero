import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Eye, X } from "lucide-react";

function SiloCapacityChart({
  selectedSilo,
  silos,
  range,
  onRange,
}: {
  selectedSilo?: string;
  silos: Array<{
    id: string;
    silo_id: string;
    name: string;
    capacity_kg: number;
    current_occupancy_kg: number | null;
  }>;
  range: RangeKey;
  onRange: (v: RangeKey) => void;
}) {
  // Get the selected silo data or use overall data
  let fillPct = 0;
  let siloName = "Overall Capacity";
  let currentFill = 0;
  let totalCapacity = 0;

  if (selectedSilo) {
    const silo = silos.find((s) => s.id === selectedSilo);
    if (silo) {
      fillPct = silo.capacity_kg
        ? Math.round(((silo.current_occupancy_kg ?? 0) / silo.capacity_kg) * 100)
        : 0;
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
    if (percentage >= 90) return "#dc2626"; // Red - Overflow/Critical (90%+)
    if (percentage >= 70) return "#f59e0b"; // Amber - Fully filled (70-89%)
    if (percentage >= 40) return "#3b82f6"; // Blue - Half filled (40-69%)
    return "#10b981"; // Green - Stable/Less filled (0-39%)
  };

  const getCapacityLevel = (percentage: number) => {
    if (percentage >= 90) return "Critical";
    if (percentage >= 70) return "High";
    if (percentage >= 40) return "Medium";
    return "Low";
  };

  const chartData = [
    { name: "Used", value: fillPct, color: getCapacityColor(fillPct) },
    { name: "Available", value: 100 - fillPct, color: "#f1f5f9" },
  ];

  return (
    <Link
      to="/grain-operations"
      search={{ tab: "silos" }}
      className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col min-h-[240px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-foreground">
          Silo Fill
        </span>
        <RangeChip value={range} onChange={onRange} />
      </div>

      {/* Smaller Semi-circle donut chart */}
      <div className="flex-1 flex items-center justify-center py-2">
        <div className="relative">
          <div className="relative h-28 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="85%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={45}
                  outerRadius={58}
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
              <div
                className="text-3xl font-bold tabular-nums leading-tight"
                style={{ color: getCapacityColor(fillPct) }}
              >
                {fillPct}%
              </div>
              <div className="text-xs font-medium text-muted-foreground text-center mt-0.5">
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
  fillPct: number;
  totalCap: number;
  totalOcc: number;
  batchesTotal: number;
  batchesActive: number;
  alertsOpen: number;
  alertsCritical: number;
  qcPending: number;
  dispatchReady: number;
  actuatorsOn: number;
  actuatorsTotal: number;
  ordersOpen: number;
  spoiledBatches: number;
};

export function ManagerKpiSummary({
  range,
  onRange,
  kpis,
  fillSpark,
  silos,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  kpis?: ManagerKpis;
  fillSpark?: number[];
  silos?: Array<{
    id: string;
    silo_id: string;
    name: string;
    capacity_kg: number;
    current_occupancy_kg: number | null;
  }>;
}) {
  const [selectedSilo, setSelectedSilo] = useState<string>("");
  const k = kpis;
  const fill = k?.fillPct ?? 0;
  const fmtKg = (n: number) => `${Math.round(n / 1000).toLocaleString()}t`;

  // Alert breakdown data for bar chart - mock data representing alert types over time periods
  const alertChartData = [
    { name: "Humidity", weekly: 5, monthly: 18, yearly: 72 },
    { name: "Pest", weekly: 3, monthly: 12, yearly: 48 },
    { name: "Temperature", weekly: 7, monthly: 22, yearly: 85 },
    { name: "Moisture", weekly: 2, monthly: 8, yearly: 35 },
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
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_0.8fr]">
        {/* Semi-circle Silo Fill Chart */}
        {silos && (
          <SiloCapacityChart
            selectedSilo={selectedSilo}
            silos={silos}
            range={range}
            onRange={onRange}
          />
        )}

        {/* Alerts by Type - Bar Chart */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b bg-card/60 flex items-center justify-between">
            <h3 className="text-xs font-semibold">Alerts by Type</h3>
            <select
              defaultValue="monthly"
              className="h-7 text-xs border rounded px-2 bg-background dark:bg-slate-900"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="p-2 h-full">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={alertChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
                />
                <Bar dataKey="monthly" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
