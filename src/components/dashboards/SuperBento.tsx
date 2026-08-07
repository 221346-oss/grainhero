import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, UserPlus, Package, AlertTriangle, Settings } from "lucide-react";
import { getPlatformLogs } from "@/lib/platform-no-admin.functions";
import { HairlineGrid, NeonPanel } from "@/components/charts/neon";

type Signup = {
  id: string;
  name?: string | null;
  email?: string | null;
  subscription_plan?: string | null;
  created_at?: string | null;
};

// Categorize activity for better understanding
type ActivityCategory = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
};

const activityCategories: Record<string, ActivityCategory> = {
  signup: {
    icon: UserPlus,
    label: "New Signup",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  order: {
    icon: Package,
    label: "Install Order",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  alert: {
    icon: AlertTriangle,
    label: "System Alert",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  default: {
    icon: Settings,
    label: "System Event",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

function categorizeActivity(action?: string | null): string {
  if (!action) return "default";
  const a = action.toLowerCase();
  if (a.includes("signup") || a.includes("user")) return "signup";
  if (a.includes("order") || a.includes("install")) return "order";
  if (a.includes("alert") || a.includes("critical")) return "alert";
  return "default";
}

export function SuperBento({ recentSignups }: { recentSignups: Signup[] }) {
  const logsFn = useServerFn(getPlatformLogs);
  const { data: logs } = useQuery({
    queryKey: ["platform-logs", "dashboard"],
    queryFn: () => logsFn({ data: { limit: 8 } }),
    refetchInterval: 45_000,
  });
  const rows = logs ?? [];

  // Calculate activity summary
  const activitySummary = {
    signups: recentSignups.length,
    orders: rows.filter(r => categorizeActivity(r.action) === "order").length,
    alerts: rows.filter(r => categorizeActivity(r.action) === "alert").length,
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Recent signups - Simplified */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Recent Signups</CardTitle>
          <Link to="/platform/users" aria-label="Open users" className="text-emerald-600 hover:text-emerald-700">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[220px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">User</th>
                  <th className="text-left px-2 py-1.5 font-medium hidden sm:table-cell">Plan</th>
                  <th className="text-right px-3 py-1.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentSignups.slice(0, 6).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2">
                      <Link to="/platform/users" className="block min-w-0">
                        <p className="font-medium truncate">{s.name || "New User"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>
                      </Link>
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px] py-0 h-5">
                        {s.subscription_plan ?? "starter"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] text-muted-foreground whitespace-nowrap">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {recentSignups.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-muted-foreground py-8 text-xs">No recent signups</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary - SIMPLIFIED for beginners */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Platform Activity</CardTitle>
          <Link to="/platform/audit-logs" aria-label="View all activity" className="text-emerald-600 hover:text-emerald-700">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* Activity Summary Cards */}
          <HairlineGrid cols="grid-cols-3 mb-3">
            <NeonPanel className="text-center py-2">
              <div className="flex flex-col items-center gap-1">
                <UserPlus className="w-4 h-4 text-success" />
                <span className="text-xl font-bold tabular-nums text-foreground">{activitySummary.signups}</span>
                <span className="text-[10px] text-muted-foreground">New Users</span>
              </div>
            </NeonPanel>
            <NeonPanel className="text-center py-2">
              <div className="flex flex-col items-center gap-1">
                <Package className="w-4 h-4 text-info" />
                <span className="text-xl font-bold tabular-nums text-foreground">{activitySummary.orders}</span>
                <span className="text-[10px] text-muted-foreground">Orders</span>
              </div>
            </NeonPanel>
            <NeonPanel className="text-center py-2">
              <div className="flex flex-col items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-xl font-bold tabular-nums text-foreground">{activitySummary.alerts}</span>
                <span className="text-[10px] text-muted-foreground">Alerts</span>
              </div>
            </NeonPanel>
          </HairlineGrid>

          {/* Recent Events - Simplified */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recent Events</p>
            {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No recent activity</p>}
            <div className="space-y-1">
              {rows.slice(0, 5).map((r) => {
                const category = activityCategories[categorizeActivity(r.action)] || activityCategories.default;
                const Icon = category.icon;
                
                return (
                  <Link 
                    key={r.id} 
                    to="/platform/audit-logs" 
                    className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/30 transition rounded group"
                  >
                    <div className={`p-1 rounded ${category.bgColor}`}>
                      <Icon className={`w-3 h-3 ${category.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">{category.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}