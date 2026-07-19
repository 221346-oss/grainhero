import { createFileRoute, Link } from "@tanstack/react-router";
import { SilosSkeleton } from "@/components/app/skeletons";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Search, Edit2, Trash2, Eye, Thermometer, Droplets, Wind,
  Clock, CalendarDays, Loader2, Inbox, Building2, WifiOff, Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import { listSilos, upsertSilo, deleteSilo, listWarehouses } from "@/lib/operations.functions";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { DispatchDialog } from "@/components/app/silos/DispatchDialog";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

export const Route = createFileRoute("/_authenticated/silos")({
  component: SilosPage,
});

type Silo = {
  id: string;
  silo_id: string;
  name: string;
  warehouse_id: string | null;
  capacity_kg: number | null;
  current_occupancy_kg: number | null;
  status: string | null;
  location: { description?: string | null } | null;
  batch_loaded_date: string | null;
  batch_dispatched_date: string | null;
  current_conditions: {
    temperature?: { value?: number };
    humidity?: { value?: number };
    co2?: { value?: number };
  } | null;
  notes: string | null;
  warehouses?: { id: string; name: string; warehouse_id: string } | null;
  current_batch?: { id: string; batch_id: string; grain_type: string } | null;
};

type Warehouse = { id: string; name: string; warehouse_id: string };

type FormState = {
  id?: string;
  warehouse_id: string;
  capacity_kg: string;
  location_description: string;
  status: "active" | "offline" | "error" | "maintenance";
  notes: string;
};

const emptyForm: FormState = {
  warehouse_id: "",
  capacity_kg: "",
  location_description: "",
  status: "active",
  notes: "",
};

function SilosPage() {
  const list = useServerFn(listSilos);
  const listWh = useServerFn(listWarehouses);
  const upsert = useServerFn(upsertSilo);
  const del = useServerFn(deleteSilo);
  const qc = useQueryClient();
  
  // Plan limits check
  const { canAddSilo, siloLimitMessage } = usePlanLimits();
  const { isSuperAdmin } = useIsSuperAdmin();

  const { data, isLoading } = useQuery({ queryKey: ["silos"], queryFn: () => list() as Promise<Silo[]> });
  const { data: warehousesData } = useQuery({ queryKey: ["warehouses"], queryFn: () => listWh() as Promise<Warehouse[]> });
  const warehouses = warehousesData ?? [];

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Silo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchSilo, setDispatchSilo] = useState<Silo | null>(null);

  // Live tick for storage-duration counter
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const all = (data ?? []) as Silo[];
    return all.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (warehouseFilter !== "all" && s.warehouse_id !== warehouseFilter) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return s.name?.toLowerCase().includes(t) || s.silo_id?.toLowerCase().includes(t);
    });
  }, [data, q, statusFilter, warehouseFilter]);

  const totalCap = rows.reduce((s, x) => s + (x.capacity_kg ?? 0), 0);
  const totalStock = rows.reduce((s, x) => s + (x.current_occupancy_kg ?? 0), 0);
  const activeCount = rows.filter((x) => x.status === "active").length;

  const saveMutation = useMutation({
    mutationFn: (fs: FormState) =>
      upsert({
        data: {
          id: fs.id,
          warehouse_id: fs.warehouse_id,
          capacity_kg: Number(fs.capacity_kg),
          location_description: fs.location_description.trim() || null,
          status: fs.status,
          notes: fs.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Silo updated" : "Silo created");
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Silo deleted");
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  function openCreate() {
    setForm({ ...emptyForm, warehouse_id: warehouses[0]?.id ?? "" });
    setEditOpen(true);
  }

  function openEdit(s: Silo) {
    setForm({
      id: s.id,
      warehouse_id: s.warehouse_id ?? "",
      capacity_kg: s.capacity_kg ? String(s.capacity_kg) : "",
      location_description: s.location?.description ?? "",
      status: (s.status as FormState["status"]) ?? "active",
      notes: s.notes ?? "",
    });
    setEditOpen(true);
  }

  if (isLoading) return <SilosSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Silo Management"
        subtitle="Storage units, live conditions, and batch tracking"
        badge={isLoading ? "…" : `${rows.length}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MiniStat icon={Package} label="Silos" value={rows.length} tint="emerald" />
        <MiniStat icon={Package} label="Active" value={activeCount} tint="sky" />
        <MiniStat icon={Package} label="Capacity" value={`${(totalCap / 1000).toFixed(1)}t`} tint="violet" />
        <MiniStat icon={Package} label="Stock" value={`${(totalStock / 1000).toFixed(1)}t`} tint="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search silo…" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSuperAdmin ? (
          <Button
            onClick={openCreate}
            className="gap-2 whitespace-nowrap"
            disabled={!canAddSilo}
            title={siloLimitMessage ?? "Create new silo"}
          >
            <Plus className="w-4 h-4" /> New silo
          </Button>
        ) : (
          <Button asChild variant="outline" className="gap-2 whitespace-nowrap">
            <Link to="/orders">Request install →</Link>
          </Button>
        )}
      </div>

      {/* Plan limit warning banner */}
      {siloLimitMessage && (
        <Card className="border-amber-300 bg-amber-50 mb-4">
          <CardContent className="p-4 flex items-start gap-3">
            <Package className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900">{siloLimitMessage}</p>
              <Link to="/subscription" className="text-amber-700 underline text-xs">
                View plans →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {rows.length === 0 ? (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-60" />
            <p className="text-sm mb-4">No silos match your filters.</p>
            {warehouses.length === 0 ? (
              <Link to="/warehouses" className="text-sm text-primary hover:text-primary/80 underline underline-offset-4">Create a warehouse first →</Link>
            ) : (
              <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add silo</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <SiloCard key={s.id} silo={s}
              onView={() => { setSelected(s); setViewOpen(true); }}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleteId(s.id)}
              onDispatch={() => { setDispatchSilo(s); setDispatchOpen(true); }}
            />
          ))}
        </div>
      )}

      <DispatchDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        siloId={dispatchSilo?.id ?? null}
        siloName={dispatchSilo?.name}
      />

      {/* Create / Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit silo" : "New silo"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update silo settings. Silo ID and name are immutable." : "Silo ID and name are generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="silo-form"
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
            className="grid gap-4 py-2"
          >
            <div>
              <Label>Warehouse</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.warehouse_id})</SelectItem>)}
                </SelectContent>
              </Select>
              {warehouses.length === 0 && (
                <p className="text-xs text-rose-600 mt-1">
                  No warehouses yet. <Link to="/warehouses" className="underline">Create one</Link> first.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacity (kg)</Label>
                <Input required type="number" min={1} value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Location description</Label>
              <Input value={form.location_description} onChange={(e) => setForm({ ...form, location_description: e.target.value })} placeholder="Row A, position 3" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button form="silo-form" type="submit" disabled={saveMutation.isPending || !form.warehouse_id || !form.capacity_kg}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? "Save changes" : "Create silo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 min-w-0">
              <Package className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="truncate">{selected?.name}</span>
            </DialogTitle>
            <DialogDescription>{selected?.silo_id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm py-2">
              <Row label="Status"><StatusBadge value={selected.status} /></Row>
              <Row label="Warehouse">
                {selected.warehouses ? (
                  <Link to="/warehouses" className="text-emerald-700 underline inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {selected.warehouses.name}
                  </Link>
                ) : "—"}
              </Row>
              <Row label="Capacity">{selected.capacity_kg ? `${selected.capacity_kg.toLocaleString()} kg` : "—"}</Row>
              <Row label="Occupancy">
                {selected.capacity_kg && selected.current_occupancy_kg != null ? (
                  <span>{selected.current_occupancy_kg.toLocaleString()} kg ({Math.round((selected.current_occupancy_kg / selected.capacity_kg) * 100)}%)</span>
                ) : "—"}
              </Row>
              <Row label="Location">{selected.location?.description ?? "—"}</Row>
              {selected.current_batch && (
                <Row label="Current batch">
                  <Link to="/grain-batches" className="text-emerald-700 underline">
                    {selected.current_batch.batch_id} · {selected.current_batch.grain_type}
                  </Link>
                </Row>
              )}
              {selected.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
                  <p className="text-slate-700 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button onClick={() => { setViewOpen(false); if (selected) openEdit(selected); }} className="gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete silo?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the silo permanently. Sensors, batches and alerts referencing it will lose the link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SiloCard({ silo, onView, onEdit, onDelete, onDispatch }: { silo: Silo; onView: () => void; onEdit: () => void; onDelete: () => void; onDispatch: () => void }) {
  const cap = silo.capacity_kg ?? 0;
  const occ = silo.current_occupancy_kg ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
  const duration = getStorageDuration(silo);

  const t = silo.current_conditions?.temperature?.value;
  const h = silo.current_conditions?.humidity?.value;
  const c = silo.current_conditions?.co2?.value;

  return (
    <Card className="border-slate-200/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{silo.name}</div>
            <div className="text-xs text-slate-500 truncate">{silo.silo_id}</div>
          </div>
          <StatusBadge value={silo.status} />
        </div>

        {silo.warehouses && (
          <div className="text-xs text-slate-600 flex items-center gap-1 min-w-0">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{silo.warehouses.name}</span>
          </div>
        )}

        {/* Occupancy */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Occupancy</span>
            <span className="font-medium tabular-nums">{occ.toLocaleString()} / {cap.toLocaleString()} kg</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Current batch */}
        {silo.current_batch && (
          <div className="rounded-md bg-sky-50 border border-sky-100 px-2.5 py-1.5 text-xs">
            <div className="font-medium text-sky-900 truncate">Batch {silo.current_batch.batch_id}</div>
            <div className="text-sky-700 truncate">{silo.current_batch.grain_type}</div>
          </div>
        )}

        {/* Storage duration */}
        {duration && (
          <div className={`rounded-md px-2.5 py-1.5 text-xs border ${duration.isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="flex items-center gap-1 text-slate-600 min-w-0">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="truncate">Storage</span>
              </span>
              {duration.isActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Live
                </span>
              ) : (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">Stopped</Badge>
              )}
            </div>
            <div className={`font-semibold tabular-nums mt-0.5 ${duration.isActive ? "text-emerald-800" : "text-slate-700"}`}>
              {duration.days}d {duration.hours}h {duration.minutes}m
            </div>
            {silo.batch_loaded_date && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                <CalendarDays className="w-2.5 h-2.5" />
                Since {new Date(silo.batch_loaded_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Environmental */}
        <div className="pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Conditions</span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <WifiOff className="w-3 h-3" />
              <span className="text-[10px]">no live feed</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Reading icon={Thermometer} value={typeof t === "number" ? `${t.toFixed(1)}°` : "—"} status={condStatus(t, "temperature")} />
            <Reading icon={Droplets} value={typeof h === "number" ? `${h.toFixed(0)}%` : "—"} status={condStatus(h, "humidity")} />
            <Reading icon={Wind} value={typeof c === "number" ? `${c.toFixed(0)}` : "—"} status={condStatus(c, "co2")} label="ppb" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          <Button size="sm" onClick={onDispatch} className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"><Truck className="w-3.5 h-3.5 mr-1" />Dispatch</Button>
          <Button variant="outline" size="sm" onClick={onView} className="h-8 w-8 p-0" title="View"><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="h-8 w-8 p-0" title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Reading({ icon: Icon, value, status, label }: { icon: React.ElementType; value: string; status: string; label?: string }) {
  const tone: Record<string, string> = {
    normal: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    critical: "bg-rose-50 text-rose-700 border-rose-100",
    unknown: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <div className={`rounded-md border px-2 py-1.5 text-center ${tone[status]}`}>
      <Icon className="w-3 h-3 mx-auto mb-0.5 opacity-70" />
      <div className="text-xs font-semibold tabular-nums leading-tight">{value}</div>
      {label && <div className="text-[9px] uppercase opacity-60">{label}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-slate-500 pt-0.5">{label}</span>
      <span className="text-slate-800 text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: React.ReactNode; tint: "emerald" | "sky" | "violet" | "amber" }) {
  const map = { emerald: "text-emerald-600 bg-emerald-50", sky: "text-sky-600 bg-sky-50", violet: "text-violet-600 bg-violet-50", amber: "text-amber-600 bg-amber-50" };
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardContent className="p-3 flex items-center gap-2">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${map[tint]}`}><Icon className="w-4 h-4" /></div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
          <div className="font-semibold text-slate-900 truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStorageDuration(silo: Silo) {
  if (!silo.batch_loaded_date) return null;
  const start = new Date(silo.batch_loaded_date).getTime();
  const end = silo.batch_dispatched_date ? new Date(silo.batch_dispatched_date).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes, isActive: !silo.batch_dispatched_date };
}

function condStatus(v: number | undefined, kind: "temperature" | "humidity" | "co2"): string {
  if (typeof v !== "number") return "unknown";
  if (kind === "temperature") {
    if (v > 35 || v < 15) return "critical";
    if (v > 30) return "warning";
    return "normal";
  }
  if (kind === "humidity") {
    if (v > 80 || v < 40) return "critical";
    if (v > 70) return "warning";
    return "normal";
  }
  if (v > 5000) return "critical";
  if (v > 1000) return "warning";
  return "normal";
}