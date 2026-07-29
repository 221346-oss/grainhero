/**
 * TicketChannelKeepAlive
 * Renderless — mounted at the authenticated layout root.
 * Keeps Supabase broadcast channels open for all active tickets so
 * messages and unread counts work even when Discussion dialog is closed.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listTickets } from "@/lib/tickets.functions";
import { attachTicketForUser } from "@/lib/ticketMessages";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";

export function TicketChannelKeepAlive() {
  const listFn = useServerFn(listTickets);
  const [currentUserId, setCurrentUserId] = useState("");

  // Resolve user id once on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

  const { data } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => listFn({ data: { status: "open" } }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!currentUserId, // only after userId is known
  });

  useRealtimeInvalidate("field_tickets", [["field-tickets", "open"]]);

  // Attach channel + unread tracking for every ticket
  useEffect(() => {
    if (!currentUserId) return;
    const tickets = data?.tickets ?? [];
    tickets.forEach((t) => attachTicketForUser(t.id, currentUserId));
  }, [data, currentUserId]);

  return null;
}
