"use client";

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Warehouse, Search, Edit2, Trash2, Loader2, ShoppingCart, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/app/DataListPage";
import { InlineRename } from "@/components/app/InlineRename";
import {
  listSilos,
  upsertSilo,
  deleteSilo,
  listWarehouses,
  renameSilo,
  listGrainBatches,
} from "@/lib/operations.functions";
import { parsePlanLimitError, usePlanGate } from "@/lib/plan-gate";
import { getMyRole } from "@/lib/roles.functions";
import { SiloOperationsCard, type BatchRow } from "./SiloOperationsCard";
import { DispatchDialog } from "@/components/app/silos/DispatchDialog";

function friendlySaveError(e: Error): string {
  const limit = parsePlanLimitError(e);
  if (limit)
    return `Your plan allows up to ${limit.limit} silos (${limit.used} in use). Upgrade to add more.`;
  return e.message || "Save failed";
}

// Managers are not allowed to edit/rename silos.
const RENAME_ROLES = ["super_admin", "admin"];

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

type Warehouse = {
  id: string;
  name: string;
  warehouse_id: string;
  location?: { description?: string | null; address?: string | null } | null;
};

type FormState = {
  id?: string;
  name: string;
  warehouse_id: string;
  capacity_kg: string;
  location_description: string;
  status: "active" | "offline" | "maintenance";
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
  const listBatchesFn = useServerFn(listGrainBatches);
  const upsert = useServerFn(upsertSilo);
  const del = useServerFn(deleteSilo);
  const rename = useServerFn(renameSilo);
  const fetchRole = useServerFn(getMyRole);
  const qc = useQueryClient();

  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["silos"],
    queryFn: () => list() as Promise<Silo[]>,
  });
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWh() as Promise<Warehouse[]>,
  });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const { data: batchesData } = useQuery({
    queryKey: ["grain-batches"],
    queryFn: () => listBatchesFn() as Promise<BatchRow[]>,
  });
  const warehouses = warehousesData ?? [];
  const batches = batchesData ?? [];
  const canRename = RENAME_ROLES.includes(me?.role ?? "");
  const isAdmin = me?.role === "admin" || me?.role === "super_admin";
  const isManager = me?.role === "manager";
  const [sellSilo, setSellSilo] = useState<Silo | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  // Admin/manager can never create a silo directly anymore — this only
  // decides where "Request Silo" sends them: the existing hardware-order
  // request flow (still within plan headroom) or the plan upgrade page
  // (would exceed it). Super Admin remains the only path that can actually
  // insert a silo row (via upsertSilo directly, or the automated
  // hardware_order_provision_silo trigger once an order's install completes).
  const siloGate = usePlanGate("max_silos");
  // usePlanGate resolves async — never fall through to "allowed" while the
  // gate is unresolved (loading, refetching after an error, etc). Only
  // proceed once siloGate.data has actually arrived.
  const siloGateReady = !siloGate.isLoading && !!siloGate.data;

  function handleRequestSilo() {
    // Super admin has no tenant subscription — send them to the platform
    // silo-requests page where they manage all pending silo orders.
    if (me?.role === "super_admin") {
      navigate({ to: "/platform/silo-requests" });
      return;
    }
    if (siloGate.data && !siloGate.data.allowed) {
      // Show an informative dialog instead of silently redirecting
      setLimitOpen(true);
      return;
    }
    navigate({ to: "/orders", search: { request: "1" } });
  }

  // Tracks which warehouse groups are expanded — all open by default
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(() => new Set());
  const toggleWarehouse = (id: string) =>
    setExpandedWarehouses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

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

  // ── Two-level hierarchy: Region → Warehouse → Silos ─────────────────────
  // Region = city. Try location.description, then parse from address, then warehouse name.
  function extractRegion(wh: Warehouse | undefined): string {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (!wh) return "Unassigned Region";
    const desc = (wh.location?.description ?? "").trim();
    if (desc) return desc;
    const addr = (wh.location?.address ?? "").trim();
    if (addr) {
      const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
      const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      if (city) return cap(city);
    }
    if (wh.name) {
      const city = wh.name.split(/[—\-–]/)[0].trim();
      if (city) return cap(city);
    }
    return "Unassigned Region";
  }

  const regionGroups = useMemo(() => {
    const whMap = new Map<string, Warehouse>();
    for (const w of warehouses) whMap.set(w.id, w);

    const byWarehouse = new Map<string, { warehouse: Warehouse | null; silos: Silo[] }>();
    for (const s of rows) {
      const whId = s.warehouse_id ?? "unassigned";
      if (!byWarehouse.has(whId)) {
        byWarehouse.set(whId, { warehouse: whMap.get(whId) ?? null, silos: [] });
      }
      byWarehouse.get(whId)!.silos.push(s);
    }

    const byRegion = new Map<string, Array<{ warehouse: Warehouse | null; warehouseId: string; silos: Silo[] }>>();
    for (const [whId, entry] of byWarehouse.entries()) {
      const region = extractRegion(entry.warehouse ?? undefined);
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region)!.push({ warehouse: entry.warehouse, warehouseId: whId, silos: entry.silos });
    }

    return [...byRegion.entries()]
      .sort(([a], [b]) => {
        if (a === "Unassigned Region") return 1;
        if (b === "Unassigned Region") return -1;
        return a.localeCompare(b);
      })
      .map(([region, whs]) => ({
        region,
        warehouses: whs.sort((a, b) =>
          (a.warehouse?.name ?? "").localeCompare(b.warehouse?.name ?? ""),
        ),
      }));
  }, [rows, warehouses]);

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
    onSuccess: (result) => {
      console.log("[SiloSection] Silo saved successfully:", result);
      toast.success(`Silo "${result?.name || 'saved'}" updated successfully`);
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => {
      console.error("[SiloSection] Silo save error:", {
        message: e.message,
        stack: e.stack,
        fullError: e,
      });
      toast.error(`Error: ${friendlySaveError(e)}`);
    },
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
          {isAdmin && (
            siloGate.data && !siloGate.data.allowed && me?.role !== "super_admin" ? (
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/plan-management" })}
                className="gap-2 h-9 whitespace-nowrap border-emerald-400 text-emerald-700 hover:bg-emerald-50"
              >
                <ShoppingCart className="w-4 h-4" /> Upgrade Plan
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleRequestSilo}
                disabled={siloGate.isLoading}
                className="gap-2 h-9 whitespace-nowrap border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                title="Silo provisioning is handled by Super Admin — this requests a new one."
              >
                <ShoppingCart className="w-4 h-4" /> Request Silo
              </Button>
            )
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No silos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rows.map((s) => (
              <SiloOperationsCard
                key={s.id}
                silo={s}
                batches={batches}
                isAdmin={isAdmin}
                onView={(silo) => { setSelected(silo as Silo); setViewOpen(true); }}
                onEdit={(silo) => openEdit(silo as Silo)}
                onDelete={(id) => setDeleteId(id)}
                onSell={(silo) => setSellSilo(silo as Silo)}
                onRequestMore={handleRequestSilo}
              />
            ))}
          </div>
        )}
      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setForm(emptyForm);
        }}
      >
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit silo</DialogTitle>
            <DialogDescription>Update silo details.</DialogDescription>
          </DialogHeader>
          <form
            id="silo-form"
            className="grid gap-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div>
              <Label>Name</Label>
              {form.id && !canRename ? (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                  {form.name || "—"}
                </div>
              ) : (
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Auto-generated if left blank"
                />
              )}
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select
                value={form.warehouse_id}
                onValueChange={(v) => setForm({ ...form, warehouse_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
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
              <Label>Capacity (kg) *</Label>
              <Input
                type="number"
                min={1}
                required
                value={form.capacity_kg}
                onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location_description}
                onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                placeholder="e.g. Building A, Zone 1"
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
                rows={2}
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
              form="silo-form"
              type="submit"
              disabled={saveMutation.isPending || !form.warehouse_id || !form.capacity_kg}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save changes"
              )}
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
                <Row label="Current">
                  {(selected.current_occupancy_kg ?? 0).toLocaleString()} kg
                </Row>
                <Row label="Status">
                  <StatusBadge value={selected.status} />
                </Row>
                {selected.location?.description && (
                  <Row label="Location">{selected.location.description}</Row>
                )}
                {selected.current_batch && (
                  <Row label="Current Batch">{selected.current_batch.grain_type}</Row>
                )}
                {selected.notes && (
                  <Row label="Notes">
                    <span className="whitespace-pre-wrap">{selected.notes}</span>
                  </Row>
                )}
              </div>
              <DialogFooter>
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
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell — creates a dispatch request from this silo, pending admin approval */}
      <DispatchDialog
        open={!!sellSilo}
        onOpenChange={(o) => !o && setSellSilo(null)}
        siloId={sellSilo?.id ?? null}
        siloName={sellSilo?.name}
      />

      {/* Plan limit dialog — shown when admin tries to request a silo beyond their plan cap */}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Silo limit reached</DialogTitle>
            <DialogDescription>
              Your current plan allows up to{" "}
              <strong>{typeof siloGate.data?.limit === "number" ? siloGate.data.limit : "—"}</strong> silos
              and you are already using{" "}
              <strong>{typeof siloGate.data?.used === "number" ? siloGate.data.used : "all"}</strong> of them.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600 px-1">
            To add more silos, upgrade to a higher plan. Visit the plan management page to request an upgrade.
          </p>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setLimitOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { setLimitOpen(false); navigate({ to: "/plan-management" }); }}
            >
              Upgrade plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
