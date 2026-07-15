import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import {
  Building2, Users, Package, Warehouse, OctagonAlert, CreditCard, DollarSign,
  ClipboardList, UserPlus, AlertTriangle, TrendingUp, Sparkles, ScrollText,
  Activity, ArrowRight, Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./_shared";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform.functions";

const QUICK_ACTIONS: { to: string; label: string; icon: LucideIcon; tone: string }[] = [
  { to: "/platform/tenants", label: "Tenants", icon: Building2, tone: "from-sky-500 to-sky-700" },
  { to: "/platform/users", label: "Users & roles", icon: Users, tone: "from-violet-500 to-violet-700" },
  { to: "/platform/plans", label: "Plans & pricing", icon: Sparkles, tone: "from-emerald-500 to-emerald-700" },
  { to: "/platform/revenue", label: "Revenue", icon: DollarSign, tone: "from-amber-500 to-amber-700" },
  { to: "/platform/pipeline", label: "Pipeline", icon: TrendingUp, tone: "from-rose-500 to-rose-700" },
  { to: "/platform/leads", label: "Leads", icon: UserPlus, tone: "from-fuchsia-500 to-fuchsia-700" },
  { to: "/platform/health", label: "Health", icon: Activity, tone: "from-teal-500 to-teal-700" },
  { to: "/platform/audit-logs", label: "Audit logs", icon: ScrollText, tone: "from-slate-500 to-slate-700" },
  { to: "/platform/orders", label: "Install orders", icon: Package, tone: "from-indigo-500 to-indigo-700" },
  { to: "/platform/logs", label: "System logs", icon: ClipboardList, tone: "from-neutral-500 to-neutral-700" },
];

export function SuperAdminDashboard({ name }: { name?: string }) {
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const { data: m } = useQuery({ queryKey: ["platform-metrics"], queryFn: () => metricsFn() });
  const { data: w } = useQuery({ queryKey: ["platform-widgets"], queryFn: () => widgetsFn() });

  const maxCount = Math.max(1, ...(w?.signupsSeries.map((p) => p.count) ?? [1]));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Compact header */}
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-500 to-red-700 grid place-items-center shadow-sm">
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-black tracking-tight truncate">
            Super Admin{name ? ` — ${name}` : ""}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Platform owner console
          </p>
        </div>
      </header>

      {/* Metrics — dense 4/6 grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard label="Tenants" value={m?.totalTenants ?? "—"} icon={Building2} accent="sky" />
        <StatCard label="Users" value={m?.totalUsers ?? "—"} icon={Users} accent="violet" />
        <StatCard label="Active Subs" value={m?.activeSubscriptions ?? "—"} icon={CreditCard} accent="emerald" />
        <StatCard label="MRR" value={m ? `$${m.mrr.toLocaleString()}` : "—"} icon={DollarSign} accent="emerald" />
        <StatCard label="Batches" value={m?.totalBatches ?? "—"} icon={Package} accent="amber" />
        <StatCard label="Silos" value={m?.totalSilos ?? "—"} icon={Warehouse} accent="sky" />
        <StatCard label="Critical Alerts" value={m?.criticalAlerts ?? "—"} icon={OctagonAlert} accent="rose" trend={m ? `${m.totalAlerts} total` : undefined} />
        <StatCard label="Activity Logs" value={m?.totalLogs ?? "—"} icon={ClipboardList} accent="violet" />
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Manage</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 hover:shadow-sm transition"
              >
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${a.tone} text-white`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold text-foreground truncate flex-1">{a.label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Role distribution — inline compact */}
      {m && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Role distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {Object.entries(m.roleDistribution).map(([role, n]) => (
                <div key={role} className="rounded-md border border-border bg-muted/40 px-2.5 py-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{role.replace("_", " ")}</div>
                  <div className="text-sm font-bold">{n as number}</div>
                </div>
              ))}
              {m.blockedUsers > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1">
                  <div className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">Blocked</div>
                  <div className="text-sm font-bold text-red-700">{m.blockedUsers}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widgets: signups + alerts + trend */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" /> Recent signups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!w ? <div className="text-xs text-muted-foreground">Loading…</div> :
              w.recentSignups.length === 0 ? <div className="text-xs text-muted-foreground">No signups yet.</div> :
              <ul className="divide-y divide-border">
                {w.recentSignups.slice(0, 6).map((s) => (
                  <li key={s.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{s.name || s.email}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.email}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </div>
                  </li>
                ))}
              </ul>
            }
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> System alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!w ? <div className="text-xs text-muted-foreground">Loading…</div> :
              w.systemAlerts.length === 0 ? <div className="text-xs text-muted-foreground">No critical alerts.</div> :
              <ul className="divide-y divide-border">
                {w.systemAlerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{a.alert_type ?? "Alert"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{a.message ?? ""}</div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {a.severity}
                    </span>
                  </li>
                ))}
              </ul>
            }
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-600" /> Signups · 30d
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!w ? <div className="text-xs text-muted-foreground">Loading…</div> :
              <>
                <div className="flex items-end gap-0.5 h-20">
                  {w.signupsSeries.map((p) => (
                    <div key={p.date} className="flex-1">
                      <div
                        className="bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t"
                        style={{ height: `${(p.count / maxCount) * 100}%`, minHeight: 2 }}
                        title={`${p.date}: ${p.count}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>{w.signupsSeries[0]?.date}</span>
                  <span>{w.signupsSeries[w.signupsSeries.length - 1]?.date}</span>
                </div>
              </>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}