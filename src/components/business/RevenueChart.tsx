import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

type TimeRange = "week" | "month" | "year";

interface RevenueChartProps {
  invoices: Array<{
    created_at: string;
    total_amount: number;
    payment_status?: string;
  }>;
  payments: Array<{
    payment_date: string;
    amount: number;
    status?: string;
  }>;
}

export function RevenueChart({ invoices = [], payments = [] }: RevenueChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  const chartData = useMemo(() => {
    const now = new Date();
    const data: Array<{ date: string; revenue: number; collected: number }> = [];

    if (timeRange === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayRevenue = invoices
          .filter((inv) => inv.created_at.startsWith(dateStr))
          .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

        const dayCollected = payments
          .filter((p) => p.payment_date?.startsWith(dateStr) && p.status === "completed")
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        data.push({
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          revenue: Math.round(dayRevenue),
          collected: Math.round(dayCollected),
        });
      }
    } else if (timeRange === "month") {
      // Last 30 days grouped by week
      const weeks = 4;
      for (let i = weeks - 1; i >= 0; i--) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (i + 1) * 7);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - i * 7);

        const weekRevenue = invoices
          .filter((inv) => {
            const invDate = new Date(inv.created_at);
            return invDate >= startDate && invDate < endDate;
          })
          .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

        const weekCollected = payments
          .filter((p) => {
            const payDate = new Date(p.payment_date);
            return payDate >= startDate && payDate < endDate && p.status === "completed";
          })
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        data.push({
          date: `Week ${weeks - i}`,
          revenue: Math.round(weekRevenue),
          collected: Math.round(weekCollected),
        });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const monthRevenue = invoices
          .filter((inv) => {
            const invDate = new Date(inv.created_at);
            return invDate.getFullYear() === year && invDate.getMonth() === month;
          })
          .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

        const monthCollected = payments
          .filter((p) => {
            const payDate = new Date(p.payment_date);
            return (
              payDate.getFullYear() === year &&
              payDate.getMonth() === month &&
              p.status === "completed"
            );
          })
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        data.push({
          date: date.toLocaleDateString("en-US", { month: "short" }),
          revenue: Math.round(monthRevenue),
          collected: Math.round(monthCollected),
        });
      }
    }

    return data;
  }, [invoices, payments, timeRange]);

  const totals = useMemo(() => {
    const revenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const collected = chartData.reduce((sum, d) => sum + d.collected, 0);
    return { revenue, collected };
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Revenue Tracking</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {timeRange === "week" && "Last 7 days"}
            {timeRange === "month" && "Last 4 weeks"}
            {timeRange === "year" && "Last 12 months"}
          </p>
        </div>

        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-32 h-8 text-xs">
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
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total Revenue
          </p>
          <p className="text-lg font-bold">
            PKR {totals.revenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Collected
          </p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            PKR {totals.collected.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`PKR ${value.toLocaleString()}`, ""]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ fill: "#f59e0b", r: 4 }}
              activeDot={{ r: 6 }}
              name="Collected"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Invoiced Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">Collected Payments</span>
        </div>
      </div>
    </div>
  );
}
