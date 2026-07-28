/**
 * Per-ticket message store + Supabase broadcast bus.
 *
 * Persistence: localStorage under `gh_ticket_msgs_<ticketId>`.
 * Cleared only when ticket is closed/deleted via clearTicketMessages().
 *
 * HMR-safe: state is stored on `window.__gh_ticket_store__` so Vite
 * hot-module-reloads don't wipe the Maps and lose subscriptions.
 *
 * Two listener tiers:
 *  - listeners      — UI (TicketDiscussion). Cleaned up on dialog close. OK.
 *  - coreListeners  — Unread tracking. NEVER cleaned up by UI. Survive HMR.
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

// ── HMR-safe global store ─────────────────────────────────────────────────────
// Stored on `window` so Vite module reloads don't reset the Maps.

declare global {
  interface Window {
    __gh_ticket_store__?: {
      messageStore:         Map<string, ChatMessage[]>;
      channels:             Map<string, RealtimeChannel>;
      listeners:            Map<string, Set<Listener>>;
      coreListeners:        Map<string, Set<Listener>>;
      coreListenersByPair:  Map<string, Listener>;
      unreadCounts:         Map<string, number>;
      unreadListeners:      Map<string, Set<Listener>>;
      attachedForUser:      Set<string>;
    };
  }
}

function getStore() {
  if (!window.__gh_ticket_store__) {
    window.__gh_ticket_store__ = {
      messageStore:        new Map(),
      channels:            new Map(),
      listeners:           new Map(),
      coreListeners:       new Map(),
      coreListenersByPair: new Map(),
      unreadCounts:        new Map(),
      unreadListeners:     new Map(),
      attachedForUser:     new Set(),
    };
  }
  return window.__gh_ticket_store__;
}

// ── localStorage ──────────────────────────────────────────────────────────────

function storageKey(ticketId: string) { return `gh_ticket_msgs_${ticketId}`; }

function loadFromStorage(ticketId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(ticketId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch { return []; }
}

function saveToStorage(ticketId: string, msgs: ChatMessage[]) {
  try { localStorage.setItem(storageKey(ticketId), JSON.stringify(msgs)); } catch { /* quota */ }
}

function removeFromStorage(ticketId: string) {
  try { localStorage.removeItem(storageKey(ticketId)); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function channelName(ticketId: string) { return `ticket-discussion-${ticketId}`; }

function notify(ticketId: string) {
  const s = getStore();
  s.coreListeners.get(ticketId)?.forEach((fn) => fn());
  s.listeners.get(ticketId)?.forEach((fn) => fn());
}

function ensureLoaded(ticketId: string) {
  const s = getStore();
  if (!s.messageStore.has(ticketId)) {
    s.messageStore.set(ticketId, loadFromStorage(ticketId));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function attachTicket(ticketId: string) {
  const s = getStore();
  if (s.channels.has(ticketId)) return;
  ensureLoaded(ticketId);

  const ch = supabase
    .channel(channelName(ticketId), { config: { broadcast: { self: true } } })
    .on("broadcast", { event: "message" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      const msgs = s.messageStore.get(ticketId) ?? [];
      if (msgs.some((m) => m.id === msg.id)) return;
      const updated = [...msgs, msg];
      s.messageStore.set(ticketId, updated);
      saveToStorage(ticketId, updated);
      notify(ticketId);
    })
    .on("broadcast", { event: "edit" }, ({ payload }) => {
      const { id, text } = payload as { id: string; text: string };
      const msgs = s.messageStore.get(ticketId) ?? [];
      const updated = msgs.map((m) => m.id === id ? { ...m, text, edited: true } : m);
      s.messageStore.set(ticketId, updated);
      saveToStorage(ticketId, updated);
      notify(ticketId);
    })
    .on("broadcast", { event: "delete" }, ({ payload }) => {
      const { id } = payload as { id: string };
      const msgs = s.messageStore.get(ticketId) ?? [];
      const updated = msgs.filter((m) => m.id !== id);
      s.messageStore.set(ticketId, updated);
      saveToStorage(ticketId, updated);
      notify(ticketId);
    })
    .subscribe();

  s.channels.set(ticketId, ch);
}

export function detachTicket(ticketId: string) {
  const s = getStore();
  const ch = s.channels.get(ticketId);
  if (ch) supabase.removeChannel(ch);
  s.channels.delete(ticketId);
  s.messageStore.delete(ticketId);
  s.listeners.delete(ticketId);
  s.coreListeners.delete(ticketId);
  removeFromStorage(ticketId);
  for (const pair of s.attachedForUser) {
    if (pair.endsWith(`:${ticketId}`)) {
      s.attachedForUser.delete(pair);
      s.coreListenersByPair?.delete(pair);
    }
  }
}

export function getMessages(ticketId: string): ChatMessage[] {
  ensureLoaded(ticketId);
  return getStore().messageStore.get(ticketId) ?? [];
}

export async function sendMessage(ticketId: string, msg: ChatMessage) {
  const s = getStore();
  if (!s.channels.has(ticketId)) {
    attachTicket(ticketId);
    await new Promise((r) => setTimeout(r, 300));
  }
  const ch = s.channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "message", payload: msg });
}

export async function editMessage(ticketId: string, id: string, newText: string) {
  const ch = getStore().channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "edit", payload: { id, text: newText } });
}

export async function deleteMessage(ticketId: string, id: string) {
  const ch = getStore().channels.get(ticketId);
  if (!ch) return;
  await ch.send({ type: "broadcast", event: "delete", payload: { id } });
}

export function clearTicketMessages(ticketId: string) {
  detachTicket(ticketId);
}

/** UI listener — safe to clean up on component unmount. */
export function subscribeToTicket(ticketId: string, fn: Listener): () => void {
  const s = getStore();
  if (!s.listeners.has(ticketId)) s.listeners.set(ticketId, new Set());
  s.listeners.get(ticketId)!.add(fn);
  return () => s.listeners.get(ticketId)?.delete(fn);
}

// ── Unread count tracking ─────────────────────────────────────────────────────

function unreadKey(userId: string, ticketId: string) { return `${userId}:${ticketId}`; }

function notifyUnread(userId: string) {
  getStore().unreadListeners.get(userId)?.forEach((fn) => fn());
}

/**
 * Attach channel + register PERSISTENT unread tracking.
 * Uses coreListeners — survives dialog close and Vite HMR.
 */
export function attachTicketForUser(ticketId: string, currentUserId: string) {
  if (!currentUserId) return;
  attachTicket(ticketId);

  const s = getStore();
  const pair = `${currentUserId}:${ticketId}`;
  if (s.attachedForUser.has(pair)) return;
  s.attachedForUser.add(pair);

  // Use a single named listener function stored by pair key so it can
  // never be registered twice even if this function is called concurrently
  let lastCountedId: string | null = null;

  // Remove any stale listener for this pair before adding fresh one
  // (guards against window store surviving but listener being stale)
  const existing = s.coreListenersByPair?.get(pair);
  if (existing) {
    s.coreListeners.get(ticketId)?.delete(existing);
  }
  if (!s.coreListenersByPair) s.coreListenersByPair = new Map();

  const listener = () => {
    const msgs = getMessages(ticketId);
    if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    if (last && last.senderId !== currentUserId && last.id !== lastCountedId) {
      lastCountedId = last.id;
      const key = unreadKey(currentUserId, ticketId);
      s.unreadCounts.set(key, (s.unreadCounts.get(key) ?? 0) + 1);
      notifyUnread(currentUserId);
    }
  };

  s.coreListenersByPair.set(pair, listener);
  if (!s.coreListeners.has(ticketId)) s.coreListeners.set(ticketId, new Set());
  s.coreListeners.get(ticketId)!.add(listener);
}

export function markTicketRead(userId: string, ticketId: string) {
  const s = getStore();
  s.unreadCounts.set(unreadKey(userId, ticketId), 0);
  notifyUnread(userId);
}

export function getUnreadCount(userId: string, ticketId: string): number {
  return getStore().unreadCounts.get(unreadKey(userId, ticketId)) ?? 0;
}

export function getTotalUnread(userId: string): number {
  let total = 0;
  for (const [key, count] of getStore().unreadCounts) {
    if (key.startsWith(`${userId}:`)) total += count;
  }
  return total;
}

/** Subscribe to unread count changes. Survives HMR via window store. */
export function subscribeUnread(userId: string, fn: Listener): () => void {
  const s = getStore();
  if (!s.unreadListeners.has(userId)) s.unreadListeners.set(userId, new Set());
  s.unreadListeners.get(userId)!.add(fn);
  return () => s.unreadListeners.get(userId)?.delete(fn);
}
