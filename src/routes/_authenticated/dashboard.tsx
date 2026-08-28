import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getMyRole } from "@/lib/roles.functions";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { SuperAdminTechnicianPage } from "@/components/dashboards/SuperAdminTechnicianPage";
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard";
import { getImpersonationSession } from "@/components/app/ImpersonationBanner";
import { useState, useEffect } from "react";
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
    case "technician": {
      // Global technicians (admin_id IS NULL) → Command Center
      // Tenant technicians (admin_id IS NOT NULL) → basic dashboard
      const isGlobalTech = data?.profile?.admin_id == null;
      return isGlobalTech ? (
        <SuperAdminTechnicianPage name={name} />
      ) : (
        <TechnicianDashboard name={name} />
      );
    }
    // "admin" and any legacy/pending role → admin dashboard by default
    default:
      return <AdminDashboard name={name} />;
  }
}
