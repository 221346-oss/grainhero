import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { Loader2, Plus, MessageSquare, AlertTriangle } from "lucide-react";
import { type ReactNode, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOpenFieldIncidents } from "@/lib/field-settings.functions";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import { MonitoringDiscussionDialog, type MonitoringIncidentItem } from "@/components/app/MonitoringDiscussionDialog";
import { supabase } from "@/integrations/supabase/client";
import { attachTicketForUser } from "@/lib/ticketMessages";
import { useTicketUnread } from "@/hooks/useTicketUnread";
import { ManagerTeamStrip } from "./ManagerTeamStrip";

function formatRelativeTime(iso: string) {
  const now = new Date();
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Row = {
  id: string;
  primary: ReactNode;
  secondary?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  to?: string;
  search?: { tab: string };
};

function BentoCard({
  title,
  count,
  to,
  search,
  tooltip,
  rows,
  empty,
  headerAction,
}: {
  title: string;
  count?: number;
  to: string;
  search?: { tab: string };
  tooltip: string;
  rows: Row[];
  empty: string;
  headerAction?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card/60 flex flex-col h-[200px]">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-card/40 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs font-semibold truncate">{title}</h3>
          <InfoDot text={tooltip} />
          {typeof count === "number" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerAction}
          <Link
            to={to}
            search={search as never}
            className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            View all
          </Link>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center">{empty}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
              >
                {r.to ? (
                  <Link
                    to={r.to}
                    search={r.search as never}
                    className="flex-1 min-w-0 flex flex-col"
                  >
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {r.secondary}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {r.secondary}
                      </div>
                    )}
                  </div>
                )}
                {r.badge}
                {r.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  const displayCount = count > 99 ? "99+" : count.toString();
  return (
    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full border-white dark:border-slate-900">
      {displayCount}
    </span>
  );
}

export function ManagerBento({
  silos,
  qcQueue,
  dispatchQueue,
  actuators,
  buyers,
  technicians,
}: {
  silos: Array<{
    id: string;
    name: string;
    silo_id: string;
    capacity_kg: number;
    current_occupancy_kg: number | null;
    status: string | null;
  }>;
  qcQueue: Array<{
    id: string;
    batch_id: string;
    grain_type: string;
    quantity_kg: number;
    risk_score: number | null;
  }>;
  dispatchQueue: Array<{ id: string; batch_id: string; grain_type: string; quantity_kg: number }>;
  actuators: Array<{
    id: string;
    name: string;
    actuator_type: string;
    is_on: boolean | null;
    silo_id: string | null;
  }>;
  buyers: Array<{
    id: string;
    name: string;
    company_name?: string | null;
    status?: string | null;
    contact_name?: string | null;
    created_at?: string | null;
  }>;
  technicians: Array<{
    id: string;
    name: string | null;
    email: string | null;
    department: string | null;
    shift_pattern: string | null;
  }>;
}) {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussionTicket, setActiveDiscussionTicket] = useState<MonitoringIncidentItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ""));
  }, []);

  const siloRows: Row[] = silos.map((s) => {
    const pct = s.capacity_kg
      ? Math.round((Number(s.current_occupancy_kg ?? 0) / s.capacity_kg) * 100)
      : 0;
    return {
      id: s.id,
      primary: s.name,
      secondary: `${s.silo_id} · ${pct}% full`,
      badge: (
        <div className="w-16">
          <div className="h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
            <div
              className={`h-full ${pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      ),
      to: `/silos/${s.id}`,
    };
  });

  const qcRows: Row[] = qcQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    badge:
      (b.risk_score ?? 0) >= 70 ? (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
          risk
        </span>
      ) : (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          ok
        </span>
      ),
    to: "/grain-operations",
    search: { tab: "batches" },
  }));

  const dispatchRows: Row[] = dispatchQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    to: "/grain-operations",
    search: { tab: "silos" },
  }));

  const actRows: Row[] = actuators.map((a) => ({
    id: a.id,
    primary: a.name,
    secondary: a.actuator_type,
    badge: (
      <span
        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.is_on ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-slate-500/10 text-slate-600"}`}
      >
        {a.is_on ? "on" : "off"}
      </span>
    ),
    to: "/actuators",
  }));

  const buyerRows: Row[] = buyers.map((b) => ({
    id: b.id,
    primary: b.name,
    secondary: `${b.company_name ?? b.contact_name ?? "No details"} · ${b.status ?? "—"}`,
    badge: b.created_at ? (
      <span className="text-[9px] text-muted-foreground">{formatRelativeTime(b.created_at)}</span>
    ) : undefined,
    to: "/grain-operations",
    search: { tab: "buyers" },
  }));

  const listTicketsFn = useServerFn(listOpenFieldIncidents);
  const { data: openTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["open-field-tickets"],
    queryFn: () => listTicketsFn(),
    refetchInterval: 30_000,
  });
  const incList = (openTickets ?? []) as Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    created_at: string;
    notes?: string | null;
    assigned_to?: string | null;
    reporter_user_id?: string;
  }>;

  // Attach unread tracking for all incidents
  useEffect(() => {
    if (!currentUserId) return;
    incList.forEach((inc) => attachTicketForUser(inc.id, currentUserId));
  }, [incList, currentUserId]);

  // Get unread counts for incidents
  const { unreadFor, markRead } = useTicketUnread(currentUserId);

  return (
    <div className="space-y-4">
      {/* ── Top Row: Key Metrics (Silos and QC Queue) ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <BentoCard
          title="Silos"
          count={silos.length}
          to="/grain-operations"
          search={{ tab: "silos" }}
          tooltip="Silo utilisation, sorted by fill. Click any silo for full detail."
          rows={siloRows}
          empty="No silos yet — provision from install orders."
        />
        <BentoCard
          title="QC queue"
          count={qcQueue.length}
          to="/grain-operations"
          search={{ tab: "batches" }}
          tooltip="Batches currently in intake / processing / treatment awaiting QC sign-off."
          rows={qcRows}
          empty="No batches pending QC."
        />
      </div>

      {/* ── Middle Row: Operations & Incidents ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <BentoCard
          title="Dispatch queue"
          count={dispatchQueue.length}
          to="/grain-operations"
          search={{ tab: "silos" }}
          tooltip="Batches ready to be dispatched to buyers."
          rows={dispatchRows}
          empty="Nothing ready to ship."
        />
        <BentoCard
          title="Buyer orders"
          count={buyers.length}
          to="/grain-operations"
          search={{ tab: "buyers" }}
          tooltip="All buyers created by your team. Shows creation timestamp and status."
          rows={buyerRows}
          empty="No buyers created yet."
        />
        <BentoCard
          title="Actuators"
          count={actuators.length}
          to="/actuators"
          tooltip="Latest actuator state. Click through to toggle from the Actuators page."
          rows={actRows}
          empty="No actuators registered."
        />
      </div>

      {/* ── Bottom Row: Field Incidents & Team on Shift ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Open Field Incidents */}
        <div className="rounded-2xl bg-card/60 flex flex-col h-[200px]">
          <header className="flex items-center justify-between px-3 py-2 border-b bg-card/40 rounded-t-xl shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-semibold truncate">Open field incidents</h3>
              <InfoDot text="Active field incidents — click the message icon to open discussion." />
              {incList.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {incList.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="manager-new-ticket-btn"
                onClick={() => setTicketDialogOpen(true)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                title="Report a new field incident ticket"
              >
                <Plus className="h-3 w-3" /> New Ticket
              </button>
              <Link
                to="/monitoring"
                search={{} as never}
                className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {ticketsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : incList.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground text-center">
                  No open field incidents.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {incList.map((inc) => {
                  const unreadCount = unreadFor(inc.id);
                  return (
                    <li
                      key={inc.id}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{inc.category}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {new Date(inc.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveDiscussionTicket({
                            id: inc.id,
                            title: inc.category,
                            priority: inc.severity,
                            status: inc.status,
                            message: inc.notes ?? null,
                            triggered_at: inc.created_at,
                            source: "field_incident",
                          });
                          setDiscussionOpen(true);
                          markRead(inc.id);
                        }}
                        className="relative flex items-center justify-center p-2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0"
                        title={
                          unreadCount > 0
                            ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                            : "Open discussion thread"
                        }
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <UnreadBadge count={unreadCount} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Team on Shift */}
        <ManagerTeamStrip technicians={technicians} />
      </div>

      {/* ── Dialogs ── */}
      <ReportTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        silos={silos}
      />
      <MonitoringDiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        incident={activeDiscussionTicket}
        currentUserId={currentUserId}
      />
    </div>
  );
}
