import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/roles.functions";

/** Cached role check. Returns `true` only when the user is a super_admin. */
export function useIsSuperAdmin() {
  const fetchRole = useServerFn(getMyRole);
  const q = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    staleTime: 60_000,
  });
  return {
    isSuperAdmin: q.data?.role === "super_admin",
    role: q.data?.role ?? null,
    isLoading: q.isLoading,
  };
}
