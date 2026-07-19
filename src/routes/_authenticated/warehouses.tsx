import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Search, Edit2, Trash2, Eye, MapPin, Package, Users, Loader2, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import { listWarehouses, upsertWarehouse, deleteWarehouse } from "@/lib/operations.functions";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export const Route = createFileRoute("/_authenticated/warehouses")({
  component: WarehousesPage,
});

type Warehouse = {
  id: string;
  warehouse_id: string;
  name: string;
  status: string | null;
  total_capacity_kg: number | null;
  location: { description?: string | null; address?: string | null } | null;
  notes: string | null;
  created_at: string | null;
  silos?: Array<{ id: string }> | null;
};

type FormState = {
  id?: string;
  name: string;
  warehouse_id: string;
  location_description: string;
  address: string;
  total_capacity_kg: string;
  status: "active" | "offline" | "error" | "maintenance";
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  warehouse_id: "",
  location_description: "",
  address: "",
  total_capacity_kg: "",
  status: "active",
  notes: "",
};

function WarehousesPage() {
  const list = useServerFn(listWarehouses);
  const upsert = useServerFn(upsertWarehouse);
  const del = useServerFn(deleteWarehouse);
  const qc = useQueryClient();
  
  // Plan limits check
  const { canAddWarehouse, warehouseLimitMessage } = usePlanLimits();

  const { data, isLoading, error } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => list() as Promise<Warehouse[]>,
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const rows = useMemo(() => {
    const all = (data ?? []) as Warehouse[];
    return all.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        w.name?.toLowerCase().includes(s) ||
        w.warehouse_id?.toLowerCase().includes(s) ||
        w.location?.description?.toLowerCase().includes(s) ||
        w.location?.address?.toLowerCase().includes(s)
      );
    });
  }, [data, q, statusFilter]);

  const totalCapacity = rows.reduce((s, w) => s + (w.total_capacity_kg ?? 0), 0);
  const totalSilos = rows.reduce((s, w) => s + (w.silos?.length ?? 0), 0);

  const saveMutation = useMutation({
    mutationFn: async (fs: FormState) => {
      const payload = {
        id: fs.id,
        name: fs.name.trim(),
        warehouse_id: fs.warehouse_id.trim(),
        location_description: fs.location_description.trim() || null,
        address: fs.address.trim() || null,
        total_capacity_kg: fs.total_capacity_kg ? Number(fs.total_capacity_kg) : null,
        status: fs.status,
        notes: fs.notes.trim() || null,
      };
      return upsert({ data: payload });
    },
    onSuccess: () => {
      toast.success(form.id ? "Warehouse updated" : "Warehouse created");
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
      toast.success("Warehouse deleted");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  function openCreate() {
    setForm({ ...emptyForm, warehouse_id: `WH-${Date.now().toString().slice(-6)}` });
    setEditOpen(true);
  }

  function openEdit(w: Warehouse) {
    setForm({
      id: w.id,
      name: w.name ?? "",
      warehouse_id: w.warehouse_id ?? "",
      location_description: w.location?.description ?? "",
      address: w.location?.address ?? "",
      total_capacity_kg: w.total_capacity_kg ? String(w.total_capacity_kg) : "",
      status: (w.status as FormState["status"]) ?? "active",
      notes: w.notes ?? "",
    });
    setEditOpen(true);
  }

  function openView(w: Warehouse) {
    setSelected(w);
    setViewOpen(true);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Warehouses"
        subtitle="Physical facilities that hold your silos and grain"
        badge={isLoading ? "…" : `${rows.length}`}
      />

      {/* Stat strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatBox icon={Building2} label="Facilities" value={rows.length} accent="emerald" />
        <StatBox icon={Package} label="Total capacity" value={`${(totalCapacity / 1000).toFixed(1)} t`} accent="sky" />
        <StatBox icon={Users} label="Silos across sites" value={totalSilos} accent="violet" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, ID, or location…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={openCreate}
          className="gap-2"
          disabled={!canAddWarehouse}
          title={warehouseLimitMessage ?? "Create new warehouse"}
        >
          <Plus className="w-4 h-4" /> New warehouse
        </Button>
      </div>

      {/* Plan limit warning banner */}
      {warehouseLimitMessage && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 mb-4">
          <CardContent className="p-4 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">{warehouseLimitMessage}</p>
              <Link to="/subscription" className="text-amber-700 dark:text-amber-300 underline text-xs">
                View plans →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card className="border-rose-200"><CardContent className="py-8 text-center text-rose-600 text-sm">{(error as Error).message}</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm mb-4">No warehouses yet.</p>
            <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add your first warehouse</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Warehouse</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-left font-semibold">Capacity</th>
                  <th className="px-4 py-3 text-left font-semibold">Silos</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.warehouse_id}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <div>{w.location?.description ?? "—"}</div>
                          {w.location?.address && <div className="text-xs text-muted-foreground">{w.location.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {w.total_capacity_kg ? `${(w.total_capacity_kg / 1000).toLocaleString()} t` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/silos"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline"
                      >
                        <Package className="w-3.5 h-3.5" /> {w.silos?.length ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={w.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openView(w)} className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(w)} className="h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(w.id)} className="h-8 w-8 text-rose-600 hover:text-rose-700"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit warehouse" : "New warehouse"}</DialogTitle>
            <DialogDescription>{form.id ? "Update this facility's details." : "Add a new physical facility."}</DialogDescription>
          </DialogHeader>
          <form
            id="warehouse-form"
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
            className="grid gap-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="North Facility" />
              </div>
              <div>
                <Label>Warehouse ID</Label>
                <Input required value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.location_description} onChange={(e) => setForm({ ...form, location_description: e.target.value })} placeholder="Main dry-storage site" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, city" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacity (kg)</Label>
                <Input type="number" min={0} value={form.total_capacity_kg} onChange={(e) => setForm({ ...form, total_capacity_kg: e.target.value })} />
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
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button form="warehouse-form" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? "Save changes" : "Create warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {selected?.name}
            </DialogTitle>
            <DialogDescription>{selected?.warehouse_id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm py-2">
              <Row label="Status"><StatusBadge value={selected.status} /></Row>
              <Row label="Description">{selected.location?.description ?? "—"}</Row>
              <Row label="Address">{selected.location?.address ?? "—"}</Row>
              <Row label="Capacity">{selected.total_capacity_kg ? `${(selected.total_capacity_kg / 1000).toLocaleString()} t` : "—"}</Row>
              <Row label="Silos"><Badge variant="secondary">{selected.silos?.length ?? 0}</Badge></Row>
              <Row label="Created">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</Row>
              {selected.notes && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  <p className="text-foreground/80 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button onClick={() => { setViewOpen(false); if (selected) openEdit(selected); }} className="gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the warehouse permanently. Silos and batches linked to it will lose the reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-muted-foreground pt-0.5">{label}</span>
      <span className="text-foreground text-right">{children}</span>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: React.ReactNode; accent: "emerald" | "sky" | "violet" }) {
  const valueTone = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  } as const;
  const iconTone = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
  } as const;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconTone[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`text-xl font-semibold ${valueTone[accent]}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}