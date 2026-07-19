import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { GrainBatchesSkeleton } from "@/components/app/skeletons";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Search, Edit2, Trash2, Eye, Loader2, Inbox, QrCode,
  Truck, AlertTriangle, Building2, User, Calendar, DollarSign, Wheat,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  listGrainBatches, upsertGrainBatch, deleteGrainBatch,
  dispatchGrainBatch, logSpoilageEvent, listSilos, listBuyers,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/grain-batches")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) ?? "all",
  }),
  component: GrainBatchesPage,
});

const GRAIN_TYPES = ["Wheat","Rice","Maize","Corn","Barley","Sorghum"] as const;
const STATUSES = ["stored","dispatched","sold","damaged","expired","on_hold","processing"] as const;
type GrainType = typeof GRAIN_TYPES[number];
type Status = typeof STATUSES[number];

type Batch = {
  id: string;
  batch_id: string;
  qr_code: string | null;
  grain_type: GrainType;
  variety: string | null;
  grade: string | null;
  quantity_kg: number;
  dispatched_quantity_kg: number | null;
  moisture_content: number | null;
  protein_content: number | null;
  test_weight: number | null;
  status: Status;
  spoilage_label: string | null;
  risk_score: number | null;
  intake_date: string | null;
  harvest_date: string | null;
  expected_dispatch_date: string | null;
  actual_dispatch_date: string | null;
  farmer_name: string | null;
  farmer_contact: string | null;
  source_location: string | null;
  purchase_price_per_kg: number | null;
  sell_price_per_kg: number | null;
  total_purchase_value: number | null;
  revenue: number | null;
  profit: number | null;
  intake_conditions: { temperature?: number | null; humidity?: number | null } | null;
  dispatch_details: Record<string, unknown> | null;
  spoilage_events: Array<Record<string, unknown>> | null;
  notes: string | null;
  silos?: { id: string; silo_id: string; name: string; capacity_kg: number; warehouse_id: string } | null;
  warehouses?: { id: string; name: string; warehouse_id: string } | null;
  buyers?: { id: string; name: string; company_name: string | null; contact_phone: string | null } | null;
};

type Silo = { id: string; silo_id: string; name: string; capacity_kg: number; current_occupancy_kg: number | null; warehouse_id: string | null; warehouses?: { name: string } | null };
type Buyer = { id: string; name: string; company_name: string | null };

type Form = {
  id?: string;
  grain_type: GrainType | "";
  variety: string;
  grade: string;
  quantity_kg: string;
  silo_id: string;
  moisture_content: string;
  protein_content: string;
  test_weight: string;
  farmer_name: string;
  farmer_contact: string;
  source_location: string;
  harvest_date: string;
  expected_dispatch_date: string;
  purchase_price_per_kg: string;
  intake_temperature: string;
  intake_humidity: string;
  status: Status;
  notes: string;
};

const emptyForm: Form = {
  grain_type: "", variety: "", grade: "Standard", quantity_kg: "", silo_id: "",
  moisture_content: "", protein_content: "", test_weight: "",
  farmer_name: "", farmer_contact: "", source_location: "",
  harvest_date: "", expected_dispatch_date: "",
  purchase_price_per_kg: "", intake_temperature: "", intake_humidity: "",
  status: "stored", notes: "",
};

type Dispatch = {
  buyer_id: string;
  new_buyer_name: string;
  new_buyer_phone: string;
  new_buyer_email: string;
  sell_price_per_kg: string;
  dispatched_quantity_kg: string;
  vehicle_number: string;
  driver_name: string;
  driver_contact: string;
  destination: string;
  notes: string;
};

const emptyDispatch: Dispatch = {
  buyer_id: "", new_buyer_name: "", new_buyer_phone: "", new_buyer_email: "",
  sell_price_per_kg: "", dispatched_quantity_kg: "",
  vehicle_number: "", driver_name: "", driver_contact: "", destination: "", notes: "",
};

type Spoilage = {
  type: string; severity: "low"|"medium"|"high"|"critical";
  description: string; estimated_loss_kg: string;
  temperature: string; humidity: string; action_taken: string;
};

const emptySpoilage: Spoilage = {
  type: "pests", severity: "low", description: "", estimated_loss_kg: "",
  temperature: "", humidity: "", action_taken: "",
};

function GrainBatchesPage() {
  const listFn = useServerFn(listGrainBatches);
  const listSiloFn = useServerFn(listSilos);
  const listBuyerFn = useServerFn(listBuyers);
  const upsertFn = useServerFn(upsertGrainBatch);
  const deleteFn = useServerFn(deleteGrainBatch);
  const dispatchFn = useServerFn(dispatchGrainBatch);
  const spoilageFn = useServerFn(logSpoilageEvent);
  const qc = useQueryClient();

  // Seed statusFilter from ?status= URL search param (e.g. navigated from dashboard)
  const { status: searchStatus } = useSearch({ from: "/_authenticated/grain-batches" });

  const { data, isLoading } = useQuery({ queryKey: ["grain-batches"], queryFn: () => listFn() as Promise<Batch[]> });
  const { data: silosData } = useQuery({ queryKey: ["silos"], queryFn: () => listSiloFn() as Promise<Silo[]> });
  const { data: buyersData } = useQuery({ queryKey: ["buyers"], queryFn: () => listBuyerFn() as Promise<Buyer[]> });
  const silos = silosData ?? [];
  const buyers = buyersData ?? [];

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchStatus ?? "all");
  const [grainFilter, setGrainFilter] = useState("all");
  const [selected, setSelected] = useState<Batch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [spoilageOpen, setSpoilageOpen] = useState(false);

  // Sync filter whenever the URL search param changes (back/forward navigation)
  useEffect(() => {
    setStatusFilter(searchStatus ?? "all");
  }, [searchStatus]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [dispatch, setDispatch] = useState<Dispatch>(emptyDispatch);
  const [spoilage, setSpoilage] = useState<Spoilage>(emptySpoilage);

  const rows = useMemo(() => {
    const all = (data ?? []) as Batch[];
    return all.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (grainFilter !== "all" && b.grain_type !== grainFilter) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (
        b.batch_id?.toLowerCase().includes(t) ||
        b.grain_type?.toLowerCase().includes(t) ||
        b.farmer_name?.toLowerCase().includes(t) ||
        b.silos?.name?.toLowerCase().includes(t) ||
        b.buyers?.name?.toLowerCase().includes(t)
      );
    });
  }, [data, q, statusFilter, grainFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const stored = rows.filter(r => r.status === "stored" || r.status === "processing").length;
    const dispatched = rows.filter(r => r.status === "dispatched" || r.status === "sold").length;
    const totalKg = rows.reduce((s, r) => s + Number(r.quantity_kg || 0), 0);
    const risky = rows.filter(r => (r.risk_score ?? 0) >= 40 || r.spoilage_label === "Risky" || r.spoilage_label === "Spoiled").length;
    return { total, stored, dispatched, totalKg, risky };
  }, [rows]);

  const saveMut = useMutation({
    mutationFn: (f: Form) => upsertFn({ data: {
      id: f.id,
      grain_type: f.grain_type as GrainType,
      variety: f.variety.trim() || null,
      grade: f.grade || "Standard",
      quantity_kg: Number(f.quantity_kg),
      silo_id: f.silo_id,
      moisture_content: f.moisture_content ? Number(f.moisture_content) : null,
      protein_content: f.protein_content ? Number(f.protein_content) : null,
      test_weight: f.test_weight ? Number(f.test_weight) : null,
      farmer_name: f.farmer_name.trim() || null,
      farmer_contact: f.farmer_contact.trim() || null,
      source_location: f.source_location.trim() || null,
      harvest_date: f.harvest_date || null,
      expected_dispatch_date: f.expected_dispatch_date || null,
      purchase_price_per_kg: f.purchase_price_per_kg ? Number(f.purchase_price_per_kg) : null,
      intake_temperature: f.intake_temperature ? Number(f.intake_temperature) : null,
      intake_humidity: f.intake_humidity ? Number(f.intake_humidity) : null,
      status: f.status,
      notes: f.notes.trim() || null,
    }}),
    onSuccess: () => {
      toast.success(form.id ? "Batch updated" : "Batch created");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Batch deleted");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  const dispatchMut = useMutation({
    mutationFn: (payload: { id: string; d: Dispatch }) => {
      const useExisting = !!payload.d.buyer_id;
      return dispatchFn({ data: {
        id: payload.id,
        buyer_id: useExisting ? payload.d.buyer_id : null,
        new_buyer: useExisting ? null : {
          name: payload.d.new_buyer_name,
          contact_phone: payload.d.new_buyer_phone || null,
          contact_email: payload.d.new_buyer_email || null,
        },
        sell_price_per_kg: Number(payload.d.sell_price_per_kg),
        dispatched_quantity_kg: Number(payload.d.dispatched_quantity_kg),
        vehicle_number: payload.d.vehicle_number || null,
        driver_name: payload.d.driver_name || null,
        driver_contact: payload.d.driver_contact || null,
        destination: payload.d.destination || null,
        notes: payload.d.notes || null,
      }});
    },
    onSuccess: () => {
      toast.success("Batch dispatched");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["buyers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDispatchOpen(false); setDispatch(emptyDispatch);
    },
    onError: (e: Error) => toast.error(e.message || "Dispatch failed"),
  });

  const spoilageMut = useMutation({
    mutationFn: (payload: { id: string; s: Spoilage }) => spoilageFn({ data: {
      id: payload.id,
      type: payload.s.type,
      severity: payload.s.severity,
      description: payload.s.description || null,
      estimated_loss_kg: payload.s.estimated_loss_kg ? Number(payload.s.estimated_loss_kg) : null,
      temperature: payload.s.temperature ? Number(payload.s.temperature) : null,
      humidity: payload.s.humidity ? Number(payload.s.humidity) : null,
      action_taken: payload.s.action_taken || null,
    }}),
    onSuccess: () => {
      toast.success("Spoilage event logged");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["grain-alerts"] });
      setSpoilageOpen(false); setSpoilage(emptySpoilage);
    },
    onError: (e: Error) => toast.error(e.message || "Log failed"),
  });

  function openCreate() {
    setForm({ ...emptyForm });
    setEditOpen(true);
  }
  function openEdit(b: Batch) {
    setForm({
      id: b.id,
      grain_type: b.grain_type,
      variety: b.variety ?? "",
      grade: b.grade ?? "Standard",
      quantity_kg: String(b.quantity_kg ?? ""),
      silo_id: b.silos?.id ?? "",
      moisture_content: b.moisture_content != null ? String(b.moisture_content) : "",
      protein_content: b.protein_content != null ? String(b.protein_content) : "",
      test_weight: b.test_weight != null ? String(b.test_weight) : "",
      farmer_name: b.farmer_name ?? "",
      farmer_contact: b.farmer_contact ?? "",
      source_location: b.source_location ?? "",
      harvest_date: b.harvest_date ?? "",
      expected_dispatch_date: b.expected_dispatch_date ?? "",
      purchase_price_per_kg: b.purchase_price_per_kg != null ? String(b.purchase_price_per_kg) : "",
      intake_temperature: b.intake_conditions?.temperature != null ? String(b.intake_conditions.temperature) : "",
      intake_humidity: b.intake_conditions?.humidity != null ? String(b.intake_conditions.humidity) : "",
      status: b.status,
      notes: b.notes ?? "",
    });
    setEditOpen(true);
  }
  function openDispatch(b: Batch) {
    setSelected(b);
    const remaining = Number(b.quantity_kg) - Number(b.dispatched_quantity_kg ?? 0);
    setDispatch({ ...emptyDispatch, dispatched_quantity_kg: String(remaining) });
    setDispatchOpen(true);
  }
  function openSpoilage(b: Batch) {
    setSelected(b);
    setSpoilage(emptySpoilage);
    setSpoilageOpen(true);
  }

  const availableSilos = silos.filter(s => (s.current_occupancy_kg ?? 0) < (s.capacity_kg ?? 0));

  if (isLoading) return <GrainBatchesSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Grain Batches" subtitle="Intake, storage tracking & dispatch" badge={isLoading ? "…" : `${rows.length}`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MiniStat icon={Package} label="Total" value={stats.total} tint="emerald" />
        <MiniStat icon={Wheat} label="Stored" value={stats.stored} tint="sky" />
        <MiniStat icon={Truck} label="Dispatched" value={stats.dispatched} tint="violet" />
        <MiniStat icon={DollarSign} label="Volume" value={`${(stats.totalKg / 1000).toFixed(1)}t`} tint="amber" />
        <MiniStat icon={AlertTriangle} label="At Risk" value={stats.risky} tint="rose" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batch, farmer, buyer…" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={grainFilter} onValueChange={setGrainFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Grain" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grains</SelectItem>
              {GRAIN_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /> New batch</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-60" />
            <p className="text-sm mb-4">No batches yet.</p>
            {availableSilos.length === 0 ? (
              <Link to="/silos" className="text-sm text-primary hover:text-primary/80 underline underline-offset-4">Create a silo first →</Link>
            ) : (
              <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add batch</Button>
            )}
          </CardContent>
        </Card>
       ) : (
        <div className="rounded-xl border bg-card/60 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 bg-card/95 backdrop-blur z-10">
                <TableRow className="[&_th]:h-9 [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground [&_th]:font-medium">
                  <TableHead>Batch</TableHead>
                  <TableHead>Grain</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Silo</TableHead>
                  <TableHead className="text-right">Intake (kg)</TableHead>
                  <TableHead className="text-right">Remaining (kg)</TableHead>
                  <TableHead>Intake date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const supplier = b.farmer_name ?? "—";
                  const intake = Number(b.quantity_kg ?? 0);
                  const remaining = Math.max(0, intake - Number(b.dispatched_quantity_kg ?? 0));
                  const intakeDate = b.harvest_date ?? b.intake_date ?? null;
                  return (
                    <TableRow key={b.id} className="[&_td]:py-2 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
                      <TableCell className="font-medium">{b.batch_id}</TableCell>
                      <TableCell className="text-muted-foreground">{b.grain_type}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[140px]">{supplier}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[140px]">{b.silos?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{intake.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{remaining.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{intakeDate ? new Date(intakeDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><StatusBadge value={b.status} /></TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          actions={[
                            { label: "View", icon: Eye, onClick: () => { setSelected(b); setViewOpen(true); } },
                            { label: "Edit", icon: Edit2, onClick: () => openEdit(b) },
                            { label: "QR code", icon: QrCode, onClick: () => { setSelected(b); setQrOpen(true); } },
                            { label: "Log spoilage", icon: AlertTriangle, onClick: () => openSpoilage(b) },
                            { label: "Delete", icon: Trash2, destructive: true, onClick: () => setDeleteId(b.id) },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-3 py-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{rows.length} batch{rows.length === 1 ? "" : "es"}</span>
            <span>Dispatch happens from <Link to="/silos" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Silos</Link></span>
          </div>
        </div>
      )}

      {/* Create / Edit */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit batch" : "New grain batch"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update batch details." : "Batch ID and QR code are generated automatically on intake."}
            </DialogDescription>
          </DialogHeader>
          <form id="batch-form" className="grid gap-4 py-2" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Grain type *</Label>
                <Select value={form.grain_type} onValueChange={(v) => setForm({ ...form, grain_type: v as GrainType })}>
                  <SelectTrigger><SelectValue placeholder="Select grain" /></SelectTrigger>
                  <SelectContent>
                    {GRAIN_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Variety</Label>
                <Input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} placeholder="e.g. Basmati" />
              </div>
              <div>
                <Label>Quantity (kg) *</Label>
                <Input type="number" min={1} required value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} />
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Economy">Economy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Silo *</Label>
                <Select value={form.silo_id} onValueChange={(v) => setForm({ ...form, silo_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign silo" /></SelectTrigger>
                  <SelectContent>
                    {(form.id ? silos : availableSilos).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.silo_id}) — {(s.capacity_kg ?? 0).toLocaleString()} kg cap
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {silos.length === 0 && (
                  <p className="text-xs text-rose-600 mt-1"><Link to="/silos" className="underline">Create a silo</Link> first.</p>
                )}
              </div>
              <div>
                <Label>Moisture %</Label>
                <Input type="number" step="0.1" value={form.moisture_content} onChange={(e) => setForm({ ...form, moisture_content: e.target.value })} />
              </div>
              <div>
                <Label>Protein %</Label>
                <Input type="number" step="0.1" value={form.protein_content} onChange={(e) => setForm({ ...form, protein_content: e.target.value })} />
              </div>
              <div>
                <Label>Test weight</Label>
                <Input type="number" step="0.1" value={form.test_weight} onChange={(e) => setForm({ ...form, test_weight: e.target.value })} />
              </div>
              <div>
                <Label>Purchase $/kg</Label>
                <Input type="number" step="0.01" value={form.purchase_price_per_kg} onChange={(e) => setForm({ ...form, purchase_price_per_kg: e.target.value })} />
              </div>
              <div>
                <Label>Farmer name</Label>
                <Input value={form.farmer_name} onChange={(e) => setForm({ ...form, farmer_name: e.target.value })} />
              </div>
              <div>
                <Label>Farmer contact</Label>
                <Input value={form.farmer_contact} onChange={(e) => setForm({ ...form, farmer_contact: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Source location</Label>
                <Input value={form.source_location} onChange={(e) => setForm({ ...form, source_location: e.target.value })} placeholder="Village, district, region" />
              </div>
              <div>
                <Label>Harvest date</Label>
                <Input type="date" value={form.harvest_date} onChange={(e) => setForm({ ...form, harvest_date: e.target.value })} />
              </div>
              <div>
                <Label>Expected dispatch</Label>
                <Input type="date" value={form.expected_dispatch_date} onChange={(e) => setForm({ ...form, expected_dispatch_date: e.target.value })} />
              </div>
              <div>
                <Label>Intake temp °C</Label>
                <Input type="number" step="0.1" value={form.intake_temperature} onChange={(e) => setForm({ ...form, intake_temperature: e.target.value })} />
              </div>
              <div>
                <Label>Intake humidity %</Label>
                <Input type="number" step="0.1" value={form.intake_humidity} onChange={(e) => setForm({ ...form, intake_humidity: e.target.value })} />
              </div>
              {form.id && (
                <div className="sm:col-span-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button form="batch-form" type="submit" disabled={saveMut.isPending || !form.grain_type || !form.quantity_kg || !form.silo_id}>
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? "Save changes" : "Create batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 min-w-0">
                  <Wheat className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="truncate">{selected.batch_id}</span>
                </DialogTitle>
                <DialogDescription>{selected.grain_type}{selected.variety ? ` · ${selected.variety}` : ""}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <Row label="Status"><StatusBadge value={selected.status} /></Row>
                <Row label="Quality">
                  {selected.spoilage_label && (
                    <Badge variant={selected.spoilage_label === "Spoiled" ? "destructive" : selected.spoilage_label === "Risky" ? "secondary" : "outline"} className="mr-1">{selected.spoilage_label}</Badge>
                  )}
                  {selected.risk_score != null && <span className="text-xs text-slate-500">Risk {Math.round(Number(selected.risk_score))}</span>}
                </Row>
                <Row label="Quantity">{Number(selected.quantity_kg).toLocaleString()} kg</Row>
                {selected.dispatched_quantity_kg ? (
                  <Row label="Dispatched">{Number(selected.dispatched_quantity_kg).toLocaleString()} kg</Row>
                ) : null}
                <Row label="Grade">{selected.grade ?? "—"}</Row>
                <Row label="Silo">
                  {selected.silos ? <Link to="/silos" className="text-emerald-700 underline">{selected.silos.name}</Link> : "—"}
                </Row>
                <Row label="Warehouse">
                  {selected.warehouses ? <Link to="/warehouses" className="text-emerald-700 underline inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{selected.warehouses.name}</Link> : "—"}
                </Row>
                <Row label="Farmer">{selected.farmer_name ?? "—"}{selected.farmer_contact ? ` · ${selected.farmer_contact}` : ""}</Row>
                <Row label="Source">{selected.source_location ?? "—"}</Row>
                <Row label="Harvest">{selected.harvest_date ? new Date(selected.harvest_date).toLocaleDateString() : "—"}</Row>
                <Row label="Intake">{selected.intake_date ? new Date(selected.intake_date).toLocaleDateString() : "—"}</Row>
                <Row label="Moisture">{selected.moisture_content != null ? `${selected.moisture_content}%` : "—"}</Row>
                <Row label="Protein">{selected.protein_content != null ? `${selected.protein_content}%` : "—"}</Row>
                {selected.purchase_price_per_kg && <Row label="Purchase">PKR {selected.purchase_price_per_kg}/kg · Total PKR {Number(selected.total_purchase_value ?? 0).toLocaleString()}</Row>}
                {selected.sell_price_per_kg && <Row label="Sell">PKR {selected.sell_price_per_kg}/kg · Rev PKR {Number(selected.revenue ?? 0).toLocaleString()}</Row>}
                {selected.buyers && (
                  <Row label="Buyer">
                    <Link to="/buyers" className="text-emerald-700 underline">{selected.buyers.name}</Link>
                  </Row>
                )}
                {selected.actual_dispatch_date && (
                  <Row label="Dispatched at">{new Date(selected.actual_dispatch_date).toLocaleString()}</Row>
                )}
                {selected.spoilage_events && selected.spoilage_events.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Spoilage events ({selected.spoilage_events.length})</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selected.spoilage_events.slice(-5).reverse().map((e, i) => {
                        const ev = e as { type?: string; severity?: string; description?: string; logged_at?: string };
                        return (
                          <div key={i} className="text-xs bg-rose-50 border border-rose-100 rounded px-2 py-1">
                            <span className="font-medium text-rose-900">{ev.type}</span> <Badge variant="outline" className="ml-1 text-[10px] h-4">{ev.severity}</Badge>
                            {ev.description && <div className="text-rose-700 truncate">{ev.description}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selected.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
                    <p className="text-slate-700 whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} className="gap-1"><QrCode className="w-4 h-4" /> QR</Button>
                <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); openSpoilage(selected); }} className="gap-1"><AlertTriangle className="w-4 h-4" /> Log spoilage</Button>
                {selected.status !== "dispatched" && selected.status !== "sold" && (
                  <Button size="sm" onClick={() => { setViewOpen(false); openDispatch(selected); }} className="gap-1"><Truck className="w-4 h-4" /> Dispatch</Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); openEdit(selected); }} className="gap-1"><Edit2 className="w-4 h-4" /> Edit</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR */}
      {selected && (
        <QRCodeDisplay
          qrCode={selected.qr_code || ""}
          batchId={selected.batch_id}
          grainType={selected.grain_type}
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
        />
      )}

      {/* Dispatch */}
      <Dialog open={dispatchOpen} onOpenChange={(o) => { setDispatchOpen(o); if (!o) setDispatch(emptyDispatch); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-emerald-600" /> Dispatch batch</DialogTitle>
            <DialogDescription>{selected?.batch_id} · {selected?.grain_type}</DialogDescription>
          </DialogHeader>
          <form id="dispatch-form" className="grid gap-3 py-2" onSubmit={(e) => { e.preventDefault(); if (selected) dispatchMut.mutate({ id: selected.id, d: dispatch }); }}>
            <div>
              <Label>Buyer</Label>
              <Select value={dispatch.buyer_id} onValueChange={(v) => setDispatch({ ...dispatch, buyer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select existing buyer" /></SelectTrigger>
                <SelectContent>
                  {buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}{b.company_name ? ` · ${b.company_name}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">Or enter a new buyer below</p>
            </div>
            {!dispatch.buyer_id && (
              <div className="grid sm:grid-cols-2 gap-2 rounded-md border border-slate-200 p-3 bg-slate-50">
                <div className="sm:col-span-2">
                  <Label className="text-xs">New buyer name</Label>
                  <Input value={dispatch.new_buyer_name} onChange={(e) => setDispatch({ ...dispatch, new_buyer_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={dispatch.new_buyer_phone} onChange={(e) => setDispatch({ ...dispatch, new_buyer_phone: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={dispatch.new_buyer_email} onChange={(e) => setDispatch({ ...dispatch, new_buyer_email: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity (kg) *</Label>
                <Input type="number" min={1} required value={dispatch.dispatched_quantity_kg} onChange={(e) => setDispatch({ ...dispatch, dispatched_quantity_kg: e.target.value })} />
              </div>
              <div>
                <Label>Sell $/kg *</Label>
                <Input type="number" step="0.01" min={0.01} required value={dispatch.sell_price_per_kg} onChange={(e) => setDispatch({ ...dispatch, sell_price_per_kg: e.target.value })} />
              </div>
              <div>
                <Label>Vehicle #</Label>
                <Input value={dispatch.vehicle_number} onChange={(e) => setDispatch({ ...dispatch, vehicle_number: e.target.value })} />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={dispatch.destination} onChange={(e) => setDispatch({ ...dispatch, destination: e.target.value })} />
              </div>
              <div>
                <Label>Driver</Label>
                <Input value={dispatch.driver_name} onChange={(e) => setDispatch({ ...dispatch, driver_name: e.target.value })} />
              </div>
              <div>
                <Label>Driver phone</Label>
                <Input value={dispatch.driver_contact} onChange={(e) => setDispatch({ ...dispatch, driver_contact: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={dispatch.notes} onChange={(e) => setDispatch({ ...dispatch, notes: e.target.value })} />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button form="dispatch-form" type="submit" disabled={dispatchMut.isPending || !dispatch.sell_price_per_kg || !dispatch.dispatched_quantity_kg || (!dispatch.buyer_id && !dispatch.new_buyer_name)}>
              {dispatchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spoilage */}
      <Dialog open={spoilageOpen} onOpenChange={(o) => { setSpoilageOpen(o); if (!o) setSpoilage(emptySpoilage); }}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" /> Log spoilage event</DialogTitle>
            <DialogDescription>{selected?.batch_id}</DialogDescription>
          </DialogHeader>
          <form id="spoilage-form" className="grid gap-3 py-2" onSubmit={(e) => { e.preventDefault(); if (selected) spoilageMut.mutate({ id: selected.id, s: spoilage }); }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={spoilage.type} onValueChange={(v) => setSpoilage({ ...spoilage, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pests">Pests</SelectItem>
                    <SelectItem value="mold">Mold</SelectItem>
                    <SelectItem value="moisture">Moisture</SelectItem>
                    <SelectItem value="temperature">Temperature</SelectItem>
                    <SelectItem value="contamination">Contamination</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={spoilage.severity} onValueChange={(v) => setSpoilage({ ...spoilage, severity: v as Spoilage["severity"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. loss (kg)</Label>
                <Input type="number" value={spoilage.estimated_loss_kg} onChange={(e) => setSpoilage({ ...spoilage, estimated_loss_kg: e.target.value })} />
              </div>
              <div>
                <Label>Temp °C</Label>
                <Input type="number" step="0.1" value={spoilage.temperature} onChange={(e) => setSpoilage({ ...spoilage, temperature: e.target.value })} />
              </div>
              <div>
                <Label>Humidity %</Label>
                <Input type="number" step="0.1" value={spoilage.humidity} onChange={(e) => setSpoilage({ ...spoilage, humidity: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={spoilage.description} onChange={(e) => setSpoilage({ ...spoilage, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Action taken</Label>
                <Textarea rows={2} value={spoilage.action_taken} onChange={(e) => setSpoilage({ ...spoilage, action_taken: e.target.value })} />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSpoilageOpen(false)}>Cancel</Button>
            <Button form="spoilage-form" type="submit" disabled={spoilageMut.isPending}>
              {spoilageMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the batch and frees up its silo occupancy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchCard({ batch, onView, onEdit, onDelete, onQR, onDispatch, onSpoilage }: {
  batch: Batch; onView: () => void; onEdit: () => void; onDelete: () => void;
  onQR: () => void; onDispatch: () => void; onSpoilage: () => void;
}) {
  const dispatched = Number(batch.dispatched_quantity_kg ?? 0);
  const total = Number(batch.quantity_kg);
  const remaining = Math.max(0, total - dispatched);
  const canDispatch = batch.status !== "dispatched" && batch.status !== "sold" && remaining > 0;
  const risk = Number(batch.risk_score ?? 0);
  const riskTone = risk >= 60 ? "bg-rose-50 text-rose-700 border-rose-100" : risk >= 30 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <Card className="border-slate-200/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Wheat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">{batch.batch_id}</span>
            </div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {batch.grain_type}{batch.variety ? ` · ${batch.variety}` : ""}
            </div>
          </div>
          <StatusBadge value={batch.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Quantity</div>
            <div className="font-semibold text-slate-900 tabular-nums">{total.toLocaleString()} kg</div>
          </div>
          <div className={`rounded-md border px-2 py-1.5 ${riskTone}`}>
            <div className="text-[10px] uppercase tracking-wider opacity-70">
              {batch.spoilage_label ?? "Safe"}
            </div>
            <div className="font-semibold tabular-nums">Risk {Math.round(risk)}</div>
          </div>
        </div>

        {batch.silos && (
          <div className="text-xs text-slate-600 flex items-center gap-1 min-w-0">
            <Package className="w-3 h-3 shrink-0" />
            <span className="truncate">{batch.silos.name}</span>
            {batch.warehouses && <span className="text-slate-400">·</span>}
            {batch.warehouses && (
              <span className="truncate inline-flex items-center gap-0.5">
                <Building2 className="w-3 h-3" /> {batch.warehouses.name}
              </span>
            )}
          </div>
        )}

        {dispatched > 0 && (
          <div className="text-xs text-slate-600">
            Dispatched <span className="font-medium tabular-nums">{dispatched.toLocaleString()}</span> / {total.toLocaleString()} kg
            {batch.buyers && <> · <Link to="/buyers" className="text-emerald-700 underline">{batch.buyers.name}</Link></>}
          </div>
        )}

        {batch.farmer_name && (
          <div className="text-xs text-slate-600 flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 shrink-0" /> <span className="truncate">{batch.farmer_name}</span>
          </div>
        )}

        {batch.intake_date && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Intake {new Date(batch.intake_date).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          <Button variant="outline" size="sm" onClick={onView} className="h-8 px-0" title="View"><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={onQR} className="h-8 px-0" title="QR"><QrCode className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="h-8 px-0" title="Edit"><Edit2 className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="h-8 px-0 text-rose-600 hover:text-rose-700" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button variant="outline" size="sm" onClick={onSpoilage} className="h-8 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs"><AlertTriangle className="w-3.5 h-3.5 mr-1" />Spoilage</Button>
          <Button size="sm" onClick={onDispatch} disabled={!canDispatch} className="h-8 text-xs"><Truck className="w-3.5 h-3.5 mr-1" />Dispatch</Button>
        </div>
      </CardContent>
    </Card>
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

function MiniStat({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: React.ReactNode; tint: "emerald" | "sky" | "violet" | "amber" | "rose" }) {
  const map = {
    emerald: "text-emerald-600 bg-emerald-50",
    sky: "text-sky-600 bg-sky-50",
    violet: "text-violet-600 bg-violet-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
  };
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
