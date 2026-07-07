import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, Server, Activity, Globe2 } from "lucide-react";
import { PageHeader, StatCard, Placeholder } from "./_shared";
import { useDashboardStats } from "./useDashboardStats";

export function SuperAdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Super Admin${name ? ` — ${name}` : ""}`}
        subtitle="Platform-wide health, tenants, subscriptions and revenue"
        badge="Super Admin"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Warehouses" value={s?.warehouses ?? "—"} icon={Building2} accent="emerald" />
        <StatCard label="Silos" value={s?.silos ?? "—"} icon={Users} accent="sky" />
        <StatCard label="Batches" value={s?.batches.total ?? "—"} icon={DollarSign} accent="violet" />
        <StatCard label="Sensors" value={s?.sensors.total ?? "—"} icon={Server} accent="amber" />
        <StatCard label="Actuators" value={s?.actuators.total ?? "—"} icon={Activity} accent="emerald" />
        <StatCard label="Alerts" value={s?.alerts.open ?? "—"} icon={Globe2} accent="rose" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">System Alerts</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="md:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Global Analytics</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
      </div>
    </div>
  );
}