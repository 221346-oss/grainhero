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
];
const insightsNav: NavItem[] = [
  { name: "traceability", label: "Traceability", to: "/traceability", icon: QrCode, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "notifications", label: "Notifications", to: "/notifications", icon: Bell, roles: ["super_admin", "admin", "manager", "technician"] },
  { name: "activity-logs", label: "Activity Logs", to: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager"] },
];
const businessNav: NavItem[] = [
  { name: "insurance", label: "Insurance", to: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"] },
];
const adminNav: NavItem[] = [
  { name: "team-management", label: "Team", to: "/team-management", icon: UserCog, roles: ["super_admin", "admin", "manager", "technician"] },
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
      {!collapsed && <SidebarGroupLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => {
            const active = currentPath === item.to;
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                  <Link to={item.to} className={cn("flex items-center gap-3", active && "bg-emerald-50 text-emerald-700")}>
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <Badge className={cn("ml-auto text-[9px] px-1.5 py-0 h-4 font-bold", (item.badge === "AI" || item.badge === "ML") ? "bg-emerald-600" : "bg-slate-200 text-slate-700")}>
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
      <SidebarHeader className="border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shrink-0">
            <span className="text-white font-black text-base">G</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">GrainHero</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">{role.replace("_", " ")}</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Section label="Overview" items={dashboardNav} role={role} currentPath={currentPath} />
        <Section label="Grain Operations" items={grainOpsNav} role={role} currentPath={currentPath} />
        <Section label="IoT & Monitoring" items={iotNav} role={role} currentPath={currentPath} />
        <Section label="Insights & Audit" items={insightsNav} role={role} currentPath={currentPath} />
        <Section label="Business" items={businessNav} role={role} currentPath={currentPath} />
        <Section label="Administration" items={adminNav} role={role} currentPath={currentPath} />
        <Section label="Platform" items={platformNav} role={role} currentPath={currentPath} />
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start text-slate-600 hover:text-red-600 hover:bg-red-50">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}