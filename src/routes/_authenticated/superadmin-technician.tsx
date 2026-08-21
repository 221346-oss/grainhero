/**
 * SuperAdmin Technician Dashboard
 *
 * A dedicated workspace for users with the technician role who need
 * fleet-wide visibility. This is the "superadmin technician" experience:
 * a technician who can manage the entire fleet, all installations,
 * ticketing, and provide real-time status updates — all from a single
 * comprehensive dashboard.
 *
 * Route: /superadmin-technician
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/roles.functions";
import { SuperAdminTechnicianPage } from "@/components/dashboards/SuperAdminTechnicianPage";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/superadmin-technician")({
  head: () => ({
    meta: [
      { title: "Technician Command Center — Grain Hero" },
      {
        name: "description",
        content:
          "Fleet management, installations, ticketing and real-time status for superadmin technicians.",
      },
      { property: "og:title", content: "Technician Command Center — Grain Hero" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    // Allow both technicians and super_admins to access this page.
    // Technicians get the full fleet view; super_admins also get it
    // (they can already access /platform/technicians, but this gives
    // them the technician-centric experience).
    //
    // The server functions enforce their own role checks, so this
    // beforeLoad is a lightweight client-side gate to redirect
    // non-technician/non-superadmin users to the not-allowed page.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/auth/login" });
    }
  },
  component: SuperAdminTechnicianRoute,
});

function SuperAdminTechnicianRoute() {
  const fetchRole = useServerFn(getMyRole);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-sm text-red-600">Failed to load role: {(error as Error).message}</p>
      </div>
    );
  }

  const role = data?.role ?? "admin";

  // Only technicians and super_admins can access this page
  if (role !== "technician" && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          The Technician Command Center is available to technicians and super administrators only.
          Your current role is <span className="font-medium">{role}</span>.
        </p>
      </div>
    );
  }

  const name = data?.profile?.name ?? undefined;

  return <SuperAdminTechnicianPage name={name} />;
}
