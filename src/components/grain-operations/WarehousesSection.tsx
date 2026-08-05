'use client';

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Eye, Loader2, LayoutList, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/app/DataListPage";
import { InlineRename } from "@/components/app/InlineRename";
import { listWarehouses, upsertWarehouse, deleteWarehouse, renameWarehouse, listWarehousesByCity } from "@/lib/operations.functions";
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
  const listByCity = useServerFn(listWarehousesByCity);
  const upsert = useServerFn(upsertWarehouse);
  const del = useServerFn(deleteWarehouse);
  const rename = useServerFn(renameWarehouse);
  const fetchRole = useServerFn(getMyRole);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => list() as Promise<Warehouse[]>,
  });

  const { data: warehousesByCity } = useQuery({
    queryKey: ["warehouses-by-city"],
    queryFn: () => listByCity(),
  });

  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canRename = RENAME_ROLES.includes(me?.role ?? "");
  const isManager = me?.role === "manager";
  const isTechnician = me?.role === "technician";
  const canCreateWarehouse = !isManager && !isTechnician; // Only admins can create warehouses

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
      qc.invalidateQueries({ queryKey: ["warehouses-by-city"] });
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
      qc.invalidateQueries({ queryKey: ["warehouses-by-city"] });
      qc.invalidateQueries({ queryKey: ["dashboard-extras"] });
    },
    onError: (e: Error) => toast.error(e.message || "Rename failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Warehouse deleted");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["warehouses-by-city"] });
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

  // Manager/Technician view - show warehouses grouped by cities
  if (isManager || isTechnician) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">My Warehouses</h2>
            <p className="text-sm text-muted-foreground">
              {isManager ? "Warehouses you manage" : "Your assigned warehouse"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading warehouses...
          </div>
        ) : !warehousesByCity?.byCity || Object.keys(warehousesByCity.byCity).length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No warehouses assigned to you.</p>
            <p className="text-xs mt-1">Contact your administrator to get warehouse access.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(warehousesByCity.byCity).map(([city, warehouses]) => (
              <div key={city} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-foreground">{city}</h3>
                  <span className="text-xs text-muted-foreground">
                    {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warehouses.map((warehouse: any) => (
                    <div
                      key={warehouse.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-card"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm">{warehouse.name}</h4>
                          <p className="text-xs text-muted-foreground">{warehouse.warehouse_id}</p>
                        </div>
                        <StatusBadge value={warehouse.status} />
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Silos:</span>
                          <span className="font-medium">{warehouse.siloCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-medium">
                            {Math.round((warehouse.totalCapacity || 0) / 1000).toLocaleString()}t
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Fill:</span>
                          <span className="font-medium">
                            {warehouse.totalCapacity 
                              ? `${Math.round(((warehouse.currentOccupancy || 0) / warehouse.totalCapacity) * 100)}%`
                              : "0%"
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(warehouse);
                            setViewOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {!isTechnician && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(warehouse)}
                            className="flex-1"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {renderManagerDialogs()}
      </div>
    );
  }

  // Helper function for manager/technician dialogs
  function renderManagerDialogs() {
    return (
      <>
        {/* View Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-md">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    <InlineRename
                      value={selected.name}
                      canRename={canRename && !isTechnician}
                      onSave={async (next) => {
                        await renameMutation.mutateAsync({ id: selected.id, name: next });
                        setSelected((prev) => (prev ? { ...prev, name: next } : prev));
                      }}
                    />
                  </DialogTitle>
                  <DialogDescription>{selected.warehouse_id}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm py-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge value={selected.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Capacity:</span>
                    <span>{(selected.total_capacity_kg ?? 0).toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Silos:</span>
                    <span>{selected.silos?.length ?? 0}</span>
                  </div>
                  {selected.location?.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selected.location.description}</span>
                    </div>
                  )}
                  {selected.location?.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span>{selected.location.address}</span>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Notes:</span>
                      <div className="text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded">
                        {selected.notes}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {!isTechnician && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewOpen(false);
                        openEdit(selected);
                      }}
                      className="gap-1"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog - Limited for managers */}
        <Dialog
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setForm(emptyForm);
          }}
        >
          <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Warehouse</DialogTitle>
              <DialogDescription>Update warehouse details (limited access).</DialogDescription>
            </DialogHeader>
            <form
              id="warehouse-form"
              className="grid gap-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Warehouse name"
                  disabled={true} // Managers cannot change name
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="City, State, Country"
                />
              </div>
              <div>
                <Label>Location Description</Label>
                <Input
                  value={form.location_description}
                  onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                  placeholder="e.g. Industrial Zone A"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </form>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                form="warehouse-form"
                type="submit"
                disabled={saveMutation.isPending || !form.name}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
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

          <Button onClick={openCreate} className="gap-2 h-9 whitespace-nowrap" disabled={!canCreateWarehouse}>
            <Plus className="w-4 h-4" /> New warehouse
          </Button>
        </div>

        {/* ── Region view ───────────────────────────────────────── */}
        {viewMode === "region" && <MultiRegionWarehousesView />}

        {/* ── List view ─────────────────────────────────────────── */}
        {viewMode === "list" && (isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No warehouses yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Warehouse</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Capacity</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-colors">
                    <td className="px-3 py-2 text-foreground font-medium">
                      <InlineRename
                        value={w.name}
                        canRename={canRename}
                        textClassName="text-foreground font-medium"
                        onSave={async (next) => { await renameMutation.mutateAsync({ id: w.id, name: next }); }}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{w.location?.description ?? w.location?.address ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{(w.total_capacity_kg ?? 0).toLocaleString()} kg</td>
                    <td className="px-3 py-2"><StatusBadge value={w.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(w); setViewOpen(true); }} className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(w)} className="h-7 w-7 p-0"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
