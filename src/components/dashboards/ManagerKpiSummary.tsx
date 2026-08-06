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
  // Get the selected silo data or use overall data based on time range
  let fillPct = 0;
  let siloName = "Overall Capacity";
  let currentFill = 0;
  let totalCapacity = 0;

  // Calculate capacity based on time range - simulate historical data
  const getCapacityByRange = (baseCapacity: number, baseFill: number, timeRange: RangeKey) => {
    const capacityVariations = {
      today: { capacity: baseCapacity * 0.95, fill: baseFill * 0.92 },
      "7d": { capacity: baseCapacity * 0.97, fill: baseFill * 0.94 },
      "30d": { capacity: baseCapacity * 0.98, fill: baseFill * 0.96 },
      mtd: { capacity: baseCapacity, fill: baseFill },
      ytd: { capacity: baseCapacity * 1.02, fill: baseFill * 1.01 },
    };
    return capacityVariations[timeRange] || capacityVariations.mtd;
  };

  if (selectedSilo) {
    const silo = silos.find((s) => s.id === selectedSilo);
    if (silo) {
      const rangeData = getCapacityByRange(silo.capacity_kg, silo.current_occupancy_kg ?? 0, range);
      fillPct = rangeData.capacity
        ? Math.round((rangeData.fill / rangeData.capacity) * 100)
        : 0;
      siloName = silo.name;
      currentFill = rangeData.fill;
      totalCapacity = rangeData.capacity;
    }
  } else {
    // Calculate average capacity for "Overall Capacity" option with time range consideration
    const totalSilos = silos.length;
    if (totalSilos > 0) {
      const totalCapacitySum = silos.reduce((sum, s) => sum + s.capacity_kg, 0);
      const totalFillSum = silos.reduce((sum, s) => sum + (s.current_occupancy_kg ?? 0), 0);
      const baseAverageCapacity = totalCapacitySum / totalSilos;
      const baseAverageFill = totalFillSum / totalSilos;
      
      const rangeData = getCapacityByRange(baseAverageCapacity, baseAverageFill, range);
      fillPct = rangeData.capacity ? Math.round((rangeData.fill / rangeData.capacity) * 100) : 0;
      
      // Update silo name to reflect time period
      const timeLabels = {
        today: "Today's Capacity",
        "7d": "7-Day Avg Capacity",
        "30d": "30-Day Avg Capacity",
        mtd: "Monthly Avg Capacity",
        ytd: "Yearly Avg Capacity",
      };
      siloName = timeLabels[range] || "Average Capacity";
      currentFill = rangeData.fill;
      totalCapacity = rangeData.capacity;
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
    <div className="rounded-lg border bg-card p-3 flex flex-col min-h-[240px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-foreground">
          Silo Fill
        </span>
        <RangeChip value={range} onChange={onRange} />
      </div>

      {/* Smaller Semi-circle donut chart */}
      <div className="flex-1 flex items-center justify-center py-2">
        <div className="relative">
          <div className="relative h-32 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="75%"
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
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
              <div
                className="text-3xl font-bold tabular-nums leading-tight"
                style={{ color: getCapacityColor(fillPct) }}
              >
                {fillPct}%
              </div>
              <div className="text-xs font-medium text-muted-foreground text-center mt-1">
                {siloName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const [factorPeriod, setFactorPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const k = kpis;
  const fill = k?.fillPct ?? 0;
  const fmtKg = (n: number) => `${Math.round(n / 1000).toLocaleString()}t`;

  // Grain affecting factors data for bar chart - environmental factors impact on grain storage
  const grainFactorsData = [
    { name: "Temperature", weekly: 4, monthly: 18, yearly: 72 },
    { name: "Grain Moisture", weekly: 5, monthly: 22, yearly: 85 },
    { name: "Humidity", weekly: 3, monthly: 15, yearly: 60 },
    { name: "Pest Presence", weekly: 2, monthly: 8, yearly: 35 },
    { name: "Dew Point", weekly: 3, monthly: 12, yearly: 48 },
    { name: "Storage Days", weekly: 1, monthly: 5, yearly: 95 },
    { name: "Air Flow", weekly: 2, monthly: 10, yearly: 40 },
    { name: "Ambient Light", weekly: 1, monthly: 3, yearly: 15 },
    { name: "Ventilation", weekly: 2, monthly: 9, yearly: 38 },
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

        {/* Grain Factors Impact - Bar Chart */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b bg-card/60 flex items-center justify-between">
            <h3 className="text-xs font-semibold">Grain Storage Factors Impact</h3>
            <select
              value={factorPeriod}
              onChange={(e) => setFactorPeriod(e.target.value as "weekly" | "monthly" | "yearly")}
              className="h-7 text-xs border rounded px-2 bg-background dark:bg-slate-900"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="p-2 h-full">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={grainFactorsData} barCategoryGap="10%">
                <defs>
                  {/* Define diagonal stripe patterns for each grain factor */}
                  <pattern id="diagonalHatch1" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#ef4444" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#dc2626" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch2" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#3b82f6" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#1d4ed8" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch3" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#06b6d4" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#0891b2" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch4" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#8b5cf6" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#7c3aed" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch5" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#06d6a0" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#059669" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch6" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#fbbf24" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#f59e0b" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch7" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#10b981" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#047857" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch8" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#f97316" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#ea580c" strokeWidth="0.8"/>
                  </pattern>
                  <pattern id="diagonalHatch9" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#6366f1" opacity="0.9"/>
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#4f46e5" strokeWidth="0.8"/>
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
                />
                <Bar dataKey={factorPeriod} radius={[4, 4, 0, 0]}>
                  {grainFactorsData.map((entry, index) => {
                    const patterns = [
                      'url(#diagonalHatch1)', // Temperature - Red
                      'url(#diagonalHatch2)', // Grain Moisture - Blue
                      'url(#diagonalHatch3)', // Humidity - Cyan
                      'url(#diagonalHatch4)', // Pest Presence - Purple
                      'url(#diagonalHatch5)', // Dew Point - Teal
                      'url(#diagonalHatch6)', // Storage Days - Amber
                      'url(#diagonalHatch7)', // Air Flow - Green
                      'url(#diagonalHatch8)', // Ambient Light - Orange
                      'url(#diagonalHatch9)', // Ventilation - Indigo
                    ];
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={patterns[index]} 
                        stroke="none"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
