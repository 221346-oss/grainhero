import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTickets } from "@/lib/tickets.functions";

export function useTicketCount() {
  const ticketsFn = useServerFn(listTickets);
  
  const { data: ticketData } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => ticketsFn({ data: { status: "open" } }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return ticketData?.tickets?.length ?? 0;
}