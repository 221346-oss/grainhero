import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Package, Warehouse, OctagonAlert, CreditCard, DollarSign, ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboards/_shared";
import { getPlatformMetrics } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/platform/")({ component: PlatformOverview });

function PlatformOverview() {
  const fn = useServerFn(getPlatformMetrics);
  const { data, isLoading } = useQuery({ queryKey: ["platform-metrics"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="p-6"><DashboardSkeleton /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tenants" value={data.totalTenants} icon={Building2} accent="sky" />
        <StatCard label="Total Users" value={data.totalUsers} icon={Users} accent="violet" />
        <StatCard label="Active Subs" value={data.activeSubscriptions} icon={CreditCard} accent="emerald" />
        <StatCard label="MRR" value={`$${data.mrr.toLocaleString()}`} icon={DollarSign} accent="emerald" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Grain Batches" value={data.totalBatches} icon={Package} accent="amber" />
        <StatCard label="Silos" value={data.totalSilos} icon={Warehouse} accent="sky" />
        <StatCard label="Critical Alerts" value={data.criticalAlerts} icon={OctagonAlert} accent="rose" trend={`${data.totalAlerts} total`} />
        <StatCard label="Activity Logs" value={data.totalLogs} icon={ClipboardList} accent="violet" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Role distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.roleDistribution).map(([role, n]) => (
              <div key={role} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">{role}</div>
                <div className="text-lg font-bold text-slate-900">{n as number}</div>
              </div>
            ))}
            {data.blockedUsers > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
                <div className="text-[11px] uppercase tracking-widest text-red-600 font-semibold">Blocked</div>
                <div className="text-lg font-bold text-red-700">{data.blockedUsers}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}