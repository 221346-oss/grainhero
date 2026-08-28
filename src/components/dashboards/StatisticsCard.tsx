import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatisticsCardVariant = "dark" | "fuchsia" | "blue" | "teal";

const VARIANT_BG: Record<StatisticsCardVariant, string> = {
  dark: "bg-zinc-950",
  fuchsia: "bg-fuchsia-600",
  blue: "bg-blue-600",
  teal: "bg-teal-600",
};

export function StatisticsCard({
  to,
  title,
  value,
  delta,
  lastPeriod,
  variant = "dark",
  className,
}: {
  to?: string;
  title: string;
  value: string | number;
  delta?: number;
  lastPeriod?: string | number;
  variant?: StatisticsCardVariant;
  className?: string;
}) {
  const card = (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col items-stretch rounded-xl border border-white/10 text-white shadow-xs",
        VARIANT_BG[variant],
        to &&
          "transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-lg cursor-pointer",
        className,
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-2.5 px-5 min-h-14">
        <h3 className="text-white/90 text-sm font-medium leading-none tracking-tight">{title}</h3>
        <button
          type="button"
          className="-me-1.5 p-1 rounded-md text-white/80 hover:text-white"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 grow p-5 pt-8 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {delta !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
              {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {delta}%
            </span>
          )}
        </div>
        <div className="text-xs text-white/80 mt-2 border-t border-white/20 pt-2.5">
          Vs last month: <span className="font-medium text-white">{lastPeriod ?? "—"}</span>
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group block">
        {card}
      </Link>
    );
  }
  return card;
}
