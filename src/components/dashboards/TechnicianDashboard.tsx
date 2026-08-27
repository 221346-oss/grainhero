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
  listOpenFieldIncidents,
} from "@/lib/field-settings.functions";
import {
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Ticket,
  MessageSquare,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import { TicketDiscussionDialog, type TicketItem } from "@/components/app/TicketDiscussionDialog";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

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
  const { locale } = useI18n();
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
      toast.success(translateText("Incident resolved — great work!", locale));
      setExpanded(false);
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-assigned-incidents"] });
    },
    onError: (e: Error) => toast.error(translateText(e.message, locale)),
  });

  return (
    <LocalizedContent>
      <div
        className={`rounded-xl border bg-card/70 overflow-hidden transition-all ${
          incident.severity === "critical"
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
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SevColor(
                incident.severity,
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
    </LocalizedContent>
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
    <LocalizedContent>
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
    </LocalizedContent>
  );
}

// ─── All Open Tickets Section (technician-facing) ─────────────────────────────
type OpenTicket = {
  id: string;
  category: string;
  severity: string;
  status: string;
  notes: string | null;
  silo_id: string | null;
  created_at: string;
  assigned_to: string | null;
  reporter_user_id: string;
};

function SevPill({ severity }: { severity: string }) {
  const { locale } = useI18n();
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600 border-red-200/60",
    high: "bg-orange-500/10 text-orange-600 border-orange-200/60",
    medium: "bg-amber-500/10 text-amber-600 border-amber-200/60",
    low: "bg-sky-500/10 text-sky-600 border-sky-200/60",
  };
  return (
    <span
      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${map[severity] ?? map.medium}`}
    >
      {translateText(severity, locale)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const { locale } = useI18n();
  const map: Record<string, string> = {
    open: "bg-rose-500/10 text-rose-600 border-rose-200/60",
    investigating: "bg-blue-500/10 text-blue-600 border-blue-200/60",
  };
  return (
    <span
      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${map[status] ?? "bg-slate-500/10 text-slate-600 border-slate-200/60"}`}
    >
      {translateText(status, locale)}
    </span>
  );
}

function AllOpenTicketsSection() {
  const fn = useServerFn(listOpenFieldIncidents);
  const [reportOpen, setReportOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussionTicket, setActiveDiscussionTicket] = useState<TicketItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["open-field-tickets"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const tickets = (data ?? []) as OpenTicket[];

  return (
    <LocalizedContent>
      <div className="rounded-xl border bg-card/60">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold">Mobile Field Reports</h2>
          {tickets.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              {tickets.length}
            </span>
          )}
        </div>
        <button
          id="tech-report-ticket-btn"
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-3 w-3" /> Report Ticket
        </button>
      </header>

      <div className="p-3 space-y-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">
              No open mobile field reports right now. 🎉
            </p>
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 text-[11px] font-semibold text-amber-600 hover:underline"
            >
              + Report a new incident
            </button>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 px-3 py-2 rounded-lg border bg-card/40 hover:bg-muted/30 transition-colors"
            >
              <AlertTriangle
                className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                  t.severity === "critical"
                    ? "text-red-500"
                    : t.severity === "high"
                      ? "text-orange-500"
                      : t.severity === "medium"
                        ? "text-amber-500"
                        : "text-sky-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold capitalize">
                    {t.category.replace(/_/g, " ")}
                  </span>
                  <SevPill severity={t.severity} />
                  <StatusPill status={t.status} />
                  {t.assigned_to && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 font-semibold">
                      Assigned
                    </span>
                  )}
                </div>
                {t.notes && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.notes}</p>
                )}
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveDiscussionTicket({
                    id: t.id,
                    category: t.category,
                    severity: t.severity,
                    status: t.status,
                    notes: t.notes,
                    created_at: t.created_at,
                  });
                  setDiscussionOpen(true);
                }}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0 mt-0.5"
                title="Open discussion thread"
              >
                <MessageSquare className="h-3 w-3" /> Discuss
              </button>
            </div>
          ))
        )}
      </div>

      <ReportTicketDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        extraInvalidate={[["open-field-tickets"], ["my-assigned-incidents"]]}
      />
      <TicketDiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        incident={activeDiscussionTicket}
      />
      </div>
    </LocalizedContent>
  );
}

export function TechnicianDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <AdminPageShell
      title={`Technician${name ? ` — ${name}` : ""}`}
      subtitle="Sensor health, actuator status and open maintenance work"
      actions={
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
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

      {/* Mobile Field Reports — visible to every technician. Older mobile-sync
          field_incidents system (field-settings.functions.ts) — not the newer
          auto-routing Field Incidents feature under Administration. */}
      <AllOpenTicketsSection />

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
