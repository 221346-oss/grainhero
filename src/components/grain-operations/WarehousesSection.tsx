'use client';

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Eye, Loader2, LayoutList, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/app/DataListPage";
import { InlineRename } from "@/components/app/InlineRename";
import { listWarehouses, upsertWarehouse, deleteWarehouse, renameWarehouse } from "@/lib/operations.functions";
import { parsePlanLimitError } from "@/lib/plan-gate";
import { getMyRole } from "@/lib/roles.functions";
import { MultiRegionWarehousesView } from "@/components/grain-operations/MultiRegionWarehousesView";
import type { ExportColumn } from "@/lib/csv-pdf-export";

function friendlySaveError(e: Error): string {
  const limit = parsePlanLimitError(e);
  if (limit) return `Your plan allows up to ${limit.limit} warehouses (${limit.used} in use). Upgrade to add more.`;
  return e.message || "Save failed";
}

// Same allow-list used for team invite/manage — technicians can't rename.
const RENAME_ROLES = ["super_admin", "admin", "manager"];

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

const warehouseExportColumns: ExportColumn<Warehouse>[] = [
  { header: "Warehouse ID", value: (w) => w.warehouse_id },
  { header: "Name", value: (w) => w.name },
  { header: "Status", value: (w) => w.status ?? "" },
  { header: "Total capacity (kg)", value: (w) => w.total_capacity_kg ?? "" },
  { header: "Silo count", value: (w) => w.silos?.length ?? 0 },
  { header: "Address", value: (w) => w.location?.address ?? "" },
];

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

export function WarehousesSection() {
  const list = useServerFn(listWarehouses);
  const upsert = useServerFn(upsertWarehouse);
  const del = useServerFn(deleteWarehouse);
  const rename = useServerFn(renameWarehouse);
  const fetchRole = useServerFn(getMyRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => list() as Promise<Warehouse[]>,
  });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canRename = RENAME_ROLES.includes(me?.role ?? "");

  const [viewMode, setViewMode] = useState<"list" | "region">("list");
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

  const saveMutation = useMutation({
    mutationFn: async (fs: FormState) => {
      return upsert({
        data: {
          id: fs.id,
          name: fs.name.trim(),
          total_capacity_kg: Number(fs.total_capacity_kg),
          location_description: fs.location_description.trim() || null,
          address: fs.address.trim() || null,
          status: fs.status,
          notes: fs.notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success(form.id ? "Warehouse updated" : "Warehouse created");
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
      toast.success("Warehouse renamed");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-extras"] });
    },
    onError: (e: Error) => toast.error(e.message || "Rename failed"),
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
    setForm(emptyForm);
    setEditOpen(true);
  }
  function openEdit(w: Warehouse) {
    setForm({
      id: w.id,
      name: w.name ?? "",
      warehouse_id: w.warehouse_id ?? "",
      location_description: w.location?.description ?? "",
      address: w.location?.address ?? "",
      total_capacity_kg: String(w.total_capacity_kg ?? ""),
      status: (w.status ?? "active") as FormState["status"],
      notes: w.notes ?? "",
    });
    setEditOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search warehouse…" className="pl-9 h-9" />
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

          {/* View-mode toggle */}
          <div className="flex rounded-md border border-slate-200 overflow-hidden h-9 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              title="List view"
              className={`px-3 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[#2FAC0C] text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode("region")}
              title="By region"
              className={`px-3 flex items-center gap-1.5 text-xs font-medium border-l border-slate-200 transition-colors ${
                viewMode === "region"
                  ? "bg-[#2FAC0C] text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> By Region
            </button>
          </div>

          <Button onClick={openCreate} className="gap-2 h-9 whitespace-nowrap"><Plus className="w-4 h-4" /> New warehouse</Button>
        </div>

        {/* ── Region view ───────────────────────────────────────── */}
        {viewMode === "region" && (
          <div className="max-h-[72vh] overflow-y-auto pr-0.5">
            <MultiRegionWarehousesView />
          </div>
        )}

        {/* ── List view — compact card grid ─────────────────────── */}
        {viewMode === "list" && (isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No warehouses yet.</p>
          </div>
        ) : (
          <div className="max-h-[72vh] overflow-y-auto pr-0.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {rows.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col"
              >
                {/* Card header */}
                <div className="flex items-start gap-2 p-3 pb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0 mt-0.5">
                    <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <InlineRename
                      value={w.name}
                      canRename={canRename}
                      textClassName="text-xs font-semibold text-slate-800 truncate block"
                      onSave={async (next) => { await renameMutation.mutateAsync({ id: w.id, name: next }); }}
                    />
                    <p className="text-[10px] font-mono text-slate-400 truncate">{w.warehouse_id}</p>
                  </div>
                  <StatusBadge value={w.status} />
                </div>

                {/* Location */}
                {(w.location?.description || w.location?.address) && (
                  <div className="flex items-start gap-1.5 px-3 pb-1.5">
                    <MapPin className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500 truncate leading-4">
                      {w.location?.description ?? w.location?.address}
                    </p>
                  </div>
                )}

                {/* Stats row */}
                <div className="mx-3 mb-2 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 leading-3">Capacity</p>
                    <p className="text-[11px] font-semibold text-slate-700 tabular-nums">{(w.total_capacity_kg ?? 0).toLocaleString()} kg</p>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 leading-3">Silos</p>
                    <p className="text-[11px] font-semibold text-slate-700">{w.silos?.length ?? 0}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0 px-2 pb-2 mt-auto border-t border-slate-100 pt-1.5">
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(w); setViewOpen(true); }} className="h-6 flex-1 text-[10px] text-slate-500 hover:text-slate-800 gap-0.5 rounded-md">
                    <Eye className="w-3 h-3" /> View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)} className="h-6 flex-1 text-[10px] text-slate-500 hover:text-slate-800 gap-0.5 rounded-md">
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)} className="h-6 w-7 p-0 text-rose-400 hover:text-rose-600 rounded-md">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit warehouse" : "New warehouse"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update warehouse details." : "Create a new warehouse location."}
            </DialogDescription>
          </DialogHeader>
          <form id="warehouse-form" className="grid gap-4 py-2" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div>
              <Label>Name *</Label>
              {form.id && !canRename ? (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">{form.name || "—"}</div>
              ) : (
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Storage" />
              )}
            </div>
            <div>
              <Label>Capacity (kg) *</Label>
              <Input type="number" min={1} required value={form.total_capacity_kg} onChange={(e) => setForm({ ...form, total_capacity_kg: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location_description} onChange={(e) => setForm({ ...form, location_description: e.target.value })} placeholder="e.g. Building A" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
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
            <Button form="warehouse-form" type="submit" disabled={saveMutation.isPending || !form.name || !form.total_capacity_kg}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? "Save changes" : "Create warehouse"}
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
                <DialogDescription>{selected.warehouse_id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm py-2">
                <Row label="Capacity">{(selected.total_capacity_kg ?? 0).toLocaleString()} kg</Row>
                {selected.location?.description && <Row label="Location">{selected.location.description}</Row>}
                {selected.location?.address && <Row label="Address">{selected.location.address}</Row>}
                <Row label="Status"><StatusBadge value={selected.status} /></Row>
                {selected.silos && <Row label="Silos">{selected.silos.length}</Row>}
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
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the warehouse. Any silos it contains must be reassigned first.
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
