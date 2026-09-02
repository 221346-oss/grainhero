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
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminLocations } from "@/lib/locations.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { getImpersonationSession } from "@/components/app/ImpersonationBanner";
import { LocationScopeProvider } from "./LocationScope";

const IMPERSONATION_CHANGED = "gh_impersonation_changed";

export function LocationScopeGate({ children }: { children: ReactNode }) {
  const { role } = useIsSuperAdmin();

  // `useIsSuperAdmin` reports the *real* role, so a super admin who is
  // impersonating still reads as "super_admin" here — while /dashboard
  // downgrades them to "admin" and renders the location picker. Without this
  // the two disagree: the dashboard asks for locations the gate never fetched,
  // and an impersonated tenant is shown "No locations yet" regardless of how
  // many warehouses they own.
  const [impersonating, setImpersonating] = useState(() => getImpersonationSession());
  useEffect(() => {
    const sync = () => setImpersonating(getImpersonationSession());
    window.addEventListener("storage", sync);
    window.addEventListener(IMPERSONATION_CHANGED, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(IMPERSONATION_CHANGED, sync);
    };
  }, []);

  const isAdmin = role === "admin" || (role === "super_admin" && impersonating !== null);

  const fetchLocations = useServerFn(listAdminLocations);
  const { data, isPending } = useQuery({
    queryKey: ["admin-locations", impersonating?.adminId ?? null],
    queryFn: () => fetchLocations(),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  // Non-admins never load anything, so they are ready immediately. For an admin
  // the list is not trustworthy until the query settles — an empty list mid-flight
  // is indistinguishable from "no warehouses" and would flash the unscoped view.
  const ready = !isAdmin || !isPending;

  return (
    <LocationScopeProvider
      locations={isAdmin ? (data?.locations ?? []) : []}
      plan={isAdmin ? data?.plan : undefined}
      ready={ready}
    >
      {children}
    </LocationScopeProvider>
  );
}
