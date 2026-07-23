import { Link } from "@tanstack/react-router";
import { Users, Building2, Package, Container, Radio, Wallet, type LucideIcon } from "lucide-react";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";
import { useDashboardStats } from "./useDashboardStats";

const fmtPKR = new Intl.NumberFormat("en-PK", {
  style: "currency", currency: "PKR", maximumFractionDigits: 0,
});

function Spark({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 24 - (v / max) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-6">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-emerald-500"
      />
    </svg>
  );
}

type Row = { label: string; value: number | string; to: string; search?: { tab: string }; delta?: number; icon: LucideIcon };

export function KpiSummary({
  range, onRange,
  deltaBatches, deltaAlerts,
  revenueMtd, revenueDeltaPct, revenueSpark,
  planName,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  deltaBatches?: number;
  deltaAlerts?: number;
  revenueMtd?: number;
  revenueDeltaPct?: number;
  revenueSpark?: number[];
  planName?: string;
}) {
  const { data: s } = useDashboardStats();
  const rows: Row[] = [
    { label: "Buyers", value: s?.buyers ?? "—", to: "/grain-operations", search: { tab: "buyers" }, icon: Users },
    { label: "Warehouses", value: s?.warehouses ?? "—", to: "/grain-operations", search: { tab: "warehouses" }, icon: Building2 },
    { label: "Active Batches", value: s?.batches.active ?? "—", to: "/grain-operations", search: { tab: "batches" }, delta: deltaBatches, icon: Package },
    { label: "Silos", value: s?.silos ?? "—", to: "/grain-operations", search: { tab: "silos" }, icon: Container },
    { label: "Sensors Online", value: s?.sensors.online ?? "—", to: "/sensors", delta: deltaAlerts, icon: Radio },
  ];
  const rev = revenueMtd ?? 0;
  const revPositive = (revenueDeltaPct ?? 0) >= 0;

  return (
    <section className="rounded-xl bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">KPI Summary</h2>
          <InfoDot text="Revenue and live totals for your tenant. Switch the range to compare against a prior period." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_35%]">
        {/* Revenue hero (65%, LEFT) */}
        <Link
          to="/subscription"
          className="group rounded-lg bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3 w-3" /> Revenue
            </span>
            {planName && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {planName}
              </span>
            )}
          </div>
          <div className="mt-1">
            <div className="text-3xl md:text-4xl font-bold tabular-nums text-emerald-600 leading-tight">
              {fmtPKR.format(rev)}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[10px] font-medium ${revPositive ? "text-emerald-600" : "text-amber-600"}`}>
                {revPositive ? "+" : ""}{revenueDeltaPct ?? 0}% vs prev
              </span>
              <InfoDot text="12-month revenue trend, shown below." />
            </div>
            <Spark data={revenueSpark ?? []} />
          </div>
        </Link>

        {/* Compact KPI list (35%, RIGHT) */}
        <div className="rounded-lg bg-card overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => {
              const positive = (r.delta ?? 0) >= 0;
              const Icon = r.icon;
              return (
                <li key={r.label}>
                  <Link
                    to={r.to}
                    search={r.search as never}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
                      {r.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {typeof r.delta === "number" && (
                        <span className={`text-[10px] font-medium ${positive ? "text-emerald-600" : "text-amber-600"}`}>
                          {positive ? "+" : ""}{r.delta}%
                        </span>
                      )}
                      <span className="text-sm font-bold tabular-nums text-foreground w-10 text-right">{r.value}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}