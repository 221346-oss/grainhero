import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications-audit.functions";

type Row = Awaited<ReturnType<typeof listNotifications>>["notifications"][number];

/**
 * Phase 5 — Realtime notifications hook.
 * - Primes cache via `listNotifications` (last 50 for the user).
 * - Subscribes to postgres_changes filtered by recipient.
 * - Pops a toast when a new ticket notification arrives.
 * - Returns unread count + mark helpers.
 */
export function useNotifications(userId: string | null | undefined) {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const key = ["notifications", "bell", userId ?? "anon"] as const;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => list({ data: { filter: "all", limit: 20 } }),
    enabled: !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          // Also invalidate ticket list so super admin sees new tickets live
          qc.invalidateQueries({ queryKey: ["field-tickets"] });

          // Pop a toast for ticket notifications so super admin is actively alerted
          const row = payload.new as Record<string, unknown>;
          if (row?.category === "ticket") {
            toast(String(row.title ?? "New incident ticket"), {
              description: String(row.message ?? ""),
              duration: 6000,
              action: row.action_url
                ? {
                    label: "View",
                    onClick: () => {
                      window.location.href = String(row.action_url);
                    },
                  }
                : undefined,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const readMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const allMut = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items: Row[] = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = data?.unread_count ?? 0;

  return {
    items,
    unreadCount,
    isLoading,
    markRead: (id: string) => readMut.mutate(id),
    markAllRead: () => allMut.mutate(),
  };
}
