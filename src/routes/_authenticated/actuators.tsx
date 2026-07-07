import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Fan, Lightbulb, Power, PowerOff, Activity, AlertTriangle, CheckCircle,
  Zap, ThermometerSun, Wind, Shield, Timer, Gauge, Plus, Search, Edit2, Trash2,
  Eye, Loader2, Inbox, Bell, Snowflake, Flame,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import {
  listActuators, upsertActuator, deleteActuator, controlActuator, listSilos,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/actuators")({
  component: ActuatorsPage,
});

const TYPES = ["fan","vent","heater","cooler","alarm","light"] as const;
type ActType = typeof TYPES[number];

type Actuator = {
  id: string; actuator_id: string; name: string;
  actuator_type: ActType;
  silo_id: string;
  manufacturer: string | null; model: string | null; mac_address: string | null;
  status: "active"|"offline"|"error"|"maintenance";
  control_mode: string | null;
  is_enabled: boolean | null; is_on: boolean | null;
  power_level: number | null; target_fan_speed: number | null;
  human_requested_fan: boolean | null; ml_requested_fan: boolean | null;
  ml_decision: string | null;
  current_operation: { action?: string; value?: number; at?: string } | null;
  tags: string[] | null; notes: string | null;
  silos?: { id: string; silo_id: string; name: string;
    warehouses?: { id: string; name: string; warehouse_id: string } | null } | null;
};

type Silo = { id: string; silo_id: string; name: string; warehouse_id: string | null };

type Form = {
  id?: string;
  actuator_id: string; name: string;
  actuator_type: ActType;
  silo_id: string;
  manufacturer: string; model: string; mac_address: string;
  status: Actuator["status"];
  control_mode: "auto"|"manual"|"failsafe";
  is_enabled: boolean;
  power_level: string; target_fan_speed: string;
  tags: string; notes: string;
};

const empty: Form = {
  actuator_id: "", name: "", actuator_type: "fan", silo_id: "",
  manufacturer: "", model: "", mac_address: "",
  status: "active", control_mode: "auto", is_enabled: true,
  power_level: "80", target_fan_speed: "80",
  tags: "", notes: "",
};

const typeIcon = (t: string) => {
  switch (t) {
    case "fan": return Fan;
    case "vent": return Wind;
    case "heater": return Flame;
    case "cooler": return Snowflake;
    case "alarm": return Bell;
    case "light": return Lightbulb;
    default: return Activity;
  }
};

function ActuatorsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listActuators);
  const silosFn = useServerFn(listSilos);
  const saveFn = useServerFn(upsertActuator);
  const delFn = useServerFn(deleteActuator);
  const ctrlFn = useServerFn(controlActuator);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["actuators"],
    queryFn: () => listFn() as Promise<Actuator[]>,
    refetchInterval: 15000,
  });
  const { data: silos = [] } = useQuery({
    queryKey: ["silos"],
    queryFn: () => silosFn() as unknown as Promise<Silo[]>,
  });

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [viewing, setViewing] = useState<Actuator | null>(null);
  const [toDelete, setToDelete] = useState<Actuator | null>(null);
  const [pwmByRow, setPwmByRow] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.actuator_type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.actuator_id.toLowerCase().includes(q) ||
        (r.silos?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const on = rows.filter((r) => r.is_on).length;
    const auto = rows.filter((r) => r.control_mode === "auto").length;
    const err = rows.filter((r) => r.status === "error" || r.status === "offline").length;
    return { total, on, auto, err };
  }, [rows]);

  const save = useMutation({
    mutationFn: (payload: unknown) => saveFn({ data: payload } as never),
    onSuccess: () => {
      toast.success("Actuator saved");
      qc.invalidateQueries({ queryKey: ["actuators"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDlgOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Actuator deleted");
      qc.invalidateQueries({ queryKey: ["actuators"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const control = useMutation({
    mutationFn: (v: { id: string; action: string; value?: number }) =>
      ctrlFn({ data: v } as never),
    onSuccess: (_d, v) => {
      toast.success(`✅ ${v.action.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["actuators"] });
    },
    onError: (e: Error) => toast.error(`❌ ${e.message}`),
  });

  const openCreate = () => { setForm(empty); setDlgOpen(true); };
  const openEdit = (r: Actuator) => {
    setForm({
      id: r.id, actuator_id: r.actuator_id, name: r.name,
      actuator_type: r.actuator_type, silo_id: r.silo_id,
      manufacturer: r.manufacturer ?? "", model: r.model ?? "", mac_address: r.mac_address ?? "",
      status: r.status, control_mode: (r.control_mode as Form["control_mode"]) ?? "auto",
      is_enabled: !!r.is_enabled,
      power_level: String(r.power_level ?? 80),
      target_fan_speed: String(r.target_fan_speed ?? 80),
      tags: (r.tags ?? []).join(", "),
      notes: r.notes ?? "",
    });
    setDlgOpen(true);
  };
  const submit = () => {
    if (!form.name || !form.actuator_id || !form.silo_id) {
      toast.error("Name, ID and silo are required"); return;
    }
    save.mutate({
      id: form.id,
      actuator_id: form.actuator_id, name: form.name,
      actuator_type: form.actuator_type, silo_id: form.silo_id,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      mac_address: form.mac_address || null,
      status: form.status, control_mode: form.control_mode,
      is_enabled: form.is_enabled,
      power_level: form.power_level ? Number(form.power_level) : null,
      target_fan_speed: form.target_fan_speed ? Number(form.target_fan_speed) : null,
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
      notes: form.notes || null,
    });
  };

  const emergency = () => {
    rows.filter((r) => r.is_on).forEach((r) =>
      control.mutate({ id: r.id, action: "emergency_stop" })
    );
    toast.warning("🚨 Emergency stop broadcast to all active actuators");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <PageHeader
          title="Actuator Control Center"
          subtitle="Fans, vents, heaters, coolers, alarms & lights — direct hardware control"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={emergency}>
            <AlertTriangle className="h-4 w-4" /> Emergency Stop
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Actuator
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Devices" value={stats.total} icon={<Activity className="h-4 w-4" />} tone="indigo" />
        <StatCard label="Currently On" value={stats.on} icon={<Power className="h-4 w-4" />} tone="emerald" />
        <StatCard label="Auto Mode" value={stats.auto} icon={<Shield className="h-4 w-4" />} tone="blue" />
        <StatCard label="Offline / Error" value={stats.err} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID or silo" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of actuator cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading actuators…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <div className="font-medium">No actuators found</div>
          <div className="text-sm">Create one to start controlling hardware.</div>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const Icon = typeIcon(r.actuator_type);
            const on = !!r.is_on;
            const pwm = pwmByRow[r.id] ?? r.power_level ?? 80;
            const authority = r.control_mode === "manual" ? "HUMAN"
              : r.control_mode === "failsafe" ? "FAILSAFE" : "ML_AUTO";
            return (
              <Card key={r.id} className={`relative overflow-hidden border-2 transition-all ${on ? "border-emerald-400 shadow-lg shadow-emerald-100/50" : "border-transparent"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${on ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        <Icon className={`h-5 w-5 ${on && r.actuator_type === "fan" ? "animate-spin" : ""}`} style={on && r.actuator_type === "fan" ? { animationDuration: "1.2s" } : {}} />
                      </div>
                      <span className="truncate">{r.name}</span>
                    </span>
                    <Badge variant={on ? "default" : "secondary"} className={on ? "bg-emerald-500" : ""}>
                      {on ? "Running" : "Idle"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-mono">{r.actuator_id}</span>
                    <span className="capitalize">{r.actuator_type}</span>
                    {r.silos && <span>· {r.silos.name}</span>}
                    <StatusBadge value={r.status} />
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border p-2 bg-muted/30">
                      <div className="text-[10px] uppercase text-muted-foreground">Power</div>
                      <div className="font-bold flex items-center justify-center gap-1"><Gauge className="h-3 w-3" />{r.power_level ?? 0}%</div>
                    </div>
                    <div className="rounded-lg border p-2 bg-muted/30">
                      <div className="text-[10px] uppercase text-muted-foreground">Mode</div>
                      <div className="font-bold text-xs">{authority === "HUMAN" ? "🧑 Manual" : authority === "FAILSAFE" ? "🛡️ Safe" : "🤖 Auto"}</div>
                    </div>
                    <div className="rounded-lg border p-2 bg-muted/30">
                      <div className="text-[10px] uppercase text-muted-foreground">ML</div>
                      <div className="font-bold text-xs capitalize truncate">{r.ml_decision ?? "—"}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={control.isPending}
                      onClick={() => control.mutate({ id: r.id, action: "turn_on", value: pwm })}>
                      <Power className="h-4 w-4" /> Start ({pwm}%)
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                      disabled={control.isPending}
                      onClick={() => control.mutate({ id: r.id, action: "turn_off" })}>
                      <PowerOff className="h-4 w-4" /> Stop
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-muted-foreground">Power Level</Label>
                      <span className="font-bold">{pwm}%</span>
                    </div>
                    <Slider value={[pwm]} min={0} max={100} step={5}
                      onValueChange={([v]) => setPwmByRow((s) => ({ ...s, [r.id]: v }))}
                      onValueCommit={([v]) => control.mutate({ id: r.id, action: "set_value", value: v })}
                    />
                    <div className="flex gap-1.5">
                      {[20, 40, 60, 80, 100].map((v) => (
                        <Button key={v} variant="outline" size="sm" className="flex-1 h-7 text-xs"
                          onClick={() => {
                            setPwmByRow((s) => ({ ...s, [r.id]: v }));
                            control.mutate({ id: r.id, action: "set_value", value: v });
                          }}>{v}%</Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                      onClick={() => control.mutate({ id: r.id, action: r.control_mode === "auto" ? "manual" : "auto" })}>
                      <Activity className="h-3 w-3" />
                      {r.control_mode === "auto" ? "Take Manual" : "Return to Auto"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewing(r)} title="Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} title="Delete">
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* System rules card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-indigo-600" /> Control Rules & Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
            <CheckCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            <span><strong className="text-blue-700 dark:text-blue-300">Lid opens before fan starts</strong> — ESP32 opens lid, waits 3s, then starts the fan.</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
            <Timer className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <span><strong className="text-amber-700 dark:text-amber-300">Manual override expires</strong> — After 10 minutes, control returns to Auto/ML.</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
            <span><strong className="text-rose-700 dark:text-rose-300">Guardrails</strong> — Fan blocked if RH &gt; 80%, dew-point gap &lt; 1°C, or rainfall.</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
            <ThermometerSun className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span><strong className="text-emerald-700 dark:text-emerald-300">Min run time</strong> — Fan runs 15s minimum to protect the motor.</span>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Actuator" : "New Actuator"}</DialogTitle>
            <DialogDescription>Register a controllable device attached to a silo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <Label>Device ID *</Label>
              <Input value={form.actuator_id} onChange={(e) => setForm({ ...form, actuator_id: e.target.value })} placeholder="ACT-001" />
            </div>
            <div className="sm:col-span-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Silo A Fan" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.actuator_type} onValueChange={(v: ActType) => setForm({ ...form, actuator_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Silo *</Label>
              <Select value={form.silo_id} onValueChange={(v) => setForm({ ...form, silo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select silo" /></SelectTrigger>
                <SelectContent>
                  {silos.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.silo_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>MAC Address</Label><Input value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: Actuator["status"]) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Control Mode</Label>
              <Select value={form.control_mode} onValueChange={(v: Form["control_mode"]) => setForm({ ...form, control_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (ML)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="failsafe">Failsafe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Default Power %</Label><Input type="number" min={0} max={100} value={form.power_level} onChange={(e) => setForm({ ...form, power_level: e.target.value })} /></div>
            <div><Label>Target Speed %</Label><Input type="number" min={0} max={100} value={form.target_fan_speed} onChange={(e) => setForm({ ...form, target_fan_speed: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Checkbox id="ena" checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: !!v })} />
              <Label htmlFor="ena" className="cursor-pointer">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => { const I = typeIcon(viewing.actuator_type); return <I className="h-5 w-5" />; })()}
                  {viewing.name}
                </DialogTitle>
                <DialogDescription>{viewing.actuator_id} · <span className="capitalize">{viewing.actuator_type}</span></DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <Row label="Silo" val={viewing.silos?.name ?? "—"} />
                <Row label="Warehouse" val={viewing.silos?.warehouses?.name ?? "—"} />
                <Row label="Status" val={<StatusBadge value={viewing.status} />} />
                <Row label="Control mode" val={viewing.control_mode ?? "—"} />
                <Row label="On" val={viewing.is_on ? "Yes" : "No"} />
                <Row label="Power" val={`${viewing.power_level ?? 0}%`} />
                <Row label="Target speed" val={`${viewing.target_fan_speed ?? 0}%`} />
                <Row label="ML decision" val={viewing.ml_decision ?? "—"} />
                <Row label="Manufacturer" val={viewing.manufacturer ?? "—"} />
                <Row label="Model" val={viewing.model ?? "—"} />
                <Row label="MAC" val={viewing.mac_address ?? "—"} />
                {viewing.notes && <Row label="Notes" val={viewing.notes} />}
                {viewing.current_operation && (
                  <div className="p-2 rounded border bg-muted/30 text-xs">
                    <div className="font-medium mb-1">Last operation</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(viewing.current_operation, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete actuator?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{toDelete?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}
              className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "indigo"|"emerald"|"blue"|"rose" }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-200/60",
  };
  return (
    <div className={`rounded-xl border p-3 bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider font-medium opacity-80">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{val}</span>
    </div>
  );
}