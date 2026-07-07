import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, LayoutDashboard, Users, Building2, ClipboardList, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/platform")({ component: PlatformLayout });

const tabs = [
  { to: "/platform", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/platform/revenue", label: "Revenue", icon: DollarSign },
  { to: "/platform/tenants", label: "Tenants", icon: Building2 },
  { to: "/platform/users", label: "Users", icon: Users },
  { to: "/platform/logs", label: "System Logs", icon: ClipboardList },
];

function PlatformLayout() {
  const fetchRole = useServerFn(getMyRole);
  const { data } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (data && data.role !== "super_admin") {
    return (
      <div className="p-10 text-center">
        <Shield className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Super admin access required</h1>
        <p className="text-sm text-slate-500 mt-1">You don't have permission to view the platform console.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Console</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Super admin only</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap",
              active ? "border-red-600 text-red-700" : "border-transparent text-slate-500 hover:text-slate-800"
            )}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}