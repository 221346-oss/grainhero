import { useState } from "react";
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
import { MessageSquare, Send, Loader2, User } from "lucide-react";

export type TicketItem = {
  id: string;
  category: string;
  severity: string;
  status: string;
  notes?: string | null;
  created_at?: string;
  reporter_user_id?: string;
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

export function TicketDiscussionDialog({ open, onOpenChange, incident }: Props) {
  const qc = useQueryClient();
  const listCommentsFn = useServerFn(listIncidentComments);
  const addCommentFn = useServerFn(addIncidentComment);

  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["incident-comments", incident?.id],
    queryFn: () => listCommentsFn({ data: { incident_id: incident!.id } }),
    enabled: !!incident?.id && open,
    refetchInterval: 5_000, // 5s auto-poll for live discussion
  });

  const comments = (data ?? []) as unknown as CommentRow[];

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

        {/* Discussion Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px] max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">No discussion messages yet.</p>
              <p className="text-[11px] text-muted-foreground">
                Start the conversation between Manager and Technician below!
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5 items-start text-xs">
                <div className="h-7 w-7 rounded-full bg-muted/60 grid place-items-center shrink-0 text-muted-foreground mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 bg-muted/30 p-2.5 rounded-xl border space-y-1">
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{c.author_name}</span>
                      <RoleBadge role={c.author_role} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{c.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply / Discussion Input */}
        <div className="p-3 border-t bg-card/60 flex items-end gap-2">
          <Textarea
            placeholder="Type a response or discussion message… (Press Enter to send)"
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
      </DialogContent>
    </Dialog>
  );
}
