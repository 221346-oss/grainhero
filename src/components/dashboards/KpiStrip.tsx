import { Link } from "@tanstack/react-router";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTile = {
  key: string;
  label: string;
  value: number | string;
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  delta?: string | null;
};

export function KpiStrip({ tiles, className }: { tiles: KpiTile[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2", className)}>
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            to={t.to}
            search={t.search as never}
            className="group relative rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t.label}</span>
              <Icon className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums text-foreground">{t.value}</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 text-emerald-600" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}