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
  QrCode, Bell, ClipboardList, Shield, Settings, UserCog, Crown,
  Brain, Cpu, BarChart3,
  Wallet, CreditCard, Sparkles,
  Activity, AlertOctagon, FileBarChart,
  Wrench, Server, ShieldCheck, MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, type AppRole } from "@/lib/roles.functions";
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
  { name: "grain-batches", label: "Batches", to: "/grain-batches", icon: Package, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "silos", label: "Silos", to: "/silos", icon: Warehouse, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "sensors", label: "Sensors", to: "/sensors", icon: Smartphone, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "actuators", label: "Actuators", to: "/actuators", icon: Zap, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "grain-alerts", label: "Alerts", to: "/grain-alerts", icon: OctagonAlert, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "ai-predictions", label: "AI Predictions", to: "/ai-predictions", icon: Brain, roles: ["super_admin", "admin", "manager"], badge: "AI" },
  { name: "analytics", label: "Analytics", to: "/analytics", icon: BarChart3, roles: ["super_admin", "admin", "manager"] },
];

// Everything else lives behind a "More" popover, grouped like Slack's overflow menu.
const moreGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { name: "warehouses", label: "Warehouses", to: "/warehouses", icon: Building2, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "buyers", label: "Buyers", to: "/buyers", icon: Users, roles: ["super_admin", "admin", "manager"] },
      { name: "environmental", label: "Environmental", to: "/environmental", icon: Activity, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "incidents", label: "Incidents", to: "/incidents", icon: AlertOctagon, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "maintenance", label: "Maintenance", to: "/maintenance", icon: Wrench, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "server-monitoring", label: "Device Health", to: "/server-monitoring", icon: Server, roles: ["super_admin", "admin", "manager", "technician"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "reports", label: "Reports", to: "/reports", icon: FileBarChart, roles: ["super_admin", "admin", "manager"] },
      { name: "ml-models", label: "ML Models", to: "/ml-models", icon: Cpu, roles: ["super_admin", "admin"], badge: "ML" },
      { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "notifications", label: "Notifications", to: "/notifications", icon: Bell, roles: ["super_admin", "admin", "manager", "technician"] },
      { name: "activity-logs", label: "Activity Logs", to: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager"] },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "insurance", label: "Insurance", to: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"] },
      { name: "revenue", label: "Revenue", to: "/revenue", icon: Wallet, roles: ["super_admin", "admin", "manager"] },
      { name: "subscription", label: "Subscription", to: "/subscription", icon: CreditCard, roles: ["super_admin", "admin"] },
      { name: "plans", label: "Plans", to: "/plans", icon: Sparkles, roles: ["super_admin", "admin", "manager", "technician"] },
    ],
  },
];

// Bottom "admin" strip — Slack shows Admin at the bottom of the workspace rail.
const bottomNav: NavItem[] = [
  { name: "team-management", label: "Team", to: "/team-management", icon: UserCog, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "security-center", label: "Security", to: "/security-center", icon: ShieldCheck, roles: ["super_admin", "admin"] },
  { name: "settings", label: "Settings", to: "/settings", icon: Settings, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "platform", label: "Platform", to: "/platform", icon: Crown, roles: ["super_admin"], badge: "SU" },
];

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link
          to={item.to}
          className={cn(
            "flex items-center gap-3 rounded-lg transition-colors",
            active
              ? "bg-[--fusion-mint] text-[--fusion-ink] font-semibold shadow-sm"
              : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.6 : 2} />
          {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
          {!collapsed && item.badge && (
            <Badge className={cn(
              "ml-auto text-[9px] px-1.5 py-0 h-4 font-black tracking-wide border-0",
              (item.badge === "AI" || item.badge === "ML")
                ? "bg-[--fusion-grape] text-white"
                : "bg-[--fusion-ink]/10 text-[--fusion-ink]",
            )}>
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Section({ label, items, role, currentPath, showLabel = true }: { label?: string; items: NavItem[]; role: AppRole; currentPath: string; showLabel?: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <SidebarGroup>
      {!collapsed && showLabel && label && (
        <SidebarGroupLabel className="text-[10px] font-black text-sidebar-foreground/55 uppercase tracking-[0.18em] px-2">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const visibleGroups = moreGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
  if (visibleGroups.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton tooltip="More" className="text-sidebar-foreground/85 hover:bg-sidebar-accent">
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const { data } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });
  const role: AppRole = data?.role ?? "pending";

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
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start text-sidebar-foreground/80 hover:text-red-600 hover:bg-red-500/10">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}