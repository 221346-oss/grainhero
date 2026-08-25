import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown, ChevronUp, Edit2, Trash2, Eye, ArrowUpRight,
  ShoppingCart, PackagePlus, PackageMinus,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/app/ExportMenu";
import { SiloFlowDiagram, type FlowGroup } from "./SiloFlowDiagram";
import { SiloStatusPie, type StatusSlice } from "./SiloStatusPie";
import { DispatchApprovalPanel } from "./DispatchApprovalPanel";
import { listDispatches } from "@/lib/dispatches.functions";
import type { ExportColumn } from "@/lib/csv-pdf-export";

export type SiloRow = {
  id: string;
  silo_id: string;
  name: string;
  capacity_kg: number | null;
  current_occupancy_kg: number | null;
  status: string | null;
  warehouses?: { name: string } | null;
};

export type BatchRow = {
  id: string;
  batch_id: string;
  grain_type: string;
  quantity_kg: number;
  status: string | null;
  created_at: string;
  silos?: { id: string } | null;
};

// Spec's 6-stage scheme: yellow = pending, orange = QC, green = stored,
// blue = processing, purple = dispatched, red = issue.
export const BATCH_TONE: Record<string, FlowGroup["tone"]> = {
  pending_qc: "yellow", pending_approval: "yellow", on_hold: "yellow",
  qc_submitted: "orange", qc_passed: "orange",
  stored: "green", ready: "green",
  processing: "blue",
  dispatched: "purple", sold: "purple",
  qc_failed: "red", admin_rejected: "red", damaged: "red", expired: "red", rejected: "red",
};
export const BATCH_TONE_LABELS: Record<FlowGroup["tone"], string> = {
  yellow: "Pending", orange: "QC", green: "Stored", blue: "Processing", purple: "Dispatched", red: "Issue",
};
export const DISPATCH_TONE: Record<string, FlowGroup["tone"]> = {
  draft: "yellow", staged: "yellow", in_transit: "blue",
  confirmed: "green", delivered: "purple",
  cancelled: "red",
};
export const DISPATCH_TONE_LABELS: Record<FlowGroup["tone"], string> = {
  yellow: "Pending", orange: "QC", green: "Confirmed", blue: "In transit", purple: "Delivered", red: "Cancelled",
};

const ALL_TONES: FlowGroup["tone"][] = ["yellow", "orange", "green", "blue", "purple", "red"];

// Shared with DashboardBlocks.tsx's silo cards — one derived Active/Full/
// Maintenance/Offline badge, not a raw pass-through of silos.status (which
// has no "full" value; that's derived from occupancy %).
export function siloStatusBadge(pct: number, status: string | null): { label: string; cls: string } {
  if (pct >= 98) return { label: "Full", cls: "bg-red-100 text-red-700 border-red-200" };
  if (status === "maintenance") return { label: "Maintenance", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (status === "offline" || status === "error") return { label: status === "error" ? "Error" : "Offline", cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

export function groupByTone<T extends { status: string | null }>(
  rows: T[],
  toneMap: Record<string, FlowGroup["tone"]>,
  qtyOf: (r: T) => number,
  labels: Record<FlowGroup["tone"], string>,
): FlowGroup[] {
  const byTone: Record<FlowGroup["tone"], { count: number; kg: number }> = {
    yellow: { count: 0, kg: 0 }, orange: { count: 0, kg: 0 }, green: { count: 0, kg: 0 },
    blue: { count: 0, kg: 0 }, purple: { count: 0, kg: 0 }, red: { count: 0, kg: 0 },
  };
  for (const r of rows) {
    const tone = toneMap[String(r.status ?? "")] ?? "yellow";
    byTone[tone].count += 1;
    byTone[tone].kg += qtyOf(r);
  }
  return ALL_TONES
    .filter((t) => byTone[t].count > 0)
    .map((t) => ({ label: labels[t], count: byTone[t].count, kg: byTone[t].kg, tone: t }));
}

export function SiloOperationsCard({
  silo,
  batches,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onSell,
  onRequestMore,
}: {
  silo: SiloRow;
  batches: BatchRow[];
  isAdmin?: boolean;
  onView: (silo: SiloRow) => void;
  onEdit: (silo: SiloRow) => void;
  onDelete: (id: string) => void;
  onSell: (silo: SiloRow) => void;
  onRequestMore?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const listDispatchesFn = useServerFn(listDispatches);

  const cap = Number(silo.capacity_kg ?? 0);
  const occ = Number(silo.current_occupancy_kg ?? 0);
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  const barColor =
    pct >= 90
      ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
      : pct >= 70
        ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
        : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]";

  const siloBadge = siloStatusBadge(pct, silo.status);

  const siloBatches = useMemo(() => batches.filter((b) => b.silos?.id === silo.id), [batches, silo.id]);

  const dispatchesQ = useQuery({
    queryKey: ["silo-dispatches", silo.id],
    queryFn: () => listDispatchesFn({ data: { siloId: silo.id, limit: 100 } }),
    enabled: expanded,
  });
  const dispatches = (dispatchesQ.data?.dispatches ?? []) as Array<{
    id: string; status: string | null; total_qty_kg: number; dispatch_number: string;
  }>;

  const incoming = useMemo(
    () => groupByTone(siloBatches, BATCH_TONE, (b) => Number(b.quantity_kg ?? 0), BATCH_TONE_LABELS),
    [siloBatches],
  );
  const outgoing = useMemo(
    () => (expanded ? groupByTone(dispatches, DISPATCH_TONE, (d) => Number(d.total_qty_kg ?? 0), DISPATCH_TONE_LABELS) : []),
    [dispatches, expanded],
  );
  const pieData: StatusSlice[] = useMemo(() => {
    const byTone: Record<FlowGroup["tone"], number> = { yellow: 0, orange: 0, green: 0, blue: 0, purple: 0, red: 0 };
    for (const b of siloBatches) byTone[BATCH_TONE[String(b.status ?? "")] ?? "yellow"] += 1;
    return ALL_TONES.filter((t) => byTone[t] > 0).map((t) => ({ name: BATCH_TONE_LABELS[t], value: byTone[t], tone: t }));
  }, [siloBatches]);

  const incomingCount = siloBatches.length;
  const outgoingCount = dispatches.length;

  const exportColumns: ExportColumn<BatchRow>[] = [
    { header: "Batch ID", value: (b) => b.batch_id },
    { header: "Grain type", value: (b) => b.grain_type },
    { header: "Quantity (kg)", value: (b) => b.quantity_kg },
    { header: "Status", value: (b) => b.status ?? "" },
    { header: "Created", value: (b) => new Date(b.created_at).toLocaleDateString() },
  ];

  return (
    <Card className="border-border/70 bg-gradient-to-br from-card/90 via-card/70 to-muted/20 backdrop-blur-md shadow-sm hover:border-emerald-500/40 transition-all">
      <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate text-foreground">{silo.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{silo.warehouses?.name ?? "—"} · {silo.silo_id}</p>
        </div>
        <Badge className={siloBadge.cls} variant="outline">{siloBadge.label}</Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-muted/80 overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <span className="text-[11px] tabular-nums font-bold w-9 text-right text-foreground">{pct}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums">{occ.toLocaleString()} / {cap.toLocaleString()} kg</p>

        {/* Incoming/Outgoing stat mini-cards */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <PackagePlus className="h-3 w-3 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground leading-none">Incoming</p>
              <p className="text-xs font-semibold tabular-nums leading-tight">{incomingCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <PackageMinus className="h-3 w-3 text-sky-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground leading-none">Outgoing</p>
              <p className="text-xs font-semibold tabular-nums leading-tight">{expanded ? outgoingCount : "—"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-9 flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => onSell(silo)}>
            <ShoppingCart className="h-3 w-3" /> Sell
          </Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => onView(silo)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => onEdit(silo)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-rose-600 hover:text-rose-700" onClick={() => onDelete(silo.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
          <Button
            size="sm" variant="ghost" className="h-9 w-9 p-0"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand — flow diagram, breakdown, sales"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {onRequestMore && (
          <button
            type="button"
            onClick={onRequestMore}
            className="w-full text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Request more capacity
          </button>
        )}

        {expanded && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <SiloFlowDiagram siloName={silo.name} occupancyPct={pct} incoming={incoming} outgoing={outgoing} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Batch status breakdown</p>
                <SiloStatusPie data={pieData} />
              </div>
              <div className="flex flex-col justify-between">
                <DispatchApprovalPanel siloId={silo.id} isAdmin={Boolean(isAdmin)} />
                <div className="flex items-center justify-between mt-2">
                  <ExportMenu
                    filename={`${silo.silo_id}-batches`}
                    title={`${silo.name} — batches`}
                    rows={siloBatches}
                    columns={exportColumns}
                  />
                  <Link
                    to="/silos/$siloId"
                    params={{ siloId: silo.id }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    View full silo <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
