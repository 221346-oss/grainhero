import { Link } from "@tanstack/react-router";
import { Users, Warehouse, Wheat, Container, Radio, type LucideIcon } from "lucide-react";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import { useDashboardStats } from "./useDashboardStats";

type Tile = { key: string; label: string; value: number | string; to: string; icon: LucideIcon; info: string; delta?: number };

export function KpiSummary({ range, onRange, deltaBatches, deltaAlerts }: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  deltaBatches?: number;
  deltaAlerts?: number;
}) {
  const { data: s } = useDashboardStats();
  const tiles: Tile[] = [
    { key: "buyers", label: "Buyers", value: s?.buyers ?? "—", to: "/buyers", icon: Users, info: "Total buyers linked to your tenant." },
    { key: "wh", label: "Warehouses", value: s?.warehouses ?? "—", to: "/warehouses", icon: Warehouse, info: "Active warehouses under management." },
    { key: "batches", label: "Active Batches", value: s?.batches.active ?? "—", to: "/grain-batches", icon: Wheat, info: "Batches currently in storage or QC.", delta: deltaBatches },
    { key: "silos", label: "Silos", value: s?.silos ?? "—", to: "/silos", icon: Container, info: "Silos deployed across your warehouses." },
    { key: "sensors", label: "Sensors Online", value: s?.sensors.online ?? "—", to: "/sensors", icon: Radio, info: "Sensor devices reporting within the last hour.", delta: deltaAlerts },
  ];

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">KPI Summary</h2>
          <InfoDot text="Live totals for your tenant. Switch the range to compare against a prior period." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          const positive = (t.delta ?? 0) >= 0;
          return (
            <Link
              key={t.key}
              to={t.to}
              className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40"
            >
              <div className="flex items-center justify-between">
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 grid place-items-center">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <InfoDot text={t.info} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-[11px] text-muted-foreground truncate">{t.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-foreground leading-tight">{t.value}</div>
              {typeof t.delta === "number" && (
                <div className={`text-[10px] font-medium mt-0.5 ${positive ? "text-emerald-600" : "text-red-500"}`}>
                  {positive ? "+" : ""}{t.delta}% vs prev
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}