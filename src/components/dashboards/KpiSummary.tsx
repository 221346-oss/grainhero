import { Link } from "@tanstack/react-router";
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

type Row = { label: string; value: number | string; to: string; delta?: number };

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
    { label: "Buyers", value: s?.buyers ?? "—", to: "/buyers" },
    { label: "Warehouses", value: s?.warehouses ?? "—", to: "/warehouses" },
    { label: "Active Batches", value: s?.batches.active ?? "—", to: "/grain-batches", delta: deltaBatches },
    { label: "Silos", value: s?.silos ?? "—", to: "/silos" },
    { label: "Sensors Online", value: s?.sensors.online ?? "—", to: "/sensors", delta: deltaAlerts },
  ];
  const rev = revenueMtd ?? 0;
  const revPositive = (revenueDeltaPct ?? 0) >= 0;

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">KPI Summary</h2>
          <InfoDot text="Revenue and live totals for your tenant. Switch the range to compare against a prior period." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>

      <div className="grid gap-2 md:grid-cols-[35%_1fr]">
        {/* Revenue hero (35%) */}
        <Link
          to="/subscription"
          className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
            {planName && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {planName}
              </span>
            )}
          </div>
          <div className="mt-1">
            <div className="text-2xl md:text-3xl font-bold tabular-nums text-emerald-600 leading-tight">
              {fmtPKR.format(rev)}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`text-[10px] font-medium ${revPositive ? "text-emerald-600" : "text-amber-600"}`}>
                {revPositive ? "+" : ""}{revenueDeltaPct ?? 0}% vs prev
              </span>
              <span className="text-[10px] text-muted-foreground">12-mo trend</span>
            </div>
            <Spark data={revenueSpark ?? []} />
          </div>
        </Link>

        {/* Compact KPI list (65%) */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => {
              const positive = (r.delta ?? 0) >= 0;
              return (
                <li key={r.label}>
                  <Link
                    to={r.to}
                    className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                  >
                    <span className="text-xs text-foreground">{r.label}</span>
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