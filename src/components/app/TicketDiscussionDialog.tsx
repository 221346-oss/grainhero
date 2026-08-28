import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listIncidentComments, addIncidentComment } from "@/lib/field-settings.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, User, X } from "lucide-react";

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
}

function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase();
  const cls =
    r === "manager" || r === "admin" || r === "super_admin"
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

// Removed participant and closed incident restrictions for open chatbox functionality

export function TicketDiscussionDialog({ open, onOpenChange, incident, currentUserId }: Props) {
  const qc = useQueryClient();
  const listCommentsFn = useServerFn(listIncidentComments);
  const addCommentFn = useServerFn(addIncidentComment);

  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enable chatbox for all users - no restrictions
  const { data, isLoading } = useQuery({
    queryKey: ["incident-comments", incident?.id],
    queryFn: () => listCommentsFn({ data: { incident_id: incident!.id } }),
    enabled: !!incident?.id && open,
    refetchInterval: 5_000, // Always refresh for real-time chat
  });

  // Parse response — server now returns { comments, isParticipant }
  const responseData = data as
    { comments: CommentRow[]; isParticipant: boolean } | CommentRow[] | undefined;
  const comments: CommentRow[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.comments ?? []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

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
    if (!message.trim() || sendMut.isPending || !incident) return;
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
    <>
      {/* Backdrop with fade effect */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-all duration-300"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sliding Container */}
      <div
        className={`fixed top-1/2 right-4 w-[32rem] max-h-[85vh] bg-background border rounded-lg shadow-2xl z-50 transition-all duration-300 ease-out transform -translate-y-1/2 ${
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        } flex flex-col overflow-hidden`}
      >
        {/* Discussion Header */}
        <div className="p-4 border-b bg-card/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-semibold">DISCUSSION</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Messages */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px] max-h-[400px]"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">No messages yet.</p>
              <p className="text-[11px] text-muted-foreground">
                Start the conversation about this incident.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="space-y-1">
                {/* Sender Name & Time */}
                <div
                  className={`flex items-center gap-2 text-[10px] ${
                    c.user_id === currentUserId ? "justify-end" : "justify-start"
                  }`}
                >
                  <span
                    className={`font-bold text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      c.user_id === currentUserId
                        ? "text-black"
                        : c.author_role.toLowerCase() === "manager" ||
                            c.author_role.toLowerCase() === "admin" ||
                            c.author_role.toLowerCase() === "super_admin"
                          ? "text-black"
                          : c.author_role.toLowerCase() === "technician"
                            ? "text-black"
                            : "text-black"
                    }`}
                    style={{ backgroundColor: "#C8F0A4" }}
                  >
                    {c.user_id === currentUserId ? "You" : c.author_role}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {/* Message Bubble */}
                <div
                  className={`flex gap-2.5 items-start text-xs ${
                    c.user_id === currentUserId ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-muted/60 grid place-items-center shrink-0 text-muted-foreground mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div
                    className={`max-w-[70%] p-2.5 rounded-xl border ${
                      c.user_id === currentUserId
                        ? "bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-800/40"
                        : "bg-muted/30"
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{c.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
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
            {sendMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </div>
      </div>
    </>
  );
}
