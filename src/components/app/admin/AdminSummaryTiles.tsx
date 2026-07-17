import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SummaryTile = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
};

export function AdminSummaryTiles({
  tiles,
  active,
  onSelect,
  columns = 5,
}: {
  tiles: SummaryTile[];
  active?: string;
  onSelect?: (key: string) => void;
  columns?: 3 | 4 | 5;
}) {
  const colClass =
    columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : "md:grid-cols-5";
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3", colClass)}>
      {tiles.map((t) => {
        const isActive = active === t.key;
        const clickable = !!onSelect;
        return (
          <Card
            key={t.key}
            onClick={clickable ? () => onSelect!(t.key) : undefined}
            className={cn(
              "transition-all border-slate-200/70",
              "hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_20px_-12px_rgba(16,185,129,0.25)]",
              clickable && "cursor-pointer",
              isActive && "ring-2 ring-emerald-400 shadow-md",
            )}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 leading-tight">{t.value}</div>
              <p className="text-xs text-slate-500 font-medium mt-1">{t.label}</p>
              {t.hint && <p className="text-[10px] text-slate-400 mt-0.5">{t.hint}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}