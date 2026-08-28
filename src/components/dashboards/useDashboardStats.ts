import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/operations.functions";

export function useDashboardStats() {
  const fetch = useServerFn(getDashboardStats);
  return useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetch() });
}
