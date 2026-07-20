import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Thermometer, Droplet, Wheat, AlertTriangle } from "lucide-react";
import { getAnalyticsOverview } from "@/lib/analytics.functions";
import { getPlatformAnalyticsBreakdown } from "@/lib/platform-overviews.functions";
import { getMyRole } from "@/lib/roles.functions";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { PlatformOverviewTable } from "@/components/app/PlatformOverviewTable";
import { DataVisualizationPanel } from "./DataVisualizationPanel";

function fmtKg(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}t`;
  return `${Math.round(n)} kg`;
}
function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
}

export function AnalyticsSection() {
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
      <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Analytics is available to managers, admins and super admins.</CardDescription></CardHeader></Card>
    );
  }

  const t = data?.totals;
  const env = data?.environmental;
  const trend = data?.trend ?? [];
  const byGrain = data?.byGrain ?? [];
  const byStatus = data?.byStatus ?? [];
  const alertsByPriority = data?.alertsByPriority ?? [];

  const maxTrend = Math.max(1, ...trend.map((d: any) => d.kg));

  return (
    <div className="space-y-6">
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
                <span className={r.spoilageRate > 0.1 ? "text-red-600 font-medium" : ""}>{(r.spoilageRate * 100).toFixed(1)}%</span>
              ) },
          ]}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-slate-500 font-semibold">Total inventory</div><div className="text-2xl font-bold text-slate-900">{fmtKg(t?.totalKg ?? 0)}</div><div className="text-xs text-slate-500 mt-1">{t?.batches ?? 0} batches</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-slate-500 font-semibold">Revenue</div><div className="text-2xl font-bold text-slate-900">{fmtMoney(t?.totalRevenue ?? 0)}</div><div className="text-xs text-emerald-600 mt-1">{((t?.margin ?? 0) * 100).toFixed(1)}% margin</div></div>
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-slate-500 font-semibold">Capacity used</div><div className="text-2xl font-bold text-slate-900">{((t?.utilization ?? 0) * 100).toFixed(0)}%</div>
              <Progress value={(t?.utilization ?? 0) * 100} className="h-1.5 mt-2" /></div>
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs uppercase text-slate-500 font-semibold">Spoilage rate</div><div className="text-2xl font-bold text-red-600">{((t?.spoilageRate ?? 0) * 100).toFixed(1)}%</div><div className="text-xs text-slate-500 mt-1">{t?.spoiled ?? 0} affected · {t?.openAlerts ?? 0} open alerts</div></div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Thermometer className="h-5 w-5 text-orange-600" /><div><div className="text-xs uppercase text-slate-500 font-semibold">Avg temperature</div><div className="text-xl font-bold">{(env?.avgTemp ?? 0).toFixed(1)}°C</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Droplet className="h-5 w-5 text-blue-600" /><div><div className="text-xs uppercase text-slate-500 font-semibold">Avg humidity</div><div className="text-xl font-bold">{(env?.avgHum ?? 0).toFixed(1)}%</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Wheat className="h-5 w-5 text-amber-600" /><div><div className="text-xs uppercase text-slate-500 font-semibold">Avg moisture</div><div className="text-xl font-bold">{(env?.avgMoist ?? 0).toFixed(1)}%</div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Intake trend (30 days)</CardTitle><CardDescription>Daily inventory received</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40">
            {trend.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end group" title={`${d.date}: ${fmtKg(d.kg)} (${d.batches} batches)`}>
                <div className="w-full bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600" style={{ height: `${(d.kg / maxTrend) * 100}%`, minHeight: d.kg > 0 ? "2px" : "0" }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
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
                  <div className="flex justify-between text-sm mb-1"><span className="capitalize font-medium">{g.grain}</span><span className="text-slate-500">{fmtKg(g.kg)} · {fmtMoney(g.revenue)}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(g.kg / max) * 100}%` }} /></div>
                </div>
              );
            })}
            {byGrain.length === 0 && <div className="text-sm text-slate-500 text-center py-6">No batches yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Alerts &amp; status</CardTitle><CardDescription>Distribution across priorities and batch states</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">Alerts by priority</div>
              <div className="grid grid-cols-4 gap-2">
                {alertsByPriority.map((a: any) => (
                  <div key={a.priority} className="text-center p-2 rounded border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{a.count}</div>
                    <div className="text-[10px] uppercase text-slate-500">{a.priority}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">Batch status</div>
              <div className="flex flex-wrap gap-2">
                {byStatus.map((s: any) => (
                  <Badge key={s.status} variant="outline" className="text-xs">{s.status}: {s.count}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Visualization — merged from the former standalone page */}
      {!isSuperAdmin && (
        <div className="pt-2 border-t border-white/8">
          <DataVisualizationPanel />
        </div>
      )}
    </div>
  );
}
