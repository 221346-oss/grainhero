"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getIncidents,
  assignIncident,
  escalateIncident,
  updateIncidentStatus,
} from "@/lib/monitoring.functions";
import { closeFieldIncident } from "@/lib/field-incidents.functions";
import { listTeamMembers } from "@/lib/team-settings-insurance.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertOctagon,
  Plus,
  X,
  CheckCircle2,
  MessageSquare,
  SlidersHorizontal,
  Search,
  ArrowUpCircle,
  Clock,
  Ban,
  Layers,
  Users,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import {
  MonitoringDiscussionDialog,
  type MonitoringIncidentItem,
} from "@/components/app/MonitoringDiscussionDialog";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "@tanstack/react-router";

type TabKey = "all" | "active" | "resolved" | "dismissed" | "incoming" | "escalated";

type IncidentRow = {
  id: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  isFieldIncident: boolean;
  reportedByName: string | null;
  recipientName: string | null;
  assignedToName: string | null;
  triggered_at: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  source?: string | null;
  recipient_id?: string | null;
  isMine?: boolean;
  isForMe?: boolean;
  custom_fields?: {
    reporter_role?: string;
    target_role?: string;
    [key: string]: any;
  };
};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Layers },
  { key: "active", label: "Active", icon: Clock },
  { key: "escalated", label: "Escalated", icon: ArrowUpCircle },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
  { key: "dismissed", label: "Dismissed", icon: Ban },
  { key: "incoming", label: "Incoming", icon: Users },
];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  investigating: "bg-indigo-100 text-indigo-800 border-indigo-200",
  acknowledged: "bg-purple-100 text-purple-800 border-purple-200",
  escalated: "bg-purple-100 text-purple-800 border-purple-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  dismissed: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  open: <Clock className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  investigating: <Clock className="h-3 w-3 text-indigo-600" />,
  acknowledged: <CheckCircle2 className="h-3 w-3" />,
  escalated: <ArrowUpCircle className="h-3 w-3" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
  closed: <CheckCircle2 className="h-3 w-3" />,
  dismissed: <Ban className="h-3 w-3" />,
};

function IncidentCard({
  row,
  isSelected,
  onClick,
}: {
  row: IncidentRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Determine severity for display
  const displaySeverity = row.isFieldIncident ? "medium" : row.priority;

  return (
    <Card
      className={`cursor-pointer transition-all border ${
        isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm hover:border-primary/30"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground">{row.title}</h4>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`${SEVERITY_COLOR[displaySeverity] || SEVERITY_COLOR.medium} border text-[10px] px-1.5 py-0.5`}
            >
              {displaySeverity}
            </Badge>
            <Badge
              className={`${STATUS_COLOR[row.status] || STATUS_COLOR.open} border text-[10px] px-1.5 py-0.5 gap-1`}
            >
              {STATUS_ICON[row.status]}
              {row.status}
            </Badge>
          </div>

          {/* Message preview */}
          {row.message && (
            <p className="text-xs text-muted-foreground line-clamp-2">{row.message}</p>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {row.reportedByName && `From ${row.reportedByName}`}
              {row.isFieldIncident && row.recipientName && ` → ${row.recipientName}`}
              {!row.isFieldIncident && row.assignedToName && ` → ${row.assignedToName}`}
            </span>
            {row.triggered_at && <span>{new Date(row.triggered_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailPanel({
  row,
  onClose,
  children,
}: {
  row: IncidentRow;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const displaySeverity = row.isFieldIncident ? "medium" : row.priority;

  return (
    <div className="lg:sticky lg:top-4">
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* Header with title and close button */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-foreground">{row.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={`${SEVERITY_COLOR[displaySeverity] || SEVERITY_COLOR.medium} border text-[10px] px-2 py-0.5`}
                >
                  {displaySeverity.toUpperCase()}
                </Badge>
                <Badge
                  className={`${STATUS_COLOR[row.status] || STATUS_COLOR.open} border text-[10px] px-2 py-0.5 gap-1`}
                >
                  {STATUS_ICON[row.status]}
                  {row.status}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </p>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {(() => {
                // Remove the "Reported by:" header line if it exists
                const desc = row.message || "No description provided.";
                const lines = desc.split("\n");
                const filteredLines = lines.filter(
                  (line) => !line.startsWith("Reported by:") && !line.includes("Target Role:"),
                );
                return filteredLines.join("\n").trim() || "No description provided.";
              })()}
            </p>
          </div>

          {/* Date and Time */}
          {row.triggered_at && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reported Date & Time
              </p>
              <p className="text-xs">
                {new Date(row.triggered_at).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          )}

          {/* Sent By (for incoming incidents) */}
          {row.reportedByName && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {row.isForMe ? "Sent By" : "Reported By"}
              </p>
              <p className="text-xs">
                <span className="font-medium">{row.reportedByName}</span>
                {row.source === "field_incident" && (
                  <span className="text-muted-foreground ml-1">
                    ({row.custom_fields?.reporter_role || "User"})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Sent To (for outgoing incidents) */}
          {row.isMine && (row.recipientName || row.assignedToName) && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sent To
              </p>
              <p className="text-xs">
                <span className="font-medium">{row.recipientName || row.assignedToName}</span>
                {row.isFieldIncident && row.custom_fields?.target_role && (
                  <span className="text-muted-foreground ml-1">
                    ({row.custom_fields.target_role})
                  </span>
                )}
              </p>
            </div>
          )}

          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export function IncidentsSection() {
  const getFn = useServerFn(getIncidents);
  const fetchRole = useServerFn(getMyRole);
  const listTeamFn = useServerFn(listTeamMembers);
  const assignFn = useServerFn(assignIncident);
  const escalateFn = useServerFn(escalateIncident);
  const updateStatusFn = useServerFn(updateIncidentStatus);
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [active, setActive] = useState<IncidentRow | null>(null);
  const [ticketDlgOpen, setTicketDlgOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<MonitoringIncidentItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: () => getFn() });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canManage = me?.role === "manager" || me?.role === "admin";
  const canReportAsAdmin = me?.role === "admin" || me?.role === "manager";

  const teamQ = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listTeamFn(),
    enabled: canManage,
  });
  const technicians = (
    (teamQ.data ?? []) as Array<{ id: string; name: string | null; email: string; role: string }>
  ).filter((m) => m.role === "technician");

  const assignMut = useMutation({
    mutationFn: (v: { id: string; technicianId: string | null }) => assignFn({ data: v }),
    onSuccess: () => {
      toast.success("Assigned");
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not assign"),
  });

  const escalateMut = useMutation({
    mutationFn: (id: string) => escalateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Escalated to Admin");
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not escalate"),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => updateStatusFn({ data: { id, status: "resolved" } }),
    onSuccess: () => {
      toast.success("Incident marked as resolved");
      setActive(null);
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not resolve"),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => updateStatusFn({ data: { id, status: "dismissed" } }),
    onSuccess: () => {
      toast.success("Incident marked as dismissed");
      setActive(null);
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not dismiss"),
  });

  const allIncidents = (data?.incidents ?? []) as IncidentRow[];

  // Filter by tab
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "all":
        return allIncidents;
      case "active":
        return allIncidents.filter(
          (i) =>
            i.status === "open" ||
            i.status === "pending" ||
            i.status === "investigating" ||
            i.status === "acknowledged",
        );
      case "escalated":
        return allIncidents.filter((i) => i.status === "escalated");
      case "resolved":
        return allIncidents.filter((i) => i.status === "resolved" || i.status === "closed");
      case "dismissed":
        return allIncidents.filter((i) => i.status === "dismissed");
      case "incoming":
        // Incoming = incidents created by admin/technician sent to manager
        return allIncidents.filter((i) => i.isForMe && !i.isMine);
      default:
        return allIncidents;
    }
  }, [allIncidents, activeTab]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    return {
      all: allIncidents.length,
      active: allIncidents.filter(
        (i) =>
          i.status === "open" ||
          i.status === "pending" ||
          i.status === "investigating" ||
          i.status === "acknowledged",
      ).length,
      escalated: allIncidents.filter((i) => i.status === "escalated").length,
      resolved: allIncidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
      dismissed: allIncidents.filter((i) => i.status === "dismissed").length,
      incoming: allIncidents.filter((i) => i.isForMe && !i.isMine).length,
    };
  }, [allIncidents]);

  // Apply additional filters
  const filtered = useMemo(() => {
    return tabFiltered.filter((i) => {
      // Severity filter
      if (severityFilter !== "all") {
        const sev = i.isFieldIncident ? "medium" : i.priority;
        if (sev !== severityFilter) return false;
      }

      // Status filter for dropdown
      if (statusFilter !== "all") {
        if (statusFilter === "active") {
          if (
            i.status !== "open" &&
            i.status !== "pending" &&
            i.status !== "investigating" &&
            i.status !== "acknowledged"
          ) {
            return false;
          }
        } else if (statusFilter === "resolved") {
          if (i.status !== "resolved" && i.status !== "closed") return false;
        } else if (statusFilter === "dismissed") {
          if (i.status !== "dismissed") return false;
        } else if (statusFilter === "escalated") {
          if (i.status !== "escalated") return false;
        } else if (statusFilter === "incoming") {
          if (!i.isForMe || i.isMine) return false;
        }
      }

      // Role filter - show incidents sent to/received by admin or technician
      if (roleFilter !== "all") {
        const targetRole = i.custom_fields?.target_role;
        const reporterRole = i.custom_fields?.reporter_role;

        if (roleFilter === "admin") {
          // Show incidents where target_role is admin OR reporter_role is admin
          if (targetRole !== "admin" && reporterRole !== "admin") return false;
        } else if (roleFilter === "technician") {
          // Show incidents where target_role is technician OR reporter_role is technician
          if (targetRole !== "technician" && reporterRole !== "technician") return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const t = search.trim().toLowerCase();
        if (!i.title?.toLowerCase().includes(t) && !i.message?.toLowerCase().includes(t))
          return false;
      }

      return true;
    });
  }, [tabFiltered, severityFilter, statusFilter, roleFilter, search]);

  const splitView = !!active;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setActive(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/60"
                  }`}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All severities
            </SelectItem>
            <SelectItem value="critical" className="text-xs">
              Critical
            </SelectItem>
            <SelectItem value="medium" className="text-xs">
              Medium
            </SelectItem>
            <SelectItem value="low" className="text-xs">
              Low
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All statuses
            </SelectItem>
            <SelectItem value="active" className="text-xs">
              Active
            </SelectItem>
            <SelectItem value="escalated" className="text-xs">
              Escalated
            </SelectItem>
            <SelectItem value="resolved" className="text-xs">
              Resolved
            </SelectItem>
            <SelectItem value="dismissed" className="text-xs">
              Dismissed
            </SelectItem>
            <SelectItem value="incoming" className="text-xs">
              Incoming
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All roles
            </SelectItem>
            <SelectItem value="admin" className="text-xs">
              Admin
            </SelectItem>
            <SelectItem value="technician" className="text-xs">
              Technician
            </SelectItem>
          </SelectContent>
        </Select>

        {canReportAsAdmin && (
          <div className="ml-auto">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setTicketDlgOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New ticket
            </Button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      {(search || severityFilter !== "all" || statusFilter !== "all" || roleFilter !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          {search && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              Search: {search}
              <button onClick={() => setSearch("")} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {severityFilter !== "all" && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              Severity: {severityFilter}
              <button onClick={() => setSeverityFilter("all")} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("all")} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {roleFilter !== "all" && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              Role: {roleFilter}
              <button onClick={() => setRoleFilter("all")} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              setSearch("");
              setSeverityFilter("all");
              setStatusFilter("all");
              setRoleFilter("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertOctagon className="h-8 w-8 mx-auto opacity-20 mb-2" />
            <p className="text-sm text-muted-foreground">
              {tabFiltered.length === 0
                ? `No ${activeTab} incidents.`
                : "No incidents match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={splitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "space-y-2"}
        >
          {/* Fixed height container for 4 entries with vertical scroll */}
          <div className={splitView ? "space-y-2" : "space-y-2 h-[320px] overflow-y-auto"}>
            {filtered.map((i) => (
              <IncidentCard
                key={i.id}
                row={i}
                isSelected={active?.id === i.id}
                onClick={() => (active?.id === i.id ? setActive(null) : setActive(i))}
              />
            ))}
          </div>

          {splitView && active && (
            <DetailPanel row={active} onClose={() => setActive(null)}>
              {/* Actions for system incidents */}
              {!active.isFieldIncident && canManage && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Assign Technician
                    </p>
                    <Select
                      value={active.assigned_to ?? "unassigned"}
                      onValueChange={(v) =>
                        assignMut.mutate({
                          id: active.id,
                          technicianId: v === "unassigned" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign technician" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">
                          Unassigned
                        </SelectItem>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.name ?? t.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {active.status !== "escalated" && active.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => escalateMut.mutate(active.id)}
                        disabled={escalateMut.isPending}
                        className="gap-1.5"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Escalate
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Actions for field incidents - show escalate option only if not resolved/dismissed */}
              {active.isFieldIncident &&
                canManage &&
                active.status !== "escalated" &&
                active.status !== "resolved" &&
                active.status !== "dismissed" && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => escalateMut.mutate(active.id)}
                      disabled={escalateMut.isPending}
                      className="gap-1.5 w-full"
                    >
                      {escalateMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                      )}
                      Escalate to Admin
                    </Button>
                  </div>
                )}

              {/* Resolve and Dismiss actions for all incidents (when manager and not already resolved/dismissed) */}
              {canManage && active.status !== "resolved" && active.status !== "dismissed" && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => resolveMut.mutate(active.id)}
                      disabled={resolveMut.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
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
                      onClick={() => dismissMut.mutate(active.id)}
                      disabled={dismissMut.isPending}
                      className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      {dismissMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Ban className="h-3.5 w-3.5" />
                      )}
                      Mark Dismissed
                    </Button>
                  </div>
                </div>
              )}

              {/* Discussion button for all incidents - only if not resolved/dismissed */}
              {active.status !== "resolved" && active.status !== "dismissed" && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-100 w-full"
                    onClick={() => {
                      setActiveDiscussion({
                        id: active.id,
                        title: active.title,
                        priority: active.isFieldIncident ? "field" : active.priority,
                        status: active.status,
                        message: active.message,
                        triggered_at: active.triggered_at ?? undefined,
                        created_by: active.created_by,
                        assigned_to: active.assigned_to,
                        source: active.source,
                        recipient_id: active.recipient_id,
                      });
                      setDiscussionOpen(true);
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Discussion
                  </Button>
                </div>
              )}
            </DetailPanel>
          )}
        </div>
      )}

      <ReportTicketDialog
        open={ticketDlgOpen}
        onOpenChange={setTicketDlgOpen}
        extraInvalidate={[["incidents"]]}
      />
      <MonitoringDiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        incident={activeDiscussion}
        currentUserId={currentUserId}
      />
    </div>
  );
}
