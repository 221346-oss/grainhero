import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { listMetrics } from "@/lib/metric-registry.functions";
import { listWidgetsForMe, saveWidget, deleteWidget } from "@/lib/dashboard-builder.functions";
import { MetricWidget } from "@/components/app/analytics/MetricWidget";

export const Route = createFileRoute("/_authenticated/platform/dashboard-builder")({
  component: DashboardBuilderPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const ROLES = ["super_admin", "admin", "manager", "technician", "buyer"] as const;
const SIZES = ["sm", "md", "lg"] as const;

function DashboardBuilderPage() {
  const qc = useQueryClient();
  const fetchWidgets = useServerFn(listWidgetsForMe);
  const fetchMetrics = useServerFn(listMetrics);
  const save = useServerFn(saveWidget);
  const remove = useServerFn(deleteWidget);

  const widgetsQ = useQuery({ queryKey: ["dashboard-widgets", "me"], queryFn: () => fetchWidgets() });
  const metricsQ = useQuery({ queryKey: ["metrics", "onlyMine"], queryFn: () => fetchMetrics({ data: { onlyMine: true, active: "active" } }) });

  const [metricKey, setMetricKey] = useState("");
  const [size, setSize] = useState<"sm" | "md" | "lg">("sm");
  const [role, setRole] = useState<string>("");
  const [personal, setPersonal] = useState(true);

  const myRole = widgetsQ.data?.role;
  const metrics = (metricsQ.data?.metrics ?? []) as Row[];
  const widgets = (widgetsQ.data?.widgets ?? []) as Row[];
  const metricByKey = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);

  const saveM = useMutation({
    mutationFn: () => save({ data: {
      metric_key: metricKey,
      chart_type: (metricByKey.get(metricKey)?.chart_hint ?? "tile"),
      size,
      filters: {},
      position: widgets.length,
      role_scope: (role || undefined) as ("super_admin" | "admin" | "manager" | "technician" | "buyer" | undefined),
      personal,
      dashboard_key: "role_default",
    } }),
    onSuccess: () => { toast.success("Widget added"); qc.invalidateQueries({ queryKey: ["dashboard-widgets"] }); setMetricKey(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["dashboard-widgets"] }); },
  });

  return (
    <AdminPageShell
      title="Dashboard Builder"
      subtitle="Compose your own KPI band from the metric registry. Super-admins can publish widgets to any role."
    >
      <AdminDataCard title="Add a widget">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Metric</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger><SelectValue placeholder="Pick metric" /></SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label} <span className="text-slate-400">({m.key})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as typeof size)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {myRole === "super_admin" && (
            <>
              <div>
                <Label>Publish to role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Personal only" /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={personal} onCheckedChange={setPersonal} />
                <Label className="!m-0">Personal (only me)</Label>
              </div>
            </>
          )}
          <div className="md:col-span-4 flex justify-end">
            <Button disabled={!metricKey || saveM.isPending} onClick={() => saveM.mutate()}>
              {saveM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add widget
            </Button>
          </div>
        </div>
      </AdminDataCard>

      <AdminDataCard title="Live preview">
        {widgets.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No widgets yet. Add one above to see it here.</div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {widgets.map((w) => {
              const m = metricByKey.get(w.metric_key);
              return (
                <div key={w.id} className="relative group">
                  <MetricWidget metricKey={w.metric_key} label={m?.label ?? w.metric_key} format={m?.format ?? "number"} unit={m?.unit} filters={w.filters} size={w.size} />
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {w.role_scope && !w.owner_id && <Badge variant="secondary" className="text-[10px]">{w.role_scope}</Badge>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeM.mutate(w.id)}>
                      <Trash2 className="h-3 w-3 text-rose-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminDataCard>

      <Card>
        <CardContent className="p-4 text-xs text-slate-500">
          Every widget renders through <code>public.run_metric()</code>. Metrics visible here follow the role
          allow-list defined in <b>Metric Registry</b>. Nothing is hardcoded — edit or add metrics there and they
          appear immediately in this builder.
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}