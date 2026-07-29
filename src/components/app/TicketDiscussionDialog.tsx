import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listIncidentComments, addIncidentComment } from "@/lib/field-settings.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, User, Lock } from "lucide-react";

export type TicketItem = {
  id: string;
  category: string;
  severity: string;
  status: string;
  notes?: string | null;
  created_at?: string;
  reporter_user_id?: string | null;
  assigned_to?: string | null;
};

type CommentRow = {
  id: string;
  incident_id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: TicketItem | null;
  /** The currently signed-in user's ID — used to enforce participant-only access */
  currentUserId?: string | null;
  /** The current user's role — used to allow admin viewing */
  userRole?: string | null;
}

function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase();
  const cls = r === "manager" || r === "admin" || r === "super_admin"
    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/50"
    : r === "technician"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50"
      : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200/50";

  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${cls}`}>
      {role}
    </span>
  );
}

/** Returns true if the user is a participant in the incident discussion */
function isUserParticipant(
  currentUserId: string | null | undefined,
  incident: TicketItem | null,
): boolean {
  if (!currentUserId || !incident) return false;
  return (
    incident.reporter_user_id === currentUserId ||
    incident.assigned_to === currentUserId
  );
}

/** Returns true if the user can view the discussion (participants + admins) */
function canViewDiscussion(
  currentUserId: string | null | undefined,
  incident: TicketItem | null,
  userRole: string | null | undefined,
): boolean {
  if (!currentUserId || !incident) return false;
  // Participants can always view
  if (isUserParticipant(currentUserId, incident)) return true;
  // Admins can view but not participate
  return userRole === "admin" || userRole === "super_admin";
}

/** True if incident is in a terminal (closed) state */
function isIncidentClosed(status: string) {
  return status === "resolved" || status === "dismissed";
}

export function TicketDiscussionDialog({ open, onOpenChange, incident, currentUserId, userRole }: Props) {
  const qc = useQueryClient();
  const listCommentsFn = useServerFn(listIncidentComments);
  const addCommentFn = useServerFn(addIncidentComment);

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine if this user is a participant or can view
  const participant = isUserParticipant(currentUserId, incident);
  const canView = canViewDiscussion(currentUserId, incident, userRole);
  const isAdminViewing = canView && !participant;
  const isClosed = !!incident && isIncidentClosed(incident.status);

  const { data, isLoading } = useQuery({
    queryKey: ["incident-comments", incident?.id],
    queryFn: () => listCommentsFn({ data: { incident_id: incident!.id } }),
    enabled: !!incident?.id && open && canView,
    refetchInterval: canView && !isClosed ? 5_000 : false,
  });

  // Parse response — server now returns { comments, isParticipant }
  const responseData = data as { comments: CommentRow[]; isParticipant: boolean } | CommentRow[] | undefined;
  const comments: CommentRow[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.comments ?? []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Clear comment cache when a closed incident's dialog is opened
  useEffect(() => {
    if (open && incident?.id && isClosed) {
      qc.removeQueries({ queryKey: ["incident-comments", incident.id] });
    }
  }, [open, incident?.id, isClosed, qc]);

  const sendMut = useMutation({
    mutationFn: () =>
      addCommentFn({
        data: {
          incident_id: incident!.id,
          message: message.trim(),
        },
      }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["incident-comments", incident?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!message.trim() || sendMut.isPending || !incident || isClosed) return;
    sendMut.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Ticket Header */}
        <DialogHeader className="p-4 border-b bg-card/60">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageSquare className="h-4 w-4 text-amber-600 shrink-0" />
            <DialogTitle className="text-sm font-semibold truncate flex-1 min-w-0">
              Discussion — {incident.category}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-bold">
              {incident.severity}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              {incident.status}
            </Badge>
          </div>
          {incident.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 bg-muted/30 p-2 rounded border">
              {incident.notes}
            </p>
          )}
        </DialogHeader>

        {/* Non-participant lock state */}
        {!participant ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Discussion restricted</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              This discussion is private between the person who reported this incident and the person it was assigned to. You are not a participant in this conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Closed incident notice */}
            {isClosed && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>This incident is <strong>{incident.status}</strong>. The discussion has been closed and history cleared.</span>
              </div>
            )}

            {/* Discussion Messages List */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px] max-h-[400px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isClosed ? (
                <div className="py-12 text-center space-y-1">
                  <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">Discussion closed.</p>
                  <p className="text-[11px] text-muted-foreground">
                    History is cleared when an incident is resolved or dismissed.
                  </p>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">No messages yet.</p>
                  <p className="text-[11px] text-muted-foreground">
                    Start the conversation — only you and the other participant can see this thread.
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex gap-2.5 items-start text-xs ${c.user_id === currentUserId ? "flex-row-reverse" : ""}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-muted/60 grid place-items-center shrink-0 text-muted-foreground mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div
                      className={`flex-1 min-w-0 p-2.5 rounded-xl border space-y-1 ${
                        c.user_id === currentUserId
                          ? "bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-800/40"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {c.user_id === currentUserId ? "You" : c.author_name}
                          </span>
                          <RoleBadge role={c.author_role} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{c.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input — disabled for closed incidents */}
            {!isClosed && (
              <div className="p-3 border-t bg-card/60 flex items-end gap-2">
                <Textarea
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-xs resize-none min-h-[44px]"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!message.trim() || sendMut.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1 h-10 px-3"
                >
                  {sendMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
