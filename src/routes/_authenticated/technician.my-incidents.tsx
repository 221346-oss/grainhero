import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyAssignedIncidents,
  resolveFieldIncident,
  listOpenFieldIncidents,
} from "@/lib/field-settings.functions";
import {
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketDiscussionDialog, type TicketItem } from "@/components/app/TicketDiscussionDialog";
import { DashboardSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/technician/my-incidents")({
  head: () => ({
    meta: [
      { title: "My Incidents — Technician" },
      { name: "description", content: "View and manage your assigned field incidents" },
    ],
  }),
  component: MyIncidentsPage,
});

type AssignedIncident = {
  id: string;
  category: string;
  severity: string;
  status: string;
  notes: string | null;
  silo_id: string | null;
  created_at: string;
  assigned_at: string | null;
  reporter_user_id: string;
  resolution_notes: string | null;
};

// ── Status colors (synced with manager monitoring page) ────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  medium:   "bg-amber-100 text-amber-800 border-amber-200",
  low:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  high:     "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_COLOR: Record<string, string> = {
  open:          "bg-blue-100 text-blue-800 border-blue-200",
  pending:       "bg-blue-100 text-blue-800 border-blue-200",
  investigating: "bg-indigo-100 text-indigo-800 border-indigo-200",
  acknowledged:  "bg-purple-100 text-purple-800 border-purple-200",
  escalated:     "bg-purple-100 text-purple-800 border-purple-200",
  resolved:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed:        "bg-emerald-100 text-emerald-800 border-emerald-200",
  dismissed:     "bg-slate-100 text-slate-600 border-slate-200",
};

// Legacy function for backward compatibility
function SevColor(s: string) {
  const colorMap: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600 border-red-200/50",
    high: "bg-amber-500/10 text-amber-600 border-amber-200/50",
    medium: "bg-amber-500/10 text-amber-600 border-amber-200/50",
    low: "bg-sky-500/10 text-sky-600 border-sky-200/50",
  };
  return colorMap[s] || "bg-sky-500/10 text-sky-600 border-sky-200/50";
}

// Legacy function for backward compatibility
function StatusColor(s: string) {
  const colorMap: Record<string, string> = {
    resolved:      "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
    closed:        "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
    investigating: "bg-blue-500/10 text-blue-600 border-blue-200/50",
    acknowledged:  "bg-purple-500/10 text-purple-600 border-purple-200/50",
    pending:       "bg-blue-500/10 text-blue-600 border-blue-200/50",
    open:          "bg-blue-500/10 text-blue-600 border-blue-200/50",
    escalated:     "bg-purple-500/10 text-purple-600 border-purple-200/50",
    dismissed:     "bg-slate-500/10 text-slate-600 border-slate-200/50",
  };
  return colorMap[s] || "bg-rose-500/10 text-rose-600 border-rose-200/50";
}

function IncidentCard({
  incident,
  onDiscuss,
}: {
  incident: AssignedIncident;
  onDiscuss?: (incident: TicketItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveFieldIncident);

  const updateStatusMut = useMutation({
    mutationFn: (newStatus: string) =>
      resolveFn({
        data: {
          id: incident.id,
          status: newStatus as "open" | "investigating" | "resolved" | "dismissed",
          resolution_notes: (["resolved", "dismissed"].includes(newStatus) ? note : undefined) || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Status updated");
      setNote("");
      setStatusMenuOpen(false);
      qc.invalidateQueries({ queryKey: ["my-assigned-incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveMut = useMutation({
    mutationFn: () =>
      resolveFn({
        data: {
          id: incident.id,
          status: "resolved",
          resolution_notes: note || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Incident resolved — great work!");
      setExpanded(false);
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-assigned-incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isResolved = incident.status === "resolved" || incident.status === "closed" || incident.status === "dismissed";
  
  // Status options available for update
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "investigating", label: "Investigating" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "escalated", label: "Escalated" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
  ];

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all ${
        incident.severity === "critical"
          ? "border-red-200/60 dark:border-red-800/40"
          : incident.severity === "high"
            ? "border-amber-200/60 dark:border-amber-800/40"
            : "border-border"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <button
          className="flex-1 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left rounded-lg -ml-2 -my-2 p-2"
          onClick={() => setExpanded((v) => !v)}
        >
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${
              incident.severity === "critical"
                ? "text-red-500"
                : incident.severity === "high"
                  ? "text-amber-500"
                  : "text-sky-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold capitalize">
                {incident.category.replace(/_/g, " ")}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${SevColor(
                  incident.severity
                )}`}
              >
                {incident.severity}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${StatusColor(
                  incident.status
                )}`}
              >
                {incident.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Reported {new Date(incident.created_at).toLocaleString()}
              {incident.assigned_at && (
                <span className="ml-2">
                  • Assigned {new Date(incident.assigned_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        {onDiscuss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDiscuss({
                id: incident.id,
                category: incident.category,
                severity: incident.severity,
                status: incident.status,
                notes: incident.notes,
                created_at: incident.created_at,
              });
            }}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 transition-colors shrink-0"
            title="Open discussion thread"
          >
            <MessageSquare className="h-3 w-3" /> Discuss
          </button>
        )}
      </div>

      {/* Expanded details + actions */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {incident.notes && (
            <div className="pt-3">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                Incident notes
              </div>
              <p className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded">
                {incident.notes}
              </p>
            </div>
          )}

          {incident.resolution_notes && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                Resolution notes
              </div>
              <p className="text-xs whitespace-pre-wrap bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-200/50">
                {incident.resolution_notes}
              </p>
            </div>
          )}

          {/* Status update section */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
              Update Status
            </div>
            <Select value={incident.status} onValueChange={(v) => {
              if (["resolved", "dismissed"].includes(v)) {
                // For resolve/dismiss, show note input
                setStatusMenuOpen(true);
              } else {
                // For other statuses, update immediately
                updateStatusMut.mutate(v);
              }
            }}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isResolved && (
            <>
              {statusMenuOpen && (
                <div className="space-y-2 p-2 bg-muted/30 rounded">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Notes (optional)
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Describe what was done…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
                      disabled={updateStatusMut.isPending}
                      onClick={() => updateStatusMut.mutate("resolved")}
                    >
                      {updateStatusMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Confirm Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatusMenuOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!statusMenuOpen && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
                    disabled={resolveMut.isPending}
                    onClick={() => resolveMut.mutate()}
                  >
                    {resolveMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    disabled={updateStatusMut.isPending}
                    onClick={() => {
                      updateStatusMut.mutate("dismissed");
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MyIncidentsPage() {
  const fn = useServerFn(getMyAssignedIncidents);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussionTicket, setActiveDiscussionTicket] = useState<TicketItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-assigned-incidents"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const incidents = (data ?? []) as AssignedIncident[];

  // Filter logic
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = searchQuery
      ? incident.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  function handleDiscuss(ticket: TicketItem) {
    setActiveDiscussionTicket(ticket);
    setDiscussionOpen(true);
  }

  // Calculate stats
  const stats = {
    total: incidents.length,
    open: incidents.filter((i) => i.status === "open").length,
    pending: incidents.filter((i) => i.status === "pending").length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    acknowledged: incidents.filter((i) => i.status === "acknowledged").length,
    escalated: incidents.filter((i) => i.status === "escalated").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    dismissed: incidents.filter((i) => i.status === "dismissed").length,
    critical: incidents.filter((i) => i.severity === "critical").length,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-emerald-600" />
          My Incidents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all field incidents assigned to you
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Open</div>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Investigating</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.investigating}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Acknowledged</div>
            <div className="text-2xl font-bold text-purple-600">{stats.acknowledged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Resolved</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Critical</div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Incident list</CardTitle>
              <CardDescription>
                {filteredIncidents.length} of {incidents.length} incidents
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incidents…"
                  className="pl-8 w-full sm:w-48 h-9 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="open" className="text-xs">Open</SelectItem>
                  <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                  <SelectItem value="investigating" className="text-xs">Investigating</SelectItem>
                  <SelectItem value="acknowledged" className="text-xs">Acknowledged</SelectItem>
                  <SelectItem value="escalated" className="text-xs">Escalated</SelectItem>
                  <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                  <SelectItem value="dismissed" className="text-xs">Dismissed</SelectItem>
                  <SelectItem value="closed" className="text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Severity</SelectItem>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredIncidents.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {incidents.length === 0
                  ? "No incidents assigned to you. 🎉"
                  : "No incidents match your filters."}
              </p>
            </div>
          ) : (
            filteredIncidents.map((i) => (
              <IncidentCard key={i.id} incident={i} onDiscuss={handleDiscuss} />
            ))
          )}
        </CardContent>
      </Card>

      <TicketDiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        incident={activeDiscussionTicket}
      />
    </div>
  );
}
