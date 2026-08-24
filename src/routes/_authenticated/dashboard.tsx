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
import { useLocationScope } from "@/components/app/location/LocationScope";
import { LocationPicker } from "@/components/app/location/LocationPicker";
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
 * rather than the app quietly choosing for them. The scope itself is provided
 * by LocationScopeGate in the authenticated layout, so the header switcher and
 * every other page share it.
 */
function AdminDashboardWithLocations({ name }: { name?: string }) {
  const scope = useLocationScope();

  // No scope, or none resolved yet — fall back to the unscoped dashboard rather
  // than stranding the admin on a chooser that may never populate.
  if (!scope || scope.locations.length === 0) return <AdminDashboard name={name} />;

  if (!scope.active) {
    return (
      <LocationPicker
        locations={scope.locations}
        name={name}
        onSelect={(key) => scope.select(key)}
      />
    );
  }

  return <AdminDashboard name={name} />;
}
