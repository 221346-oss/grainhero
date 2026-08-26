import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTechnicianSensors } from "@/lib/operations.functions";
import {
  Thermometer,
  Droplets,
  Wind,
  Battery,
  Signal,
  Clock,
  Filter,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/technician/sensors")({
  head: () => ({
    meta: [
      { title: "Sensors — Technician" },
      { name: "description", content: "View sensors in your assigned silos with real-time environmental data" },
    ],
  }),
  component: TechnicianSensorsPage,
});

type SensorDevice = {
  id: string;
  device_id: string;
  device_name: string;
  warehouse_id: string;
  silo_id: string;
  status: string;
  power_source: string | null;
  sensor_types: string[] | null;
  last_calibration_date: string | null;
  is_enabled: boolean;
  created_at: string;
  notes: string | null;
  silos?: { id: string; silo_id: string; name: string }[];
  warehouses?: { id: string; name: string; warehouse_id: string }[];
};

type SensorReading = {
  id: string;
  device_id: string;
  reading_timestamp: string;
  temperature_value: number | null;
  humidity_value: number | null;
  moisture_value: number | null;
  co2_value: number | null;
  voc_value: number | null;
  dew_point: number | null;
  pressure_value: number | null;
  light_value: number | null;
  ambient_temperature: number | null;
  ambient_humidity: number | null;
  battery_level: number | null;
  signal_strength: number | null;
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

function SensorCard({
  sensor,
  reading,
}: {
  sensor: SensorDevice;
  reading?: SensorReading;
}) {
  const siloName = sensor.silos?.[0]?.name || sensor.silos?.[0]?.silo_id || "Unknown Silo";
  const StatusIcon = STATUS_ICON[sensor.status] || AlertCircle;

  return (
    <Link
      to="/technician/sensors/$sensorId"
      params={{ sensorId: sensor.id }}
      className="block hover:shadow-lg transition-shadow"
    >
      <Card className="overflow-hidden cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">{sensor.device_name}</CardTitle>
              <CardDescription className="text-xs mt-1">{siloName}</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${STATUS_COLOR[sensor.status] || STATUS_COLOR.offline}`}
            >
              <StatusIcon className="h-3 w-3 mr-1 inline" />
              {sensor.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Device ID and Type */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Device ID</div>
              <div className="font-mono text-[10px]">{sensor.device_id}</div>
            </div>
            {sensor.power_source && (
              <div>
                <div className="text-muted-foreground">Power</div>
                <div className="capitalize font-semibold">{sensor.power_source}</div>
              </div>
            )}
          </div>

          {/* Latest Readings Grid */}
          {reading ? (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {reading.temperature_value !== null && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="text-muted-foreground">Temp</div>
                      <div className="font-bold">{reading.temperature_value.toFixed(1)}°C</div>
                    </div>
                  </div>
                )}
                {reading.humidity_value !== null && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-muted-foreground">RH</div>
                      <div className="font-bold">{reading.humidity_value.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
                {reading.moisture_value !== null && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    <div>
                      <div className="text-muted-foreground">Moist</div>
                      <div className="font-bold">{reading.moisture_value.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
                {reading.voc_value !== null && (
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-purple-500" />
                    <div>
                      <div className="text-muted-foreground">VOC</div>
                      <div className="font-bold">{reading.voc_value.toFixed(0)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Battery and Signal */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                {reading.battery_level !== null && (
                  <div className="flex items-center gap-2 text-xs">
                    <Battery className="h-4 w-4 text-amber-500" />
                    <span>{reading.battery_level.toFixed(0)}%</span>
                  </div>
                )}
                {reading.signal_strength !== null && (
                  <div className="flex items-center gap-2 text-xs">
                    <Signal className="h-4 w-4 text-emerald-500" />
                    <span>{reading.signal_strength.toFixed(0)} dBm</span>
                  </div>
                )}
              </div>

              {/* Last Updated */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                <Clock className="h-3 w-3" />
                {new Date(reading.reading_timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              No recent readings
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function TechnicianSensorsPage() {
  const fn = useServerFn(getTechnicianSensors);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["technician-sensors"],
    queryFn: () => fn({ data: { limit: 100 } }),
    refetchInterval: 30_000,
  });

  const sensors = (data?.sensors ?? []) as SensorDevice[];
  const latestReadings = (data?.latestReadings ?? {}) as Record<string, SensorReading>;

  // Filter sensors
  const filteredSensors = sensors.filter((sensor) => {
    const matchesSearch = searchQuery
      ? sensor.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sensor.silos?.[0]?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter === "all" || sensor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: sensors.length,
    active: sensors.filter((s) => s.status === "active").length,
    offline: sensors.filter((s) => s.status === "offline").length,
    maintenance: sensors.filter((s) => s.status === "maintenance").length,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Thermometer className="h-6 w-6 text-emerald-600" />
          Sensors
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Environmental sensors in your assigned silos with real-time readings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Active</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Offline</div>
            <div className="text-2xl font-bold text-slate-600">{stats.offline}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Maintenance</div>
            <div className="text-2xl font-bold text-amber-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Sensor List</CardTitle>
              <CardDescription>
                {filteredSensors.length} of {sensors.length} sensors
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sensors…"
                  className="pl-8 w-full sm:w-48 h-9 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="offline" className="text-xs">
                    Offline
                  </SelectItem>
                  <SelectItem value="error" className="text-xs">
                    Error
                  </SelectItem>
                  <SelectItem value="maintenance" className="text-xs">
                    Maintenance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSensors.length === 0 ? (
            <div className="py-8 text-center col-span-full">
              <Thermometer className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {sensors.length === 0
                  ? "No sensors assigned to your silos yet."
                  : "No sensors match your filters."}
              </p>
            </div>
          ) : (
            filteredSensors.map((sensor) => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                reading={latestReadings[sensor.id]}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
