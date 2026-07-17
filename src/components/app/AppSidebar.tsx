import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Smartphone, LogOut,
  Package, OctagonAlert, Zap, Building2, Warehouse,
  QrCode, Bell, ClipboardList, Shield, Settings, UserCog,
  Brain, Cpu, BarChart3,
  CreditCard,
  Activity, AlertOctagon, FileBarChart,
  Wrench, Server, ShieldCheck, MoreHorizontal,
  DollarSign, TrendingUp, UserPlus, ScrollText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, type AppRole } from "@/lib/roles.functions";
import { countPendingOrders } from "@/lib/hardware-orders.functions";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = {
  name: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: AppRole[];
  badge?: string;
};

// Pinned = the ~8 items always visible in the sidebar (Slack-style "starred/channels").
const pinnedNav: NavItem[] = [
  { name: "dashboard", label: "Home", to: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "grain-batches", label: "Batches", to: "/grain-batches", icon: Package, roles: ["admin", "manager", "technician"] },
  { name: "silos", label: "Silos", to: "/silos", icon: Warehouse, roles: ["admin", "manager", "technician"] },
  { name: "sensors", label: "Sensors", to: "/sensors", icon: Smartphone, roles: ["admin", "manager", "technician"] },
  { name: "actuators", label: "Actuators", to: "/actuators", icon: Zap, roles: ["admin", "manager", "technician"] },
  { name: "grain-alerts", label: "Alerts", to: "/grain-alerts", icon: OctagonAlert, roles: ["admin", "manager", "technician"] },
  { name: "ai-predictions", label: "AI Predictions", to: "/ai-predictions", icon: Brain, roles: ["admin", "manager"], badge: "AI" },
  { name: "analytics", label: "Analytics", to: "/analytics", icon: BarChart3, roles: ["admin", "manager"] },
  { name: "activity-logs", label: "Activity Logs", to: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager"] },
  { name: "warehouses", label: "Warehouses", to: "/warehouses", icon: Building2, roles: ["admin", "manager", "technician"] },
  { name: "buyers", label: "Buyers", to: "/buyers", icon: Users, roles: ["admin", "manager"] },
  { name: "revenue", label: "Revenue", to: "/revenue", icon: DollarSign, roles: ["super_admin", "admin", "manager"] },
  { name: "platform-orders", label: "Install Orders", to: "/platform/orders", icon: Package, roles: ["super_admin"] },
];

// Everything else lives behind a "More" popover, grouped like Slack's overflow menu.
const moreGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Insights",
    items: [
      { name: "environmental", label: "Environmental", to: "/environmental", icon: Activity, roles: ["admin", "manager", "technician"] },
      { name: "incidents", label: "Incidents", to: "/incidents", icon: AlertOctagon, roles: ["admin", "manager", "technician"] },
      { name: "maintenance", label: "Maintenance", to: "/maintenance", icon: Wrench, roles: ["admin", "manager", "technician"] },
      { name: "server-monitoring", label: "Device Health", to: "/server-monitoring", icon: Server, roles: ["admin", "manager", "technician"] },
      { name: "data-visualization", label: "Data Visualization", to: "/data-visualization", icon: Activity, roles: ["admin", "manager", "technician"] },
      { name: "reports", label: "Reports", to: "/reports", icon: FileBarChart, roles: ["admin", "manager"] },
      { name: "ml-models", label: "ML Models", to: "/ml-models", icon: Cpu, roles: ["admin"], badge: "ML" },
      { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["admin", "manager", "technician"] },
      { name: "notifications", label: "Notifications", to: "/notifications", icon: Bell, roles: ["admin", "manager", "technician"] },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "revenue", label: "Revenue", to: "/revenue", icon: DollarSign, roles: ["super_admin", "admin", "manager"] },
      { name: "insurance", label: "Insurance", to: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"] },
      { name: "subscription", label: "Subscription", to: "/subscription", icon: CreditCard, roles: ["super_admin", "admin"] },
      { name: "plan-management", label: "Plan Management", to: "/plan-management", icon: CreditCard, roles: ["admin"] },
    ],
  },
  {
    label: "Platform",
    items: [
      { name: "platform-overview", label: "Overview", to: "/platform", icon: Activity, roles: ["super_admin"] },
      { name: "platform-tenants", label: "Tenants", to: "/platform/tenants", icon: Building2, roles: ["super_admin"] },
      { name: "platform-users", label: "Users", to: "/platform/users", icon: Users, roles: ["super_admin"] },
      { name: "platform-plans", label: "Plans & Thresholds", to: "/platform/plans", icon: CreditCard, roles: ["super_admin"] },
      { name: "platform-pipeline", label: "Pipeline", to: "/platform/pipeline", icon: TrendingUp, roles: ["super_admin"] },
      { name: "platform-leads", label: "Leads", to: "/platform/leads", icon: UserPlus, roles: ["super_admin"] },
      { name: "platform-health", label: "System Health", to: "/platform/health", icon: Activity, roles: ["super_admin"] },
      { name: "platform-audit", label: "Audit Logs", to: "/platform/audit-logs", icon: ScrollText, roles: ["super_admin"] },
      { name: "platform-logs", label: "System Logs", to: "/platform/logs", icon: ClipboardList, roles: ["super_admin"] },
    ],
  },
];

// Bottom "admin" strip — Slack shows Admin at the bottom of the workspace rail.
const bottomNav: NavItem[] = [
  { name: "team-management", label: "Team", to: "/team-management", icon: UserCog, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "security-center", label: "Security", to: "/security-center", icon: ShieldCheck, roles: ["super_admin", "admin"] },
  { name: "settings", label: "Settings", to: "/settings", icon: Settings, roles: ["super_admin", "admin", "manager", "technician"] },
];

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className={cn(
          "h-9 rounded-lg transition-all",
          collapsed && "justify-center px-0",
          active
            ? "bg-[--fusion-mint] text-[--fusion-ink] font-semibold shadow-sm hover:bg-[--fusion-mint] hover:text-[--fusion-ink]"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Link to={item.to} data-tour={`nav-${item.name}`} className="flex items-center gap-3">
          <item.icon
            className={cn(
              "shrink-0 transition-transform duration-200",
              active ? "h-[18px] w-[18px] scale-110" : "h-4 w-4 group-hover/menu-item:scale-110",
            )}
            strokeWidth={active ? 2.6 : 2}
          />
          {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
          {!collapsed && item.badge && (
            <Badge
              className={cn(
                "ml-auto text-[9px] px-1.5 py-0 h-4 font-black tracking-wide border-0",
                item.badge === "AI" || item.badge === "ML"
                  ? "bg-[--fusion-grape] text-white"
                  : "bg-[--fusion-ink]/10 text-[--fusion-ink]",
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Section({ label, items, role, currentPath, showLabel = true }: { label?: string; items: NavItem[]; role: AppRole; currentPath: string; showLabel?: boolean }) {
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <SidebarGroup className={cn(collapsed && "px-0 items-center")}>
      {!collapsed && showLabel && label && (
        <SidebarGroupLabel className="text-[10px] font-black text-sidebar-foreground/55 uppercase tracking-[0.18em] px-2">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className={cn(collapsed && "items-center gap-1")}>
          {visible.map((item) => {
            const active = item.to === "/platform"
              ? currentPath === "/platform" || currentPath.startsWith("/platform/")
              : currentPath === item.to;
            return <NavRow key={item.name} item={item} active={active} collapsed={collapsed} />;
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function MoreButton({ role, currentPath }: { role: AppRole; currentPath: string }) {
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const visibleGroups = moreGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
  if (visibleGroups.length === 0) return null;
  return (
    <SidebarGroup className={cn(collapsed && "px-0 items-center")}>
      <SidebarGroupContent>
        <SidebarMenu className={cn(collapsed && "items-center")}>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  tooltip="More"
                  className={cn(
                    "h-9 rounded-lg text-sidebar-foreground/85 hover:bg-sidebar-accent",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <MoreHorizontal className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-[13px]">More</span>}
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" sideOffset={8} className="w-64 p-2 max-h-[70vh] overflow-y-auto no-scrollbar">
                {visibleGroups.map((g) => (
                  <div key={g.label} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">{g.label}</div>
                    <div className="flex flex-col">
                      {g.items.map((item) => {
                        const active = currentPath === item.to;
                        return (
                          <Link
                            key={item.name}
                            to={item.to}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-[--fusion-mint] text-[--fusion-ink] font-semibold"
                                : "text-foreground hover:bg-muted",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge && (
                              <Badge className="text-[9px] px-1.5 h-4 border-0 bg-[--fusion-grape] text-white">{item.badge}</Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const { data } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });
  const role: AppRole = data?.role ?? "pending";
  const fetchPending = useServerFn(countPendingOrders);
  const { data: pending } = useQuery({
    queryKey: ["pending-order-count"],
    queryFn: () => fetchPending(),
    enabled: role === "super_admin",
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

  return (
    <Sidebar collapsible="icon">
      {!collapsed && (
        <SidebarHeader className="border-b border-sidebar-border/60">
          <div className="px-2 py-2">
            <span className="text-[10px] font-black text-sidebar-foreground/60 uppercase tracking-[0.24em]">
              {role.replace("_", " ")}
            </span>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <Section items={pinnedNav} role={role} currentPath={currentPath} showLabel={false} />
        <MoreButton role={role} currentPath={currentPath} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 gap-0">
        <Section items={bottomNav} role={role} currentPath={currentPath} showLabel={false} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "h-9 text-sidebar-foreground/80 hover:text-red-600 hover:bg-red-500/10",
            collapsed ? "justify-center px-0 w-9 mx-auto" : "justify-start",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
