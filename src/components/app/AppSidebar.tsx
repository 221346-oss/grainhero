import React from "react";
import { useRouterState, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Package,
  QrCode, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FlowingNavItem } from "@/components/app/FlowingNavItem";
import { getMyRole, type AppRole } from "@/lib/roles.functions";
import { countPendingOrders } from "@/lib/hardware-orders.functions";
import { useQueryClient } from "@tanstack/react-query";
import { getImpersonationSession } from "@/components/app/ImpersonationBanner";

type NavItem = {
  name: string;
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: AppRole[];
  badge?: string;
  /** Section names inside this workspace — scrolled in the hover marquee. */
  marqueeItems?: string[];
};

// Group 2 — the five consolidated workspaces.
const workspaceNav: NavItem[] = [
  { name: "grain-operations", label: "Grain Operations", to: "/grain-operations", roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Grain Batches", "Silos", "Warehouses", "Buyers"] },
  { name: "monitoring", label: "Monitoring", to: "/monitoring", roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Sensors", "Actuators", "Alerts", "Environmental", "Device Health", "Maintenance", "Incidents"] },
  { name: "intelligence", label: "Intelligence", to: "/intelligence", roles: ["super_admin", "admin", "manager", "technician"], badge: "AI", marqueeItems: ["AI Predictions", "Analytics", "ML Models", "Reports"] },
  { name: "business", label: "Business", to: "/business", roles: ["super_admin", "admin", "manager"], marqueeItems: ["Revenue", "Subscription", "Insurance"] },
  { name: "administration", label: "Administration", to: "/administration", roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Team Management", "Security Center", "Activity Logs"] },
];

// Group 3 — standalone pages. Platform is a single entry to the platform area.
const utilityNav: NavItem[] = [
  { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["admin", "manager", "technician"], marqueeItems: ["Total Batches", "Stored", "Dispatched", "High Risk"] },
  { name: "platform-orders", label: "Install Orders", to: "/platform/orders", icon: Package, roles: ["super_admin"], marqueeItems: ["Pending", "Completed", "Revenue"] },
  { name: "platform", label: "Platform", to: "/platform", roles: ["super_admin"], marqueeItems: ["Overview", "Tenants", "Users", "Plans & Thresholds", "Pipeline", "Leads", "System Health", "Audit Logs", "Activity Feed"] },
];

// Bottom "admin" strip — Slack shows Admin at the bottom of the workspace rail.
const bottomNav: NavItem[] = [
  { name: "settings", label: "Settings", to: "/settings", icon: Settings, roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Profile", "Location", "Notifications", "Appearance"] },
];

function hasVisible(items: NavItem[], role: AppRole) {
  return items.some((i) => i.roles.includes(role));
}

function Section({ items, role, currentPath }: { label?: string; items: NavItem[]; role: AppRole; currentPath: string; showLabel?: boolean }) {
  // Sidebar is permanently visible (collapsible="none") — never render collapsed.
  const collapsed = false;
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <div className={cn(collapsed && "flex flex-col items-center py-1")}>
      {visible.map((item) => {
        const active = item.to === "/platform"
          ? currentPath === "/platform" || currentPath.startsWith("/platform/")
          : currentPath === item.to;
        return (
          <FlowingNavItem
            key={item.name}
            label={item.label}
            to={item.to}
            active={active}
            collapsed={collapsed}
            badge={item.badge}
            dataTour={`nav-${item.name}`}
            marqueeItems={item.marqueeItems}
          />
        );
      })}
    </div>
  );
}

export function AppSidebar({ hidden = false }: { hidden?: boolean }) {
  const collapsed = false;
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const { data } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });
  const realRole: AppRole = data?.role ?? "pending";

  // Track impersonation session reactively
  const [impersonating, setImpersonating] = React.useState(() => getImpersonationSession());
  React.useEffect(() => {
    const sync = () => setImpersonating(getImpersonationSession());
    window.addEventListener("storage", sync);
    window.addEventListener("gh_impersonation_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("gh_impersonation_changed", sync);
    };
  }, []);

  // When super_admin is impersonating, show admin-level navigation
  const role: AppRole = realRole === "super_admin" && impersonating ? "admin" : realRole;

  const fetchPending = useServerFn(countPendingOrders);
  const { data: pending } = useQuery({
    queryKey: ["pending-order-count"],
    queryFn: () => fetchPending(),
    enabled: realRole === "super_admin",
    refetchInterval: 60_000,
  });
  // pending count kept available for future badge on Install Orders
  void pending;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  void collapsed;

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-screen w-56 bg-transparent">
      <div className="flex h-full flex-col px-3">

        {/* Logo — fixed at the top, outside the dock, never hidden by scroll */}
        <div className="px-2 py-4">
          <Link
            to="/dashboard"
            aria-label="GrainHero dashboard"
            className="text-xl font-black tracking-tight select-none inline-block rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <span className="text-[#2FAC0C] text-2xl">G</span>
            <span className="text-sidebar-foreground">rain</span>
            <span className="text-[#2FAC0C] text-2xl">H</span>
            <span className="text-sidebar-foreground">ero</span>
          </Link>
        </div>

        {/* Floating dock — curved rectangle, vertically centered on the left */}
        <div
          className={`flex min-h-0 flex-1 items-center pb-6 transition-transform duration-300 ease-out ${
            hidden ? "-translate-x-[120%]" : "translate-x-0"
          }`}
        >
          <div className="flex w-full max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-sidebar-border/60 bg-sidebar shadow-2xl shadow-black/30">

            {/* Nav — workspaces / standalone pages, separated by dividers */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Section items={workspaceNav} role={role} currentPath={currentPath} showLabel={false} />
              {hasVisible(utilityNav, role) && <div className="mx-3 my-1.5 h-px bg-sidebar-border/80" />}
              <Section items={utilityNav} role={role} currentPath={currentPath} showLabel={false} />
            </div>

            {/* Footer */}
            <div className="border-t border-sidebar-border/40">
              <Section items={bottomNav} role={role} currentPath={currentPath} showLabel={false} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-9 w-full justify-start rounded-none px-4 text-sidebar-foreground/80 hover:text-red-600 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="ml-2">Sign out</span>
              </Button>
            </div>

          </div>
        </div>

      </div>
    </Sidebar>
  );
}
