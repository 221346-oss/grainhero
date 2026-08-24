/**
 * LocationScopeGate — provides the active location to the whole authenticated app.
 *
 * Mounted in the authenticated layout rather than on a single page, because the
 * scope has to be readable from the header switcher and from every page that
 * shows location-dependent data, not just the dashboard.
 *
 * Only admins have a location scope. Managers and technicians are already bound
 * to one warehouse, and super admins look across tenants — for all of them this
 * provides an empty scope, which every consumer treats as "no location filter"
 * and leaves their behaviour exactly as it was.
 */
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminLocations } from "@/lib/locations.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { LocationScopeProvider } from "./LocationScope";

export function LocationScopeGate({ children }: { children: ReactNode }) {
  const { role } = useIsSuperAdmin();
  const isAdmin = role === "admin";

  const fetchLocations = useServerFn(listAdminLocations);
  const { data } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: () => fetchLocations(),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  return (
    <LocationScopeProvider locations={isAdmin ? (data?.locations ?? []) : []}>
      {children}
    </LocationScopeProvider>
  );
}
