import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import { QualityBadge } from "@/components/app/sensors/QualityBadge";
import { LiveReadingChart } from "@/components/app/sensors/LiveReadingChart";
import { ThresholdDrawer } from "@/components/app/sensors/ThresholdDrawer";
import { AutomationRulesDrawer } from "@/components/app/automation/AutomationRulesDrawer";
import { BatchLifecycleActions } from "@/components/app/batches/BatchLifecycleActions";
import { CommandConsole } from "@/components/app/actuators/CommandConsole";
import { getSiloCockpit } from "@/lib/silo-cockpit.functions";
import {
  ArrowLeft, Thermometer, Droplets, Wind, Gauge, Zap, Sliders, AlertTriangle, Package, Radio, Wifi, WifiOff,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/silos/$siloId")({
  component: SiloCockpit,
});

function SiloCockpit() {
  const { siloId } = Route.useParams();
  const fn = useServerFn(getSiloCockpit);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["silo-cockpit", siloId],
    queryFn: () => fn({ data: { siloId } }),
  });
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [selectedActuatorId, setSelectedActuatorId] = useState<string | null>(null);

  // Realtime: refresh cockpit on new readings/alerts/commands for this silo
  useEffect(() => {
    const ch = supabase.channel(`silo-cockpit-${siloId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sensor_readings", filter: `silo_id=eq.${siloId}` },
        () => qc.invalidateQueries({ queryKey: ["silo-cockpit", siloId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "grain_alerts", filter: `silo_id=eq.${siloId}` },
        () => qc.invalidateQueries({ queryKey: ["silo-cockpit", siloId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "grain_batches", filter: `silo_id=eq.${siloId}` },
        () => qc.invalidateQueries({ queryKey: ["silo-cockpit", siloId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [siloId, qc]);

  const d = data as {
    silo: Record<string, unknown>;
    latestReading: Record<string, unknown> | null;
    openAlerts: Array<Record<string, unknown>>;
    batches: Array<Record<string, unknown>>;
    sensors: Array<Record<string, unknown>>;
    actuators: Array<Record<string, unknown>>;
    heartbeats: Array<Record<string, unknown>>;
    automationRules: Array<Record<string, unknown>>;
  } | undefined;

  const silo = d?.silo;
  const siloName = (silo?.name as string) ?? "Silo";
  const capacity = Number(silo?.capacity_kg ?? 0);
  const occupancy = Number(silo?.current_occupancy_kg ?? 0);
  const fillPct = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;

  const latest = d?.latestReading;
  const online = useMemo(() => {
    if (!d) return 0;
    const cutoff = Date.now() - 15 * 60_000;
    return (d.heartbeats ?? []).filter((h) => {
      const t = new Date(h.last_seen_at as string).getTime();
      return h.status === "online" && t >= cutoff;
    }).length;
  }, [d]);

  if (isLoading || !d) {
    return <div className="p-6 max-w-7xl mx-auto text-sm text-muted-foreground">Loading cockpit…</div>;
  }

  const activeActuator = d.actuators.find((a) => a.id === selectedActuatorId) ?? d.actuators[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/grain-operations"><ArrowLeft className="h-4 w-4 mr-1" /> Silos</Link></Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={siloName}
          subtitle={`${d.sensors.length} sensors · ${d.actuators.length} actuators · ${d.openAlerts.length} open alerts`}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setThresholdOpen(true)}><Sliders className="h-4 w-4 mr-1" /> Thresholds</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAutomationOpen(true)}>
            <Zap className="h-4 w-4 mr-1" /> Automation
          </Button>
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={<Thermometer className="h-4 w-4 text-rose-500" />} label="Temp"
          value={latest?.temperature_value != null ? `${latest.temperature_value}°C` : "—"} />
        <MetricTile icon={<Droplets className="h-4 w-4 text-sky-500" />} label="Humidity"
          value={latest?.humidity_value != null ? `${latest.humidity_value}%` : "—"} />
        <MetricTile icon={<Wind className="h-4 w-4 text-emerald-500" />} label="CO₂"
          value={latest?.co2_value != null ? `${latest.co2_value} ppm` : "—"} />
        <MetricTile icon={<Gauge className="h-4 w-4 text-amber-500" />} label="Moisture"
          value={latest?.moisture_value != null ? `${latest.moisture_value}%` : "—"} />
      </div>

      {/* Capacity + status */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Capacity</span>
            <span>{occupancy.toLocaleString()} / {capacity.toLocaleString()} kg · {fillPct}%</span>
          </div>
          <Progress value={fillPct} className="h-2" />
          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Wifi className="h-3.5 w-3.5 text-emerald-500" /> {online} online</span>
            <span className="flex items-center gap-1"><WifiOff className="h-3.5 w-3.5 text-muted-foreground" /> {d.sensors.length - online} offline</span>
            <QualityBadge flag={(latest?.quality_flag as string) ?? null} />
            {latest?.reading_timestamp ? <span>Last reading {new Date(latest.reading_timestamp as string).toLocaleString()}</span> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Live chart spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Live telemetry (24h)</CardTitle></CardHeader>
          <CardContent>
            {d.sensors[0] ? (
              <LiveReadingChart siloId={siloId} deviceId={d.sensors[0].id as string} hours={24} />
            ) : <div className="text-sm text-muted-foreground">No sensors assigned.</div>}
          </CardContent>
        </Card>

        {/* Open alerts */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Open alerts
            </CardTitle>
            <Badge variant="outline">{d.openAlerts.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {d.openAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No open alerts.</div>
            ) : d.openAlerts.map((a) => (
              <div key={a.id as string} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="capitalize">{String(a.alert_type)}</Badge>
                  <Badge className={
                    a.severity === "critical" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" :
                    a.severity === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
                    "bg-slate-500/15"}>{String(a.severity)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{String(a.message ?? "")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active batches */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Active batches</CardTitle>
          <Badge variant="outline">{d.batches.length}</Badge>
        </CardHeader>
        <CardContent>
          {d.batches.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active batches in this silo.</div>
          ) : (
            <div className="divide-y">
              {d.batches.map((b) => (
                <div key={b.id as string} className="flex items-center justify-between py-2 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{String(b.batch_number)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {String(b.grain_type ?? "")} · {b.net_weight_kg != null ? `${b.net_weight_kg} kg` : ""} {b.quality_grade ? ` · grade ${b.quality_grade}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge value={String(b.status)} />
                    <BatchLifecycleActions batchId={b.id as string} batchLabel={String(b.batch_number)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actuators + command console */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Actuators</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {d.actuators.length === 0 ? (
              <div className="text-sm text-muted-foreground">None assigned.</div>
            ) : d.actuators.map((a) => (
              <button key={a.id as string} onClick={() => setSelectedActuatorId(a.id as string)}
                className={`w-full text-left rounded-md border p-2 text-sm hover:border-emerald-500 transition ${activeActuator?.id === a.id ? "border-emerald-500 bg-emerald-500/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{String(a.name)}</span>
                  <StatusBadge value={String(a.status)} />
                </div>
                <div className="text-xs text-muted-foreground capitalize">{String(a.actuator_type ?? "")}</div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Command console</CardTitle></CardHeader>
          <CardContent>
            {activeActuator ? (
              <CommandConsole actuatorId={activeActuator.id as string} />
            ) : (
              <div className="text-sm text-muted-foreground">Select an actuator to send commands.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <ThresholdDrawer open={thresholdOpen} onOpenChange={setThresholdOpen} siloId={siloId} siloName={siloName} />
      <AutomationRulesDrawer open={automationOpen} onOpenChange={setAutomationOpen} siloId={siloId} siloName={siloName} />
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>{icon}
        </div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
