'use client';

import QRCodeDisplay from "@/components/QRCodeDisplay";
import { GrainBatchesSkeleton } from "@/components/app/skeletons";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Search, Edit2, Trash2, Eye, Loader2, QrCode,
  Truck, AlertTriangle, User, Calendar, Wheat, FlaskConical, ShieldCheck, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/app/RowActions";
import { StatusBadge } from "@/components/app/DataListPage";
import { supabase } from "@/integrations/supabase/client";
import {
  listGrainBatches, upsertGrainBatch, deleteGrainBatch,
  logSpoilageEvent, listSilos,
} from "@/lib/operations.functions";
import { listSuppliers } from "@/lib/suppliers.functions";
import { getMyRole } from "@/lib/roles.functions";
import { listAvailableTechnicians } from "@/lib/batch-qc.functions";
import { BatchQCDialog, type QCMode } from "./BatchQCDialog";
import { cn } from "@/lib/utils";

const GRAIN_TYPES = ["Wheat","Rice","Maize","Corn","Barley","Sorghum"] as const;
const STATUSES = ["stored","dispatched","sold","damaged","expired","on_hold","processing"] as const;
// QC-pipeline statuses aren't offered in the free-form "Status" editor (that
// would bypass the role-gated QC functions) but users still need to filter
// the list by them, so the top filter bar gets its own, wider list.
const QC_STATUSES = ["pending_qc","qc_submitted","qc_failed","qc_passed","admin_rejected"] as const;
const FILTER_STATUSES = [...STATUSES, ...QC_STATUSES] as const;
type GrainType = typeof GRAIN_TYPES[number];
type Status = typeof STATUSES[number] | typeof QC_STATUSES[number];

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
  assigned_technician_id: string | null;
  silos?: { id: string; silo_id: string; name: string; capacity_kg: number; warehouse_id: string } | null;
  warehouses?: { id: string; name: string; warehouse_id: string } | null;
  buyers?: { id: string; name: string; company_name: string | null; contact_phone: string | null } | null;
};

type Silo = { id: string; silo_id: string; name: string; capacity_kg: number; current_occupancy_kg: number | null; warehouse_id: string | null; warehouses?: { name: string } | null };

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
  supplier_id: string;
  source_kind: "external" | "own_farm" | "internal_transfer" | "anonymous";
  farmer_name: string; // fallback / anonymous label
  farmer_contact: string;
  source_location: string;
  purchase_price_per_kg: string;
  intake_temperature: string;
  intake_humidity: string;
  status: Status;
  notes: string;
  assignedTechnicianId: string;
};

const emptyForm: Form = {
  grain_type: "", variety: "", grade: "Standard", quantity_kg: "", silo_id: "",
  moisture_content: "", protein_content: "", test_weight: "",
  supplier_id: "", source_kind: "external",
  farmer_name: "", farmer_contact: "", source_location: "",
  purchase_price_per_kg: "", intake_temperature: "", intake_humidity: "",
  status: "stored", notes: "", assignedTechnicianId: "",
};

type FormErrors = Partial<Record<keyof Form, string>>;

// Mirrors the bounds enforced server-side in operations.functions.ts' batchInput
// zod schema, so bad values are caught before they ever leave the browser.
function validateBatchForm(f: Form): FormErrors {
  const errors: FormErrors = {};

  const checkRange = (raw: string, min: number | null, max: number | null, label: string): string | undefined => {
    if (raw.trim() === "") return undefined; // optional fields — empty is valid
    const n = Number(raw);
    if (Number.isNaN(n)) return `${label} must be a number`;
    if (min !== null && n < min) return `${label} must be at least ${min}`;
    if (max !== null && n > max) return `${label} must be at most ${max}`;
    return undefined;
  };

  if (f.quantity_kg.trim() !== "") {
    const qty = Number(f.quantity_kg);
    if (Number.isNaN(qty)) errors.quantity_kg = "Quantity must be a number";
    else if (qty <= 0) errors.quantity_kg = "Quantity must be greater than 0";
  }

  const moistureErr = checkRange(f.moisture_content, 0, 100, "Moisture");
  if (moistureErr) errors.moisture_content = moistureErr;

  const proteinErr = checkRange(f.protein_content, 0, 100, "Protein");
  if (proteinErr) errors.protein_content = proteinErr;

  const testWeightErr = checkRange(f.test_weight, 0, null, "Test weight");
  if (testWeightErr) errors.test_weight = testWeightErr;

  const priceErr = checkRange(f.purchase_price_per_kg, 0, null, "Purchase price");
  if (priceErr) errors.purchase_price_per_kg = priceErr;

  const humidityErr = checkRange(f.intake_humidity, 0, 100, "Intake humidity");
  if (humidityErr) errors.intake_humidity = humidityErr;

  // Intake temperature has no real bound (cold storage can be well below 0°C) — just must be numeric.
  if (f.intake_temperature.trim() !== "" && Number.isNaN(Number(f.intake_temperature))) {
    errors.intake_temperature = "Intake temp must be a number";
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

type SpoilageErrors = Partial<Record<keyof Spoilage, string>>;

function validateSpoilageForm(s: Spoilage, maxLossKg: number | null): SpoilageErrors {
  const errors: SpoilageErrors = {};

  if (s.estimated_loss_kg.trim() !== "") {
    const loss = Number(s.estimated_loss_kg);
    if (Number.isNaN(loss)) errors.estimated_loss_kg = "Loss must be a number";
    else if (loss < 0) errors.estimated_loss_kg = "Loss can't be negative";
    else if (maxLossKg != null && loss > maxLossKg) errors.estimated_loss_kg = `Can't exceed batch quantity (${maxLossKg.toLocaleString()} kg)`;
  }

  if (s.temperature.trim() !== "" && Number.isNaN(Number(s.temperature))) {
    errors.temperature = "Temp must be a number";
  }

  if (s.humidity.trim() !== "") {
    const h = Number(s.humidity);
    if (Number.isNaN(h)) errors.humidity = "Humidity must be a number";
    else if (h < 0 || h > 100) errors.humidity = "Humidity must be between 0 and 100";
  }

  return errors;
}

type Spoilage = {
  type: string; severity: "low"|"medium"|"high"|"critical";
  description: string; estimated_loss_kg: string;
  temperature: string; humidity: string; action_taken: string;
};

const emptySpoilage: Spoilage = {
  type: "pests", severity: "low", description: "", estimated_loss_kg: "",
  temperature: "", humidity: "", action_taken: "",
};

export function BatchesSection({ initialStatus }: { initialStatus?: string } = {}) {
  const listFn = useServerFn(listGrainBatches);
  const listSiloFn = useServerFn(listSilos);
  const listSupFn = useServerFn(listSuppliers);
  const upsertFn = useServerFn(upsertGrainBatch);
  const deleteFn = useServerFn(deleteGrainBatch);
  const spoilageFn = useServerFn(logSpoilageEvent);
  const roleFn = useServerFn(getMyRole);
  const listTechFn = useServerFn(listAvailableTechnicians);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["grain-batches"], queryFn: () => listFn() as unknown as Promise<Batch[]> });
  const { data: silosData } = useQuery({ queryKey: ["silos"], queryFn: () => listSiloFn() as Promise<Silo[]> });
  const silos = silosData ?? [];
  const suppliersQ = useQuery({
    queryKey: ["suppliers-mini"],
    queryFn: () => listSupFn({ data: {} }),
    retry: 1,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suppliers: any[] = (suppliersQ.data?.suppliers ?? []) as any[];

  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });
  const myRole = me?.role ?? "pending";
  const canCreate = ["admin", "manager"].includes(myRole);
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data: u }) => setMyId(u.user?.id ?? null)); }, []);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && (FILTER_STATUSES as readonly string[]).includes(initialStatus) ? initialStatus : "all",
  );
  const [grainFilter, setGrainFilter] = useState("all");
  const [selected, setSelected] = useState<Batch | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [spoilageOpen, setSpoilageOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [spoilage, setSpoilage] = useState<Spoilage>(emptySpoilage);
  const [qcBatch, setQcBatch] = useState<Batch | null>(null);
  const [qcMode, setQcMode] = useState<QCMode | null>(null);
  const [qcOpen, setQcOpen] = useState(false);

  const techniciansQ = useQuery({
    queryKey: ["available-technicians"],
    queryFn: () => listTechFn() as Promise<Array<{ id: string; name: string | null; email: string | null }>>,
    enabled: canCreate && editOpen && !form.id,
  });

  function openQC(b: Batch, mode: QCMode) {
    setQcBatch(b);
    setQcMode(mode);
    setQcOpen(true);
  }

  const formErrors = useMemo(() => validateBatchForm(form), [form]);
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const spoilageErrors = useMemo(
    () => validateSpoilageForm(spoilage, selected != null ? Number(selected.quantity_kg) : null),
    [spoilage, selected],
  );
  const hasSpoilageErrors = Object.keys(spoilageErrors).length > 0;

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
      supplier_id: f.supplier_id || null,
      source_kind: f.source_kind,
      unit_cost: f.purchase_price_per_kg ? Number(f.purchase_price_per_kg) : null,
      farmer_contact: f.farmer_contact.trim() || null,
      source_location: f.source_location.trim() || null,
      purchase_price_per_kg: f.purchase_price_per_kg ? Number(f.purchase_price_per_kg) : null,
      intake_temperature: f.intake_temperature ? Number(f.intake_temperature) : null,
      intake_humidity: f.intake_humidity ? Number(f.intake_humidity) : null,
      status: f.id ? f.status : undefined,
      notes: f.notes.trim() || null,
      assignedTechnicianId: f.id ? undefined : (f.assignedTechnicianId || null),
    }}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (row: any) => {
      // Safety net: some server-fn error shapes resolve instead of rejecting
      // (e.g. an { error } payload survives serialization as a 200). Treat those
      // — and a missing row — as a failure rather than silently "succeeding".
      const softError = row?.error ?? (row == null ? "Save failed — no data returned" : null);
      if (softError) {
        toast.error(typeof softError === "string" ? softError : "Save failed");
        return;
      }
      toast.success(form.id ? "Batch updated" : "Batch created");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false); setForm(emptyForm);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => {
      const message = e?.message || (typeof e === "string" ? e : null) || "Save failed";
      toast.error(message);
    },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (row: any) => {
      const softError = row?.error ?? (row == null ? "Log failed — no data returned" : null);
      if (softError) { toast.error(typeof softError === "string" ? softError : "Log failed"); return; }
      toast.success("Spoilage event logged");
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["grain-alerts"] });
      setSpoilageOpen(false); setSpoilage(emptySpoilage);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(e?.message || (typeof e === "string" ? e : null) || "Log failed"),
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
      supplier_id: (b as { supplier_id?: string | null }).supplier_id ?? "",
      source_kind: ((b as { source_kind?: string }).source_kind as Form["source_kind"]) ?? "external",
      moisture_content: b.moisture_content != null ? String(b.moisture_content) : "",
      protein_content: b.protein_content != null ? String(b.protein_content) : "",
      test_weight: b.test_weight != null ? String(b.test_weight) : "",
      farmer_name: b.farmer_name ?? "",
      farmer_contact: b.farmer_contact ?? "",
      source_location: b.source_location ?? "",
      purchase_price_per_kg: b.purchase_price_per_kg != null ? String(b.purchase_price_per_kg) : "",
      intake_temperature: b.intake_conditions?.temperature != null ? String(b.intake_conditions.temperature) : "",
      intake_humidity: b.intake_conditions?.humidity != null ? String(b.intake_conditions.humidity) : "",
      status: b.status,
      notes: b.notes ?? "",
      assignedTechnicianId: b.assigned_technician_id ?? "",
    });
    setEditOpen(true);
  }
  function openSpoilage(b: Batch) {
    setSelected(b);
    setSpoilage(emptySpoilage);
    setSpoilageOpen(true);
  }

  const availableSilos = silos.filter(s => (s.current_occupancy_kg ?? 0) < (s.capacity_kg ?? 0));

  if (isLoading) return <GrainBatchesSkeleton />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div><div className="font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stored</div><div className="font-semibold">{stats.stored}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dispatched</div><div className="font-semibold">{stats.dispatched}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume</div><div className="font-semibold">{(stats.totalKg / 1000).toFixed(1)}t</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">At Risk</div><div className="font-semibold">{stats.risky}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batch, farmer, buyer…" className="pl-9 h-9" />
        </div>
        <Select value={grainFilter} onValueChange={setGrainFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Grain" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grains</SelectItem>
            {GRAIN_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {FILTER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2 h-9 whitespace-nowrap"><Plus className="w-4 h-4" /> New batch</Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
            <p className="text-sm mb-4">No batches yet.</p>
            {availableSilos.length === 0 ? (
              <Link to="/grain-operations" search={{ tab: "silos" }} className="text-sm text-primary hover:text-primary/80 underline underline-offset-4">Create a silo first →</Link>
            ) : canCreate ? (
              <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add batch</Button>
            ) : null}
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
                  const intakeDate = b.intake_date ?? null;
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
                            ...(myRole === "technician" && b.assigned_technician_id === myId && ["pending_qc", "qc_failed"].includes(b.status)
                              ? [{ label: b.status === "qc_failed" ? "Resubmit QC" : "Submit QC", icon: FlaskConical, onClick: () => openQC(b, "submit" as QCMode) }]
                              : []),
                            ...(["manager", "admin"].includes(myRole) && b.status === "qc_submitted"
                              ? [{ label: "Review QC", icon: FlaskConical, onClick: () => openQC(b, "review" as QCMode) }]
                              : []),
                            ...(myRole === "admin" && b.status === "qc_passed"
                              ? [{ label: "Final review", icon: ShieldCheck, onClick: () => openQC(b, "admin" as QCMode) }]
                              : []),
                            ...(myRole === "admin" && b.status === "admin_rejected"
                              ? [{ label: "Resolve rejection", icon: Undo2, onClick: () => openQC(b, "resolve" as QCMode) }]
                              : []),
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
            <span>Dispatch from the <Link to="/grain-operations" search={{ tab: "silos" }} className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Silos</Link> tab</span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit batch" : "New grain batch"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Update batch details." : "Batch ID and QR code are generated automatically on intake."}
            </DialogDescription>
          </DialogHeader>
          <form id="batch-form" className="grid gap-4 py-2" onSubmit={(e) => {
            e.preventDefault();
            // Source validation
            if (form.source_kind === "anonymous") {
              if (!form.farmer_name.trim()) { toast.error("Enter a walk-in name for anonymous source"); return; }
            } else if (!form.supplier_id) {
              toast.error("Pick a supplier or switch source to Anonymous");
              return;
            }
            if (!form.silo_id) { toast.error("Pick a silo"); return; }
            if (!form.id && !form.assignedTechnicianId) { toast.error("Assign a technician for QC"); return; }
            if (!form.grain_type) { toast.error("Pick a grain type"); return; }
            if (!form.quantity_kg || Number(form.quantity_kg) <= 0) { toast.error("Enter a quantity"); return; }
            if (!form.purchase_price_per_kg || Number(form.purchase_price_per_kg) <= 0) {
              toast.error("Purchase price / kg is required for cost tracking"); return;
            }
            if (hasFormErrors) {
              // Enter-to-submit bypasses the disabled submit button, so re-check here too.
              toast.error("Fix the highlighted fields before submitting");
              return;
            }
            saveMut.mutate(form);
          }}>
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
                <Input
                  type="number" min={1} required value={form.quantity_kg}
                  onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                  className={cn(formErrors.quantity_kg && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.quantity_kg} />
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
                  <p className="text-xs text-rose-600 mt-1">Create a silo first.</p>
                )}
              </div>
              {!form.id && (
                <div className="sm:col-span-2">
                  <Label>Assign technician <span className="text-red-500">*</span></Label>
                  <Select value={form.assignedTechnicianId} onValueChange={(v) => setForm({ ...form, assignedTechnicianId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a technician for QC" /></SelectTrigger>
                    <SelectContent>
                      {(techniciansQ.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name ?? t.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {techniciansQ.data?.length === 0 && !techniciansQ.isLoading && (
                    <p className="text-xs text-rose-600 mt-1">No technician is free right now — everyone already has a batch in progress.</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">The batch starts in "Pending QC" — this technician inputs the QC values.</p>
                </div>
              )}
              <div>
                <Label>Moisture %</Label>
                <Input
                  type="number" step="0.1" min={0} max={100} value={form.moisture_content}
                  onChange={(e) => setForm({ ...form, moisture_content: e.target.value })}
                  className={cn(formErrors.moisture_content && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.moisture_content} />
              </div>
              <div>
                <Label>Protein %</Label>
                <Input
                  type="number" step="0.1" min={0} max={100} value={form.protein_content}
                  onChange={(e) => setForm({ ...form, protein_content: e.target.value })}
                  className={cn(formErrors.protein_content && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.protein_content} />
              </div>
              <div>
                <Label>Test weight</Label>
                <Input
                  type="number" step="0.1" min={0} value={form.test_weight}
                  onChange={(e) => setForm({ ...form, test_weight: e.target.value })}
                  className={cn(formErrors.test_weight && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.test_weight} />
              </div>
              <div>
                <Label>Purchase $/kg</Label>
                <Input
                  type="number" step="0.01" min={0} value={form.purchase_price_per_kg}
                  onChange={(e) => setForm({ ...form, purchase_price_per_kg: e.target.value })}
                  className={cn(formErrors.purchase_price_per_kg && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.purchase_price_per_kg} />
              </div>
              <div>
                <Label>Source kind</Label>
                <Select value={form.source_kind} onValueChange={(v) => setForm({ ...form, source_kind: v as Form["source_kind"], supplier_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External supplier</SelectItem>
                    <SelectItem value="own_farm">Own farm / harvest</SelectItem>
                    <SelectItem value="internal_transfer">Internal transfer</SelectItem>
                    <SelectItem value="anonymous">Anonymous / walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier <span className="text-red-500">*</span></Label>
                {form.source_kind === "anonymous" ? (
                  <Input value={form.farmer_name} onChange={(e) => setForm({ ...form, farmer_name: e.target.value })} placeholder="Walk-in name (required)" required />
                ) : suppliersQ.isLoading ? (
                  <div className="h-9 flex items-center gap-2 rounded-md border border-input px-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading suppliers…
                  </div>
                ) : suppliersQ.isError ? (
                  <div className="h-9 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 text-xs text-red-600">
                    <span className="flex-1">Failed to load suppliers</span>
                    <button type="button" onClick={() => suppliersQ.refetch()} className="underline hover:text-red-700">Retry</button>
                  </div>
                ) : (
                  (() => {
                    const options = suppliers.filter((s) => s.kind === form.source_kind);
                    if (options.length === 0) {
                      return (
                        <div className="h-9 flex items-center gap-2 rounded-md border border-dashed border-input px-3 text-xs text-muted-foreground">
                          No {form.source_kind.replace("_", " ")} suppliers.
                          <Link to="/suppliers" className="text-emerald-600 underline">Add one →</Link>
                        </div>
                      );
                    }
                    return (
                      <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Pick from suppliers" /></SelectTrigger>
                        <SelectContent>
                          {options.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()
                )}
                <Link to="/suppliers" className="text-[10px] text-muted-foreground hover:text-emerald-600 underline mt-1 inline-block">Manage suppliers →</Link>
              </div>
              <div>
                <Label>Contact (optional)</Label>
                <Input value={form.farmer_contact} onChange={(e) => setForm({ ...form, farmer_contact: e.target.value })} placeholder="Override contact" />
              </div>
              <div className="sm:col-span-2">
                <Label>Source location</Label>
                <Input value={form.source_location} onChange={(e) => setForm({ ...form, source_location: e.target.value })} placeholder="Village, district, region" />
              </div>
              <div>
                <Label>Intake temp °C</Label>
                <Input
                  type="number" step="0.1" value={form.intake_temperature}
                  onChange={(e) => setForm({ ...form, intake_temperature: e.target.value })}
                  className={cn(formErrors.intake_temperature && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.intake_temperature} />
              </div>
              <div>
                <Label>Intake humidity %</Label>
                <Input
                  type="number" step="0.1" min={0} max={100} value={form.intake_humidity}
                  onChange={(e) => setForm({ ...form, intake_humidity: e.target.value })}
                  className={cn(formErrors.intake_humidity && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={formErrors.intake_humidity} />
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
            <Button form="batch-form" type="submit" disabled={saveMut.isPending || !form.grain_type || !form.quantity_kg || !form.silo_id || (!form.id && !form.assignedTechnicianId) || hasFormErrors}>
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? "Save changes" : "Create batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
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
                <Row label="Quantity">{Number(selected.quantity_kg).toLocaleString()} kg</Row>
                {selected.dispatched_quantity_kg ? (
                  <Row label="Dispatched">{Number(selected.dispatched_quantity_kg).toLocaleString()} kg</Row>
                ) : null}
                <Row label="Grade">{selected.grade ?? "—"}</Row>
                <Row label="Silo">{selected.silos?.name ?? "—"}</Row>
                <Row label="Farmer">{selected.farmer_name ?? "—"}{selected.farmer_contact ? ` · ${selected.farmer_contact}` : ""}</Row>
                <Row label="Source">{selected.source_location ?? "—"}</Row>
                {selected.intake_date && <Row label="Intake">{new Date(selected.intake_date).toLocaleDateString()}</Row>}
                {selected.moisture_content != null && <Row label="Moisture">{selected.moisture_content}%</Row>}
                {selected.protein_content != null && <Row label="Protein">{selected.protein_content}%</Row>}
                {selected.notes && <Row label="Notes"><span className="whitespace-pre-wrap">{selected.notes}</span></Row>}
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => { setSelected(b => b); setViewOpen(false); openEdit(selected); }} className="gap-1"><Edit2 className="w-4 h-4" /> Edit</Button>
                {/* Dispatch happens from the silo's mixed stock, not a single batch — see dispatchFromSilo/createDispatchFromSilo. */}
                {selected.silos && (
                  <Button size="sm" asChild className="gap-1">
                    <Link to="/silos/$siloId" params={{ siloId: selected.silos.id }} onClick={() => setViewOpen(false)}>
                      <Truck className="w-4 h-4" /> Dispatch from {selected.silos.name}
                    </Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
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


      {/* Spoilage Dialog */}
      <Dialog open={spoilageOpen} onOpenChange={(o) => { setSpoilageOpen(o); if (!o) setSpoilage(emptySpoilage); }}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" /> Log spoilage event</DialogTitle>
            <DialogDescription>{selected?.batch_id}</DialogDescription>
          </DialogHeader>
          <form id="spoilage-form" className="grid gap-3 py-2" onSubmit={(e) => {
            e.preventDefault();
            if (hasSpoilageErrors) { toast.error("Fix the highlighted fields before submitting"); return; }
            if (selected) spoilageMut.mutate({ id: selected.id, s: spoilage });
          }}>
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
                <Input
                  type="number" min={0} value={spoilage.estimated_loss_kg}
                  onChange={(e) => setSpoilage({ ...spoilage, estimated_loss_kg: e.target.value })}
                  className={cn(spoilageErrors.estimated_loss_kg && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={spoilageErrors.estimated_loss_kg} />
              </div>
              <div>
                <Label>Temp °C</Label>
                <Input
                  type="number" step="0.1" value={spoilage.temperature}
                  onChange={(e) => setSpoilage({ ...spoilage, temperature: e.target.value })}
                  className={cn(spoilageErrors.temperature && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={spoilageErrors.temperature} />
              </div>
              <div>
                <Label>Humidity %</Label>
                <Input
                  type="number" step="0.1" min={0} max={100} value={spoilage.humidity}
                  onChange={(e) => setSpoilage({ ...spoilage, humidity: e.target.value })}
                  className={cn(spoilageErrors.humidity && "border-red-500 focus-visible:ring-red-500")}
                />
                <FieldError message={spoilageErrors.humidity} />
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
            <Button form="spoilage-form" type="submit" disabled={spoilageMut.isPending || hasSpoilageErrors}>
              {spoilageMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BatchQCDialog batch={qcBatch} mode={qcMode} open={qcOpen} onOpenChange={setQcOpen} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-slate-500 pt-0.5">{label}</span>
      <span className="text-slate-800 text-right min-w-0">{children}</span>
    </div>
  );
}
