import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Period = "day" | "week" | "month" | "year";

type ChartDataPoint = {
  date: string;
  activity: number;
  reports: number;
};

type AdministrationOverviewChartProps = {
  activityLogs?: Array<{ created_at: string }>;
  batches?: Array<{ created_at: string }>;
  alerts?: Array<{ created_at: string }>;
  invoices?: Array<{ created_at: string }>;
};

export function AdministrationOverviewChart({
  activityLogs = [],
  batches = [],
  alerts = [],
  invoices = [],
}: AdministrationOverviewChartProps) {
  const [period, setPeriod] = useState<Period>("month");

  const chartData = useMemo(() => {
    // Determine number of days based on period
    const daysMap: Record<Period, number> = {
      day: 1,
      week: 7,
      month: 30,
      year: 365,
    };
    const days = daysMap[period];
    const now = new Date();
    const dataMap = new Map<string, { activity: number; reports: number }>();

    // Initialize all days with zero values
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dataMap.set(key, { activity: 0, reports: 0 });
    }

    // Count activity logs per day
    activityLogs.forEach((log) => {
      if (log.created_at) {
        const key = log.created_at.split("T")[0];
        const entry = dataMap.get(key);
        if (entry) {
          entry.activity += 1;
        }
      }
    });

    // Count reports (batches + alerts + invoices) per day
    [...batches, ...alerts, ...invoices].forEach((item) => {
      if (item.created_at) {
        const key = item.created_at.split("T")[0];
        const entry = dataMap.get(key);
        if (entry) {
          entry.reports += 1;
        }
      }
    });

    // Convert to array and format dates based on period
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      if (period === "day") {
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      } else if (period === "week" || period === "month") {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        // year
        return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }
    };

    return Array.from(dataMap.entries())
      .map(([date, counts]) => ({
        date: formatDate(date),
        activity: counts.activity,
        reports: counts.reports,
      }))
      .sort((a, b) => {
        // Sort chronologically
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
  }, [activityLogs, batches, alerts, invoices, period]);

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.activity, d.reports)),
    10
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-end mb-3">
        <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={[0, maxValue]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="activity"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#activityGradient)"
              name="Activity Logs"
              dot={false}
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="reports"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#reportsGradient)"
              name="Reports Created"
              dot={false}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
