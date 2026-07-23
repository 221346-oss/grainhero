import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { useDashboardStats } from "./useDashboardStats";
import { ActuatorsCard, RecentAlertsCard, SilosOccupancyCard } from "./DashboardBlocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomWidgetsBand } from "@/components/app/analytics/CustomWidgetsBand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getMyAssignedIncidents,
  resolveFieldIncident,
} from "@/lib/field-settings.functions";
import {
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
};

function SevColor(s: string) {
  if (s === "critical") return "bg-red-500/10 text-red-600 border-red-200/50";
  if (s === "high") return "bg-amber-500/10 text-amber-600 border-amber-200/50";
  return "bg-sky-500/10 text-sky-600 border-sky-200/50";
}

function IncidentCard({ incident }: { incident: AssignedIncident }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveFieldIncident);

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

  return (
    <div
      className={`rounded-xl border bg-card/70 overflow-hidden transition-all ${incident.severity === "critical"
          ? "border-red-200/60 dark:border-red-800/40"
          : incident.severity === "high"
            ? "border-amber-200/60 dark:border-amber-800/40"
            : "border-border"
        }`}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <AlertTriangle
          className={`h-4 w-4 shrink-0 ${incident.severity === "critical"
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
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SevColor(
                incident.severity
              )}`}
            >
              {incident.severity}
            </span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-200/50">
              {incident.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Reported {new Date(incident.created_at).toLocaleString()}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded details + resolve */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
          {incident.notes && (
            <div className="pt-3">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                Incident notes
              </div>
              <p className="text-xs whitespace-pre-wrap">{incident.notes}</p>
            </div>
          )}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
              Resolution notes (optional)
            </div>
            <Textarea
              rows={2}
              placeholder="Describe what was done to resolve this incident…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
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
        </div>
      )}
    </div>
  );
}

function AssignedIncidentsSection() {
  const fn = useServerFn(getMyAssignedIncidents);
  const { data, isLoading } = useQuery({
    queryKey: ["my-assigned-incidents"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const incidents = (data ?? []) as AssignedIncident[];

  return (
    <div className="rounded-xl border bg-card/60">
      <header className="flex items-center gap-2 px-4 py-3 border-b">
        <ShieldAlert className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold">My assigned incidents</h2>
        {incidents.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
            {incidents.length}
          </span>
        )}
      </header>
      <div className="p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-4 text-center">
            No incidents assigned to you. 🎉
          </p>
        ) : (
          incidents.map((i) => <IncidentCard key={i.id} incident={i} />)
        )}
      </div>
    </div>
  );
}

export function TechnicianDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <AdminPageShell
      title={`Technician${name ? ` — ${name}` : ""}`}
      subtitle="Sensor health, actuator status and open maintenance work"
      actions={
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          Technician
        </Badge>
      }
    >
      <AdminSummaryTiles
        columns={4}
        tiles={[
          {
            key: "so",
            label: "Sensors online",
            value: `${s?.sensors.online ?? 0}/${s?.sensors.total ?? 0}`,
          },
          {
            key: "aa",
            label: "Actuators active",
            value: `${s?.actuators.active ?? 0}/${s?.actuators.total ?? 0}`,
          },
          { key: "oa", label: "Open alerts", value: s?.alerts.open ?? "—" },
          { key: "ca", label: "Critical", value: s?.alerts.critical ?? "—" },
        ]}
      />
      <CustomWidgetsBand />

      {/* Assigned field incidents — action items for this technician */}
      <AssignedIncidentsSection />

      <div className="grid gap-4 md:grid-cols-2">
        <ActuatorsCard />
        <RecentAlertsCard />
        <SilosOccupancyCard />
      </div>
    </AdminPageShell>
  );
}