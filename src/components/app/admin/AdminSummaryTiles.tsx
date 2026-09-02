import { Card, CardContent } from "@/components/ui/card";
import { Rail } from "@/components/app/surface";
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
  columns?: 3 | 4 | 5 | 6;
}) {
  const numeric = (v: string | number) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const max = Math.max(0, ...tiles.map((t) => numeric(t.value)));
  const colClass =
    columns === 3
      ? "md:grid-cols-3"
      : columns === 4
        ? "md:grid-cols-4"
        : columns === 6
          ? "md:grid-cols-6"
          : "md:grid-cols-5";
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
              "transition-all border-0 shadow-none",
              "hover:shadow-[0_10px_20px_-12px_rgba(16,185,129,0.25)]",
              clickable && "cursor-pointer",
              isActive && "shadow-[0_0_20px_-4px_rgba(16,185,129,0.45)]",
            )}
          >
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.label}
              </p>
              <div className="mt-1.5 text-2xl font-bold tabular-nums leading-tight text-foreground">
                {t.value}
              </div>
              {t.hint && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{t.hint}</p>}
              <div className="mt-3">
                <Rail pct={max > 0 ? (numeric(t.value) / max) * 100 : 0} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
