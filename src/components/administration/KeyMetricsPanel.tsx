import { TrendingUp, TrendingDown } from "lucide-react";

export interface KeyMetricsStats {
  label: string;
  value: number | string;
  up: boolean;
}

interface KeyMetricsPanelProps {
  stats: KeyMetricsStats[];
}

export function KeyMetricsPanel({ stats }: KeyMetricsPanelProps) {
  // Calculate percentage for progress bar visualization
  // For demonstration, we calculate based on typical ranges
  const getProgressPercentage = (label: string, value: number | string): number => {
    const numValue = typeof value === "string" ? parseInt(value) : value;

    // Different scaling based on metric type
    if (label.includes("Members")) return Math.min((numValue / 50) * 100, 100);
    if (label.includes("Invites")) return Math.min((numValue / 10) * 100, 100);
    if (label.includes("Events")) return Math.min((numValue / 100) * 100, 100);

    return Math.min((numValue / 100) * 100, 100);
  };

  return (
    <div className="bg-card border-border rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between relative h-full">
      <div className="flex justify-between items-start mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Key Metrics
        </p>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
          Last 12 Cycles
        </p>
      </div>

      <div className="space-y-6 flex-1 flex flex-col justify-center mt-2">
        {stats.map((s, idx) => {
          const percentage = getProgressPercentage(s.label, s.value);
          return (
            <div key={s.label} className="w-full">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center w-[45%] min-w-[120px]">
                  <div className="truncate">
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-base font-black text-foreground truncate">
                      {typeof s.value === "string" ? s.value : s.value.toString()}
                    </p>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700 ${
                        s.up ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right w-12 shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              {idx < stats.length - 1 && <div className="h-px w-full bg-border mt-6" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
