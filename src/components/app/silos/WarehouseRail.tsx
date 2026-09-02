import { Building2, LayoutGrid, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type WarehouseRailItem = {
  id: string;
  name: string;
  warehouse_id: string;
  city?: string | null;
  address?: string | null;
  total_capacity_kg?: number | null;
  silo_count: number;
};

export function WarehouseRail({
  warehouses,
  selectedId,
  onSelect,
  totalSilos,
}: {
  warehouses: WarehouseRailItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  totalSilos: number;
}) {
  return (
    <aside className="rounded-2xl bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Warehouses
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{warehouses.length}</span>
      </div>
      <ul className="max-h-[70vh] overflow-auto py-1">
        <li>
          <button
            onClick={() => onSelect("all")}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition ${
              selectedId === "all"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500"
                : "text-foreground hover:bg-muted/60 border-l-2 border-transparent"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 opacity-70" />
            <span className="flex-1 text-left truncate">All warehouses</span>
            <span className="tabular-nums text-[10px] text-muted-foreground">{totalSilos}</span>
          </button>
        </li>
        {warehouses.length === 0 && (
          <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">
            No warehouses yet.
            <br />
            Complete an install to provision one.
          </li>
        )}
        {warehouses.map((w) => (
          <li key={w.id} className="group flex items-stretch">
            <button
              onClick={() => onSelect(w.id)}
              className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                selectedId === w.id
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500"
                  : "text-foreground hover:bg-muted/60 border-l-2 border-transparent"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="flex-1 text-left truncate">{w.name}</span>
              <span className="tabular-nums text-[10px] text-muted-foreground">{w.silo_count}</span>
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label={`Details for ${w.name}`}
                  className="px-2 text-muted-foreground/60 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition"
                >
                  <Info className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-64 text-xs space-y-1">
                <div className="font-semibold text-sm">{w.name}</div>
                <div className="text-muted-foreground font-mono text-[10px]">{w.warehouse_id}</div>
                {w.address && <div className="pt-1 text-foreground">{w.address}</div>}
                {w.city && <div className="text-muted-foreground">{w.city}</div>}
                <div className="pt-1 flex items-center justify-between border-t mt-1 pt-1">
                  <span className="text-muted-foreground">Silos</span>
                  <span className="tabular-nums font-medium">{w.silo_count}</span>
                </div>
                {w.total_capacity_kg ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="tabular-nums font-medium">
                      {(w.total_capacity_kg / 1000).toFixed(1)}t
                    </span>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </li>
        ))}
      </ul>
    </aside>
  );
}
