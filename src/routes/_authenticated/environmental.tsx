import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplet, Wind, Wheat, AlertTriangle, Activity } from "lucide-react";
import { getEnvironmentalOverview } from "@/lib/monitoring.functions";

export const Route = createFileRoute("/_authenticated/environmental")({
  component: EnvPage,
});

function Stat({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <Icon className={`h-6 w-6 ${color}`} />
      <div><div className="text-xs uppercase text-slate-500 font-semibold">{label}</div><div className="text-xl font-bold">{value}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>
    </CardContent></Card>
  );
}

function EnvPage() {
  const fn = useServerFn(getEnvironmentalOverview);
  const { data } = useQuery({ queryKey: ["environmental"], queryFn: () => fn(), refetchInterval: 60_000 });

  const env = data?.env;
  const trend = data?.trend ?? [];
  const silos = data?.siloLatest ?? [];
  const maxT = Math.max(1, ...trend.map((t: any) => t.temp));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Activity className="h-6 w-6 text-emerald-600" /> Environmental Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">Live conditions across silos over the last 24 hours ({data?.samples ?? 0} samples).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Thermometer} label="Temperature" value={`${(env?.temp.avg ?? 0).toFixed(1)}°C`} sub={`range ${(env?.temp.min ?? 0).toFixed(1)}–${(env?.temp.max ?? 0).toFixed(1)}`} color="text-orange-600" />
        <Stat icon={Droplet} label="Humidity" value={`${(env?.hum.avg ?? 0).toFixed(1)}%`} sub={`range ${(env?.hum.min ?? 0).toFixed(0)}–${(env?.hum.max ?? 0).toFixed(0)}`} color="text-blue-600" />
        <Stat icon={Wheat} label="Moisture" value={`${(env?.moist.avg ?? 0).toFixed(1)}%`} sub={`range ${(env?.moist.min ?? 0).toFixed(1)}–${(env?.moist.max ?? 0).toFixed(1)}`} color="text-amber-600" />
        <Stat icon={Wind} label="CO₂" value={`${(env?.co2.avg ?? 0).toFixed(0)} ppm`} sub={`peak ${(env?.co2.max ?? 0).toFixed(0)}`} color="text-slate-600" />
        <Stat icon={AlertTriangle} label="Anomalies" value={String(data?.anomalies ?? 0)} sub={`${data?.condensationRisk ?? 0} condensation risks`} color="text-red-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>24-hour trend</CardTitle><CardDescription>Hourly average temperature</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {trend.map((t: any) => (
              <div key={t.hour} className="flex-1 flex flex-col items-center justify-end group" title={`${t.hour}: ${t.temp.toFixed(1)}°C`}>
                <div className="w-full bg-orange-400 rounded-t group-hover:bg-orange-500 transition-colors" style={{ height: `${(t.temp / maxT) * 100}%`, minHeight: t.temp > 0 ? "2px" : "0" }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{trend[0]?.hour}</span><span>{trend[trend.length - 1]?.hour}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Silo readings</CardTitle><CardDescription>Latest sample per silo</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {silos.map((s: any) => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.silo_id} · {s.status}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="text-orange-700 border-orange-200">{Number(s.latest?.temperature_value ?? 0).toFixed(1)}°C</Badge>
                  <Badge variant="outline" className="text-blue-700 border-blue-200">{Number(s.latest?.humidity_value ?? 0).toFixed(0)}% RH</Badge>
                  <Badge variant="outline" className="text-amber-700 border-amber-200">{Number(s.latest?.moisture_value ?? 0).toFixed(1)}% M</Badge>
                  {s.latest?.anomaly_detected && <Badge className="bg-red-100 text-red-800">anomaly</Badge>}
                  {s.latest?.condensation_risk && <Badge className="bg-amber-100 text-amber-800">condensation</Badge>}
                </div>
              </div>
            ))}
            {silos.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No sensor data in the last 24 hours.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}