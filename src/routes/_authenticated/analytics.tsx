import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, DollarSign, Thermometer, Droplet, Wheat, AlertTriangle } from "lucide-react";
import { getAnalyticsOverview } from "@/lib/analytics.functions";
import { getPlatformAnalyticsBreakdown } from "@/lib/platform-overviews.functions";
import { getMyRole } from "@/lib/roles.functions";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { PlatformOverviewTable } from "@/components/app/PlatformOverviewTable";
import { PageHeader } from "@/components/dashboards/_shared";
import { AnalyticsSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Grain Hero" },
      { name: "description", content: "Analytics workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Analytics — Grain Hero" },
      { property: "og:description", content: "Analytics workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

function fmtKg(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}t`;
  return `${Math.round(n)} kg`;
}
function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
}

function AnalyticsPage() {
  const fetchRole = useServerFn(getMyRole);
  const fetchOverview = useServerFn(getAnalyticsOverview);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin", "manager"].includes(role);
  const isSuperAdmin = role === "super_admin";

  const { data } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => fetchOverview(),
    enabled: allowed,
    refetchInterval: 60_000,
  });

  const fetchPlatform = useServerFn(getPlatformAnalyticsBreakdown);
  const platformQ = useQuery({
    queryKey: ["platform-analytics-breakdown"],
    queryFn: () => fetchPlatform(),
    enabled: isSuperAdmin,
    refetchInterval: 60_000,
  });

  if (!roleQ.isLoading && !allowed) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Analytics is available to managers, admins and super admins.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  if (roleQ.isLoading) return <AnalyticsSkeleton />;

  const t = data?.totals;
  const env = data?.environmental;
  const trend = data?.trend ?? [];
  const byGrain = data?.byGrain ?? [];
  const byStatus = data?.byStatus ?? [];
  const alertsByPriority = data?.alertsByPriority ?? [];

  const maxTrend = Math.max(1, ...trend.map((d: any) => d.kg));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Aggregated operational and financial metrics across every tenant." />
      )}
      {isSuperAdmin && platformQ.data && (
        <PlatformOverviewTable
          title="Per-tenant performance"
          description={`${platformQ.data.totalTenants} tenants · ${fmtKg(platformQ.data.totals.kg)} · ${fmtMoney(platformQ.data.totals.revenue)}`}
          rows={platformQ.data.rows}
          columns={[
            { key: "batches", label: "Batches", align: "right", render: (r) => r.batches },
            { key: "kg", label: "Volume", align: "right", render: (r) => fmtKg(r.kg) },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtMoney(r.revenue) },
            { key: "margin", label: "Margin", align: "right", render: (r) => `${(r.margin * 100).toFixed(1)}%` },
            { key: "spoilageRate", label: "Spoilage", align: "right", render: (r) => (
                <span className={r.spoilageRate > 0.1 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{(r.spoilageRate * 100).toFixed(1)}%</span>
              ) },
          ]}
        />
      )}
      <PageHeader title="Business Analytics" subtitle="Operational and financial performance across your grain operations." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-muted-foreground font-semibold">Total inventory</div><div className="text-2xl font-bold text-foreground">{fmtKg(t?.totalKg ?? 0)}</div><div className="text-xs text-muted-foreground mt-1">{t?.batches ?? 0} batches</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-muted-foreground font-semibold">Revenue</div><div className="text-2xl font-bold text-foreground">{fmtMoney(t?.totalRevenue ?? 0)}</div><div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{((t?.margin ?? 0) * 100).toFixed(1)}% margin</div></div>
            <DollarSign className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-muted-foreground font-semibold">Capacity used</div><div className="text-2xl font-bold text-foreground">{((t?.utilization ?? 0) * 100).toFixed(0)}%</div>
              <Progress value={(t?.utilization ?? 0) * 100} className="h-1.5 mt-2" /></div>
            <TrendingUp className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-muted-foreground font-semibold">Spoilage rate</div><div className="text-2xl font-bold text-red-600 dark:text-red-400">{((t?.spoilageRate ?? 0) * 100).toFixed(1)}%</div><div className="text-xs text-muted-foreground mt-1">{t?.spoiled ?? 0} affected · {t?.openAlerts ?? 0} open alerts</div></div>
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Thermometer className="h-5 w-5 text-orange-500 dark:text-orange-400" /><div><div className="text-xs uppercase text-muted-foreground font-semibold">Avg temperature</div><div className="text-xl font-bold text-foreground">{(env?.avgTemp ?? 0).toFixed(1)}°C</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Droplet className="h-5 w-5 text-blue-500 dark:text-blue-400" /><div><div className="text-xs uppercase text-muted-foreground font-semibold">Avg humidity</div><div className="text-xl font-bold text-foreground">{(env?.avgHum ?? 0).toFixed(1)}%</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Wheat className="h-5 w-5 text-amber-500 dark:text-amber-400" /><div><div className="text-xs uppercase text-muted-foreground font-semibold">Avg moisture</div><div className="text-xl font-bold text-foreground">{(env?.avgMoist ?? 0).toFixed(1)}%</div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Intake trend (30 days)</CardTitle><CardDescription>Daily inventory received</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40">
            {trend.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end group" title={`${d.date}: ${fmtKg(d.kg)} (${d.batches} batches)`}>
                <div className="w-full bg-primary rounded-t transition-all group-hover:bg-primary/80" style={{ height: `${(d.kg / maxTrend) * 100}%`, minHeight: d.kg > 0 ? "2px" : "0" }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>{trend[0]?.date}</span><span>{trend[trend.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By grain type</CardTitle><CardDescription>Volume and revenue split</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {byGrain.map((g: any) => {
              const max = Math.max(1, ...byGrain.map((x: any) => x.kg));
              return (
                <div key={g.grain}>
                  <div className="flex justify-between text-sm mb-1"><span className="capitalize font-medium text-foreground">{g.grain}</span><span className="text-muted-foreground">{fmtKg(g.kg)} · {fmtMoney(g.revenue)}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(g.kg / max) * 100}%` }} /></div>
                </div>
              );
            })}
            {byGrain.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No batches yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Alerts &amp; status</CardTitle><CardDescription>Distribution across priorities and batch states</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">Alerts by priority</div>
              <div className="grid grid-cols-4 gap-2">
                {alertsByPriority.map((a: any) => (
                  <div key={a.priority} className="text-center p-2 rounded">
                    <div className="text-lg font-bold text-foreground">{a.count}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{a.priority}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">Batch status</div>
              <div className="flex flex-wrap gap-2">
                {byStatus.map((s: any) => (
                  <Badge key={s.status} variant="outline" className="text-xs">{s.status}: {s.count}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}