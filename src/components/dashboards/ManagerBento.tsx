import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { AlertTriangle, ClipboardCheck, Truck, ToggleRight, Package, Container, UserCheck, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assignQCTask, approveQCResult } from "@/lib/qc.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Row = { id: string; primary: ReactNode; secondary?: ReactNode; badge?: ReactNode; to?: string; action?: ReactNode };

// ─── QC Status Badge ──────────────────────────────────────────────────────────
function QCStatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, { label: string; cls: string }> = {
    arrived:  { label: "Arrived",       cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
    testing:  { label: "Testing",       cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    pending:  { label: "Pending Review",cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
    passed:   { label: "Passed",        cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    failed:   { label: "Failed",        cls: "bg-red-500/10 text-red-600" },
  };
  const s = status ?? "arrived";
  const { label, cls } = map[s] ?? map.arrived;
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

// ─── Assign QC Button ─────────────────────────────────────────────────────────
function AssignQCButton({
  batchId, technicians,
}: {
  batchId: string;
  technicians: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const assignFn = useServerFn(assignQCTask);

  const mut = useMutation({
    mutationFn: (techId: string) => assignFn({ data: { id: batchId, assigned_to: techId } }),
    onSuccess: () => {
      toast.success("QC task assigned to technician");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (technicians.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
          title="Assign QC technician"
        >
          <UserCheck className="h-3 w-3" />
          Assign
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end" side="left">
        <p className="text-xs font-semibold mb-2">Pick a technician</p>
        <ul className="space-y-1 max-h-40 overflow-auto">
          {technicians.map((t) => (
            <li key={t.id}>
              <Button
                variant="ghost" size="sm"
                className="w-full justify-start gap-2 h-auto py-1.5"
                disabled={mut.isPending}
                onClick={() => mut.mutate(t.id)}
              >
                {mut.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  : <div className="h-5 w-5 grid place-items-center rounded-full bg-sky-500/15 text-[8px] font-bold text-sky-700 dark:text-sky-300 shrink-0">
                      {(t.name ?? t.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                }
                <span className="text-xs truncate">{t.name ?? t.email ?? "Technician"}</span>
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ─── Review QC Modal Button ───────────────────────────────────────────────────
function ReviewQCButton({
  batch,
}: {
  batch: {
    id: string;
    batch_id: string;
    moisture_content: number | null;
    protein_content: number | null;
    test_weight: number | null;
    qc_notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const approveFn = useServerFn(approveQCResult);

  const mut = useMutation({
    mutationFn: (passed: boolean) => approveFn({ data: { id: batch.id, passed } }),
    onSuccess: (_, passed) => {
      toast.success(passed ? "Batch QC Approved — now stored!" : "Batch QC Rejected — put on hold.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
      >
        Review
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QC Report — {batch.batch_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold">{batch.moisture_content ?? "—"}%</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Moisture</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold">{batch.protein_content ?? "—"}%</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Protein</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold">{batch.test_weight ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Test Wt.</div>
              </div>
            </div>
            {batch.qc_notes && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Technician Notes</div>
                <div className="text-xs">{batch.qc_notes}</div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline" size="sm" className="flex-1 gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
              disabled={mut.isPending}
              onClick={() => mut.mutate(false)}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              size="sm" className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={mut.isPending}
              onClick={() => mut.mutate(true)}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PriorityPill({ p }: { p?: string | null }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600",
    high: "bg-amber-500/10 text-amber-600",
    medium: "bg-sky-500/10 text-sky-600",
    low: "bg-slate-500/10 text-slate-600",
  };
  const key = String(p ?? "medium").toLowerCase();
  return <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${map[key] ?? map.medium}`}>{key}</span>;
}

// ─── BentoCard ────────────────────────────────────────────────────────────────
function BentoCard({
  title, icon: Icon, count, to, tooltip, rows, empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  to: string;
  tooltip: string;
  rows: Row[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 flex flex-col min-h-0">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-card/40 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <h3 className="text-xs font-semibold truncate">{title}</h3>
          <InfoDot text={tooltip} />
          {typeof count === "number" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {count}
            </span>
          )}
        </div>
        <Link to={to as never} search={{} as never} className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
          View all
        </Link>
      </header>
      <div className="max-h-[260px] overflow-auto">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-6 text-center">{empty}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition">
                {r.to ? (
                  <Link to={r.to as never} search={{} as never} className="flex-1 min-w-0 flex flex-col">
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && <div className="text-[10px] text-muted-foreground truncate">{r.secondary}</div>}
                  </Link>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && <div className="text-[10px] text-muted-foreground truncate">{r.secondary}</div>}
                  </div>
                )}
                {r.badge}
                {r.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ManagerBento({
  silos, alerts, qcQueue, dispatchQueue, actuators, orders, technicians,
}: {
  silos: Array<{ id: string; name: string; silo_id: string; capacity_kg: number; current_occupancy_kg: number | null; status: string | null }>;
  alerts: Array<{ id: string; title: string; priority: string | null; alert_type: string | null; triggered_at: string | null }>;
  qcQueue: Array<{
    id: string; batch_id: string; grain_type: string; quantity_kg: number; risk_score: number | null;
    qc_status?: string | null; qc_assigned_to?: string | null; qc_notes?: string | null;
    moisture_content?: number | null; protein_content?: number | null; test_weight?: number | null;
  }>;
  dispatchQueue: Array<{ id: string; batch_id: string; grain_type: string; quantity_kg: number }>;
  actuators: Array<{ id: string; name: string; actuator_type: string; is_on: boolean | null; silo_id: string | null }>;
  orders: Array<{ id: string; order_number: string; status: string; total_amount: number | null; created_at: string }>;
  technicians?: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const siloRows: Row[] = silos.map((s) => {
    const pct = s.capacity_kg ? Math.round((Number(s.current_occupancy_kg ?? 0) / s.capacity_kg) * 100) : 0;
    return {
      id: s.id,
      primary: s.name,
      secondary: `${s.silo_id} · ${pct}% full`,
      badge: (
        <div className="w-16">
          <div className="h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
            <div className={`h-full ${pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      ),
      to: `/silos/${s.id}`,
    };
  });

  const alertRows: Row[] = alerts.map((a) => ({
    id: a.id,
    primary: a.title,
    secondary: a.alert_type ?? "alert",
    badge: <PriorityPill p={a.priority} />,
    to: "/grain-alerts",
  }));

  // ─── QC Queue rows with stage badges + actions ──────────────────────────────
  const techs = technicians ?? [];
  const qcRows: Row[] = qcQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    badge: <QCStatusBadge status={b.qc_status} />,
    action: b.qc_status === "arrived"
      ? <AssignQCButton batchId={b.id} technicians={techs} />
      : b.qc_status === "pending"
        ? <ReviewQCButton batch={{ id: b.id, batch_id: b.batch_id, moisture_content: b.moisture_content ?? null, protein_content: b.protein_content ?? null, test_weight: b.test_weight ?? null, qc_notes: b.qc_notes ?? null }} />
        : null,
    to: "/grain-batches",
  }));

  const dispatchRows: Row[] = dispatchQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    to: "/grain-batches",
  }));

  const actRows: Row[] = actuators.map((a) => ({
    id: a.id,
    primary: a.name,
    secondary: a.actuator_type,
    badge: (
      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.is_on ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-slate-500/10 text-slate-600"}`}>
        {a.is_on ? "on" : "off"}
      </span>
    ),
    to: "/actuators",
  }));

  const orderRows: Row[] = orders.map((o) => ({
    id: o.id,
    primary: o.order_number,
    secondary: `${o.status} · Rs. ${Number(o.total_amount ?? 0).toLocaleString()}`,
    to: "/orders",
  }));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <BentoCard title="Silos" icon={Container} count={silos.length} to="/silos"
        tooltip="Silo utilisation, sorted by fill. Click any silo for full detail."
        rows={siloRows} empty="No silos yet — provision from install orders." />
      <BentoCard title="Alert triage" icon={AlertTriangle} count={alerts.length} to="/grain-alerts"
        tooltip="Open alerts awaiting acknowledgement or escalation."
        rows={alertRows} empty="All clear — no open alerts." />
      <BentoCard title="QC queue" icon={ClipboardCheck} count={qcQueue.length} to="/grain-batches"
        tooltip="Batches in the QC pipeline. Assign a technician to arrived trucks, then review submitted reports."
        rows={qcRows} empty="No batches pending QC." />
      <BentoCard title="Dispatch queue" icon={Truck} count={dispatchQueue.length} to="/grain-batches"
        tooltip="Batches ready to be dispatched to buyers."
        rows={dispatchRows} empty="Nothing ready to ship." />
      <BentoCard title="Actuators" icon={ToggleRight} count={actuators.length} to="/actuators"
        tooltip="Latest actuator state. Click through to toggle from the Actuators page."
        rows={actRows} empty="No actuators registered." />
      <BentoCard title="Buyer orders" icon={Package} count={orders.length} to="/orders"
        tooltip="Open buyer orders — pending or confirmed. Fulfil from the orders page."
        rows={orderRows} empty="No open buyer orders." />
    </div>
  );
}