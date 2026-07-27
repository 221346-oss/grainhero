/**
 * Ephemeral per-ticket message store + Supabase broadcast bus.
 *
 * Why a singleton?
 * ─────────────────
 * Messages must persist even when the Discussion dialog is closed.
 * React state is destroyed on unmount, so we lift the message store
 * outside React into a plain module-level Map. Each ticket gets its own
 * array of messages. The Supabase broadcast channel for a ticket is also
 * kept alive here so messages arrive even while the dialog is closed.
 *
 * Both the TicketDetailSheet AND the reporting page reference the same
 * channel/store for the same ticketId, so they share conversations.
 *
 * Cleanup: call detachTicket(ticketId) when the ticket is closed.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  senderId: string;
  senderLabel: string;
  text: string;
  ts: number;
  edited?: boolean;
};

type Listener = () => void;

// ── Module-level state ────────────────────────────────────────────────────────

const messageStore = new Map<string, ChatMessage[]>();
const channels = new Map<string, RealtimeChannel>();
const listeners = new Map<string, Set<Listener>>();

function channelName(ticketId: string) {
  return `ticket-discussion-${ticketId}`;
}

function notify(ticketId: string) {
  listeners.get(ticketId)?.forEach((fn) => fn());
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Ensure the broadcast channel for this ticket is open and receiving. */
export function attachTicket(ticketId: string) {
  if (channels.has(ticketId)) return; // already attached

  if (!messageStore.has(ticketId)) messageStore.set(ticketId, []);

  const ch = supabase
    .channel(channelName(ticketId), { config: { broadcast: { self: true } } })
    .on("broadcast", { event: "message" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      const msgs = messageStore.get(ticketId) ?? [];
      if (msgs.some((m) => m.id === msg.id)) return; // deduplicate
      messageStore.set(ticketId, [...msgs, msg]);
      notify(ticketId);
    })
    .on("broadcast", { event: "edit" }, ({ payload }) => {
      const { id, text } = payload as { id: string; text: string };
      const msgs = messageStore.get(ticketId) ?? [];
      messageStore.set(
        ticketId,
        msgs.map((m) => (m.id === id ? { ...m, text, edited: true } : m)),
      );
      notify(ticketId);
    })
    .on("broadcast", { event: "delete" }, ({ payload }) => {
      const { id } = payload as { id: string };
      const msgs = messageStore.get(ticketId) ?? [];
      messageStore.set(ticketId, msgs.filter((m) => m.id !== id));
      notify(ticketId);
    })
    .subscribe();

  channels.set(ticketId, ch);
}

/** Remove the channel and wipe messages (call when ticket is closed). */
export function detachTicket(ticketId: string) {
  const ch = channels.get(ticketId);
  if (ch) supabase.removeChannel(ch);
  channels.delete(ticketId);
  messageStore.delete(ticketId);
  listeners.delete(ticketId);
}

/** Get current messages snapshot. */
export function getMessages(ticketId: string): ChatMessage[] {
  return messageStore.get(ticketId) ?? [];
}

/** Send a new message. */
export async function sendMessage(ticketId: string, msg: ChatMessage) {
  const ch = channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "message", payload: msg });
}

/** Edit a message (broadcast to all). */
export async function editMessage(ticketId: string, id: string, newText: string) {
  const ch = channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "edit", payload: { id, text: newText } });
}

/** Delete a message (broadcast to all). */
export async function deleteMessage(ticketId: string, id: string) {
  const ch = channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "delete", payload: { id } });
}

/** Subscribe to store changes for a ticketId. Returns unsubscribe fn. */
export function subscribeToTicket(ticketId: string, fn: Listener): () => void {
  if (!listeners.has(ticketId)) listeners.set(ticketId, new Set());
  listeners.get(ticketId)!.add(fn);
  return () => listeners.get(ticketId)?.delete(fn);
}

// ── Unread count tracking ─────────────────────────────────────────────────────
// Each user has their own unread count per ticket. When a message arrives
// via broadcast and the discussion dialog is NOT open, the count increments.
// When the user opens the dialog, markAllRead() resets it to 0.

const unreadCounts = new Map<string, number>(); // key: `${userId}:${ticketId}`
const unreadListeners = new Map<string, Set<Listener>>(); // key: userId

function unreadKey(userId: string, ticketId: string) {
  return `${userId}:${ticketId}`;
}

function notifyUnread(userId: string) {
  unreadListeners.get(userId)?.forEach((fn) => fn());
}

/**
 * Attach a ticket channel AND track unread messages for a specific user.
 * Call this instead of bare attachTicket when you know the current user.
 * IDEMPOTENT — safe to call multiple times for the same userId+ticketId.
 */

// Track which userId+ticketId pairs have had a listener registered
const attachedForUser = new Set<string>();

export function attachTicketForUser(ticketId: string, currentUserId: string) {
  // Attach the channel first (idempotent)
  attachTicket(ticketId);

  // Only register one unread-tracking listener per userId+ticketId pair
  const pair = `${currentUserId}:${ticketId}`;
  if (attachedForUser.has(pair)) return;
  attachedForUser.add(pair);

  // Track the last message id we've already counted to avoid double-counting
  let lastCountedId: string | null = null;

  subscribeToTicket(ticketId, () => {
    const msgs = getMessages(ticketId);
    if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    // Only increment once per unique incoming message from someone else
    if (last && last.senderId !== currentUserId && last.id !== lastCountedId) {
      lastCountedId = last.id;
      const key = unreadKey(currentUserId, ticketId);
      const prev = unreadCounts.get(key) ?? 0;
      unreadCounts.set(key, prev + 1);
      notifyUnread(currentUserId);
    }
  });
}

/** Reset unread count for a user+ticket (call when discussion opens). */
export function markTicketRead(userId: string, ticketId: string) {
  unreadCounts.set(unreadKey(userId, ticketId), 0);
  notifyUnread(userId);
}

/** Get unread count for a specific user+ticket. */
export function getUnreadCount(userId: string, ticketId: string): number {
  return unreadCounts.get(unreadKey(userId, ticketId)) ?? 0;
}

/** Get total unread across all tickets for a user. */
export function getTotalUnread(userId: string): number {
  let total = 0;
  for (const [key, count] of unreadCounts) {
    if (key.startsWith(`${userId}:`)) total += count;
  }
  return total;
}

/** Subscribe to any unread count change for a user. Returns unsubscribe fn. */
export function subscribeUnread(userId: string, fn: Listener): () => void {
  if (!unreadListeners.has(userId)) unreadListeners.set(userId, new Set());
  unreadListeners.get(userId)!.add(fn);
  return () => unreadListeners.get(userId)?.delete(fn);
}
