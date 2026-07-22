'use client';

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Warehouse, Plus, Search, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/app/DataListPage";
import { InlineRename } from "@/components/app/InlineRename";
import { listSilos, upsertSilo, deleteSilo, listWarehouses, renameSilo } from "@/lib/operations.functions";
import { parsePlanLimitError } from "@/lib/plan-gate";
import { getMyRole } from "@/lib/roles.functions";

function friendlySaveError(e: Error): string {
  const limit = parsePlanLimitError(e);
  if (limit) return `Your plan allows up to ${limit.limit} silos (${limit.used} in use). Upgrade to add more.`;
  return e.message || "Save failed";
}

// Same allow-list used for team invite/manage — technicians can't rename.
const RENAME_ROLES = ["super_admin", "admin", "manager"];

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
  name: string;
  warehouse_id: string;
  capacity_kg: string;
  location_description: string;
  status: "active" | "offline" | "error" | "maintenance";
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  warehouse_id: "",
  capacity_kg: "",
  location_description: "",
  status: "active",
  notes: "",
};

export function SilosSection() {
  const list = useServerFn(listSilos);
  const listWh = useServerFn(listWarehouses);
  const upsert = useServerFn(upsertSilo);
  const del = useServerFn(deleteSilo);
  const rename = useServerFn(renameSilo);
  const fetchRole = useServerFn(getMyRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["silos"], queryFn: () => list() as Promise<Silo[]> });
  const { data: warehousesData } = useQuery({ queryKey: ["warehouses"], queryFn: () => listWh() as Promise<Warehouse[]> });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const warehouses = warehousesData ?? [];
  const canRename = RENAME_ROLES.includes(me?.role ?? "");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Silo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const rows = useMemo(() => {
    const all = (data ?? []) as Silo[];
    return all.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return s.name?.toLowerCase().includes(t) || s.silo_id?.toLowerCase().includes(t);
    });
  }, [data, q, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: (fs: FormState) =>
      upsert({
        data: {
          id: fs.id,
          name: fs.name.trim() || undefined,
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
    onError: (e: Error) => toast.error(friendlySaveError(e)),
  });

  const renameMutation = useMutation({
    mutationFn: (payload: { id: string; name: string }) => rename({ data: payload }),
    onSuccess: () => {
      toast.success("Silo renamed");
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-extras"] });
    },
    onError: (e: Error) => toast.error(e.message || "Rename failed"),
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
      name: s.name ?? "",
      warehouse_id: s.warehouse_id ?? "",
      capacity_kg: String(s.capacity_kg ?? ""),
      location_description: s.location?.description ?? "",
      status: (s.status ?? "active") as FormState["status"],
      notes: s.notes ?? "",
    });
    setEditOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search silo name…" className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2 h-9 whitespace-nowrap"><Plus className="w-4 h-4" /> New silo</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-white/40">
            <p className="text-sm">No silos yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Silo</th>
                  <th className="px-3 py-2 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Warehouse</th>
                  <th className="px-3 py-2 text-right font-semibold text-white/50 text-xs uppercase tracking-wider">Capacity</th>
                  <th className="px-3 py-2 text-right font-semibold text-white/50 text-xs uppercase tracking-wider">Current</th>
                  <th className="px-3 py-2 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-white font-medium">
                      <InlineRename
                        value={s.name}
                        canRename={canRename}
                        textClassName="text-white font-medium"
                        onSave={async (next) => { await renameMutation.mutateAsync({ id: s.id, name: next }); }}
                      />
                    </td>
                    <td className="px-3 py-2 text-white/70">{s.warehouses?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-white/70 tabular-nums">{(s.capacity_kg ?? 0).toLocaleString()} kg</td>
                    <td className="px-3 py-2 text-right text-white/70 tabular-nums">{(s.current_occupancy_kg ?? 0).toLocaleString()} kg</td>
                    <td className="px-3 py-2"><StatusBadge value={s.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(s); setViewOpen(true); }} className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="h-7 w-7 p-0"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit silo" : "New silo"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update silo details." : "Create a new silo in your warehouse."}
            </DialogDescription>
          </DialogHeader>
          <form id="silo-form" className="grid gap-4 py-2" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div>
              <Label>Name</Label>
              {form.id && !canRename ? (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">{form.name || "—"}</div>
              ) : (
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-generated if left blank" />
              )}
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity (kg) *</Label>
              <Input type="number" min={1} required value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location_description} onChange={(e) => setForm({ ...form, location_description: e.target.value })} placeholder="e.g. Building A, Zone 1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}>
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
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <InlineRename
                    value={selected.name}
                    canRename={canRename}
                    onSave={async (next) => {
                      await renameMutation.mutateAsync({ id: selected.id, name: next });
                      setSelected((prev) => (prev ? { ...prev, name: next } : prev));
                    }}
                  />
                </DialogTitle>
                <DialogDescription>{selected.silo_id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm py-2">
                <Row label="Warehouse">{selected.warehouses?.name ?? "—"}</Row>
                <Row label="Capacity">{(selected.capacity_kg ?? 0).toLocaleString()} kg</Row>
                <Row label="Current">{(selected.current_occupancy_kg ?? 0).toLocaleString()} kg</Row>
                <Row label="Status"><StatusBadge value={selected.status} /></Row>
                {selected.location?.description && <Row label="Location">{selected.location.description}</Row>}
                {selected.current_batch && <Row label="Current Batch">{selected.current_batch.grain_type}</Row>}
                {selected.notes && <Row label="Notes"><span className="whitespace-pre-wrap">{selected.notes}</span></Row>}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); openEdit(selected); }} className="gap-1"><Edit2 className="w-4 h-4" /> Edit</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete silo?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the silo. Any batches it contains must be reassigned first.
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-slate-800 text-right">{children}</span>
    </div>
  );
}
