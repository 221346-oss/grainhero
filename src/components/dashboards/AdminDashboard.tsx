import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, DollarSign, TrendingUp, Package, Activity } from "lucide-react";
import { PageHeader, StatCard, Placeholder } from "./_shared";

export function AdminDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Admin Dashboard${name ? ` — ${name}` : ""}`}
        subtitle="Tenant overview: team, silos, revenue and operations"
        badge="Admin"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Team Members" value="—" icon={Users} accent="emerald" />
        <StatCard label="Warehouses" value="—" icon={Building2} accent="sky" />
        <StatCard label="Active Batches" value="—" icon={Package} accent="violet" />
        <StatCard label="Revenue MTD" value="—" icon={DollarSign} accent="emerald" />
        <StatCard label="Growth" value="—" icon={TrendingUp} accent="amber" />
        <StatCard label="System Health" value="—" icon={Activity} accent="rose" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Team Activity</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Alerts</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="md:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Subscription & Billing</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
      </div>
    </div>
  );
}