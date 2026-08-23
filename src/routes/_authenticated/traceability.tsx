import { createFileRoute } from "@tanstack/react-router";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/app/skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  MapPin,
  Clock,
  Search,
  Eye,
  Truck,
  Thermometer,
  AlertTriangle,
  Calendar,
  ClipboardList,
} from "lucide-react";
import { listGrainBatches } from "@/lib/operations.functions";
import { getMyRole } from "@/lib/roles.functions";
import { getBatchTraceability } from "@/lib/traceability.functions";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import { getBatchStageLabel } from "@/lib/batch-stage.utils";

export const Route = createFileRoute("/_authenticated/traceability")({
  head: () => ({
    meta: [
      { title: "Traceability — Grain Hero" },
      {
        name: "description",
        content: "Traceability workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Traceability — Grain Hero" },
      { property: "og:description", content: "Traceability workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TraceabilityPage,
});

type Batch = Awaited<ReturnType<typeof listGrainBatches>>[number];

function statusBadge(s: string | null, qcPassedAt?: string | null) {
  // Map QC workflow statuses
  const qcStatuses: Record<string, string> = {
    pending_qc: "bg-slate-100 text-slate-700 border-slate-200",
    qc_submitted: "bg-slate-100 text-slate-700 border-slate-200",
    qc_passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    qc_failed: "bg-red-100 text-red-800 border-red-200",
    admin_rejected: "bg-red-100 text-red-800 border-red-200",
    pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
  };

  if (s && qcStatuses[s]) {
    return qcStatuses[s];
  }

  // Original statuses
  switch (s) {
    case "stored":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "dispatched":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "sold":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "damaged":
      return "bg-red-100 text-red-800 border-red-200";
    case "on_hold":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
function riskBadge(r: number) {
  if (r >= 70) return "bg-red-100 text-red-800 border-red-200";
  if (r >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function TraceabilityPage() {
  const fetchBatches = useServerFn(listGrainBatches);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["traceability-batches"],
    queryFn: () => fetchBatches(),
  });
  const batches = (data ?? []) as Batch[];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Batch | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const q = search.toLowerCase();
      const match =
        (b.batch_id ?? "").toLowerCase().includes(q) ||
        (b.grain_type ?? "").toLowerCase().includes(q) ||
        (b.farmer_name ?? "").toLowerCase().includes(q);
      const s = status === "all" || b.status === status;
      return match && s;
    });
  }, [batches, search, status]);

  const traceabilityExportColumns: ExportColumn<Batch>[] = [
    { header: "Batch ID", value: (b) => b.batch_id },
    { header: "Grain Type", value: (b) => b.grain_type },
    { header: "Quantity (kg)", value: (b) => b.quantity_kg },
    { header: "Status", value: (b) => b.status },
    { header: "Risk Score", value: (b) => b.risk_score },
    { header: "Spoilage", value: (b) => b.spoilage_label },
    {
      header: "Silo",
      value: (b) => (b as { silos?: { name?: string } | null }).silos?.name ?? "N/A",
    },
    { header: "Farmer", value: (b) => b.farmer_name ?? "N/A" },
    {
      header: "Intake Date",
      value: (b) => (b.intake_date ? new Date(b.intake_date).toLocaleDateString() : ""),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <StatsSkeleton />
        <TableSkeleton rows={8} cols={5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Grain Traceability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete supply chain tracking from farm to market
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <Search className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <ExportMenu
            filename="grain-traceability"
            title="Grain Traceability"
            rows={batches}
            columns={traceabilityExportColumns}
          />
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Batches", val: batches.length },
          { label: "Stored", val: batches.filter((b) => b.status === "stored").length },
          { label: "Dispatched", val: batches.filter((b) => b.status === "dispatched").length },
          { label: "High Risk", val: batches.filter((b) => (b.risk_score ?? 0) >= 70).length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Batch ID, grain type, or farmer name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">No batches found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((batch) => {
            const silo =
              (batch as { silos?: { name?: string; capacity_kg?: number } | null }).silos ?? null;
            const dispatch = (batch.dispatch_details ?? null) as { buyer_name?: string } | null;
            return (
              <Card
                key={batch.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelected(batch);
                  setViewOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{batch.batch_id}</CardTitle>
                    <Badge className={statusBadge(batch.status, (batch as any).qc_passed_at)}>
                      {getBatchStageLabel(batch.status ?? "", (batch as any).qc_passed_at)}
                    </Badge>
                  </div>
                  <CardDescription>{batch.grain_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">QR Code</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(batch);
                        setQrOpen(true);
                      }}
                    >
                      View QR
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {silo?.name ?? "No location"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {Number(batch.quantity_kg).toLocaleString()} kg
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Risk:</span>
                    <Badge className={riskBadge(Number(batch.risk_score ?? 0))}>
                      {batch.spoilage_label} ({Number(batch.risk_score ?? 0)}%)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Intake:{" "}
                    {batch.intake_date ? new Date(batch.intake_date).toLocaleDateString() : "—"}
                  </div>
                  {dispatch?.buyer_name && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800 truncate">
                        Dispatched to: {dispatch.buyer_name}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(batch);
                      setViewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Full History
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              Complete Traceability History
            </DialogTitle>
            <DialogDescription>
              Full supply chain traceability for batch {selected?.batch_id}
            </DialogDescription>
          </DialogHeader>
          {selected && <TimelineBody batch={selected} />}
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      {selected && (
        <QRCodeDisplay
          qrCode={selected.qr_code || ""}
          batchId={selected.batch_id}
          grainType={selected.grain_type}
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}

function TimelineBody({ batch }: { batch: Batch }) {
  const silo = (batch as { silos?: { name?: string; capacity_kg?: number } | null }).silos ?? null;
  const dispatch = (batch.dispatch_details ?? null) as {
    buyer_name?: string;
    buyer_contact?: string;
    quantity?: number;
    dispatch_date?: string;
    notes?: string;
  } | null;

  return (
    <div className="py-4 space-y-4">
      <Card className="border-emerald-500 bg-emerald-50">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-emerald-900">{batch.batch_id}</h4>
            <p className="text-sm text-emerald-700 truncate">
              {batch.grain_type} • {Number(batch.quantity_kg).toLocaleString()} kg
            </p>
            <p className="text-xs text-emerald-700/80">
              Grade: {batch.grade ?? "N/A"} • Variety: {batch.variety ?? "N/A"}
            </p>
          </div>
          <Badge className={statusBadge(batch.status, (batch as any).qc_passed_at)}>
            {getBatchStageLabel(batch.status ?? "", (batch as any).qc_passed_at)}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Supply Chain Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TimelineStep
            color="blue"
            icon={null}
            title="Farm Intake"
            date={batch.intake_date}
            desc={`Received from farm`}
            items={[
              ["Farmer", batch.farmer_name ?? "N/A"],
              ["Contact", batch.farmer_contact ?? "N/A"],
              ["Quantity", `${Number(batch.quantity_kg).toLocaleString()} kg`],
              [
                "Harvest",
                batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : "N/A",
              ],
            ]}
          />
          <TimelineStep
            color="emerald"
            icon={<Thermometer className="h-5 w-5 text-white" />}
            title="Quality Assessment"
            date={batch.intake_date}
            desc="Pre-storage quality testing"
            items={[
              ["Moisture", `${batch.moisture_content ?? "N/A"}%`],
              ["Grade", batch.grade ?? "N/A"],
              ["Variety", batch.variety ?? "N/A"],
              ["Status", "Quality Approved"],
            ]}
          />
          <TimelineStep
            color="purple"
            icon={<MapPin className="h-5 w-5 text-white" />}
            title="Storage Assignment"
            date={batch.intake_date}
            desc="Assigned to storage facility"
            items={[
              ["Silo", silo?.name ?? "N/A"],
              [
                "Capacity",
                silo?.capacity_kg ? `${Number(silo.capacity_kg).toLocaleString()} kg` : "N/A",
              ],
              ["Status", "Stored"],
              ["Monitoring", "Active"],
            ]}
          />
          <TimelineStep
            color="amber"
            icon={<AlertTriangle className="h-5 w-5 text-white" />}
            title="Risk Assessment"
            date={batch.last_risk_assessment ?? batch.intake_date}
            desc="AI-powered spoilage risk evaluation"
            items={[
              ["Risk Level", batch.spoilage_label ?? "N/A"],
              ["Risk Score", `${Number(batch.risk_score ?? 0)}%`],
              [
                "Assessment",
                (batch.risk_score ?? 0) >= 70
                  ? "High"
                  : (batch.risk_score ?? 0) >= 40
                    ? "Medium"
                    : "Low",
              ],
              ["Confidence", `${Number(batch.ai_prediction_confidence ?? 0)}%`],
            ]}
          />
          {batch.status === "dispatched" && dispatch ? (
            <TimelineStep
              color="emerald"
              icon={<Truck className="h-5 w-5 text-white" />}
              title="Batch Dispatch"
              date={dispatch.dispatch_date ?? batch.actual_dispatch_date}
              desc="Dispatched to buyer"
              items={[
                ["Buyer", dispatch.buyer_name ?? "N/A"],
                ["Contact", dispatch.buyer_contact ?? "N/A"],
                ["Quantity", dispatch.quantity ? `${dispatch.quantity} kg` : "N/A"],
                ["Status", "Delivered"],
              ]}
              notes={dispatch.notes}
            />
          ) : (
            batch.status !== "dispatched" && (
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border-border/40">
                <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Pending Dispatch</h4>
                  <p className="text-sm text-muted-foreground">Batch is ready for dispatch</p>
                </div>
              </div>
            )
          )}
          {batch.notes && (
            <div className="p-3 bg-muted/20 rounded-lg border-border/40">
              <h4 className="font-medium text-foreground mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground">{batch.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AuditTrailCard batchId={batch.id} />
    </div>
  );
}

/** Real activity_logs audit trail — manager/admin only (see traceability.functions.ts). */
function AuditTrailCard({ batchId }: { batchId: string }) {
  const fetchRole = useServerFn(getMyRole);
  const fetchTrail = useServerFn(getBatchTraceability);
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canView = me?.role === "admin" || me?.role === "manager";

  const { data, isLoading } = useQuery({
    queryKey: ["batch-traceability", batchId],
    queryFn: () => fetchTrail({ data: { batchId } }),
    enabled: canView,
  });
  const events = data?.timeline ?? [];

  if (!canView) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Audit trail
        </CardTitle>
        <CardDescription>
          Every logged action on this batch — creation, QC steps, approvals, dispatch, and any
          related field incidents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logged events yet for this batch.</p>
        ) : (
          <div className="space-y-2">
            {events.map((e: any) => (
              <div
                key={`${e.kind}-${e.id}`}
                className="flex items-start gap-3 text-sm border-l-2 border-border/40 pl-3 py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {e.action.replace(/[._]/g, " ")}
                    </span>
                    {e.kind === "field_incident" && (
                      <Badge variant="outline" className="text-[10px]">
                        field incident
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {e.actorName}
                    {e.actorRole ? ` (${e.actorRole})` : ""} · {new Date(e.at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineStep({
  color,
  icon,
  title,
  date,
  desc,
  items,
  notes,
}: {
  color: "blue" | "emerald" | "purple" | "amber";
  icon: React.ReactNode;
  title: string;
  date?: string | null;
  desc: string;
  items: [string, string | number][];
  notes?: string | null;
}) {
  const bgMap = {
    blue: "bg-blue-50 border-blue-200",
    emerald: "bg-emerald-50 border-emerald-200",
    purple: "bg-purple-50 border-purple-200",
    amber: "bg-amber-50 border-amber-200",
  }[color];
  const nodeMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    purple: "bg-purple-600",
    amber: "bg-amber-600",
  }[color];
  const textMap = {
    blue: "text-blue-900",
    emerald: "text-emerald-900",
    purple: "text-purple-900",
    amber: "text-amber-900",
  }[color];
  const subMap = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    purple: "text-purple-700",
    amber: "text-amber-700",
  }[color];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap}`}>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${nodeMap}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className={`font-medium ${textMap}`}>{title}</h4>
          <span className={`text-xs ${subMap}`}>
            {date ? new Date(date).toLocaleDateString() : ""}
          </span>
        </div>
        <p className={`text-sm ${subMap}`}>{desc}</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {items.map(([k, v]) => (
            <div key={k} className={`text-xs ${subMap}`}>
              <span className="font-medium">{k}:</span> {v}
            </div>
          ))}
        </div>
        {notes && (
          <div className="mt-2 p-2 bg-card/70 rounded text-xs">
            <span className="font-medium">Notes:</span> {notes}
          </div>
        )}
      </div>
    </div>
  );
}
