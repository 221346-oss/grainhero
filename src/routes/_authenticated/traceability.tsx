import { createFileRoute } from "@tanstack/react-router";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, TableSkeleton } from "@/components/app/skeletons";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode, MapPin, Clock, Package, Search, Eye, Download, Truck, Thermometer,
  AlertTriangle, CheckCircle, Calendar,
} from "lucide-react";
import { listGrainBatches } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/traceability")({
  component: TraceabilityPage,
});

type Batch = Awaited<ReturnType<typeof listGrainBatches>>[number];

function statusBadge(s: string | null) {
  switch (s) {
    case "stored": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "dispatched": return "bg-blue-100 text-blue-800 border-blue-200";
    case "sold": return "bg-purple-100 text-purple-800 border-purple-200";
    case "damaged": return "bg-red-100 text-red-800 border-red-200";
    case "on_hold": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
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

  const exportCSV = () => {
    const headers = "Batch ID,Grain Type,Quantity (kg),Status,Risk Score,Spoilage,Silo,Farmer,Intake Date\n";
    const rows = batches.map((b) => {
      const silo = (b as { silos?: { name?: string } | null }).silos?.name ?? "N/A";
      return [
        b.batch_id, b.grain_type, b.quantity_kg, b.status, b.risk_score,
        b.spoilage_label, silo, b.farmer_name ?? "N/A",
        b.intake_date ? new Date(b.intake_date).toLocaleDateString() : "",
      ].map((c) => `"${String(c ?? "")}"`).join(",");
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grain-traceability-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Traceability report exported");
  };

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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Grain Traceability</h1>
          <p className="text-sm text-slate-500 mt-1">Complete supply chain tracking from farm to market</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <Search className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Batches", val: batches.length, icon: Package, color: "text-emerald-600" },
          { label: "Stored", val: batches.filter((b) => b.status === "stored").length, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Dispatched", val: batches.filter((b) => b.status === "dispatched").length, icon: Truck, color: "text-blue-600" },
          { label: "High Risk", val: batches.filter((b) => (b.risk_score ?? 0) >= 70).length, icon: AlertTriangle, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{s.val}</p>
                </div>
                <s.icon className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 ${s.color}`} />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Batch ID, grain type, or farmer name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
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
            <Package className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No batches found</h3>
            <p className="text-slate-600">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((batch) => {
            const silo = (batch as { silos?: { name?: string; capacity_kg?: number } | null }).silos ?? null;
            const dispatch = (batch.dispatch_details ?? null) as { buyer_name?: string } | null;
            return (
              <Card key={batch.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelected(batch); setViewOpen(true); }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{batch.batch_id}</CardTitle>
                    <Badge className={statusBadge(batch.status)}>
                      {(batch.status ?? "").charAt(0).toUpperCase() + (batch.status ?? "").slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>{batch.grain_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">QR Code</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelected(batch); setQrOpen(true); }}>
                      View QR
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />{silo?.name ?? "No location"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Package className="h-4 w-4 text-slate-400" />{Number(batch.quantity_kg).toLocaleString()} kg
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Risk:</span>
                    <Badge className={riskBadge(Number(batch.risk_score ?? 0))}>
                      {batch.spoilage_label} ({Number(batch.risk_score ?? 0)}%)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Intake: {batch.intake_date ? new Date(batch.intake_date).toLocaleDateString() : "—"}
                  </div>
                  {dispatch?.buyer_name && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800 truncate">Dispatched to: {dispatch.buyer_name}</span>
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); setSelected(batch); setViewOpen(true); }}>
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
              <Package className="h-5 w-5" /> Complete Traceability History
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
    buyer_name?: string; buyer_contact?: string; quantity?: number; dispatch_date?: string; notes?: string;
  } | null;

  return (
    <div className="py-4 space-y-4">
      <Card className="border-emerald-500 bg-emerald-50">
        <CardContent className="p-4 flex items-center gap-4">
          <Package className="h-10 w-10 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-emerald-900">{batch.batch_id}</h4>
            <p className="text-sm text-emerald-700 truncate">
              {batch.grain_type} • {Number(batch.quantity_kg).toLocaleString()} kg
            </p>
            <p className="text-xs text-emerald-700/80">
              Grade: {batch.grade ?? "N/A"} • Variety: {batch.variety ?? "N/A"}
            </p>
          </div>
          <Badge className={statusBadge(batch.status)}>
            {(batch.status ?? "").charAt(0).toUpperCase() + (batch.status ?? "").slice(1)}
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
            color="blue" icon={<Package className="h-5 w-5 text-white" />}
            title="Farm Intake" date={batch.intake_date}
            desc={`Received from farm`}
            items={[
              ["Farmer", batch.farmer_name ?? "N/A"],
              ["Contact", batch.farmer_contact ?? "N/A"],
              ["Quantity", `${Number(batch.quantity_kg).toLocaleString()} kg`],
              ["Harvest", batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : "N/A"],
            ]}
          />
          <TimelineStep
            color="emerald" icon={<Thermometer className="h-5 w-5 text-white" />}
            title="Quality Assessment" date={batch.intake_date}
            desc="Pre-storage quality testing"
            items={[
              ["Moisture", `${batch.moisture_content ?? "N/A"}%`],
              ["Grade", batch.grade ?? "N/A"],
              ["Variety", batch.variety ?? "N/A"],
              ["Status", "Quality Approved"],
            ]}
          />
          <TimelineStep
            color="purple" icon={<MapPin className="h-5 w-5 text-white" />}
            title="Storage Assignment" date={batch.intake_date}
            desc="Assigned to storage facility"
            items={[
              ["Silo", silo?.name ?? "N/A"],
              ["Capacity", silo?.capacity_kg ? `${Number(silo.capacity_kg).toLocaleString()} kg` : "N/A"],
              ["Status", "Stored"],
              ["Monitoring", "Active"],
            ]}
          />
          <TimelineStep
            color="amber" icon={<AlertTriangle className="h-5 w-5 text-white" />}
            title="Risk Assessment" date={batch.last_risk_assessment ?? batch.intake_date}
            desc="AI-powered spoilage risk evaluation"
            items={[
              ["Risk Level", batch.spoilage_label ?? "N/A"],
              ["Risk Score", `${Number(batch.risk_score ?? 0)}%`],
              ["Assessment", (batch.risk_score ?? 0) >= 70 ? "High" : (batch.risk_score ?? 0) >= 40 ? "Medium" : "Low"],
              ["Confidence", `${Number(batch.ai_prediction_confidence ?? 0)}%`],
            ]}
          />
          {batch.status === "dispatched" && dispatch ? (
            <TimelineStep
              color="emerald" icon={<Truck className="h-5 w-5 text-white" />}
              title="Batch Dispatch" date={dispatch.dispatch_date ?? batch.actual_dispatch_date}
              desc="Dispatched to buyer"
              items={[
                ["Buyer", dispatch.buyer_name ?? "N/A"],
                ["Contact", dispatch.buyer_contact ?? "N/A"],
                ["Quantity", dispatch.quantity ? `${dispatch.quantity} kg` : "N/A"],
                ["Status", "Delivered"],
              ]}
              notes={dispatch.notes}
            />
          ) : batch.status !== "dispatched" && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-slate-700">Pending Dispatch</h4>
                <p className="text-sm text-slate-600">Batch is ready for dispatch</p>
              </div>
            </div>
          )}
          {batch.notes && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-medium text-slate-700 mb-1">Notes</h4>
              <p className="text-sm text-slate-600">{batch.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineStep({
  color, icon, title, date, desc, items, notes,
}: {
  color: "blue" | "emerald" | "purple" | "amber";
  icon: React.ReactNode; title: string; date?: string | null; desc: string;
  items: [string, string | number][]; notes?: string | null;
}) {
  const bgMap = { blue: "bg-blue-50 border-blue-200", emerald: "bg-emerald-50 border-emerald-200", purple: "bg-purple-50 border-purple-200", amber: "bg-amber-50 border-amber-200" }[color];
  const nodeMap = { blue: "bg-blue-600", emerald: "bg-emerald-600", purple: "bg-purple-600", amber: "bg-amber-600" }[color];
  const textMap = { blue: "text-blue-900", emerald: "text-emerald-900", purple: "text-purple-900", amber: "text-amber-900" }[color];
  const subMap = { blue: "text-blue-700", emerald: "text-emerald-700", purple: "text-purple-700", amber: "text-amber-700" }[color];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${nodeMap}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className={`font-medium ${textMap}`}>{title}</h4>
          <span className={`text-xs ${subMap}`}>{date ? new Date(date).toLocaleDateString() : ""}</span>
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
          <div className="mt-2 p-2 bg-white/70 rounded text-xs">
            <span className="font-medium">Notes:</span> {notes}
          </div>
        )}
      </div>
    </div>
  );
}