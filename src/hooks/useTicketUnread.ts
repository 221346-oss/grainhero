/**
 * useTicketUnread
 * Reactive hook that returns unread message counts from the ticketMessages
 * singleton store. Re-renders whenever any unread count changes for the
 * current user.
 */
import { useState, useEffect } from "react";
import {
  getUnreadCount,
  getTotalUnread,
  markTicketRead,
  subscribeUnread,
} from "@/lib/ticketMessages";

export function useTicketUnread(userId: string | null | undefined) {
  const [, setTick] = useState(0); // force re-render on store change

  useEffect(() => {
    if (!userId) return;
    return subscribeUnread(userId, () => setTick((n) => n + 1));
  }, [userId]);

  return {
    /** Unread count for a specific ticket. */
    unreadFor: (ticketId: string) =>
      userId ? getUnreadCount(userId, ticketId) : 0,
    /** Total unread across all tickets. */
    totalUnread: userId ? getTotalUnread(userId) : 0,
    /** Call when the user opens the discussion dialog for a ticket. */
    markRead: (ticketId: string) => {
      if (userId) markTicketRead(userId, ticketId);
    },
  };
}
