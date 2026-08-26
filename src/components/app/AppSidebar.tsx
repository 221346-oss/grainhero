import React from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import {
  Package,
  Wheat,
  Activity,
  Sparkles,
  Briefcase,
  ShieldCheck,
  Building2,
  EyeOff,
  ChevronRight,
  CreditCard,
  Inbox,
  Wrench,
  Radio,
  ToggleRight,
  Bell,
  Shield,
} from "lucide-react";
// QrCode import retained — used by Traceability nav item when re-enabled
// import { QrCode } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FlowingNavItem } from "@/components/app/FlowingNavItem";
import { getMyRole, type AppRole } from "@/lib/roles.functions";
import { countPendingOrders } from "@/lib/hardware-orders.functions";
import { getImpersonationSession } from "@/components/app/ImpersonationBanner";

// Desktop sidebar has 3 committed states: "expanded" (full width, labels),
// "collapsed" (icon-only rail), "hidden" (fully gone, edge handle to bring
// back). Owned by the authenticated layout (persisted + scroll-driven).
export type SidebarMode = "expanded" | "collapsed" | "hidden";

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
// Labels are now translated via the useTranslation hook inside the component.







// Bottom nav — intentionally empty; Settings is accessible via the profile
// menu in the top-right header to avoid duplication in the sidebar rail.
const bottomNav: NavItem[] = [];

function Section({
  items,
  role,
  currentPath,
  collapsed,
}: {
  label?: string;
  items: NavItem[];
  role: AppRole;
  currentPath: string;
  showLabel?: boolean;
  collapsed: boolean;
}) {
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <div className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
      {visible.map((item) => {
        // /platform is the overview hub — only highlight it for the exact path
        // or sub-paths that don't have their own dedicated sidebar entry.
        const platformSubPaths = [
          "/platform/plans",
          "/platform/business",
          "/platform/monitoring",
          "/platform/silo-requests",
        ];
        const active =
          item.to === "/platform"
            ? currentPath === "/platform" ||
              (currentPath.startsWith("/platform/") &&
                !platformSubPaths.some((p) => currentPath === p || currentPath.startsWith(p + "/")))
            : currentPath === item.to ||
              (item.to !== "/platform" && currentPath.startsWith(item.to + "/"));
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

export function AppSidebar({
  mode,
  onModeChange,
}: {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
}) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = mode !== "expanded";
  const isHidden = mode === "hidden";
  const { t } = useTranslation();

  // Build translated nav arrays
  const workspaceNav: NavItem[] = [
    { name: "grain-operations", label: t("sidebar.grainOperations"), to: "/grain-operations", icon: Wheat, roles: ["admin", "manager"], marqueeItems: [t("sidebar.grainBatches"), t("sidebar.silos"), t("sidebar.warehouses"), t("sidebar.buyers")] },
    { name: "monitoring", label: t("sidebar.monitoring"), to: "/monitoring", icon: Activity, roles: ["admin", "manager"], marqueeItems: [t("sidebar.incidents")] },
    { name: "intelligence", label: t("sidebar.intelligence"), to: "/intelligence", icon: Sparkles, roles: ["admin", "manager"], badge: "AI", marqueeItems: [t("sidebar.aiPredictions"), t("sidebar.analytics"), t("sidebar.mlModels"), t("sidebar.reports")] },
    { name: "subscription", label: t("sidebar.subscription"), to: "/subscription", icon: CreditCard, roles: ["admin", "manager"], marqueeItems: [t("sidebar.myPlan"), t("sidebar.usage"), t("sidebar.billing"), t("sidebar.upgrade")] },
    { name: "business", label: t("sidebar.business"), to: "/business", icon: Briefcase, roles: ["admin", "manager"], marqueeItems: [t("sidebar.revenue"), t("sidebar.subscription")] },
    { name: "administration", label: t("sidebar.administration"), to: "/administration", icon: ShieldCheck, roles: ["admin", "manager"], marqueeItems: [t("sidebar.teamManagement"), t("sidebar.securityCenter"), t("sidebar.activityLogs")] },
  ];

  const globalTechnicianNav: NavItem[] = [
    { name: "installs", label: t("sidebar.myInstalls"), to: "/technician/installs", icon: Package, roles: ["technician"], marqueeItems: [t("sidebar.assigned"), t("sidebar.inProgress"), t("sidebar.completed")] },
  ];

  const tenantTechnicianNav: NavItem[] = [
    { name: "dashboard", label: t("sidebar.dashboard"), to: "/dashboard", icon: Wrench, roles: ["technician"], marqueeItems: [t("sidebar.status"), t("sidebar.availability")] },
    { name: "sensors", label: t("sidebar.sensors"), to: "/sensors", icon: Radio, roles: ["technician"], marqueeItems: [t("sidebar.online"), t("sidebar.offline"), t("sidebar.readings")] },
    { name: "actuators", label: t("sidebar.actuators"), to: "/actuators", icon: ToggleRight, roles: ["technician"], marqueeItems: [t("sidebar.active"), t("sidebar.inactive")] },
    { name: "alerts", label: t("sidebar.alerts"), to: "/grain-alerts", icon: Bell, roles: ["technician"], marqueeItems: [t("sidebar.open"), t("sidebar.critical")] },
  ];

  const utilityNav: NavItem[] = [
    { name: "platform-plans", label: t("sidebar.plans"), to: "/platform/plans", icon: CreditCard, roles: ["super_admin"], marqueeItems: [t("sidebar.editLimits"), t("sidebar.activeInactive"), t("sidebar.popularBadge"), t("sidebar.changeRequests")] },
    { name: "platform-business", label: t("sidebar.business"), to: "/platform/business", icon: Briefcase, roles: ["super_admin"], marqueeItems: [t("sidebar.revenue"), t("sidebar.subscription"), t("sidebar.installOrders")] },
    { name: "platform-monitoring", label: t("sidebar.monitoring"), to: "/platform/monitoring", icon: Activity, roles: ["super_admin"], marqueeItems: [t("sidebar.incidents"), t("sidebar.environmental"), t("sidebar.maintenance")] },
    { name: "platform-silo-requests", label: t("sidebar.siloRequests"), to: "/platform/silo-requests", icon: Inbox, roles: ["super_admin"], marqueeItems: [t("sidebar.pendingReview"), t("sidebar.approved"), t("sidebar.rejected"), t("sidebar.allRequests")] },
    { name: "platform", label: t("sidebar.platform"), to: "/platform", icon: Building2, roles: ["super_admin"], marqueeItems: [t("sidebar.overview"), t("sidebar.tenants"), t("sidebar.users"), t("sidebar.pipeline"), t("sidebar.leads"), t("sidebar.systemHealth"), t("sidebar.installOrders")] },
  ];

  // Click anywhere on a collapsed rail commits it open (stays open until
  // scroll-collapse or a manual collapse/hide action). No hover-expand —
  // only a click opens it.
  const handleRailClick = () => {
    if (mode !== "collapsed") return;
    onModeChange("expanded");
  };
  // Logo button: expanded -> manually collapse to icon rail. When collapsed,
  // the click bubbles to handleRailClick above, which expands+sticks.
  const handleLogoClick = () => {
    if (mode === "expanded") onModeChange("collapsed");
  };
  // Hide is only rendered while collapsed (enforcing full -> collapse ->
  // hide) and must not also trigger the rail's click-to-stick handler above.
  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onModeChange("hidden");
  };
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
    <>
      <Sidebar
        collapsible="none"
        onClick={handleRailClick}
        aria-hidden={isHidden}
        className={cn(
          "hidden md:block sticky top-0 h-screen bg-transparent transition-[width] duration-300 ease-out overflow-hidden",
          isHidden ? "w-0" : collapsed ? "w-16" : "w-64",
        )}
        style={isHidden ? { pointerEvents: "none" } : undefined}
      >
        <div className="flex h-full flex-col px-2">
          {/* Logo — click to toggle rail ↔ expanded */}
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            className={cn(
              "mx-auto mt-4 mb-2 grid place-items-center rounded-2xl transition-all duration-200 hover:scale-[1.04] hover:bg-sidebar-accent/60 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              collapsed ? "h-11 w-11" : "h-11 w-[calc(100%-0.5rem)] justify-self-stretch px-3",
            )}
          >
            {collapsed ? (
              <span className="text-lg font-black tracking-tight select-none">
                <span className="text-[#2FAC0C]">G</span>
                <span className="text-sidebar-foreground">H</span>
              </span>
            ) : (
                <span dir="ltr" className="text-lg font-black tracking-tight select-none w-full text-left">
                <span className="text-[#2FAC0C] text-xl">G</span>
                <span className="text-sidebar-foreground">rain</span>
                <span className="text-[#2FAC0C] text-xl">H</span>
                <span className="text-sidebar-foreground">ero</span>
              </span>
            )}
          </button>

          {/* Nav dock — sized to its content and vertically centered in the
            remaining space. Three groups — workspaces (incl. Traceability),
            platform+Hide, Settings last — separated by fixed-size spacers
            that don't change between collapsed/expanded, so the card is the
            same height in both states instead of jumping on toggle. */}
          <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
            <div className="flex w-full max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-3xl border border-sidebar-border/60 bg-sidebar shadow-2xl shadow-black/20">
              <div className="overflow-y-auto no-scrollbar py-3">
                <Section
                  items={
                    role === "technician"
                      ? data?.profile?.admin_id == null
                        ? globalTechnicianNav
                        : tenantTechnicianNav
                      : workspaceNav
                  }
                  role={role}
                  currentPath={currentPath}
                  collapsed={collapsed}
                />

                <div className="h-4 shrink-0" />

                {/* Platform (super-admin only) + Hide — occupies the slot
                  Traceability used to sit in on its own. Hide only appears
                  once already collapsed, so the flow is strictly
                  full -> collapse -> hide (never a direct full -> hide
                  jump). A same-size placeholder keeps this group's height
                  identical between the two states. */}
                <div className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
                  <Section
                    items={utilityNav}
                    role={role}
                    currentPath={currentPath}
                    collapsed={collapsed}
                  />
                  {mode === "collapsed" ? (
                    <Tooltip delayDuration={120}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleHideClick}
                          aria-label={t("nav.hideSidebar")}
                          className="mx-auto grid h-10 w-10 place-items-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        >
                          <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="font-semibold">
                        {t("nav.hideSidebar")}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="h-10" aria-hidden="true" />
                  )}
                </div>

                <div className="h-4 shrink-0" />

                {/* Settings — always last. */}
                <Section
                  items={bottomNav}
                  role={role}
                  currentPath={currentPath}
                  collapsed={collapsed}
                />
              </div>
            </div>
          </div>
        </div>
      </Sidebar>

      {/* Small edge handle when fully hidden — a bit more peeks out on hover.
        Click steps to the icon rail (not straight to full width), so the
        return path is strictly hidden -> collapsed -> expanded: click the
        logo from there to finish opening it. */}
      {isHidden && (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onModeChange("collapsed")}
              aria-label={t("nav.showSidebar")}
              className="group fixed left-0 right-auto top-1/2 z-40 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-sidebar-border/60 bg-sidebar shadow-md transition-all duration-200 hover:w-7 rtl:right-0 rtl:left-auto rtl:rounded-l-lg rtl:rounded-r-none rtl:border-l rtl:border-r-0"
            >
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.showSidebar")}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
