import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCriticalAlertsForSuperAdmin } from "@/lib/platform-no-admin.functions";
import { acknowledgeAlert } from "@/lib/alerts.functions";
import { updateIncidentStatus } from "@/lib/monitoring.functions";
import { AlertTriangle, Clock, Building2, Warehouse, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-severity-critical/10 text-severity-critical" },
  acknowledged: { label: "Acknowledged", cls: "bg-warning/10 text-warning" },
  escalated: { label: "Escalated", cls: "bg-severity-critical/10 text-severity-critical" },
  resolved: { label: "Resolved", cls: "bg-success/10 text-success" },
};

export function CriticalAlertDetailSheet({ open, onOpenChange }: Props) {
  const fetchAlerts = useServerFn(getCriticalAlertsForSuperAdmin);
  const ackFn = useServerFn(acknowledgeAlert);
  const resolveFn = useServerFn(updateIncidentStatus);
  const qc = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["critical-alerts-detail"],
    queryFn: () => fetchAlerts(),
    enabled: open,
    staleTime: 10_000,
  });

  const alerts = q.data?.alerts ?? [];

  const handleAcknowledge = async (id: string) => {
    setActionId(id);
    try {
      await ackFn({ data: { id } });
      toast.success("Alert acknowledged");
      await qc.invalidateQueries({ queryKey: ["critical-alerts-detail"] });
      await qc.invalidateQueries({ queryKey: ["platform-metrics"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to acknowledge");
    } finally {
      setActionId(null);
    }
  };

  const handleResolve = async (id: string) => {
    setActionId(id);
    try {
      await resolveFn({ data: { id, status: "resolved" } });
      toast.success("Alert resolved");
      await qc.invalidateQueries({ queryKey: ["critical-alerts-detail"] });
      await qc.invalidateQueries({ queryKey: ["platform-metrics"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resolve");
    } finally {
      setActionId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionId(id);
    try {
      await resolveFn({ data: { id, status: "dismissed" } });
      toast.success("Alert dismissed");
      await qc.invalidateQueries({ queryKey: ["critical-alerts-detail"] });
      await qc.invalidateQueries({ queryKey: ["platform-metrics"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to dismiss");
    } finally {
      setActionId(null);
    }
  };

  const isActive = (s: string) => s === "pending" || s === "acknowledged" || s === "escalated";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-severity-critical" />
            Critical Alerts
          </SheetTitle>
        </SheetHeader>

        {q.isLoading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border border-border p-4 space-y-2">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
                <div className="h-2 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="mt-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No critical alerts</p>
            <p className="text-xs text-muted-foreground/60 mt-1">All systems are healthy</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {alerts.filter((a) => isActive(a.status)).length} active ·{" "}
              {alerts.filter((a) => !isActive(a.status)).length} closed
            </p>
            {alerts.map((a) => {
              const st = statusConfig[a.status] ?? statusConfig.pending;
              const active = isActive(a.status);
              return (
                <div
                  key={a.id}
                  className={`rounded-lg border p-4 space-y-2 ${
                    active
                      ? "border-severity-critical/20 bg-severity-critical/5"
                      : "border-border bg-card opacity-75"
                  }`}
                >
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                      {a.title}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${st.cls}`}>
                      {st.label}
                    </Badge>
                  </div>

                  {/* Message */}
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    {/* Tenant */}
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {a.tenant_name}
                    </span>
                    {/* Silo */}
                    {a.silo_name && (
                      <span className="flex items-center gap-1">
                        <Warehouse className="h-3 w-3" />
                        {a.silo_name}
                      </span>
                    )}
                    {/* Source */}
                    {a.source && (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                        {a.source}
                      </span>
                    )}
                    {/* When */}
                    {a.triggered_at && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {new Date(a.triggered_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Action buttons for active alerts */}
                  {active && (
                    <div className="flex gap-2 pt-1">
                      {a.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          disabled={actionId === a.id}
                          onClick={() => handleAcknowledge(a.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {actionId === a.id ? "Working…" : "Acknowledge"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1 border-success/40 text-success hover:bg-success/10"
                        disabled={actionId === a.id}
                        onClick={() => handleResolve(a.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {actionId === a.id ? "Working…" : "Resolve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1 border-muted-foreground/30"
                        disabled={actionId === a.id}
                        onClick={() => handleDismiss(a.id)}
                      >
                        <XCircle className="h-3 w-3" />
                        {actionId === a.id ? "Working…" : "Dismiss"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
