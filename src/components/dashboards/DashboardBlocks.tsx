import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { listGrainBatches, listBuyers } from "@/lib/operations.functions";
import { listDispatches } from "@/lib/dispatches.functions";

// range must match whatever AdminDashboard.tsx's own useQuery is keyed on —
// same queryKey means react-query dedupes this into the SAME network call
// instead of firing getDashboardExtras twice (once for the KPI strip, once
// for these widgets) on every dashboard mount.
function useExtras(range: string = "mtd") {
  const fn = useServerFn(getDashboardExtras);
  return useQuery({
    queryKey: ["dashboard-extras", range],
    queryFn: () => fn({ data: { range } as never }),
    refetchInterval: 30_000,
  });
}

function riskColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function priorityDot(p: string) {
  return p === "critical"
    ? "bg-red-500"
    : p === "high"
      ? "bg-orange-500"
      : p === "medium"
        ? "bg-amber-500"
        : "bg-slate-400";
}

function CardHeaderLink({ to, search, title, count }: { to: string; search?: Record<string, string>; title: string; count?: number }) {
  return (
    <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm flex items-center gap-2">
        {title}
        {typeof count === "number" && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono tabular-nums">{count}</Badge>
        )}
      </CardTitle>
      <Link to={to} search={search as never} aria-label={`Open ${title}`} className="text-emerald-600 hover:text-emerald-700">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </CardHeader>
  );
}

/**
 * Compact "latest 3" batches widget. No scroll — rows past the 3rd are
 * rendered blurred (not just hidden) with an expand affordance underneath,
 * so it's clear more exist. Nothing here opens a popup: the header arrow,
 * the expand affordance, and every row are all real links to the full
 * Batches tab on /grain-operations.
 */
export function RecentBatchesCard({ range }: { range?: string } = {}) {
  const { data } = useExtras(range);
  const rows = data?.recentBatches ?? [];
  const visible = rows.slice(0, 3);
  const overflow = rows.slice(3);
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "batches" }} title="Batches" count={rows.length} />
      <CardContent className="p-2 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground p-2">No batches</p>}
        <div className="divide-y divide-border/40">
          {visible.map((b) => (
            <Link key={b.id} to="/grain-operations" search={{ tab: "batches" }} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1.5 text-xs hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition rounded">
              <span className="font-medium truncate">{b.batch_id}</span>
              <span className="tabular-nums text-muted-foreground text-[11px]">{Number(b.quantity_kg).toLocaleString()}kg</span>
              <span className={`h-2 w-2 rounded-full ${riskColor(Number(b.risk_score ?? 0))}`} title={`risk ${Number(b.risk_score ?? 0).toFixed(0)}`} />
            </Link>
          ))}
        </div>
        {overflow.length > 0 && (
          <Link
            to="/grain-operations"
            search={{ tab: "batches" }}
            aria-label={`View all ${rows.length} batches`}
            className="relative mt-1 block"
          >
            <div className="divide-y divide-border/40 blur-[3px] opacity-50 pointer-events-none select-none">
              {overflow.map((b) => (
                <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1.5 text-xs">
                  <span className="font-medium truncate">{b.batch_id}</span>
                  <span className="tabular-nums text-muted-foreground text-[11px]">{Number(b.quantity_kg).toLocaleString()}kg</span>
                  <span className={`h-2 w-2 rounded-full ${riskColor(Number(b.risk_score ?? 0))}`} />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-card via-card/60 to-transparent">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 transition">
                <ChevronDown className="h-3 w-3" />
                {rows.length - 3} more
              </span>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentAlertsCard() {
  const { data } = useExtras();
  const rows = data?.recentAlerts ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-alerts" title="Alerts" count={rows.length} />
      <CardContent className="p-2 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground p-2">All clear</p>}
        <div className="divide-y divide-border/40">
          {rows.slice(0, 5).map((a) => (
            <Link key={a.id} to="/grain-alerts" search={{ priority: "all" }} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition rounded">
              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot(String(a.priority))}`} />
              <span className="truncate flex-1">{a.title}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamCard() {
  const { data } = useExtras();
  const rows = data?.team ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/team-management" title="Team" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No members yet</p>}
        {rows.slice(0, 4).map((u) => (
          <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50">
            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-[10px] font-semibold shrink-0">{(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{u.name ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

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

export function BuyerOrdersCard() {
  const listBuyersFn = useServerFn(listBuyers);
  const { data: buyers } = useQuery({
    queryKey: ["buyers-overview"],
    queryFn: () => listBuyersFn(),
    refetchInterval: 30_000,
  });

  const rows = (buyers ?? []) as Array<{
    id: string;
    name: string;
    company_name?: string | null;
    status?: "active" | "paused" | "inactive" | null;
    contact_name?: string | null;
    created_at?: string | null;
  }>;

  const statusColor = (status?: string | null) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "paused": return "bg-amber-100 text-amber-700";
      case "inactive": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "buyers" }} title="Buyers" count={rows.length} />
      <CardContent className="p-3 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No buyers created</p>}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {rows.map((buyer) => (
            <Link
              key={buyer.id}
              to="/grain-operations"
              search={{ tab: "buyers" }}
              className="flex flex-col gap-1.5 px-2 py-2 rounded-md border border-border/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate flex-1">{buyer.name}</span>
                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColor(buyer.status)}`}>
                  {buyer.status ?? "—"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground truncate flex-1">
                  {buyer.company_name ? buyer.company_name : buyer.contact_name ? buyer.contact_name : "No details"}
                </span>
              </div>
              {buyer.created_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">Created</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{formatRelativeTime(buyer.created_at)}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActuatorsCard() {
  const { data } = useExtras();
  const rows = data?.actuators ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/actuators" title="Actuators" count={rows.length} />
      <CardContent className="p-3 pt-0">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No devices</p>}
        <div className="flex flex-wrap gap-1.5">
          {rows.map((a) => (
            <Link
              key={a.id}
              to="/actuators"
              title={`${a.name} · ${a.is_on ? `On ${a.power_level ?? 0}%` : "Off"}`}
              className={`h-3 w-3 rounded-full transition hover:scale-125 ${a.is_on ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
        {rows.length > 0 && (
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />on {rows.filter(r => r.is_on).length}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/30" />off {rows.filter(r => !r.is_on).length}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SilosOccupancyCard() {
  const { data } = useExtras();
  const rows = data?.silos ?? [];
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "silos" }} title="Silos" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No silos</p>}
        {rows.slice(0, 6).map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
          return (
            <Link key={s.id} to="/grain-operations" search={{ tab: "silos" }} title={`${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg`} className="flex items-center gap-2 group">
              <span className="text-[11px] w-16 truncate text-muted-foreground group-hover:text-foreground transition">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${bar} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums font-semibold w-8 text-right">{pct}%</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Admin-dashboard-only variant of the silos widget: same compact fill bars,
 * but folds each silo's active alerts in inline instead of a separate
 * alerts card next to it. Kept as its own export (not a prop on
 * SilosOccupancyCard) so TechnicianDashboard's layout/behavior is
 * untouched — see AdminDashboard.tsx for the only place this is used.
 */
export function AdminSilosCard({ range }: { range?: string } = {}) {
  const { data } = useExtras(range);
  const rows = data?.silos ?? [];
  const alerts = data?.siloAlerts ?? [];
  const [expandedSiloId, setExpandedSiloId] = useState<string | null>(null);
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "silos" }} title="Silos" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No silos</p>}
        {rows.slice(0, 6).map((s) => {
          const cap = Number(s.capacity_kg ?? 0);
          const occ = Number(s.current_occupancy_kg ?? 0);
          const pct = cap ? Math.round((occ / cap) * 100) : 0;
          const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
          const siloAlerts = alerts.filter((a) => a.silo_id === s.id);
          const topAlert = siloAlerts.find((a) => a.priority === "critical") ?? siloAlerts[0];
          const expanded = expandedSiloId === s.id;
          return (
            <div key={s.id}>
              <div className="flex items-center gap-2 group">
                <Link
                  to="/grain-operations"
                  search={{ tab: "silos" }}
                  title={topAlert ? `${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg · ${topAlert.title}` : `${s.name} · ${occ.toLocaleString()}/${cap.toLocaleString()}kg`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="text-[11px] w-16 truncate text-muted-foreground group-hover:text-foreground transition">{s.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${bar} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="text-[11px] tabular-nums font-semibold w-8 text-right">{pct}%</span>
                </Link>
                {siloAlerts.length > 0 && (
                  <span className={`inline-flex items-center gap-0.5 shrink-0 ${topAlert?.priority === "critical" ? "text-red-600" : "text-amber-600"}`}>
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px] font-semibold tabular-nums">{siloAlerts.length}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedSiloId(expanded ? null : s.id)}
                  aria-label={expanded ? `Collapse ${s.name}` : `Expand ${s.name} — incoming/outgoing`}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition"
                >
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
              {expanded && <SiloInOutPanel siloId={s.id} />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Incoming/Outgoing tabs shown when a silo row in AdminSilosCard is
 * expanded — last 3 intake batches and last 3 dispatches for that silo only.
 * Mirrors the fuller tables on the silo detail page (silos.$siloId.tsx),
 * just trimmed to widget scale; "View full silo" links there for everything
 * else (batch/dispatch editing, cost & margin summaries, etc.).
 */
function SiloInOutPanel({ siloId }: { siloId: string }) {
  const listBatchesFn = useServerFn(listGrainBatches);
  const listDispatchesFn = useServerFn(listDispatches);

  const batchesQ = useQuery({
    queryKey: ["grain-batches"],
    queryFn: () => listBatchesFn() as Promise<Array<{
      id: string; quantity_kg: number; farmer_name: string | null;
      harvest_date: string | null; intake_date: string | null;
      silos?: { id: string } | null;
    }>>,
  });
  const dispatchesQ = useQuery({
    queryKey: ["silo-dispatches", siloId],
    queryFn: () => listDispatchesFn({ data: { siloId, limit: 3 } }),
  });

  const incoming = (batchesQ.data ?? []).filter((b) => b.silos?.id === siloId).slice(0, 3);
  const outgoing = (dispatchesQ.data?.dispatches ?? []) as Array<{
    id: string; total_qty_kg: number; dispatched_at: string | null; created_at: string | null;
    buyers?: { name: string } | null;
  }>;

  return (
    <div className="ml-[72px] mr-8 mt-1 mb-1 rounded-md border border-border/50 bg-muted/20 p-2">
      <Tabs defaultValue="incoming">
        <TabsList className="h-6 p-0.5">
          <TabsTrigger value="incoming" className="text-[10px] px-2 py-0 h-5">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing" className="text-[10px] px-2 py-0 h-5">Outgoing</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="mt-1.5 space-y-1">
          {batchesQ.isLoading ? (
            <p className="text-[10px] text-muted-foreground px-1 py-1">Loading…</p>
          ) : incoming.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-1 py-1">No recent intake</p>
          ) : (
            incoming.map((b) => {
              const date = b.harvest_date ?? b.intake_date;
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 text-[10px] px-1">
                  <span className="truncate text-muted-foreground flex-1 min-w-0">{b.farmer_name ?? "—"}</span>
                  <span className="tabular-nums font-medium shrink-0">{Number(b.quantity_kg).toLocaleString()}kg</span>
                  <span className="text-muted-foreground shrink-0">{date ? new Date(date).toLocaleDateString() : "—"}</span>
                </div>
              );
            })
          )}
        </TabsContent>
        <TabsContent value="outgoing" className="mt-1.5 space-y-1">
          {dispatchesQ.isLoading ? (
            <p className="text-[10px] text-muted-foreground px-1 py-1">Loading…</p>
          ) : outgoing.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-1 py-1">No recent dispatches</p>
          ) : (
            outgoing.map((d) => {
              const date = d.dispatched_at ?? d.created_at;
              return (
                <div key={d.id} className="flex items-center justify-between gap-2 text-[10px] px-1">
                  <span className="truncate text-muted-foreground flex-1 min-w-0">{d.buyers?.name ?? "—"}</span>
                  <span className="tabular-nums font-medium shrink-0">{Number(d.total_qty_kg).toLocaleString()}kg</span>
                  <span className="text-muted-foreground shrink-0">{date ? new Date(date).toLocaleDateString() : "—"}</span>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      <Link
        to="/silos/$siloId"
        params={{ siloId }}
        className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
      >
        View full silo <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Open Field Incidents widget ───────────────────────────────────────────────

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listTickets, type TicketRow } from "@/lib/tickets.functions";
import { attachTicketForUser } from "@/lib/ticketMessages";
import { TicketCardForm } from "@/components/app/tickets/TicketCardForm";
import { TicketDetailSheet } from "@/components/app/tickets/TicketDetailSheet";
import { TicketDiscussion } from "@/components/app/tickets/TicketDiscussion";
import { TicketSidePanel } from "@/components/app/tickets/TicketSidePanel";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { useTicketUnread } from "@/hooks/useTicketUnread";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-red-500",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
const PRIORITY_BADGE_CLS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

function fmtShort(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Support ticket queue (field_tickets via tickets.functions.ts) — despite its
 * old name, this has nothing to do with the mobile field_incidents system or
 * the newer auto-routing Field Incidents feature (Administration tab,
 * grain_alerts). Renamed from `OpenFieldIncidentsCard` to stop the confusion.
 */
export function SupportTicketsCard({
  onViewAll,
  ticketPanelOpen,
  onTicketPanelClose,
}: {
  onViewAll?: () => void;
  ticketPanelOpen?: boolean;
  onTicketPanelClose?: () => void;
}) {
  const fn = useServerFn(listTickets);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => fn({ data: { status: "open" } }),
    staleTime: 30_000,
  });

  useRealtimeInvalidate("field_tickets", [["field-tickets", "open"]]);

  const tickets: TicketRow[] = data?.tickets ?? [];

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [discuss, setDiscuss] = useState<TicketRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => setCurrentUserId(d.user?.id ?? ""));
  }, []);

  // Attach channels with unread tracking for each ticket
  useEffect(() => {
    if (!currentUserId) return;
    tickets.forEach((t) => attachTicketForUser(t.id, currentUserId));
  }, [tickets, currentUserId]);

  const { unreadFor, markRead } = useTicketUnread(currentUserId);

  function handleFormSuccess() {
    setShowNewTicket(false);
    qc.invalidateQueries({ queryKey: ["field-tickets"] });
  }

  function handleDetailClose() {
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["field-tickets"] });
  }

  function openDiscuss(t: TicketRow) {
    setDiscuss(t);
    markRead(t.id);
  }

  return (
    <>
      <Card className="border-border/60 shadow-sm flex flex-col">
        {/* Header — no icon, just text + count + actions */}
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            Support Tickets
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-mono tabular-nums"
            >
              {tickets.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNewTicket(true)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              + New Ticket
            </button>
            <button
              type="button"
              onClick={onViewAll}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              View all
            </button>
          </div>
        </CardHeader>

        {/* Ticket list — fixed height with scroll, matching silos card */}
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">
              No open tickets
            </p>
          ) : (
            <ul className="divide-y divide-border/40 overflow-y-auto"
                style={{ maxHeight: "132px" }}>
              {tickets.map((t) => {
                const unread = unreadFor(t.id);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition"
                  >
                    {/* Priority dot */}
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`}
                    />
                    {/* Title + timestamp — click opens detail */}
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {fmtShort(t.created_at)}
                        {t.status === "resolved" && (
                          <span className="ml-1 text-emerald-600 font-medium">· Resolved</span>
                        )}
                      </p>
                    </button>
                    {/* Priority label */}
                    <span
                      className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_BADGE_CLS[t.priority]}`}
                    >
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    {/* Discuss button with unread badge */}
                    <button
                      type="button"
                      onClick={() => openDiscuss(t)}
                      className="relative shrink-0 text-[10px] font-semibold text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 hover:border-emerald-400 hover:text-emerald-700 transition"
                    >
                      Discuss
                      {unread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center px-0.5 leading-none">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* New Ticket popup — Dialog instead of inline/new page */}
      <Dialog open={showNewTicket} onOpenChange={(o) => !o && setShowNewTicket(false)}>
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200">
            <DialogTitle className="text-sm font-bold text-slate-900">
              New support ticket
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
            <TicketCardForm
              onSuccess={handleFormSuccess}
              onCancel={() => setShowNewTicket(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <TicketDetailSheet
        ticket={selected}
        open={!!selected}
        onClose={handleDetailClose}
      />

      {/* Discussion popup */}
      {discuss && (
        <TicketDiscussion
          ticketId={discuss.id}
          ticketTitle={discuss.title}
          open={!!discuss}
          onClose={() => setDiscuss(null)}
          currentUserId={currentUserId}
          currentUserLabel="Admin"
        />
      )}

      {/* #tickets panel — opened when user clicks "View all" */}
      <TicketSidePanel
        controlledOpen={ticketPanelOpen}
        onControlledClose={onTicketPanelClose}
      />
    </>
  );
}
