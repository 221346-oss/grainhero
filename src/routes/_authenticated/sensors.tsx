import { createFileRoute, Link } from "@tanstack/react-router";
import { SensorsSkeleton } from "@/components/app/skeletons";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import {
  Cpu,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Inbox,
  Wifi,
  WifiOff,
  Battery,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  Radio,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import { LiveReadingChart } from "@/components/app/sensors/LiveReadingChart";
import { ThresholdDrawer } from "@/components/app/sensors/ThresholdDrawer";
import { QualityBadge } from "@/components/app/sensors/QualityBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  listSensorDevices,
  upsertSensorDevice,
  deleteSensorDevice,
  listLatestSensorReadings,
  listDeviceReadings,
  listWarehouses,
  listSilos,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/sensors")({
  head: () => ({
    meta: [
      { title: "Sensors — Grain Hero" },
      {
        name: "description",
        content: "Sensors workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Sensors — Grain Hero" },
      { property: "og:description", content: "Sensors workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SensorsPage,
});

const SENSOR_TYPES = [
  "temperature",
  "humidity",
  "co2",
  "voc",
  "moisture",
  "pressure",
  "light",
  "ph",
] as const;
type SensorType = (typeof SENSOR_TYPES)[number];

type Device = {
  id: string;
  device_id: string;
  device_name: string;
  mac_address: string | null;
  model: string | null;
  manufacturer: string | null;
  firmware_version: string | null;
  device_type: string | null;
  sensor_types: string[] | null;
  status: "active" | "offline" | "error" | "maintenance";
  is_enabled: boolean | null;
  power_source: string | null;
  battery_level: number | null;
  signal_strength: number | null;
  last_heartbeat: string | null;
  data_transmission_interval: number | null;
  calibration_interval_days: number | null;
  last_calibration_date: string | null;
  calibration_due_date: string | null;
  notes: string | null;
  warehouse_id: string;
  silo_id: string | null;
  silos?: { id: string; silo_id: string; name: string } | null;
  warehouses?: { id: string; name: string; warehouse_id: string } | null;
};

type Reading = {
  id: string;
  device_id: string;
  reading_timestamp: string;
  temperature_value: number | null;
  humidity_value: number | null;
  co2_value: number | null;
  voc_value: number | null;
  moisture_value: number | null;
  pressure_value: number | null;
  ml_risk_class: string | null;
  ml_risk_score: number | null;
  anomaly_detected: boolean | null;
  battery_level: number | null;
  signal_strength: number | null;
};

type Warehouse = { id: string; name: string; warehouse_id: string };
type Silo = { id: string; silo_id: string; name: string; warehouse_id: string | null };

type Form = {
  id?: string;
  device_name: string;
  mac_address: string;
  model: string;
  manufacturer: string;
  firmware_version: string;
  device_type: string;
  category: string;
  sensor_types: SensorType[];
  warehouse_id: string;
  silo_id: string;
  status: "active" | "offline" | "error" | "maintenance";
  power_source: "" | "solar" | "battery" | "direct" | "hybrid";
  data_transmission_interval: string;
  calibration_interval_days: string;
  last_calibration_date: string;
  is_enabled: boolean;
  notes: string;
};

const emptyForm: Form = {
  device_name: "",
  mac_address: "",
  model: "",
  manufacturer: "",
  firmware_version: "",
  device_type: "environmental",
  category: "environmental",
  sensor_types: ["temperature", "humidity"],
  warehouse_id: "",
  silo_id: "",
  status: "active",
  power_source: "",
  data_transmission_interval: "60",
  calibration_interval_days: "365",
  last_calibration_date: "",
  is_enabled: true,
  notes: "",
};

function SensorsPage() {
  const listFn = useServerFn(listSensorDevices);
  const upsertFn = useServerFn(upsertSensorDevice);
  const deleteFn = useServerFn(deleteSensorDevice);
  const latestFn = useServerFn(listLatestSensorReadings);
  const historyFn = useServerFn(listDeviceReadings);
  const listWhFn = useServerFn(listWarehouses);
  const listSiloFn = useServerFn(listSilos);
  const qc = useQueryClient();
  useRealtimeInvalidate("sensor_readings", [["sensor-readings-latest"]]);
  useRealtimeInvalidate("actuators", [["actuators"]]);

  const { data, isLoading } = useQuery({
    queryKey: ["sensor-devices"],
    queryFn: () => listFn() as Promise<Device[]>,
  });
  const { data: readings } = useQuery({
    queryKey: ["sensor-readings-latest"],
    queryFn: () => latestFn() as Promise<Reading[]>,
    refetchInterval: 30_000,
  });
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWhFn() as Promise<Warehouse[]>,
  });
  const { data: silosData } = useQuery({
    queryKey: ["silos"],
    queryFn: () => listSiloFn() as Promise<Silo[]>,
  });
  const warehouses = warehousesData ?? [];
  const silos = silosData ?? [];

  // Realtime — refresh latest readings on new insert
  useEffect(() => {
    const ch = supabase
      .channel("sensor_readings_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings" },
        () => {
          qc.invalidateQueries({ queryKey: ["sensor-readings-latest"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const readingByDevice = useMemo(() => {
    const m = new Map<string, Reading>();
    for (const r of readings ?? []) m.set(r.device_id, r);
    return m;
  }, [readings]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [thresholdSilo, setThresholdSilo] = useState<{ id: string; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Device | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const rows = useMemo(() => {
    const all = (data ?? []) as Device[];
    return all.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && !(d.sensor_types ?? []).includes(typeFilter)) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (
        d.device_name?.toLowerCase().includes(t) ||
        d.device_id?.toLowerCase().includes(t) ||
        d.mac_address?.toLowerCase().includes(t) ||
        d.silos?.name?.toLowerCase().includes(t)
      );
    });
  }, [data, q, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const online = rows.filter((r) => r.status === "active").length;
    const maint = rows.filter((r) => r.status === "maintenance").length;
    const err = rows.filter((r) => r.status === "error" || r.status === "offline").length;
    return { total, online, maint, err };
  }, [rows]);

  const saveMut = useMutation({
    mutationFn: (f: Form) =>
      upsertFn({
        data: {
          id: f.id,
          device_name: f.device_name,
          mac_address: f.mac_address.trim() || null,
          model: f.model.trim() || null,
          manufacturer: f.manufacturer.trim() || null,
          firmware_version: f.firmware_version.trim() || null,
          device_type: f.device_type || null,
          category: f.category || null,
          sensor_types: f.sensor_types,
          warehouse_id: f.warehouse_id,
          silo_id: f.silo_id,
          status: f.status,
          power_source: (f.power_source || null) as
            | "solar"
            | "battery"
            | "direct"
            | "hybrid"
            | null,
          data_transmission_interval: f.data_transmission_interval
            ? Number(f.data_transmission_interval)
            : null,
          calibration_interval_days: f.calibration_interval_days
            ? Number(f.calibration_interval_days)
            : null,
          last_calibration_date: f.last_calibration_date || null,
          is_enabled: f.is_enabled,
          notes: f.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Sensor updated" : "Sensor created");
      qc.invalidateQueries({ queryKey: ["sensor-devices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sensor deleted");
      qc.invalidateQueries({ queryKey: ["sensor-devices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  function openCreate() {
    setForm({ ...emptyForm, warehouse_id: warehouses[0]?.id ?? "", silo_id: "" });
    setEditOpen(true);
  }
  function openEdit(d: Device) {
    setForm({
      id: d.id,
      device_name: d.device_name,
      mac_address: d.mac_address ?? "",
      model: d.model ?? "",
      manufacturer: d.manufacturer ?? "",
      firmware_version: d.firmware_version ?? "",
      device_type: d.device_type ?? "environmental",
      category: d.device_type ?? "environmental",
      sensor_types: (d.sensor_types ?? []) as SensorType[],
      warehouse_id: d.warehouse_id,
      silo_id: d.silo_id ?? "",
      status: d.status,
      power_source: (d.power_source as Form["power_source"]) ?? "",
      data_transmission_interval:
        d.data_transmission_interval != null ? String(d.data_transmission_interval) : "60",
      calibration_interval_days:
        d.calibration_interval_days != null ? String(d.calibration_interval_days) : "365",
      last_calibration_date: d.last_calibration_date ?? "",
      is_enabled: d.is_enabled ?? true,
      notes: d.notes ?? "",
    });
    setEditOpen(true);
  }

  const filteredSilos = form.warehouse_id
    ? silos.filter((s) => s.warehouse_id === form.warehouse_id)
    : silos;

  if (isLoading) return <SensorsSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Sensor Devices"
        subtitle="IoT devices, live telemetry & health"
        badge={isLoading ? "…" : `${rows.length}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MiniStat icon={Cpu} label="Devices" value={stats.total} tint="emerald" />
        <MiniStat icon={Wifi} label="Online" value={stats.online} tint="sky" />
        <MiniStat icon={Radio} label="Maintenance" value={stats.maint} tint="amber" />
        <MiniStat icon={WifiOff} label="Offline / err" value={stats.err} tint="rose" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search device, MAC, silo…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Sensor type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {SENSOR_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> New sensor
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-60" />
            <p className="text-sm mb-4">No sensor devices.</p>
            {silos.length === 0 ? (
              <Link
                to="/grain-operations"
                search={{ tab: "silos" }}
                className="text-sm text-primary hover:text-primary/80 underline underline-offset-4"
              >
                Create a silo first →
              </Link>
            ) : (
              <Button onClick={openCreate} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add sensor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <SensorCard
              key={d.id}
              device={d}
              reading={readingByDevice.get(d.id) ?? null}
              onView={() => {
                setSelected(d);
                setViewOpen(true);
              }}
              onEdit={() => openEdit(d)}
              onDelete={() => setDeleteId(d.id)}
              onThresholds={
                d.silos
                  ? () => setThresholdSilo({ id: d.silos!.id, name: d.silos!.name })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Create / Edit */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setForm(emptyForm);
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit sensor" : "New sensor device"}</DialogTitle>
            <DialogDescription>Device ID is auto-generated if omitted.</DialogDescription>
          </DialogHeader>
          {warehouses.length === 0 && (
            <div className="rounded-md border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">You have no warehouses yet.</div>
                <Link to="/grain-operations" search={{ tab: "silos" }} className="underline">
                  Create a warehouse first
                </Link>{" "}
                — sensors must be attached to a silo inside a warehouse.
              </div>
            </div>
          )}
          {warehouses.length > 0 && form.warehouse_id && filteredSilos.length === 0 && (
            <div className="rounded-md border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">This warehouse has no silos.</div>
                <Link to="/grain-operations" search={{ tab: "silos" }} className="underline">
                  Add a silo
                </Link>{" "}
                before registering a sensor.
              </div>
            </div>
          )}
          <form
            id="sensor-form"
            className="grid gap-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate(form);
            }}
          >
            <div>
              <Label>Device name *</Label>
              <Input
                required
                value={form.device_name}
                onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={form.warehouse_id}
                  onValueChange={(v) => setForm({ ...form, warehouse_id: v, silo_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Silo *</Label>
                <Select
                  value={form.silo_id}
                  onValueChange={(v) => setForm({ ...form, silo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSilos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Sensor types</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {SENSOR_TYPES.map((t) => {
                  const on = form.sensor_types.includes(t);
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() =>
                        setForm({
                          ...form,
                          sensor_types: on
                            ? form.sensor_types.filter((x) => x !== t)
                            : [...form.sensor_types, t],
                        })
                      }
                      className={`text-xs px-2 py-1 rounded border ${on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Model</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>
              <div>
                <Label>MAC address</Label>
                <Input
                  value={form.mac_address}
                  onChange={(e) => setForm({ ...form, mac_address: e.target.value })}
                  placeholder="AA:BB:CC:…"
                />
              </div>
              <div>
                <Label>Firmware</Label>
                <Input
                  value={form.firmware_version}
                  onChange={(e) => setForm({ ...form, firmware_version: e.target.value })}
                  placeholder="v1.0.0"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Power source</Label>
                <Select
                  value={form.power_source || "none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      power_source: v === "none" ? "" : (v as Form["power_source"]),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="battery">Battery</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transmit every (s)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.data_transmission_interval}
                  onChange={(e) => setForm({ ...form, data_transmission_interval: e.target.value })}
                />
              </div>
              <div>
                <Label>Calibration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.calibration_interval_days}
                  onChange={(e) => setForm({ ...form, calibration_interval_days: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Last calibration</Label>
                <Input
                  type="date"
                  value={form.last_calibration_date}
                  onChange={(e) => setForm({ ...form, last_calibration_date: e.target.value })}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={form.is_enabled}
                  onCheckedChange={(v) => setForm({ ...form, is_enabled: !!v })}
                />{" "}
                Device enabled
              </label>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1">
              {(!form.device_name || !form.warehouse_id || !form.silo_id) && (
                <span className="text-[11px] text-muted-foreground">
                  Missing:{" "}
                  {[
                    !form.device_name && "name",
                    !form.warehouse_id && "warehouse",
                    !form.silo_id && "silo",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
              <Button
                form="sensor-form"
                type="submit"
                disabled={
                  saveMut.isPending || !form.device_name || !form.warehouse_id || !form.silo_id
                }
              >
                {saveMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : form.id ? (
                  "Save changes"
                ) : (
                  "Create sensor"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DeviceDetail
                device={selected}
                reading={readingByDevice.get(selected.id) ?? null}
                historyFn={
                  historyFn as (arg: {
                    data: { device_id: string; limit: number };
                  }) => Promise<Reading[]>
                }
                onEdit={() => {
                  setViewOpen(false);
                  openEdit(selected);
                }}
              />
              {selected.silo_id && (
                <div className="mt-4 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Live readings</div>
                    <QualityBadge flag={readingByDevice.get(selected.id) ? "ok" : "missing"} />
                  </div>
                  <LiveReadingChart
                    siloId={selected.silo_id}
                    deviceId={selected.id}
                    metric="temperature"
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {thresholdSilo && (
        <ThresholdDrawer
          open={!!thresholdSilo}
          onOpenChange={(o) => {
            if (!o) setThresholdSilo(null);
          }}
          siloId={thresholdSilo.id}
          siloName={thresholdSilo.name}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sensor?</AlertDialogTitle>
            <AlertDialogDescription>
              Historical readings remain but the device link will be broken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SensorCard({
  device,
  reading,
  onView,
  onEdit,
  onDelete,
  onThresholds,
}: {
  device: Device;
  reading: Reading | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onThresholds?: () => void;
}) {
  const heartbeatAge = device.last_heartbeat
    ? Math.round((Date.now() - new Date(device.last_heartbeat).getTime()) / 60000)
    : null;
  const live = reading
    ? Date.now() - new Date(reading.reading_timestamp).getTime() < 5 * 60_000
    : false;
  const batt = reading?.battery_level ?? device.battery_level;
  const sig = reading?.signal_strength ?? device.signal_strength;

  return (
    <Card className="border-border/40/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-foreground truncate">{device.device_name}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">{device.device_id}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge value={device.status} />
            {live && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>{" "}
                Live
              </span>
            )}
          </div>
        </div>

        {device.silos && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0 flex-wrap">
            <span className="truncate">{device.silos.name}</span>
            {device.warehouses && (
              <>
                <span className="text-muted-foreground">·</span>
                <Building2 className="w-3 h-3" />
                <span className="truncate">{device.warehouses.name}</span>
              </>
            )}
          </div>
        )}

        {(device.sensor_types ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(device.sensor_types ?? []).slice(0, 6).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* Live readings */}
        <div className="grid grid-cols-4 gap-1.5">
          <MiniReading icon={Thermometer} value={reading?.temperature_value} unit="°" />
          <MiniReading icon={Droplets} value={reading?.humidity_value} unit="%" />
          <MiniReading icon={Wind} value={reading?.co2_value} unit="" />
          <MiniReading
            icon={AlertTriangle}
            value={reading?.voc_value}
            unit=""
            tone={reading?.anomaly_detected ? "warn" : undefined}
          />
        </div>

        {/* Health */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
          <span className="inline-flex items-center gap-1">
            <Battery className="w-3 h-3" /> {batt != null ? `${Math.round(Number(batt))}%` : "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Wifi className="w-3 h-3" /> {sig != null ? `${Math.round(Number(sig))} dBm` : "—"}
          </span>
          <span>{heartbeatAge != null ? `${heartbeatAge}m ago` : "no beat"}</span>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <Button variant="outline" size="sm" onClick={onView} className="h-8">
            <Eye className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="h-8">
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onThresholds}
            disabled={!onThresholds}
            className="h-8"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Rules
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-8 text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceDetail({
  device,
  reading,
  historyFn,
  onEdit,
}: {
  device: Device;
  reading: Reading | null;
  historyFn: (arg: { data: { device_id: string; limit: number } }) => Promise<Reading[]>;
  onEdit: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["device-readings", device.id],
    queryFn: () => historyFn({ data: { device_id: device.id, limit: 30 } }),
    refetchInterval: 30_000,
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 min-w-0">
          <Cpu className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="truncate">{device.device_name}</span>
        </DialogTitle>
        <DialogDescription>
          {device.device_id}
          {device.model ? ` · ${device.model}` : ""}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm py-2">
        <Row label="Status">
          <StatusBadge value={device.status} />
        </Row>
        <Row label="Silo">{device.silos?.name ?? "—"}</Row>
        <Row label="Warehouse">{device.warehouses?.name ?? "—"}</Row>
        <Row label="Manufacturer">{device.manufacturer ?? "—"}</Row>
        <Row label="Firmware">{device.firmware_version ?? "—"}</Row>
        <Row label="MAC">{device.mac_address ?? "—"}</Row>
        <Row label="Power">{device.power_source ?? "—"}</Row>
        <Row label="Battery">{reading?.battery_level ?? device.battery_level ?? "—"}</Row>
        <Row label="Signal">{reading?.signal_strength ?? device.signal_strength ?? "—"} dBm</Row>
        <Row label="Last heartbeat">
          {device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString() : "—"}
        </Row>
        <Row label="Calibration due">
          {device.calibration_due_date
            ? new Date(device.calibration_due_date).toLocaleDateString()
            : "—"}
        </Row>

        <div className="pt-3 border-t border-border/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Latest reading
          </div>
          {reading ? (
            <div className="grid grid-cols-4 gap-2">
              <MiniReading icon={Thermometer} value={reading.temperature_value} unit="°C" />
              <MiniReading icon={Droplets} value={reading.humidity_value} unit="%" />
              <MiniReading icon={Wind} value={reading.co2_value} unit="ppm" />
              <MiniReading icon={AlertTriangle} value={reading.voc_value} unit="" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No readings yet.</p>
          )}
        </div>

        <div className="pt-3 border-t border-border/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Recent history
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded border border-border/40 divide-y divide-slate-100 text-xs">
              {history.map((r) => (
                <div key={r.id} className="grid grid-cols-5 items-center px-2 py-1 gap-1">
                  <span className="col-span-2 text-muted-foreground">
                    {new Date(r.reading_timestamp).toLocaleTimeString()}
                  </span>
                  <span className="tabular-nums">
                    {r.temperature_value != null
                      ? `${Number(r.temperature_value).toFixed(1)}°`
                      : "—"}
                  </span>
                  <span className="tabular-nums">
                    {r.humidity_value != null ? `${Number(r.humidity_value).toFixed(0)}%` : "—"}
                  </span>
                  <span className="tabular-nums text-right">
                    {r.anomaly_detected ? (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1">
                        anom
                      </Badge>
                    ) : (
                      (r.ml_risk_class ?? "")
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {device.notes && (
          <div className="pt-2 border-t border-border/40">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
            <p className="text-foreground whitespace-pre-wrap">{device.notes}</p>
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onEdit}>
          Edit
        </Button>
      </DialogFooter>
    </>
  );
}

function MiniReading({
  icon: Icon,
  value,
  unit,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  value: number | null | undefined;
  unit: string;
  tone?: "warn";
}) {
  const has = value != null;
  const cls = !has
    ? "bg-slate-50 text-slate-400 border-slate-200"
    : tone === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-emerald-50 text-emerald-700 border-emerald-100";
  return (
    <div className={`rounded border px-1.5 py-1 text-center ${cls}`}>
      <Icon className="w-3 h-3 mx-auto opacity-70" />
      <div className="text-xs font-semibold tabular-nums leading-tight">
        {has ? `${Number(value).toFixed(unit === "" ? 0 : 1)}${unit}` : "—"}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-muted-foreground pt-0.5">{label}</span>
      <span className="text-foreground text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tint: "emerald" | "sky" | "amber" | "rose";
}) {
  const map = {
    emerald: "text-emerald-600 bg-emerald-50",
    sky: "text-sky-600 bg-sky-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
  };
  return (
    <Card className="border-border/40/70 shadow-sm">
      <CardContent className="p-3 flex items-center gap-2">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${map[tint]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-semibold text-foreground truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
