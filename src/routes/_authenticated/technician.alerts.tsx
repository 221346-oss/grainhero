import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getTechnicianAlerts, acknowledgeAlert } from "@/lib/alerts.functions";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bell,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/technician/alerts")({
  head: () => ({
    meta: [
      { title: "Active Alerts — Technician" },
      { name: "description", content: "View and acknowledge active alerts for your assigned silos" },
    ],
  }),
  component: TechnicianAlertsPage,
});

type GrainAlert = {
  id: string;
  alert_id: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  source: string;
  alert_type: string;
  sensor_type?: string;
  silo_id: string | null;
  warehouse_id: string | null;
  batch_id: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  trigger_conditions?: Record<string, any>;
  silos?: Array<{ id: string; silo_id: string; name: string }>;
};

// Priority colors
const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// Status colors
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  acknowledged: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  escalated: "bg-red-100 text-red-800 border-red-200",
};

function AlertCard({
  alert,
  onAcknowledge,
  isAcknowledging,
}: {
  alert: GrainAlert;
  onAcknowledge: (alertId: string) => Promise<void>;
  isAcknowledging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const isAcknowledged = alert.status === "acknowledged";
  const siloName = alert.silos?.[0]?.name || alert.silos?.[0]?.silo_id || "Unknown Silo";
  const triggeredTime = new Date(alert.triggered_at);
  const timeSinceTriggered = Math.floor((Date.now() - triggeredTime.getTime()) / 60000); // minutes

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all ${
        alert.priority === "critical"
          ? "border-red-200/60 dark:border-red-800/40"
          : alert.priority === "high"
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
          <AlertCircle
            className={`h-4 w-4 shrink-0 ${
              alert.priority === "critical"
                ? "text-red-500"
                : alert.priority === "high"
                  ? "text-amber-500"
                  : "text-blue-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{alert.title}</span>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${PRIORITY_COLOR[
                  alert.priority
                ] || PRIORITY_COLOR.medium}`}
              >
                {alert.priority}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${STATUS_COLOR[alert.status] || STATUS_COLOR.pending}`}
              >
                {alert.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
              <span>{siloName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeSinceTriggered < 60
                  ? `${timeSinceTriggered} min ago`
                  : timeSinceTriggered < 1440
                    ? `${Math.floor(timeSinceTriggered / 60)} h ago`
                    : triggeredTime.toLocaleString()}
              </span>
              {isAcknowledged && (
                <span className="text-emerald-600">✓ Acknowledged</span>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {/* Message/Details */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
              Alert details
            </div>
            <p className="text-sm bg-muted/30 p-3 rounded">
              {alert.message}
            </p>
          </div>

          {/* Sensor/Trigger details if available */}
          {alert.trigger_conditions && Object.keys(alert.trigger_conditions).length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                Trigger conditions
              </div>
              <div className="text-xs bg-slate-50 dark:bg-slate-900/30 p-2 rounded font-mono grid grid-cols-2 gap-2">
                {Object.entries(alert.trigger_conditions).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="ml-1 font-semibold">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source/Type info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Source</div>
              <div className="font-semibold capitalize">{alert.source}</div>
            </div>
            {alert.sensor_type && (
              <div>
                <div className="text-muted-foreground">Sensor Type</div>
                <div className="font-semibold capitalize">{alert.sensor_type}</div>
              </div>
            )}
          </div>

          {/* Acknowledge button */}
          {!isAcknowledged && (
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={isAcknowledging}
              onClick={() => onAcknowledge(alert.id)}
            >
              {isAcknowledging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Acknowledge Alert
            </Button>
          )}

          {isAcknowledged && (
            <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 p-2 rounded">
              ✓ You acknowledged this alert at {new Date(alert.acknowledged_at || "").toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TechnicianAlertsPage() {
  const fn = useServerFn(getTechnicianAlerts);
  const ackFn = useServerFn(acknowledgeAlert);
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["technician-alerts", statusFilter, priorityFilter],
    queryFn: () =>
      fn({
        data: {
          status: statusFilter === "all" ? undefined : (statusFilter as "pending" | "acknowledged"),
          priority: priorityFilter === "all" ? undefined : (priorityFilter as any),
          limit: 100,
        },
      }).then((res) => res.alerts),
    refetchInterval: 30_000,
  });

  const ackMut = useMutation({
    mutationFn: async (alertId: string) => {
      await ackFn({
        data: { id: alertId },
      });
    },
    onSuccess: () => {
      toast.success("Alert acknowledged");
      qc.invalidateQueries({ queryKey: ["technician-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alertList = (alerts ?? []) as GrainAlert[];

  // Filter alerts
  const filteredAlerts = alertList.filter((alert) => {
    const matchesSearch = searchQuery
      ? alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: alertList.length,
    critical: alertList.filter((a) => a.priority === "critical").length,
    high: alertList.filter((a) => a.priority === "high").length,
    pending: alertList.filter((a) => a.status === "pending").length,
    acknowledged: alertList.filter((a) => a.status === "acknowledged").length,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-600" />
          Active Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alerts for silos with your assigned batches. Acknowledge to confirm you are aware.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Critical</div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">High</div>
            <div className="text-2xl font-bold text-amber-600">{stats.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Pending</div>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Acknowledged</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.acknowledged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Alert list</CardTitle>
              <CardDescription>
                {filteredAlerts.length} of {alertList.length} alerts
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alerts…"
                  className="pl-8 w-full sm:w-48 h-9 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    Pending
                  </SelectItem>
                  <SelectItem value="acknowledged" className="text-xs">
                    Acknowledged
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Priority
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs">
                    Critical
                  </SelectItem>
                  <SelectItem value="high" className="text-xs">
                    High
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    Medium
                  </SelectItem>
                  <SelectItem value="low" className="text-xs">
                    Low
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {alertList.length === 0
                  ? "No active alerts. Everything is running smoothly. 🎉"
                  : "No alerts match your filters."}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={(id) => ackMut.mutateAsync(id)}
                isAcknowledging={ackMut.isPending}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
