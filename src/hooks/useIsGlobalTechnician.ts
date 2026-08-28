import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/roles.functions";

/**
 * Checks if the current user is a "global technician" — created by superadmin
 * from /platform/technicians (admin_id IS NULL in profiles).
 *
 * Returns:
 * - isGlobalTechnician: true if user is a technician with admin_id IS NULL
 * - isTenantTechnician: true if user is a technician with admin_id IS NOT NULL
 * - isTechnician: true if user has any technician role
 */
export function useIsGlobalTechnician() {
  const fetchRole = useServerFn(getMyRole);
  const q = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    staleTime: 60_000,
  });

  const isTechnician = q.data?.role === "technician";
  const adminId = q.data?.profile?.admin_id;
  const isGlobalTechnician = isTechnician && adminId == null;
  const isTenantTechnician = isTechnician && adminId != null;

  return {
    isGlobalTechnician,
    isTenantTechnician,
    isTechnician,
    isLoading: q.isLoading,
  };
}
