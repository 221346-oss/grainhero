/**
 * TicketDiscussion
 * Ephemeral chat between admin and super admin for a specific ticket.
 *
 * Messages live in a singleton module store (ticketMessages.ts) backed by
 * Supabase Realtime broadcast — so:
 *   • Channel stays open even when the dialog is closed
 *   • Messages sent while closed appear when dialog re-opens
 *   • Both sides share the same channel — same conversation everywhere
 *   • No database writes — messages are gone when the ticket is closed
 *
 * Features: send, edit (own messages), delete (own messages).
 */
import { useState, useEffect, useRef } from "react";
import {
  attachTicketForUser,
  markTicketRead,
  sendMessage,
  editMessage,
  deleteMessage,
  getMessages,
  subscribeToTicket,
  type ChatMessage,
} from "@/lib/ticketMessages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Pencil, Trash2, Check, X } from "lucide-react";

interface Props {
  ticketId: string;
  ticketTitle: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserLabel: string;
}

export function TicketDiscussion({
  ticketId,
  ticketTitle,
  open,
  onClose,
  currentUserId,
  currentUserLabel,
}: Props) {
  // Attach channel WITH unread tracking as soon as ticketId + userId are known.
  // This must use attachTicketForUser (not bare attachTicket) so the unread
  // counter is registered for the current user on this ticket.
  useEffect(() => {
    if (!ticketId || !currentUserId) return;
    attachTicketForUser(ticketId, currentUserId);
  }, [ticketId, currentUserId]);

  // When the dialog opens, mark all messages as read for this user
  useEffect(() => {
    if (open && ticketId && currentUserId) {
      markTicketRead(currentUserId, ticketId);
    }
  }, [open, ticketId, currentUserId]);

  // Keep messages in sync with the module store — also reload from
  // localStorage immediately so persisted history appears at once
  const [messages, setMessages] = useState<ChatMessage[]>(() => getMessages(ticketId));
  useEffect(() => {
    if (!ticketId) return;
    setMessages([...getMessages(ticketId)]);
    return subscribeToTicket(ticketId, () => {
      setMessages([...getMessages(ticketId)]);
    });
  }, [ticketId]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive or dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [messages, open]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: currentUserId,
      senderLabel: currentUserLabel,
      text,
      ts: Date.now(),
    };
    await sendMessage(ticketId, msg);
    setDraft("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleEdit(id: string) {
    const text = editDraft.trim();
    if (!text) return;
    await editMessage(ticketId, id, text);
    setEditingId(null);
    setEditDraft("");
  }

  async function handleDelete(id: string) {
    await deleteMessage(ticketId, id);
  }

  function startEdit(msg: ChatMessage) {
    setEditingId(msg.id);
    setEditDraft(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-md max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-t-xl max-sm:rounded-b-none"
        style={{ maxHeight: "min(80vh, 600px)" }}
      >
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <DialogTitle className="text-sm font-bold text-slate-900">Discussion</DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{ticketTitle}</p>
        </DialogHeader>

        {/* Message list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">No messages yet.</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isEditing = editingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={cn("group flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}
                >
                  <span className="text-[10px] text-slate-400 px-1">
                    {isMe ? "You" : msg.senderLabel} · {formatTime(msg.ts)}
                    {msg.edited && <span className="ml-1 opacity-60">(edited)</span>}
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full max-w-[85%]">
                      <Input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(msg.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="text-xs h-8 flex-1"
                        maxLength={1000}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleEdit(msg.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1.5">
                      {/* Edit/delete — only visible for own messages */}
                      {isMe && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="text-slate-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
                          isMe
                            ? "bg-slate-900 text-white rounded-br-sm"
                            : "bg-slate-100 text-slate-900 rounded-bl-sm",
                        )}
                      >
                        {msg.text}
                      </div>
                      {/* Edit/delete for others' messages — not allowed */}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 px-4 py-3 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 text-sm"
            maxLength={1000}
            disabled={sending}
            autoFocus={open}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="shrink-0 h-9 w-9 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
