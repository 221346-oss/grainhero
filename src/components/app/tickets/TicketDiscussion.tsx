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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Pencil, Trash2, Check, X, Paperclip, FileText, Image as ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive or dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [messages, open]);

  async function handleSend() {
    const text = draft.trim();
    if (!text && !selectedFile) return;
    
    setSending(true);
    setUploading(!!selectedFile);
    
    try {
      let attachment: ChatMessage["attachment"] | undefined;
      
      // Upload file if selected
      if (selectedFile) {
        try {
          const filePath = `ticket-attachments/${ticketId}/${Date.now()}-${selectedFile.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(filePath, selectedFile, {
              cacheControl: "3600",
              upsert: false,
            });
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(filePath);
          
          attachment = {
            name: selectedFile.name,
            url: publicUrl,
            type: selectedFile.type,
            size: selectedFile.size,
          };
        } catch (uploadErr) {
          console.error("File upload error:", uploadErr);
          toast.error("Failed to upload file. Please try again.");
          setUploading(false);
          setSending(false);
          return;
        }
      }
      
      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: currentUserId,
        senderLabel: currentUserLabel,
        text: text || (selectedFile ? `Attached: ${selectedFile.name}` : ""),
        ts: Date.now(),
        attachment,
      };
      
      await sendMessage(ticketId, msg);
      setDraft("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Send error:", error);
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setSelectedFile(file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        className="gh-english-surface w-[calc(100%-2rem)] p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-t-xl max-sm:rounded-b-none"
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
                      <div className="flex flex-col gap-1.5">
                        <div
                          className={cn(
                            "min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                            isMe
                              ? "bg-slate-900 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-900 rounded-bl-sm",
                          )}
                        >
                          {msg.text}
                        </div>
                        {/* Attachment preview */}
                        {msg.attachment && (
                          <a
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
                              isMe
                                ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            {msg.attachment.type.startsWith("image/") ? (
                              <ImageIcon className="h-4 w-4 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate flex-1">{msg.attachment.name}</span>
                            <span className="text-[10px] opacity-70 shrink-0">
                              {(msg.attachment.size / 1024).toFixed(0)} KB
                            </span>
                            <Download className="h-3 w-3 shrink-0 opacity-50" />
                          </a>
                        )}
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
        <div className="shrink-0 border-t border-slate-200 px-4 py-3 space-y-2">
          {/* File preview */}
          {selectedFile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <Paperclip className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-xs flex-1 truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-slate-500 shrink-0">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={removeSelectedFile}
                className="text-slate-400 hover:text-red-600 shrink-0"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {/* Input row */}
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="sr-only"
              id="discussion-file-input"
            />
            <label
              htmlFor="discussion-file-input"
              className={cn(
                "shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 cursor-pointer transition-colors",
                uploading || sending
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <Paperclip className="h-4 w-4 text-slate-600" />
            </label>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? "Add a message (optional)..." : "Type a message…"}
              className="min-w-0 flex-1 text-sm"
              maxLength={1000}
              disabled={sending || uploading}
              autoFocus={open}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={(!draft.trim() && !selectedFile) || sending || uploading}
              className="shrink-0 h-9 w-9 p-0"
            >
              {uploading ? (
                <span className="text-[10px]">...</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
