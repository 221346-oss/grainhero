import React from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Package,
  QrCode,
  Settings,
  Wheat,
  Activity,
  Sparkles,
  Briefcase,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { FlowingNavItem } from "@/components/app/FlowingNavItem";
import { getMyRole, type AppRole } from "@/lib/roles.functions";
import { countPendingOrders } from "@/lib/hardware-orders.functions";
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
  { name: "grain-operations", label: "Grain Operations", to: "/grain-operations", icon: Wheat, roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Grain Batches", "Silos", "Warehouses", "Buyers"] },
  { name: "monitoring", label: "Monitoring", to: "/monitoring", icon: Activity, roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Sensors", "Actuators", "Alerts", "Environmental", "Device Health", "Maintenance", "Incidents"] },
  { name: "intelligence", label: "Intelligence", to: "/intelligence", icon: Sparkles, roles: ["super_admin", "admin", "manager", "technician"], badge: "AI", marqueeItems: ["AI Predictions", "Analytics", "ML Models", "Reports"] },
  { name: "business", label: "Business", to: "/business", icon: Briefcase, roles: ["super_admin", "admin", "manager"], marqueeItems: ["Revenue", "Subscription", "Insurance"] },
  { name: "administration", label: "Administration", to: "/administration", icon: ShieldCheck, roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Team Management", "Security Center", "Activity Logs"] },
];

// Group 3 — standalone pages. Platform is a single entry to the platform area.
const utilityNav: NavItem[] = [
  { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["admin", "manager", "technician"], marqueeItems: ["Total Batches", "Stored", "Dispatched", "High Risk"] },
  { name: "platform-orders", label: "Install Orders", to: "/platform/orders", icon: Package, roles: ["super_admin"], marqueeItems: ["Pending", "Completed", "Revenue"] },
  { name: "platform", label: "Platform", to: "/platform", icon: Building2, roles: ["super_admin"], marqueeItems: ["Overview", "Tenants", "Users", "Plans & Thresholds", "Pipeline", "Leads", "System Health", "Audit Logs", "Activity Feed"] },
];

// Bottom "admin" strip — Slack shows Admin at the bottom of the workspace rail.
const bottomNav: NavItem[] = [
  { name: "settings", label: "Settings", to: "/settings", icon: Settings, roles: ["super_admin", "admin", "manager", "technician"], marqueeItems: ["Profile", "Location", "Notifications", "Appearance"] },
];

function hasVisible(items: NavItem[], role: AppRole) {
  return items.some((i) => i.roles.includes(role));
}

function Section({ items, role, currentPath, collapsed }: { label?: string; items: NavItem[]; role: AppRole; currentPath: string; showLabel?: boolean; collapsed: boolean }) {
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <div className={cn(collapsed && "flex flex-col items-center py-2 gap-0.5")}>
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
            icon={item.icon}
          />
        );
      })}
    </div>
  );
}

export function AppSidebar({ collapsed = true, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
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
  void pending;
  void useNavigate;

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "sticky top-0 h-screen bg-transparent transition-[width] duration-300 ease-out",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div className="flex h-full flex-col items-center justify-center px-2 py-3">
        {/* Logo — click to toggle rail ↔ expanded */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mx-auto mb-2 grid place-items-center rounded-2xl transition-all duration-200 hover:scale-[1.04] hover:bg-sidebar-accent/60 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            collapsed ? "h-11 w-11" : "h-11 w-[calc(100%-0.5rem)] justify-self-stretch px-3",
          )}
        >
          {collapsed ? (
            <span className="text-lg font-black tracking-tight select-none">
              <span className="text-[#2FAC0C]">G</span>
              <span className="text-sidebar-foreground">H</span>
            </span>
          ) : (
            <span className="text-lg font-black tracking-tight select-none w-full text-left">
              <span className="text-[#2FAC0C] text-xl">G</span>
              <span className="text-sidebar-foreground">rain</span>
              <span className="text-[#2FAC0C] text-xl">H</span>
              <span className="text-sidebar-foreground">ero</span>
            </span>
          )}
        </button>

        {/* Nav dock — compact, centered vertically, sized to content */}
        <div className="flex w-full flex-col items-stretch">
          <div
            className={cn(
              "flex w-full flex-col overflow-hidden rounded-3xl border border-sidebar-border/60 bg-sidebar shadow-2xl shadow-black/20",
            )}
          >
            <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
              <Section items={workspaceNav} role={role} currentPath={currentPath} collapsed={collapsed} />
              {hasVisible(utilityNav, role) && (
                <div className={cn("h-px bg-sidebar-border/80", collapsed ? "mx-3 my-1" : "mx-3 my-1.5")} />
              )}
              <Section items={utilityNav} role={role} currentPath={currentPath} collapsed={collapsed} />
            </div>
            <div className="border-t border-sidebar-border/40 py-1">
              <Section items={bottomNav} role={role} currentPath={currentPath} collapsed={collapsed} />
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
