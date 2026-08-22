import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, Package, AlertTriangle, Settings } from "lucide-react";
import { getPlatformLogs } from "@/lib/platform-no-admin.functions";
import { Panel, PanelHeader } from "./super/super-ui";

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

  const activitySummary = {
    signups: recentSignups.length,
    orders: rows.filter((r) => categorizeActivity(r.action) === "order").length,
    alerts: rows.filter((r) => categorizeActivity(r.action) === "alert").length,
  };

  const summaryTiles = [
    {
      key: "users",
      icon: UserPlus,
      tone: "text-success",
      value: activitySummary.signups,
      label: "New Users",
    },
    {
      key: "orders",
      icon: Package,
      tone: "text-info",
      value: activitySummary.orders,
      label: "Orders",
    },
    {
      key: "alerts",
      icon: AlertTriangle,
      tone: "text-warning",
      value: activitySummary.alerts,
      label: "Alerts",
    },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* ── 04 Recent signups ─────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          index="04"
          title="Recent signups"
          action={{ label: "View all", to: "/platform/users" }}
        />

        <table className="mt-5 w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              <th className="pb-3 text-left font-medium">User</th>
              <th className="pb-3 text-left font-medium">Plan</th>
              <th className="pb-3 text-right font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentSignups.slice(0, 5).map((s) => (
              <tr key={s.id} className="group">
                <td className="py-2.5">
                  <Link to="/platform/users" className="block min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {s.name || "New user"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{s.email}</p>
                  </Link>
                </td>
                <td className="py-2.5">
                  <span className="rounded bg-muted/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.subscription_plan ?? "starter"}
                  </span>
                </td>
                <td className="py-2.5 text-right text-[11px] tabular-nums text-muted-foreground">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString("en-GB") : "—"}
                </td>
              </tr>
            ))}
            {recentSignups.length === 0 && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-xs text-muted-foreground">
                  No recent signups
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* ── 05 Platform activity ──────────────────────────────────────────── */}
      <Panel className="flex flex-col">
        <PanelHeader
          index="05"
          title="Platform activity"
          action={{ label: "Open log", to: "/platform/audit-logs" }}
        />

        <div className="mt-5 grid grid-cols-3 rounded-xl bg-muted/25 py-4">
          {summaryTiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.key} className="flex flex-col items-center gap-1.5">
                <Icon className={`h-4 w-4 ${t.tone}`} />
                <span className="text-2xl font-bold leading-none tabular-nums text-foreground">
                  {t.value}
                </span>
                <span className="text-[11px] text-muted-foreground">{t.label}</span>
              </div>
            );
          })}
        </div>

        <p className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Recent events
        </p>
        {rows.length === 0 && (
          <p className="py-3 text-xs text-muted-foreground">No recent activity</p>
        )}
        <div className="flex-1">
          {rows.slice(0, 5).map((r) => {
            const category =
              activityCategories[categorizeActivity(r.action)] || activityCategories.default;
            const Icon = category.icon;
            return (
              <Link
                key={r.id}
                to="/platform/audit-logs"
                className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/25"
              >
                <span className={`rounded-md p-1.5 ${category.bgColor}`}>
                  <Icon className={`h-3 w-3 ${category.color}`} />
                </span>
                <span className="flex-1 truncate text-xs font-medium text-foreground">
                  {category.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
