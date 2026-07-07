import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Cpu, AlertOctagon, CheckCircle2, Zap, Smartphone } from "lucide-react";
import { PageHeader, StatCard, Placeholder } from "./_shared";

export function TechnicianDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Technician Dashboard${name ? ` — ${name}` : ""}`}
        subtitle="Sensor health, actuator status and open maintenance work"
        badge="Technician"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sensors Online" value="—" icon={Smartphone} accent="emerald" />
        <StatCard label="Actuators Active" value="—" icon={Zap} accent="sky" />
        <StatCard label="Open Alerts" value="—" icon={AlertOctagon} accent="rose" />
        <StatCard label="Tasks Completed" value="—" icon={CheckCircle2} accent="violet" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4" /> Device Health</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" /> Maintenance Queue</CardTitle></CardHeader>
          <CardContent><Placeholder /></CardContent>
        </Card>
      </div>
    </div>
  );
}