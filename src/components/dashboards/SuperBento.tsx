import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ScrollText } from "lucide-react";
import { getPlatformLogs } from "@/lib/platform-no-admin.functions";

type Signup = {
  id: string;
  name?: string | null;
  email?: string | null;
  subscription_plan?: string | null;
  created_at?: string | null;
};

function severityDot(s?: string | null) {
  return s === "critical" ? "bg-red-500"
    : s === "high" ? "bg-orange-500"
    : s === "warning" ? "bg-amber-500"
    : "bg-slate-400";
}

export function SuperBento({ recentSignups }: { recentSignups: Signup[] }) {
  const logsFn = useServerFn(getPlatformLogs);
  const { data: logs } = useQuery({
    queryKey: ["platform-logs", "dashboard"],
    queryFn: () => logsFn({ data: { limit: 8 } }),
    refetchInterval: 45_000,
  });
  const rows = logs ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Recent signups */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Recent signups</CardTitle>
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
                {recentSignups.slice(0, 8).map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
                    <td className="px-3 py-1.5">
                      <Link to="/platform/users" className="block min-w-0">
                        <p className="font-medium truncate">{s.name || s.email}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px] py-0 h-5">
                        {s.subscription_plan ?? "starter"}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right text-[10px] text-muted-foreground whitespace-nowrap">
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

      {/* Platform activity */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm inline-flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5 text-emerald-600" />
            Platform activity
          </CardTitle>
          <Link to="/platform/audit-logs" aria-label="Open audit logs" className="text-emerald-600 hover:text-emerald-700">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {rows.length === 0 && <p className="text-xs text-muted-foreground p-2">No recent activity</p>}
          <div className="divide-y divide-border/40">
            {rows.slice(0, 8).map((r) => (
              <Link key={r.id} to="/platform/audit-logs" className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition rounded">
                <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot(r.severity)}`} />
                <span className="truncate flex-1">
                  <span className="font-medium">{r.action}</span>
                  {r.description && <span className="text-muted-foreground"> · {r.description}</span>}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}