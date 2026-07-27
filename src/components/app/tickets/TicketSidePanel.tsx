/**
 * TicketSidePanel
 * Discord-style "#tickets" pill in the header.
 * - Admin: own open/resolved tickets + can create new
 * - Super admin: all open tickets across admins
 * Unread message badges appear on the pill (total) and per-ticket Discuss button.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listTickets, type TicketRow } from "@/lib/tickets.functions";
import { attachTicketForUser } from "@/lib/ticketMessages";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { useTicketUnread } from "@/hooks/useTicketUnread";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TicketCardForm } from "./TicketCardForm";
import { TicketDetailSheet } from "./TicketDetailSheet";
import { TicketDiscussion } from "./TicketDiscussion";
import { Plus, Hash } from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-red-500",
};

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function TicketSidePanel({
  controlledOpen,
  onControlledClose,
}: {
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}) {
  const { isSuperAdmin, role } = useIsSuperAdmin();
  const [internalOpen, setInternalOpen] = useState(false);
  const panelOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setPanelOpen = (v: boolean) => {
    if (controlledOpen !== undefined) {
      if (!v) onControlledClose?.();
    } else {
      setInternalOpen(v);
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [discuss, setDiscuss] = useState<TicketRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ""));
  }, []);

  const listFn = useServerFn(listTickets);

  const { data, isLoading, error: ticketsError } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => listFn({ data: { status: "open" } }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useRealtimeInvalidate("field_tickets", [
    ["field-tickets", "open"],
    ["field-tickets", "closed"],
    ["field-tickets"],
  ]);

  const tickets: TicketRow[] = data?.tickets ?? [];
  const openCount = tickets.length;

  // Attach channels with unread tracking
  useEffect(() => {
    if (!currentUserId) return;
    tickets.forEach((t) => attachTicketForUser(t.id, currentUserId));
  }, [tickets, currentUserId]);

  const { unreadFor, markRead } = useTicketUnread(currentUserId);

  // Only visible to admin and super_admin
  if (role !== "admin" && role !== "super_admin") return null;

  // When rendered as a controlled panel (from dashboard "View all"),
  // hide the header pill — the parent controls opening
  const showPill = controlledOpen === undefined;

  function handleFormSuccess() {
    setShowForm(false);
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
      {/* ── Pill in header (hidden when controlled externally) ── */}
      {showPill && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label={`Open tickets${openCount ? ` (${openCount})` : ""}`}
          className={cn(
            "relative shrink-0 h-9 inline-flex items-center gap-1.5 rounded-full px-3",
            "text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          )}
        >
          <Hash className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs font-medium">tickets</span>
          {openCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-slate-700 text-white text-[10px] font-bold grid place-items-center">
              {openCount > 99 ? "99+" : openCount}
            </span>
          )}
        </button>
      )}

      {/* ── Main panel ── */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-200 shrink-0">
            <SheetTitle className="flex items-center gap-1.5 text-base font-bold text-slate-900 pr-8">
              <Hash className="h-4 w-4 text-slate-500" />
              tickets
              {openCount > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px] font-semibold">
                  {openCount} open
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500">
                {isSuperAdmin
                  ? "Open incident tickets from all admins"
                  : "Your open incident tickets"}
              </p>
              {!isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1 text-slate-600 shrink-0 ml-3"
                  onClick={() => setShowForm((v) => !v)}
                >
                  <Plus className="h-3 w-3" />
                  {showForm ? "Cancel" : "New"}
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Inline form (admin only) */}
            {showForm && !isSuperAdmin && (
              <div className="px-4 pt-4 pb-2 border-b border-slate-100 shrink-0">
                <TicketCardForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="px-4 py-3 space-y-2">
                {isLoading ? (
                  <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
                ) : ticketsError ? (
                  <div className="py-6 text-center space-y-1">
                    <p className="text-sm font-medium text-red-600">Failed to load tickets</p>
                    <p className="text-xs text-slate-500 px-4">{(ticketsError as Error).message}</p>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-sm text-slate-500">No open tickets</p>
                    {!isSuperAdmin && (
                      <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Report an incident
                      </Button>
                    )}
                  </div>
                ) : (
                  tickets.map((t) => (
                    <TicketListItem
                      key={t.id}
                      ticket={t}
                      isSuperAdmin={isSuperAdmin}
                      unread={unreadFor(t.id)}
                      onClick={() => setSelected(t)}
                      onDiscuss={() => openDiscuss(t)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {isSuperAdmin && (
              <div className="shrink-0 border-t border-slate-100 px-5 py-2.5">
                <a
                  href="/platform/reporting?tab=tickets"
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 block text-center"
                >
                  View all closed tickets in Reporting →
                </a>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TicketDetailSheet
        ticket={selected}
        open={!!selected}
        onClose={handleDetailClose}
      />

      {/* Discussion popup from panel */}
      {discuss && (
        <TicketDiscussion
          ticketId={discuss.id}
          ticketTitle={discuss.title}
          open={!!discuss}
          onClose={() => setDiscuss(null)}
          currentUserId={currentUserId}
          currentUserLabel={isSuperAdmin ? "Super Admin" : "Admin"}
        />
      )}
    </>
  );
}

// ── Single ticket row ─────────────────────────────────────────────────────────

function TicketListItem({
  ticket,
  isSuperAdmin,
  unread,
  onClick,
  onDiscuss,
}: {
  ticket: TicketRow;
  isSuperAdmin: boolean;
  unread: number;
  onClick: () => void;
  onDiscuss: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-colors p-3 space-y-1.5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-sm text-slate-900 leading-snug truncate">
            {ticket.title}
          </p>
        </button>
        <span
          className={cn(
            "shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border",
            PRIORITY_BADGE[ticket.priority],
          )}
        >
          {ticket.priority}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[ticket.priority])} />
        <span className="truncate">
          {ticket.reporter_name}
          <span className="mx-1 opacity-50">·</span>
          <span className="capitalize">{ticket.reporter_role}</span>
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap">{timeAgo(ticket.created_at)}</span>
      </div>

      {isSuperAdmin && (ticket.admin_name || ticket.admin_email) && (
        <p className="text-[11px] text-slate-400 truncate">
          From: {ticket.admin_name ?? ticket.admin_email}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={onClick}
          className="text-[10px] text-emerald-700 font-medium hover:underline"
        >
          View details →
        </button>
        {/* Discuss button with unread badge */}
        <button
          type="button"
          onClick={onDiscuss}
          className="relative text-[10px] font-semibold text-slate-500 border border-slate-200 rounded px-2 py-0.5 hover:border-emerald-400 hover:text-emerald-700 transition"
        >
          Discuss
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center px-0.5 leading-none ring-1 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
