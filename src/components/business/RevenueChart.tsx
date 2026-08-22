import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

type TimeRange = "week" | "month" | "year";

export interface GrainConfig {
  key: "wheat" | "rice" | "maize" | "barley" | "sorghum";
  label: string;
  color: string;
}

export const GRAINS: GrainConfig[] = [
  { key: "wheat", label: "Wheat", color: "#f59e0b" },
  { key: "rice", label: "Rice", color: "#10b981" },
  { key: "maize", label: "Maize", color: "#84cc16" },
  { key: "barley", label: "Barley", color: "#8b5cf6" },
  { key: "sorghum", label: "Sorghum", color: "#f43f5e" },
];

interface RevenueChartProps {
  invoices?: Array<{
    id?: string;
    created_at: string;
    total_amount: number;
    payment_status?: string;
    items?: any;
    batch_ref?: string | null;
    notes?: string | null;
    grain_type?: string | null;
    grain_dispatches?: { dispatch_number?: string; grain_type?: string } | null;
    grain_batches?: { grain_type?: string } | null;
  }>;
  payments?: Array<{
    id?: string;
    payment_date: string;
    amount: number;
    status?: string;
    grain_dispatches?: { dispatch_number?: string; grain_type?: string } | null;
  }>;
}

function extractGrainType(inv: any): GrainConfig["key"] | null {
  const candidates: any[] = [];
  if (inv?.grain_dispatches?.grain_type) candidates.push(inv.grain_dispatches.grain_type);
  if (inv?.grain_batches?.grain_type) candidates.push(inv.grain_batches.grain_type);
  if (inv?.grain_type) candidates.push(inv.grain_type);
  if (Array.isArray(inv?.items)) {
    for (const item of inv.items) {
      if (item?.grain_type) candidates.push(item.grain_type);
      if (item?.description) candidates.push(item.description);
      if (item?.title) candidates.push(item.title);
    }
  }
  if (inv?.batch_ref) candidates.push(inv.batch_ref);
  if (inv?.notes) candidates.push(inv.notes);

  for (const text of candidates) {
    if (typeof text !== "string") continue;
    const lower = text.toLowerCase();
    if (lower.includes("wheat")) return "wheat";
    if (lower.includes("rice")) return "rice";
    if (lower.includes("maize") || lower.includes("corn")) return "maize";
    if (lower.includes("barley")) return "barley";
    if (lower.includes("sorghum")) return "sorghum";
  }
  return null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;

  return (
    <div className="bg-card/95 backdrop-blur-md border-border p-3.5 rounded-xl shadow-xl min-w-[210px] space-y-2">
      <div className="border-b border-border/70 pb-1.5 flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Grain Revenue
        </span>
      </div>
      <div className="space-y-1.5">
        {GRAINS.map((grain) => {
          const rev = Number(dataPoint?.[grain.key] ?? 0);
          const changePct = dataPoint?.[`${grain.key}_changePct`];
          const isGrowth = dataPoint?.[`${grain.key}_isGrowth`];

          return (
            <div key={grain.key} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: grain.color }}
                />
                <span className="font-medium text-foreground">{grain.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-foreground">
                  PKR {rev.toLocaleString()}
                </span>
                {changePct !== undefined && changePct !== null && (
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      isGrowth === true
                        ? "text-emerald-500"
                        : isGrowth === false
                        ? "text-rose-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isGrowth === true ? "+" : ""}
                    {Number(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function RevenueChart({ invoices = [], payments = [] }: RevenueChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  const processedData = useMemo(() => {
    const now = new Date();
    const data: Array<
      Record<string, any> & {
        date: string;
        fullLabel: string;
        wheat: number;
        rice: number;
        maize: number;
        barley: number;
        sorghum: number;
        total: number;
        collected: number;
      }
    > = [];

    let currentTotalRevenue = 0;
    let currentTotalCollected = 0;
    let previousTotalRevenue = 0;

    if (timeRange === "week") {
      // 4 Weeks view: Week 1 → Week 2 → Week 3 → Week 4
      const weeks = 4;
      for (let i = weeks - 1; i >= 0; i--) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (i + 1) * 7);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - i * 7);

        const periodInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate >= startDate && invDate < endDate;
        });

        const periodPayments = payments.filter((p) => {
          const payDate = new Date(p.payment_date);
          return payDate >= startDate && payDate < endDate && p.status === "completed";
        });

        const grainRev: Record<GrainConfig["key"], number> = {
          wheat: 0,
          rice: 0,
          maize: 0,
          barley: 0,
          sorghum: 0,
        };

        for (const inv of periodInvoices) {
          const amt = Number(inv.total_amount || 0);
          const g = extractGrainType(inv);
          if (g) {
            grainRev[g] += amt;
          } else {
            // Default unassigned to wheat or spread
            grainRev.wheat += amt;
          }
        }

        const weekRevenue = Object.values(grainRev).reduce((sum, v) => sum + v, 0);
        const weekCollected = periodPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        currentTotalRevenue += weekRevenue;
        currentTotalCollected += weekCollected;

        data.push({
          date: `Week ${weeks - i}`,
          fullLabel: `Week ${weeks - i} (${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
          wheat: Math.round(grainRev.wheat),
          rice: Math.round(grainRev.rice),
          maize: Math.round(grainRev.maize),
          barley: Math.round(grainRev.barley),
          sorghum: Math.round(grainRev.sorghum),
          total: Math.round(weekRevenue),
          collected: Math.round(weekCollected),
        });
      }

      // Previous 4 weeks total
      for (let i = weeks * 2 - 1; i >= weeks; i--) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (i + 1) * 7);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - i * 7);

        const prevInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate >= startDate && invDate < endDate;
        });
        const prevRevenue = prevInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        previousTotalRevenue += prevRevenue;
      }
    } else if (timeRange === "month") {
      // 6 or 12 Months: Jan → Feb → Mar → Apr → May → Jun ...
      const months = 6;
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const monthInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === year && invDate.getMonth() === month;
        });

        const monthPayments = payments.filter((p) => {
          const payDate = new Date(p.payment_date);
          return (
            payDate.getFullYear() === year &&
            payDate.getMonth() === month &&
            p.status === "completed"
          );
        });

        const grainRev: Record<GrainConfig["key"], number> = {
          wheat: 0,
          rice: 0,
          maize: 0,
          barley: 0,
          sorghum: 0,
        };

        for (const inv of monthInvoices) {
          const amt = Number(inv.total_amount || 0);
          const g = extractGrainType(inv);
          if (g) {
            grainRev[g] += amt;
          } else {
            grainRev.wheat += amt;
          }
        }

        const monthRevenue = Object.values(grainRev).reduce((sum, v) => sum + v, 0);
        const monthCollected = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        currentTotalRevenue += monthRevenue;
        currentTotalCollected += monthCollected;

        data.push({
          date: date.toLocaleDateString("en-US", { month: "short" }),
          fullLabel: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          wheat: Math.round(grainRev.wheat),
          rice: Math.round(grainRev.rice),
          maize: Math.round(grainRev.maize),
          barley: Math.round(grainRev.barley),
          sorghum: Math.round(grainRev.sorghum),
          total: Math.round(monthRevenue),
          collected: Math.round(monthCollected),
        });
      }

      // Previous 6 months total
      for (let i = months * 2 - 1; i >= months; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const prevMonthInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === year && invDate.getMonth() === month;
        });
        const prevRevenue = prevMonthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        previousTotalRevenue += prevRevenue;
      }
    } else {
      // Yearly: 2022 → 2023 → 2024 → 2025 → 2026 (Last 5 years)
      const years = 5;
      for (let i = years - 1; i >= 0; i--) {
        const targetYear = now.getFullYear() - i;

        const yearInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === targetYear;
        });

        const yearPayments = payments.filter((p) => {
          const payDate = new Date(p.payment_date);
          return payDate.getFullYear() === targetYear && p.status === "completed";
        });

        const grainRev: Record<GrainConfig["key"], number> = {
          wheat: 0,
          rice: 0,
          maize: 0,
          barley: 0,
          sorghum: 0,
        };

        for (const inv of yearInvoices) {
          const amt = Number(inv.total_amount || 0);
          const g = extractGrainType(inv);
          if (g) {
            grainRev[g] += amt;
          } else {
            grainRev.wheat += amt;
          }
        }

        const yearRevenue = Object.values(grainRev).reduce((sum, v) => sum + v, 0);
        const yearCollected = yearPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        currentTotalRevenue += yearRevenue;
        currentTotalCollected += yearCollected;

        data.push({
          date: `${targetYear}`,
          fullLabel: `Year ${targetYear}`,
          wheat: Math.round(grainRev.wheat),
          rice: Math.round(grainRev.rice),
          maize: Math.round(grainRev.maize),
          barley: Math.round(grainRev.barley),
          sorghum: Math.round(grainRev.sorghum),
          total: Math.round(yearRevenue),
          collected: Math.round(yearCollected),
        });
      }

      // Previous 5 years total
      for (let i = years * 2 - 1; i >= years; i--) {
        const targetYear = now.getFullYear() - i;
        const prevYearInvoices = invoices.filter((inv) => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === targetYear;
        });
        const prevRevenue = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        previousTotalRevenue += prevRevenue;
      }
    }

    // Calculate growth / drop per grain series across consecutive buckets
    for (let i = 0; i < data.length; i++) {
      for (const grain of GRAINS) {
        if (i === 0) {
          data[i][`${grain.key}_change`] = 0;
          data[i][`${grain.key}_changePct`] = 0;
          data[i][`${grain.key}_isGrowth`] = null;
        } else {
          const prev = data[i - 1][grain.key];
          const curr = data[i][grain.key];
          const change = curr - prev;
          const pct = prev === 0 ? (curr > 0 ? 100 : 0) : (change / prev) * 100;
          data[i][`${grain.key}_change`] = change;
          data[i][`${grain.key}_changePct`] = pct;
          data[i][`${grain.key}_isGrowth`] = change > 0 ? true : change < 0 ? false : null;
        }
      }
    }

    const totalChange = currentTotalRevenue - previousTotalRevenue;
    const totalChangePct =
      previousTotalRevenue === 0
        ? currentTotalRevenue > 0
          ? 100
          : 0
        : (totalChange / previousTotalRevenue) * 100;

    // Check if there is any data > 0
    const maxVal = Math.max(...data.map((d) => Math.max(d.wheat, d.rice, d.maize, d.barley, d.sorghum, d.total)), 0);

    return {
      data,
      maxVal,
      currentTotalRevenue,
      currentTotalCollected,
      totalChange,
      totalChangePct,
      isTotalGrowth: totalChange > 0 ? true : totalChange < 0 ? false : null,
    };
  }, [invoices, payments, timeRange]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Range Switcher */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-foreground">Revenue Tracking</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {timeRange === "week" && "Last 4 weeks"}
            {timeRange === "month" && "Last 6 months"}
            {timeRange === "year" && "Last 5 years"}
          </p>
        </div>

        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-32 h-8 text-xs bg-card border-border shadow-xs">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week" className="text-xs">Weekly</SelectItem>
            <SelectItem value="month" className="text-xs">Monthly</SelectItem>
            <SelectItem value="year" className="text-xs">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/5 rounded-lg p-3 border-primary/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total Revenue
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-lg font-bold text-foreground">
              PKR {processedData.currentTotalRevenue.toLocaleString()}
            </p>
            {processedData.totalChange !== 0 && (
              <span
                className={`text-xs font-bold ${
                  processedData.isTotalGrowth ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {processedData.isTotalGrowth ? "↑" : "↓"}{" "}
                {Math.abs(processedData.totalChangePct).toFixed(1)}% vs prev
              </span>
            )}
          </div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 border-amber-500/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Collected
          </p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            PKR {processedData.currentTotalCollected.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Multi-Line Grain Revenue Chart */}
      <div className="h-64 mt-2 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={processedData.data}
            margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
          >
            {/* Subtle horizontal gridlines */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-muted"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              dy={10}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value === 0
                  ? "PKR 0"
                  : `PKR ${
                      value >= 1000000
                        ? `${(value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
                        : `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`
                    }`
              }
              domain={[0, processedData.maxVal > 0 ? "auto" : 1000]}
              dx={-5}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1, strokeDasharray: "3 3" }}
            />

            {/* 5 Distinct Grain Revenue Lines */}
            {GRAINS.map((grain) => (
              <Line
                key={grain.key}
                type="monotone"
                dataKey={grain.key}
                name={grain.label}
                stroke={grain.color}
                strokeWidth={2.2}
                dot={{
                  r: 3.5,
                  fill: grain.color,
                  stroke: "hsl(var(--card))",
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 5.5,
                  fill: grain.color,
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2,
                }}
                animationDuration={800}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Clean Compact Legend for all 5 grains */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 border-t border-border/40">
        {GRAINS.map((grain) => (
          <div key={grain.key} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: grain.color }}
            />
            <span className="text-muted-foreground font-medium">{grain.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
