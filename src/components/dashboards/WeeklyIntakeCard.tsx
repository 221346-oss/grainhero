import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { CardHeaderLink } from "./DashboardBlocks";

type Point = { label: string; value: number };

function formatKg(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("en", { maximumFractionDigits: 1 })}t`;
  return `${kg.toLocaleString("en")}kg`;
}

/**
 * Seven-day grain intake, one bar per day. Bars are buttons rather than divs so
 * the series is reachable by keyboard and by tap — hover alone would leave the
 * numbers unavailable to anyone not on a mouse, and this widget sits on an
 * operations dashboard that gets used from tablets on the floor.
 */
export function WeeklyIntakeChart({ data }: { data: Point[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  // Guard the empty/all-zero week: Math.max() of nothing is -Infinity, and
  // dividing by a zero max would put NaN straight into the height style.
  const max = data.length ? Math.max(...data.map((d) => d.value)) : 0;
  const active = activeIndex !== null ? data[activeIndex] : null;

  if (!data.length || total === 0) {
    return <p className="text-xs text-muted-foreground py-2">No intake in the last 7 days</p>;
  }

  return (
    <div className="flex flex-col gap-3" onMouseLeave={() => setActiveIndex(null)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">
          {active ? active.label : "Last 7 days"}
        </span>
        <span className="text-lg font-bold tabular-nums leading-none text-emerald-600 dark:text-emerald-400">
          {formatKg(active ? active.value : total)}
        </span>
      </div>

      <div className="flex h-24 items-end gap-1.5">
        {data.map((point, index) => {
          const pct = max > 0 ? (point.value / max) * 100 : 0;
          const isActive = activeIndex === index;
          const isDimmed = activeIndex !== null && !isActive;
          return (
            <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <button
                type="button"
                aria-label={`${point.label}: ${formatKg(point.value)} intake`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="flex w-full flex-1 cursor-pointer flex-col justify-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                <span
                  className={cn(
                    "w-full rounded-full transition-colors duration-200",
                    isActive
                      ? "bg-emerald-500"
                      : isDimmed
                        ? "bg-emerald-500/20"
                        : "bg-emerald-500/50",
                  )}
                  // A zero-value day still needs a visible sliver, otherwise the
                  // bar vanishes and the day reads as missing rather than empty.
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </button>
              <span
                className={cn(
                  "mt-1.5 text-[10px] transition-colors duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {point.label.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Dashboard card wrapper — same query key as the rest of the row, so react-query
 *  dedupes it into the single getDashboardExtras call the dashboard already makes. */
export function WeeklyIntakeCard({ range = "mtd" }: { range?: string }) {
  const fn = useServerFn(getDashboardExtras);
  const { data } = useQuery({
    queryKey: ["dashboard-extras", range],
    queryFn: () => fn({ data: { range } as never }),
    refetchInterval: 30_000,
  });

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "batches" }} title="Weekly Intake" />
      <CardContent className="p-3 pt-0">
        <WeeklyIntakeChart data={data?.intake7d ?? []} />
      </CardContent>
    </Card>
  );
}
