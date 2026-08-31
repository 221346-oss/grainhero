import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMyAssignedBatches } from "@/lib/batch-qc.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Beaker,
  ChevronRight,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/technician/batches")({
  head: () => ({ meta: [{ title: "My Batches — Technician QC" }] }),
  component: TechnicianBatchesPage,
});

// Status colors matching the grain batch pipeline
const STATUS_COLOR: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending_qc: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  qc_submitted: {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    icon: <Beaker className="h-3.5 w-3.5" />,
  },
  qc_failed: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  qc_passed: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending_qc: "Awaiting QC",
  qc_submitted: "Submitted",
  qc_failed: "Failed - Resubmit",
  qc_passed: "Passed",
};

type Batch = {
  id: string;
  batch_id: string;
  grain_type: string;
  variety?: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  farmer_name?: string;
  risk_score?: number;
  silos?: { id: string; name: string; silo_id: string }[];
};

function BatchCard({ batch }: { batch: Batch }) {
  const statusInfo = STATUS_COLOR[batch.status] || STATUS_COLOR.pending_qc;
  const statusLabel = STATUS_LABELS[batch.status] || batch.status;
  const isAwaitingSubmission = batch.status === "pending_qc" || batch.status === "qc_failed";

  return (
    <Link to="/technician/batches/$batchId" params={{ batchId: batch.id }}>
      <Card className="hover:shadow-md transition-all border hover:border-primary/30 cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{batch.batch_id}</h3>
                <p className="text-xs text-muted-foreground">{batch.grain_type} {batch.variety ? `- ${batch.variety}` : ""}</p>
              </div>
              <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0 shrink-0 flex items-center gap-1`}>
                {statusInfo.icon}
                {statusLabel}
              </Badge>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <p className="font-semibold">{Number(batch.quantity_kg).toLocaleString()} kg</p>
              </div>
              {batch.silos?.[0] && (
                <div>
                  <span className="text-muted-foreground">Silo:</span>
                  <p className="font-semibold">{batch.silos[0].name}</p>
                </div>
              )}
              {batch.farmer_name && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Farmer:</span>
                  <p className="font-semibold truncate">{batch.farmer_name}</p>
                </div>
              )}
            </div>

            {/* Risk score if present */}
            {batch.risk_score != null && (
              <div className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                <span className="text-muted-foreground">Risk Score:</span>
                <span className={batch.risk_score > 7 ? "text-red-600 font-semibold" : "font-semibold"}>
                  {batch.risk_score.toFixed(1)}
                </span>
              </div>
            )}

            {/* Footer with action hint */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-[10px] text-muted-foreground">
                {isAwaitingSubmission ? "QC submission required" : "View details"}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TechnicianBatchesPage() {
  const fetchFn = useServerFn(getMyAssignedBatches);
  const { data, isLoading } = useQuery({
    queryKey: ["technician.batches"],
    queryFn: () => fetchFn(),
  });

  const batches: Batch[] = data?.batches ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter batches
  const filtered = batches.filter((b) => {
    const matchesSearch = searchQuery
      ? b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.grain_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: batches.length,
    awaitingQc: batches.filter((b) => b.status === "pending_qc").length,
    submitted: batches.filter((b) => b.status === "qc_submitted").length,
    failed: batches.filter((b) => b.status === "qc_failed").length,
    passed: batches.filter((b) => b.status === "qc_passed").length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Beaker className="h-6 w-6 text-emerald-600" />
          My Batches
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assigned grain batches requiring QC submission
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Awaiting QC</div>
            <div className="text-2xl font-bold text-blue-600">{stats.awaitingQc}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Submitted</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Passed</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.passed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg">Batch list</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search batches…"
                  className="pl-8 w-full sm:w-48 h-9 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="pending_qc" className="text-xs">Awaiting QC</SelectItem>
                  <SelectItem value="qc_submitted" className="text-xs">Submitted</SelectItem>
                  <SelectItem value="qc_failed" className="text-xs">Failed</SelectItem>
                  <SelectItem value="qc_passed" className="text-xs">Passed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {batches.length === 0
                  ? "No batches assigned yet."
                  : "No batches match your filters."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
