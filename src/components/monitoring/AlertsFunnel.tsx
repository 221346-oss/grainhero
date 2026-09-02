"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocationScopeQuery } from "@/components/app/location/LocationScope";
import { useServerFn } from "@tanstack/react-start";
import { listGrainAlerts } from "@/lib/operations.functions";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

function fmtMinutes(min: number) {
  if (!min) return "—";
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 60 * 24) return `${(min / 60).toFixed(1)}h`;
  return `${(min / (60 * 24)).toFixed(1)}d`;
}

/**
 * Stage-to-stage funnel over the alert lifecycle. Stages are cumulative
 * ("reached at least this point"), so counts are always monotonic:
 * every resolved alert was acknowledged, every acknowledged alert triggered.
 */
export function AlertsFunnel() {
  const listFn = useServerFn(listGrainAlerts);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const { key: loc, params: locParams } = useLocationScopeQuery();
  const { data } = useQuery({
    queryKey: ["grain-alerts", loc],
    queryFn: () => listFn({ data: locParams }),
  });
  const list = (data ?? []) as any[];

  const reachedAck = list.filter(
    (a) =>
      a.acknowledged_at ||
      a.resolved_at ||
      ["acknowledged", "escalated", "resolved"].includes(a.status),
  );
  const resolved = list.filter((a) => a.resolved_at || a.status === "resolved");

  const stages = [
    { label: "All Alerts", count: list.length },
    { label: "Acknowledged", count: reachedAck.length },
    { label: "Resolved", count: resolved.length },
  ];
  const max = Math.max(stages[0].count, 1);

  const avgMin = (arr: any[], a: string, b: string) =>
    arr.length
      ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 60000, 0) /
        arr.length
      : 0;
  const mtta = avgMin(
    list.filter((a) => a.acknowledged_at && a.triggered_at),
    "acknowledged_at",
    "triggered_at",
  );
  const mttr = avgMin(
    resolved.filter((a) => a.resolved_at && a.triggered_at),
    "resolved_at",
    "triggered_at",
  );
  const criticalOpen = list.filter(
    (a) => a.priority === "critical" && a.status === "pending",
  ).length;

  if (list.length === 0) return null;

  const metrics = [
    {
      label: "Mean Time to Acknowledge",
      value: fmtMinutes(mtta),
      icon: Clock,
      tint: "text-amber-400",
    },
    {
      label: "Mean Time to Resolve",
      value: fmtMinutes(mttr),
      icon: CheckCircle2,
      tint: "text-emerald-400",
    },
    {
      label: "Critical Open",
      value: `${criticalOpen}`,
      icon: AlertTriangle,
      tint: "text-rose-400",
    },
  ];

  return (
    <div className="bg-card border-border rounded-2xl p-6 space-y-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Alert Pipeline
      </p>

      <div className="flex h-40 items-stretch">
        {stages.map((s, i) => {
          const pct = Math.max((s.count / max) * 100, s.count > 0 ? 10 : 4);
          const keep =
            i > 0 && stages[i - 1].count > 0
              ? Math.round((s.count / stages[i - 1].count) * 100)
              : null;
          return (
            <div
              key={s.label}
              className={`relative flex-1 flex items-center ${i > 0 ? "border-l border-border" : ""}`}
              title={`${s.count} ${s.label.toLowerCase()}${keep !== null ? ` — ${keep}% of previous stage` : ""}`}
            >
              <div
                className={`w-full bg-emerald-500/75 transition-all duration-700 ${
                  i === 0 ? "rounded-l-xl" : ""
                } ${i === stages.length - 1 ? "rounded-r-xl" : ""}`}
                style={{ height: `${pct}%` }}
              />
              <div className="absolute inset-0 flex flex-col justify-center pl-4 pointer-events-none">
                <span
                  className="text-2xl font-black text-white tabular-nums"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
                >
                  {s.count}
                </span>
                <span
                  className="text-xs text-foreground/80"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
                >
                  {s.label}
                  {keep !== null && <span className="text-muted-foreground"> · {keep}%</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-border">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <m.icon className={`w-3.5 h-3.5 ${m.tint}`} />
              {m.label}
            </div>
            <span className="text-base font-bold text-foreground tabular-nums">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
