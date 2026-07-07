import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Smartphone, LogOut,
  Package, OctagonAlert, Zap, Building2, Warehouse,
  QrCode, Bell, ClipboardList, Shield, Settings, UserCog, Crown,
  Brain, Cpu, BarChart3,
  Wallet, CreditCard, Sparkles,
  Activity, AlertOctagon, FileBarChart,
  Wrench, Server, ShieldCheck,
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

const dashboardNav: NavItem[] = [
  { name: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "manager", "technician"] },
];
const grainOpsNav: NavItem[] = [
  { name: "grain-batches", label: "Grain Batches", to: "/grain-batches", icon: Package, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "silos", label: "Silos", to: "/silos", icon: Warehouse, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "warehouses", label: "Warehouses", to: "/warehouses", icon: Building2, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "buyers", label: "Buyers", to: "/buyers", icon: Users, roles: ["super_admin", "admin", "manager"] },
];
const iotNav: NavItem[] = [
  { name: "sensors", label: "Sensors", to: "/sensors", icon: Smartphone, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "actuators", label: "Actuators", to: "/actuators", icon: Zap, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "grain-alerts", label: "Alerts", to: "/grain-alerts", icon: OctagonAlert, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "environmental", label: "Environmental", to: "/environmental", icon: Activity, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "incidents", label: "Incidents", to: "/incidents", icon: AlertOctagon, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "maintenance", label: "Maintenance", to: "/maintenance", icon: Wrench, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "server-monitoring", label: "Device Health", to: "/server-monitoring", icon: Server, roles: ["super_admin", "admin", "manager", "technician"] },
];
const insightsNav: NavItem[] = [
  { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "notifications", label: "Notifications", to: "/notifications", icon: Bell, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "activity-logs", label: "Activity Logs", to: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager"] },
];
const intelligenceNav: NavItem[] = [
  { name: "ai-predictions", label: "AI Predictions", to: "/ai-predictions", icon: Brain, roles: ["super_admin", "admin", "manager"], badge: "AI" },
  { name: "analytics", label: "Analytics", to: "/analytics", icon: BarChart3, roles: ["super_admin", "admin", "manager"] },
  { name: "reports", label: "Reports", to: "/reports", icon: FileBarChart, roles: ["super_admin", "admin", "manager"] },
  { name: "ml-models", label: "ML Models", to: "/ml-models", icon: Cpu, roles: ["super_admin", "admin"], badge: "ML" },
];
const businessNav: NavItem[] = [
  { name: "insurance", label: "Insurance", to: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"] },
  { name: "revenue", label: "Revenue", to: "/revenue", icon: Wallet, roles: ["super_admin", "admin", "manager"] },
  { name: "subscription", label: "Subscription", to: "/subscription", icon: CreditCard, roles: ["super_admin", "admin"] },
  { name: "plans", label: "Plans", to: "/plans", icon: Sparkles, roles: ["super_admin", "admin", "manager", "technician"] },
];
const adminNav: NavItem[] = [
  { name: "team-management", label: "Team", to: "/team-management", icon: UserCog, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "security-center", label: "Security Center", to: "/security-center", icon: ShieldCheck, roles: ["super_admin", "admin"] },
  { name: "settings", label: "Settings", to: "/settings", icon: Settings, roles: ["super_admin", "admin", "manager", "technician"] },
];
const platformNav: NavItem[] = [
  { name: "platform", label: "Platform Console", to: "/platform", icon: Crown, roles: ["super_admin"], badge: "SU" },
];

function Section({ label, items, role, currentPath }: { label: string; items: NavItem[]; role: AppRole; currentPath: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const visible = items.filter((i) => i.roles.includes(role));
  if (visible.length === 0) return null;
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[10px] font-black text-sidebar-foreground/55 uppercase tracking-[0.18em] px-2">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => {
            const active = item.to === "/platform"
              ? currentPath === "/platform" || currentPath.startsWith("/platform/")
              : currentPath === item.to;
            return (
              <SidebarMenuItem key={item.name}>
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
          })}
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
      <SidebarHeader className="border-b border-sidebar-border/60">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 py-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 ring-1 ring-black/5"
            style={{ background: "var(--gradient-fusion)" }}
            aria-label="Home"
          >
            <span className="text-[--fusion-ink] font-black text-base">✦</span>
          </div>
          {!collapsed && (
            <span className="text-[10px] font-black text-sidebar-foreground/60 uppercase tracking-[0.24em]">
              {role.replace("_", " ")}
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Section label="Overview" items={dashboardNav} role={role} currentPath={currentPath} />
        <Section label="Grain Operations" items={grainOpsNav} role={role} currentPath={currentPath} />
        <Section label="IoT & Monitoring" items={iotNav} role={role} currentPath={currentPath} />
        <Section label="Insights & Audit" items={insightsNav} role={role} currentPath={currentPath} />
        <Section label="Intelligence" items={intelligenceNav} role={role} currentPath={currentPath} />
        <Section label="Business" items={businessNav} role={role} currentPath={currentPath} />
        <Section label="Administration" items={adminNav} role={role} currentPath={currentPath} />
        <Section label="Platform" items={platformNav} role={role} currentPath={currentPath} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start text-sidebar-foreground/80 hover:text-red-600 hover:bg-red-500/10">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}