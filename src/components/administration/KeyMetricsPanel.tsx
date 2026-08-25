import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KeyMetricsStats {
  label: string;
  value: number | string;
  up: boolean;
}

interface KeyMetricsPanelProps {
  stats: KeyMetricsStats[];
}

export function KeyMetricsPanel({ stats }: KeyMetricsPanelProps) {
  const getProgressPercentage = (label: string, value: number | string): number => {
    const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
    if (label.includes("Members")) return Math.min((numValue / 50) * 100, 100);
    if (label.includes("Invites")) return Math.min((numValue / 10) * 100, 100);
    if (label.includes("Events")) return Math.min((numValue / 100) * 100, 100);
    return Math.min((numValue / 100) * 100, 100);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card/90 via-card/70 to-muted/30 p-5 backdrop-blur-md shadow-sm h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            System Key Metrics
          </p>
        </div>
        <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Live Telemetry
        </span>
      </div>

      <div className="grid gap-px bg-border/60 rounded-lg overflow-hidden my-auto shadow-xs">
        {stats.map((s) => {
          const percentage = getProgressPercentage(s.label, s.value);
          return (
            <div key={s.label} className="bg-card p-3.5 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-black text-foreground font-mono mt-0.5">
                    {typeof s.value === "string" ? s.value : s.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border shrink-0",
                    s.up
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}
                >
                  {s.up ? (
                    <>
                      <TrendingUp className="h-3 w-3" /> +Live
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3" /> Monitor
                    </>
                  )}
                </div>
              </div>

              {/* Progress Level Gauge Bar */}
              <div className="w-full h-1.5 bg-muted/80 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 shadow-[0_0_8px]",
                    s.up
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50"
                      : "bg-gradient-to-r from-rose-500 to-amber-500 shadow-rose-500/50"
                  )}
                  style={{ width: `${Math.max(8, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
