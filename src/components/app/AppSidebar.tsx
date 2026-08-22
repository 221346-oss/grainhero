import React from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
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
// Traceability removed from sidebar — its purpose is covered by the silo-centric
// grain operations view and activity logs. Route + code retained for future use.
const workspaceNav: NavItem[] = [
  { name: "grain-operations", label: "Grain Operations", to: "/grain-operations", icon: Wheat, roles: ["admin", "manager", "technician"], marqueeItems: ["Grain Batches", "Silos", "Warehouses", "Buyers"] },
  { name: "monitoring", label: "Monitoring", to: "/monitoring", icon: Activity, roles: ["admin", "manager", "technician"], marqueeItems: ["Incidents"] },
  { name: "intelligence", label: "Intelligence", to: "/intelligence", icon: Sparkles, roles: ["admin", "manager", "technician"], badge: "AI", marqueeItems: ["AI Predictions", "Analytics", "ML Models", "Reports"] },
  // /business is tenant-scoped (invoices, own subscription) — admin and manager only.
  // Insurance tab hidden until bank partnership confirmed.
  // super_admin uses /platform/business instead.
  { name: "business", label: "Business", to: "/business", icon: Briefcase, roles: ["admin", "manager"], marqueeItems: ["Revenue", "Subscription"] },
  // super_admin has no tenant team/security/logs — those tabs are all disabled for them.
  { name: "administration", label: "Administration", to: "/administration", icon: ShieldCheck, roles: ["admin", "manager", "technician"], marqueeItems: ["Team Management", "Security Center", "Activity Logs"] },
  // { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["admin", "manager", "technician"], marqueeItems: ["Total Batches", "Stored", "Dispatched", "High Risk"] },
];

// Group 3 — super-admin-only platform entries (5 items consolidated).
// Install Orders merged into Business since both are revenue-related.
const utilityNav: NavItem[] = [
  { name: "platform-plans",         label: "Plans",          to: "/platform/plans",         icon: CreditCard, roles: ["super_admin"], marqueeItems: ["Edit limits", "Active/inactive", "Popular badge", "Change requests"] },
  { name: "platform-business",      label: "Business",       to: "/platform/business",      icon: Briefcase,  roles: ["super_admin"], marqueeItems: ["Revenue", "Subscriptions", "Hardware", "Install Orders"] },
  { name: "platform-monitoring",    label: "Monitoring",     to: "/platform/monitoring",    icon: Activity,   roles: ["super_admin"], marqueeItems: ["Incidents", "Environmental", "Maintenance"] },
  { name: "platform-silo-requests", label: "Silo Requests",  to: "/platform/silo-requests", icon: Inbox,      roles: ["super_admin"], marqueeItems: ["Pending review", "Approved", "Rejected", "All requests"] },
  { name: "platform",               label: "Platform",       to: "/platform",               icon: Building2,  roles: ["super_admin"], marqueeItems: ["Overview", "Tenants", "Users", "Pipeline", "Leads", "System Health", "Install Orders"] },
];

// Bottom nav — intentionally empty; Settings is accessible via the profile
// menu in the top-right header to avoid duplication in the sidebar rail.
const bottomNav: NavItem[] = [];

function Section({ items, role, currentPath, collapsed }: { label?: string; items: NavItem[]; role: AppRole; currentPath: string; showLabel?: boolean; collapsed: boolean }) {
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <div className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
      {visible.map((item) => {
        // /platform is the overview hub — only highlight it for the exact path
        // or sub-paths that don't have their own dedicated sidebar entry.
        const platformSubPaths = [
          "/platform/plans", "/platform/business", "/platform/monitoring",
          "/platform/silo-requests",
        ];
        const active = item.to === "/platform"
          ? currentPath === "/platform" ||
            (currentPath.startsWith("/platform/") &&
              !platformSubPaths.some((p) => currentPath === p || currentPath.startsWith(p + "/")))
          : currentPath === item.to || (item.to !== "/platform" && currentPath.startsWith(item.to + "/"));
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

export function AppSidebar({ mode, onModeChange }: { mode: SidebarMode; onModeChange: (mode: SidebarMode) => void }) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isHidden = mode === "hidden";

  // Hovering the icon rail previews the full sidebar without committing the
  // mode, so moving the cursor away snaps it back to icons. A short delay on
  // each edge keeps a cursor crossing the rail from flapping it open/shut.
  const [previewing, setPreviewing] = React.useState(false);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHover = React.useCallback((next: boolean, delay: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreviewing(next), delay);
  }, []);
  React.useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);
  // A mode change out of "collapsed" ends any preview in flight.
  React.useEffect(() => {
    if (mode !== "collapsed") {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setPreviewing(false);
    }
  }, [mode]);

  const handleRailEnter = () => {
    if (mode !== "collapsed") return;
    scheduleHover(true, 120);
  };
  const handleRailLeave = () => {
    if (mode !== "collapsed") return;
    scheduleHover(false, 180);
  };

  // Icon-only whenever the rail is collapsed and not being hover-previewed.
  const collapsed = mode !== "expanded" && !previewing;

  // Click anywhere on a collapsed rail commits it open, so it stays put once
  // the cursor leaves (hover alone only previews).
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

  // Groups are role-filtered, so for some roles a whole group renders nothing.
  // Track which ones have items to avoid separators around empty space.
  const hasWorkspace = workspaceNav.some((i) => i.roles.includes(role));
  const hasUtility = utilityNav.some((i) => i.roles.includes(role));
  const hasBottom = bottomNav.some((i) => i.roles.includes(role));

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
      onMouseEnter={handleRailEnter}
      onMouseLeave={handleRailLeave}
      aria-hidden={isHidden}
      className={cn(
        "hidden md:block sticky top-0 h-screen bg-transparent transition-[width] duration-300 ease-out overflow-hidden",
        isHidden ? "w-0" : collapsed ? "w-16" : "w-56",
      )}
      style={isHidden ? { pointerEvents: "none" } : undefined}
    >
      <div className="flex h-full flex-col px-2">
        {/* Logo — click to toggle rail ↔ expanded */}
        <button
          type="button"
          onClick={handleLogoClick}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
            <span className="text-lg font-black tracking-tight select-none w-full text-left">
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
              <Section items={workspaceNav} role={role} currentPath={currentPath} collapsed={collapsed} />

              {hasWorkspace && hasUtility && <div className="h-4 shrink-0" />}

              {/* Platform (super-admin only) + Hide — occupies the slot
                  Traceability used to sit in on its own. Hide only appears
                  once already collapsed, so the flow is strictly
                  full -> collapse -> hide (never a direct full -> hide
                  jump). */}
              <div className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
                <Section items={utilityNav} role={role} currentPath={currentPath} collapsed={collapsed} />
                {collapsed && (
                  <Tooltip delayDuration={120}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleHideClick}
                        aria-label="Hide sidebar"
                        className="mx-auto grid h-10 w-10 place-items-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      >
                        <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="font-semibold">Hide sidebar</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {hasBottom && <div className="h-4 shrink-0" />}

              {/* Settings — always last. */}
              <Section items={bottomNav} role={role} currentPath={currentPath} collapsed={collapsed} />
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
            aria-label="Show sidebar"
            className="group fixed left-0 top-1/2 z-40 flex h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-sidebar-border/60 bg-sidebar shadow-md transition-all duration-200 hover:w-7"
          >
            <ChevronRight className="h-4 w-4 text-sidebar-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Show sidebar</TooltipContent>
      </Tooltip>
    )}
    </>
  );
}
