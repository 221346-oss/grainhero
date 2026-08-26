import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSensorHistory } from "@/lib/operations.functions";
import {
  Thermometer,
  Droplets,
  Wind,
  Battery,
  Signal,
  Clock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { useNavigate } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

export const Route = createFileRoute("/_authenticated/technician/sensors/$sensorId")({
  head: () => ({
    meta: [
      { title: "Sensor Details — Technician" },
      { name: "description", content: "Detailed sensor readings and environmental metrics" },
    ],
  }),
  component: TechnicianSensorDetailPage,
});

type ChartDataPoint = {
  timestamp: string;
  date: string;
  time: string;
  temperature?: number;
  humidity?: number;
  moisture?: number;
  voc?: number;
  co2?: number;
  dew_point?: number;
};

// Status colors
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  offline: "bg-slate-100 text-slate-800 border-slate-200",
  error: "bg-red-100 text-red-800 border-red-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_ICON: Record<string, any> = {
  active: CheckCircle2,
  offline: AlertCircle,
  error: AlertCircle,
  maintenance: Zap,
};

function TechnicianSensorDetailPage() {
  const { sensorId } = Route.useParams();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<"6h" | "24h" | "7d">("24h");

  const getHistoryFn = useServerFn(getSensorHistory);

  const timeRangeHours = {
    "6h": 6,
    "24h": 24,
    "7d": 168,
  };

  const { data: readings, isLoading } = useQuery({
    queryKey: ["sensor-history", sensorId, timeRange],
    queryFn: () =>
      getHistoryFn({
        data: {
          device_uuid: sensorId,
          hours: timeRangeHours[timeRange],
          limit: 500,
        },
      }),
    refetchInterval: 30_000,
  });

  // Transform readings for charts
  const chartData: ChartDataPoint[] = (readings ?? []).map((r: any) => {
    const date = new Date(r.reading_timestamp);
    return {
      timestamp: r.reading_timestamp,
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temperature: r.temperature_value,
      humidity: r.humidity_value,
      moisture: r.moisture_value,
      voc: r.voc_value,
      co2: r.co2_value,
      dew_point: r.dew_point,
    };
  });

  // Calculate stats
  const stats = {
    temperature:
      readings && readings.length > 0
        ? {
            current: readings[readings.length - 1]?.temperature_value,
            avg:
              readings
                .filter((r: any) => r.temperature_value !== null)
                .reduce((sum: number, r: any) => sum + r.temperature_value, 0) /
              readings.filter((r: any) => r.temperature_value !== null).length,
            min: Math.min(
              ...readings.filter((r: any) => r.temperature_value !== null).map((r: any) => r.temperature_value)
            ),
            max: Math.max(
              ...readings.filter((r: any) => r.temperature_value !== null).map((r: any) => r.temperature_value)
            ),
          }
        : null,
    humidity:
      readings && readings.length > 0
        ? {
            current: readings[readings.length - 1]?.humidity_value,
            avg:
              readings
                .filter((r: any) => r.humidity_value !== null)
                .reduce((sum: number, r: any) => sum + r.humidity_value, 0) /
              readings.filter((r: any) => r.humidity_value !== null).length,
            min: Math.min(
              ...readings.filter((r: any) => r.humidity_value !== null).map((r: any) => r.humidity_value)
            ),
            max: Math.max(
              ...readings.filter((r: any) => r.humidity_value !== null).map((r: any) => r.humidity_value)
            ),
          }
        : null,
    moisture:
      readings && readings.length > 0
        ? {
            current: readings[readings.length - 1]?.moisture_value,
            avg:
              readings
                .filter((r: any) => r.moisture_value !== null)
                .reduce((sum: number, r: any) => sum + r.moisture_value, 0) /
              readings.filter((r: any) => r.moisture_value !== null).length,
          }
        : null,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const latestReading = readings?.[readings.length - 1];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/technician/sensors" })}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-emerald-600" />
            Sensor Details
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics and historical trends</p>
        </div>
      </div>

      {/* Latest Reading Card */}
      {latestReading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Readings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latestReading.temperature_value !== null && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground font-semibold">Temperature</span>
                </div>
                <div className="text-3xl font-bold">{latestReading.temperature_value.toFixed(1)}°C</div>
                {stats.temperature && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <div>Avg: {stats.temperature.avg.toFixed(1)}°C</div>
                    <div>Min: {stats.temperature.min.toFixed(1)}°C / Max: {stats.temperature.max.toFixed(1)}°C</div>
                  </div>
                )}
              </div>
            )}
            {latestReading.humidity_value !== null && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground font-semibold">Humidity</span>
                </div>
                <div className="text-3xl font-bold">{latestReading.humidity_value.toFixed(1)}%</div>
                {stats.humidity && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <div>Avg: {stats.humidity.avg.toFixed(1)}%</div>
                    <div>Min: {stats.humidity.min.toFixed(1)}% / Max: {stats.humidity.max.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            )}
            {latestReading.moisture_value !== null && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs text-muted-foreground font-semibold">Grain Moisture</span>
                </div>
                <div className="text-3xl font-bold">{latestReading.moisture_value.toFixed(1)}%</div>
                {stats.moisture && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <div>Avg: {stats.moisture.avg.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            )}
            {latestReading.voc_value !== null && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground font-semibold">VOC Index</span>
                </div>
                <div className="text-3xl font-bold">{latestReading.voc_value.toFixed(0)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32 text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6h" className="text-xs">
                Last 6 hours
              </SelectItem>
              <SelectItem value="24h" className="text-xs">
                Last 24 hours
              </SelectItem>
              <SelectItem value="7d" className="text-xs">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperature Chart */}
        {chartData.some((d) => d.temperature !== undefined && d.temperature !== null) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                Temperature Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval={Math.max(0, Math.floor(chartData.length / 6))}
                  />
                  <YAxis label={{ value: "°C", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#ef4444"
                    dot={false}
                    isAnimationActive={false}
                    name="Temperature"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Humidity & Moisture Chart */}
        {(chartData.some((d) => d.humidity !== undefined && d.humidity !== null) ||
          chartData.some((d) => d.moisture !== undefined && d.moisture !== null)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Humidity & Moisture Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval={Math.max(0, Math.floor(chartData.length / 6))}
                  />
                  <YAxis label={{ value: "%", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  {chartData.some((d) => d.humidity !== undefined && d.humidity !== null) && (
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#3b82f6"
                      dot={false}
                      isAnimationActive={false}
                      name="Humidity"
                    />
                  )}
                  {chartData.some((d) => d.moisture !== undefined && d.moisture !== null) && (
                    <Line
                      type="monotone"
                      dataKey="moisture"
                      stroke="#06b6d4"
                      dot={false}
                      isAnimationActive={false}
                      name="Grain Moisture"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* VOC & CO2 Chart */}
        {(chartData.some((d) => d.voc !== undefined && d.voc !== null) ||
          chartData.some((d) => d.co2 !== undefined && d.co2 !== null)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wind className="h-5 w-5 text-purple-500" />
                Air Quality Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval={Math.max(0, Math.floor(chartData.length / 6))}
                  />
                  <YAxis yAxisId="left" label={{ value: "VOC Index", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: "CO2 (ppm)", angle: 90, position: "insideRight" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  {chartData.some((d) => d.voc !== undefined && d.voc !== null) && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="voc"
                      stroke="#a855f7"
                      dot={false}
                      isAnimationActive={false}
                      name="VOC"
                    />
                  )}
                  {chartData.some((d) => d.co2 !== undefined && d.co2 !== null) && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="co2"
                      stroke="#f59e0b"
                      dot={false}
                      isAnimationActive={false}
                      name="CO2"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div>Total readings: {readings?.length || 0}</div>
          {latestReading && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Last updated: {new Date(latestReading.reading_timestamp).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
