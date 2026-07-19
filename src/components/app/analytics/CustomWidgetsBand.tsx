import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listWidgetsForMe } from "@/lib/dashboard-builder.functions";
import { listMetrics } from "@/lib/metric-registry.functions";
import { MetricWidget } from "./MetricWidget";
import { LayoutGrid, Plus } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Renders the caller's personal + role-scoped widgets. Silent when the user
 * has none. Every role dashboard mounts this once so newly-added widgets
 * appear without touching that role's dashboard code.
 */
export function CustomWidgetsBand({ className }: { className?: string }) {
  const fetchWidgets = useServerFn(listWidgetsForMe);
  const fetchMetrics = useServerFn(listMetrics);

  const widgetsQ = useQuery({
    queryKey: ["dashboard-widgets", "me"],
    queryFn: () => fetchWidgets(),
    staleTime: 60_000,
  });
  const metricsQ = useQuery({
    queryKey: ["metrics", "onlyMine"],
    queryFn: () => fetchMetrics({ data: { onlyMine: true, active: "active" } }),
    staleTime: 5 * 60_000,
  });

  const widgets = (widgetsQ.data?.widgets ?? []) as Row[];
  const metricByKey = new Map<string, Row>();
  for (const m of (metricsQ.data?.metrics ?? []) as Row[]) metricByKey.set(m.key, m);

  if (!widgets.length) return null;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-emerald-600" />
          My Metrics
        </h2>
        <Link
          to="/platform/dashboard-builder"
          className="text-xs text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Customize
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {widgets.map((w) => {
          const m = metricByKey.get(w.metric_key);
          return (
            <MetricWidget
              key={w.id}
              metricKey={w.metric_key}
              label={m?.label ?? w.metric_key}
              format={m?.format ?? "number"}
              unit={m?.unit}
              filters={w.filters}
              size={w.size}
            />
          );
        })}
      </div>
    </section>
  );
}