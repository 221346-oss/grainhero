import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, AlertTriangle, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { PageHeader, StatCard, Placeholder } from "./_shared";

export function ManagerDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Manager Dashboard${name ? ` — ${name}` : ""}`}
        subtitle="Operational overview of batches, dispatch and grain quality"
        badge="Manager"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Batches" value="—" icon={Package} accent="emerald" />
        <StatCard label="Active" value="—" icon={Activity} accent="sky" />
        <StatCard label="Dispatched Today" value="—" icon={Truck} accent="violet" />
        <StatCard label="Revenue" value="—" icon={TrendingUp} accent="emerald" />
        <StatCard label="Risk Alerts" value="—" icon={AlertTriangle} accent="rose" />
        <StatCard label="Quality Score" value="—" icon={BarChart3} accent="amber" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Batches</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base">Active Alerts</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="md:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Storage Capacity</CardTitle>
              <Badge variant="secondary">Preview</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Silo A", "Silo B", "Silo C"].map((silo, i) => (
              <div key={silo} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{silo}</span>
                  <span className="font-semibold text-slate-900">{[68, 42, 91][i]}%</span>
                </div>
                <Progress value={[68, 42, 91][i]} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}