/**
 * TicketDetailSheet
 * Role-aware slide-over for ticket details.
 *
 * Admin:
 *   - Sees full ticket + reporter info
 *   - If ticket is resolved by super admin, sees the resolution note
 *   - "Close ticket" button (removes it from their view)
 *   - "Discussion" button top-right (ephemeral chat)
 *
 * Super admin:
 *   - Sees full ticket + which admin raised it
 *   - "Mark resolved" button with optional note
 *   - "Discussion" button top-right (ephemeral chat)
 *   - No close button (closing is the admin's job)
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { closeTicket, resolveTicket, deleteTicket, type TicketRow } from "@/lib/tickets.functions";
import { attachTicketForUser, clearTicketMessages } from "@/lib/ticketMessages";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useTicketUnread } from "@/hooks/useTicketUnread";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TicketDiscussion } from "./TicketDiscussion";
import {
  CheckCircle2,
  User,
  CalendarClock,
  MessageSquare,
  X,
  Info,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-muted text-foreground",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  open: "border-slate-300 text-slate-600",
  resolved: "border-emerald-300 text-emerald-700 bg-emerald-50",
  closed: "bg-muted text-muted-foreground",
};

interface Props {
  ticket: TicketRow | null;
  open: boolean;
  onClose: () => void;
}

export function TicketDetailSheet({ ticket, open, onClose }: Props) {
  const qc = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const closeFn = useServerFn(closeTicket);
  const resolveFn = useServerFn(resolveTicket);
  const deleteFn = useServerFn(deleteTicket);
  const [resolveNote, setResolveNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // Attach broadcast channel with unread tracking — only once userId is known
  useEffect(() => {
    if (!ticket?.id || !currentUserId) return;
    attachTicketForUser(ticket.id, currentUserId);
  }, [ticket?.id, currentUserId]);

  // Get current user id for discussion
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? "");
    });
  }, []);

  const { unreadFor, markRead } = useTicketUnread(currentUserId);

  const closeMut = useMutation({
    mutationFn: (id: string) => closeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ticket closed");
      if (ticket?.id) clearTicketMessages(ticket.id); // wipe localStorage on close
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
      onClose();
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Failed"),
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      resolveFn({ data: { id, note } }),
    onSuccess: () => {
      toast.success("Ticket marked as resolved — admin will be notified");
      setResolveNote("");
      setShowNoteInput(false);
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
      onClose();
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ticket deleted");
      if (ticket?.id) clearTicketMessages(ticket.id); // wipe localStorage on delete
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
      qc.invalidateQueries({ queryKey: ["field-tickets", "all"] });
      onClose();
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Failed to delete"),
  });

  if (!ticket) return null;

  const isActionable = ticket.status === "open";
  const isResolved = ticket.status === "resolved";
  const isClosed = ticket.status === "closed";
  const isPending = closeMut.isPending || resolveMut.isPending || deleteMut.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right">
          {/* Header — title + id on left, Discussion button below the X (not next to it) */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
            <SheetTitle className="text-base font-bold text-foreground leading-snug pr-8">
              {ticket.title}
            </SheetTitle>
            <div className="flex items-center justify-between mt-1">
              <SheetDescription className="text-xs text-muted-foreground">
                #{ticket.id.slice(0, 8)}
              </SheetDescription>
              {/* Discussion button — clear of the sheet X, with unread badge */}
              <Button
                size="sm"
                variant="outline"
                className="relative h-7 px-2.5 text-xs gap-1.5 text-slate-600"
                onClick={() => {
                  setDiscussionOpen(true);
                  if (ticket?.id) markRead(ticket.id);
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Discussion
                {ticket && unreadFor(ticket.id) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center px-0.5 leading-none ring-1 ring-white">
                    {unreadFor(ticket.id) > 9 ? "9+" : unreadFor(ticket.id)}
                  </span>
                )}
              </Button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
            {/* Priority + Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={cn(
                  "text-[10px] font-semibold uppercase border",
                  PRIORITY_BADGE[ticket.priority],
                )}
              >
                {ticket.priority}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase",
                  STATUS_BADGE[ticket.status],
                )}
              >
                {ticket.status}
              </Badge>
            </div>

            {/* Resolved note — shown to admin when ticket is resolved */}
            {isResolved && ticket.resolved_note && (
              <div className="rounded-lg border-emerald-200 bg-emerald-50 p-3 flex gap-2">
                <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 mb-0.5">
                    Resolution note from super admin
                  </p>
                  <p className="text-xs text-emerald-700">{ticket.resolved_note}</p>
                </div>
              </div>
            )}
            {isResolved && !ticket.resolved_note && (
              <div className="rounded-lg border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">
                  Super admin has resolved this ticket. You can now close it.
                </p>
              </div>
            )}

            {/* Reporter */}
            <div className="rounded-lg bg-muted/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <User className="h-3.5 w-3.5" />
                Reporter
              </div>
              <p className="font-semibold text-foreground">{ticket.reporter_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{ticket.reporter_role}</p>
            </div>

            {/* Admin info — super admin view only */}
            {(ticket.admin_name || ticket.admin_email) && (
              <div className="rounded-lg bg-muted/20 p-3 space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Submitted by admin
                </div>
                <p className="font-semibold text-foreground">
                  {ticket.admin_name ?? ticket.admin_email}
                </p>
                {ticket.admin_name && ticket.admin_email && (
                  <p className="text-xs text-muted-foreground">{ticket.admin_email}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Description
              </div>
              <div className="whitespace-pre-wrap text-foreground leading-relaxed rounded-md border-border/40 bg-card p-3 text-xs">
                {ticket.description}
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-lg border-border/40 bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Created</span>
                <span className="ml-auto text-foreground">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Resolved</span>
                  <span className="ml-auto">
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                </div>
              )}
              {ticket.closed_at && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Closed</span>
                  <span className="ml-auto">
                    {new Date(ticket.closed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Footer actions — always visible at bottom, generous padding */}
          <div className="shrink-0 border-t border-border/40 px-5 py-4 space-y-3">
            {/* Super admin resolve note input — lives in footer, not body */}
            {isSuperAdmin && isActionable && showNoteInput && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Resolution note (optional)</p>
                <Textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Describe what action was taken…"
                  rows={2}
                  className="text-xs resize-none"
                  maxLength={1000}
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* ── ADMIN: close button ── */}
              {!isSuperAdmin && (isActionable || isResolved) && (
                <>
                  <Button
                    size="sm"
                    onClick={() => closeMut.mutate(ticket.id)}
                    disabled={isPending}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {closeMut.isPending ? "Closing…" : "Close ticket"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                    Cancel
                  </Button>
                </>
              )}

              {/* ── SUPER ADMIN: resolve button ── */}
              {isSuperAdmin && isActionable && (
                <>
                  {!showNoteInput ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setShowNoteInput(true)}
                        disabled={isPending}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Mark resolved
                      </Button>
                      <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                        Close
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveMut.mutate({ id: ticket.id, note: resolveNote || undefined })
                        }
                        disabled={isPending}
                        className="flex-1"
                      >
                        {resolveMut.isPending ? "Resolving…" : "Confirm resolve"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowNoteInput(false); setResolveNote(""); }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Already closed or super admin viewing resolved/closed */}
              {(isClosed || (isSuperAdmin && (isResolved || isClosed))) && (
                <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
                  Done
                </Button>
              )}

              {/* Super admin: delete closed ticket */}
              {isSuperAdmin && isClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMut.mutate(ticket.id)}
                  disabled={isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {deleteMut.isPending ? "Deleting…" : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ephemeral discussion popup */}
      {ticket && (
        <TicketDiscussion
          ticketId={ticket.id}
          ticketTitle={ticket.title}
          open={discussionOpen}
          onClose={() => {
            setDiscussionOpen(false);
            if (ticket?.id) markRead(ticket.id);
          }}
          currentUserId={currentUserId}
          currentUserLabel={isSuperAdmin ? "Super Admin" : "Admin"}
        />
      )}
    </>
  );
}
