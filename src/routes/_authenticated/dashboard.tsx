import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getMyRole } from "@/lib/roles.functions";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard";
import { PendingDashboard } from "@/components/dashboards/PendingDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchRole = useServerFn(getMyRole);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your workspace…
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-red-600">Failed to load role: {(error as Error).message}</div>;
  }

  const role = data?.role ?? "pending";
  const name = data?.profile?.name ?? undefined;

  switch (role) {
    case "super_admin": return <SuperAdminDashboard name={name} />;
    case "admin": return <AdminDashboard name={name} />;
    case "manager": return <ManagerDashboard name={name} />;
    case "technician": return <TechnicianDashboard name={name} />;
    default: return <PendingDashboard name={name} />;
  }
}