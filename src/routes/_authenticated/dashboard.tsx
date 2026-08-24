import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getMyRole } from "@/lib/roles.functions";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard";
import { getImpersonationSession } from "@/components/app/ImpersonationBanner";
import { useState, useEffect } from "react";
import { listAdminLocations } from "@/lib/locations.functions";
import { LocationScopeProvider, useLocationScope } from "@/components/app/location/LocationScope";
import { LocationPicker } from "@/components/app/location/LocationPicker";
import { LocationSwitcher } from "@/components/app/location/LocationSwitcher";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Grain Hero" },
      {
        name: "description",
        content: "Dashboard workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Dashboard — Grain Hero" },
      { property: "og:description", content: "Dashboard workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  // `?loc=` carries the admin's active location. Registered here so the router
  // preserves it across navigations instead of stripping it as unknown.
  validateSearch: (search: Record<string, unknown>): { loc?: string } => {
    const loc = search.loc;
    return typeof loc === "string" && loc.trim() ? { loc } : {};
  },
  component: DashboardPage,
});

const CHANGE_EVENT = "gh_impersonation_changed";

function DashboardPage() {
  const fetchRole = useServerFn(getMyRole);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });

  // Track impersonation session reactively
  const [impersonating, setImpersonating] = useState(() => getImpersonationSession());
  useEffect(() => {
    const sync = () => setImpersonating(getImpersonationSession());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-red-600">Failed to load role: {(error as Error).message}</div>;
  }

  const realRole = data?.role && data.role !== "pending" ? data.role : "admin";
  // When super_admin is impersonating, downgrade to admin view
  const role = realRole === "super_admin" && impersonating ? "admin" : realRole;
  const name = impersonating ? impersonating.adminName : (data?.profile?.name ?? undefined);

  switch (role) {
    case "super_admin":
      return <SuperAdminDashboard name={name} />;
    case "manager":
      return <ManagerDashboard name={name} />;
    case "technician":
      return <TechnicianDashboard name={name} />;
    // "admin" and any legacy/pending role → admin dashboard by default
    default:
      return <AdminDashboardWithLocations name={name} />;
  }
}

/**
 * Admins pick a location before the dashboard opens.
 *
 * The picker is shown even when there is only one location — that decision was
 * taken deliberately, so an admin always sees where their data is coming from
 * rather than the app quietly choosing for them.
 */
function AdminDashboardWithLocations({ name }: { name?: string }) {
  const fetchLocations = useServerFn(listAdminLocations);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: () => fetchLocations(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  // A failure here must not lock the admin out of their dashboard — fall back
  // to the unscoped view rather than stranding them on an error page.
  if (error) return <AdminDashboard name={name} />;

  return (
    <LocationScopeProvider locations={data?.locations ?? []}>
      <ScopedAdminDashboard name={name} />
    </LocationScopeProvider>
  );
}

function ScopedAdminDashboard({ name }: { name?: string }) {
  const scope = useLocationScope();

  if (scope && !scope.active) {
    return (
      <LocationPicker
        locations={scope.locations}
        name={name}
        onSelect={(key) => scope.select(key)}
      />
    );
  }

  return (
    <>
      {scope?.active && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 sm:px-6">
          <LocationSwitcher />
          <span className="text-[11px] text-muted-foreground">
            Showing {scope.active.warehouseCount}{" "}
            {scope.active.warehouseCount === 1 ? "warehouse" : "warehouses"} in {scope.active.city}
          </span>
        </div>
      )}
      <AdminDashboard name={name} />
    </>
  );
}
