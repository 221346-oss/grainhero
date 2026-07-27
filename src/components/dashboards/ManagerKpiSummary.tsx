import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";

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
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500" />
    </svg>
  );
}

export type ManagerKpis = {
  fillPct: number; totalCap: number; totalOcc: number;
  batchesTotal: number; batchesActive: number;
  alertsOpen: number; alertsCritical: number;
  qcPending: number; dispatchReady: number;
  actuatorsOn: number; actuatorsTotal: number;
  ordersOpen: number;
};

export function ManagerKpiSummary({
  range, onRange, kpis, fillSpark,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  kpis?: ManagerKpis;
  fillSpark?: number[];
}) {
  const k = kpis;
  const fill = k?.fillPct ?? 0;
  const fmtKg = (n: number) => `${Math.round(n / 1000).toLocaleString()}t`;
  const rows = [
    { label: "Active batches", value: k?.batchesActive ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "QC pending", value: k?.qcPending ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "Ready to dispatch", value: k?.dispatchReady ?? "—", to: "/grain-operations", search: { tab: "batches" } },
    { label: "Open alerts", value: k?.alertsOpen ?? "—", to: "/grain-alerts", search: undefined as { tab: string } | undefined },
    { label: "Open orders", value: k?.ordersOpen ?? "—", to: "/orders", search: undefined as { tab: string } | undefined },
  ];

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Operations Summary</h2>
          <InfoDot text="Live silo utilisation and operational queues. Every number links to its full page." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_35%]">
        {/* Silo Fill hero */}
        <Link
          to="/grain-operations"
          search={{ tab: "silos" }}
          className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Silo Fill</span>
            {k?.alertsCritical ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
                {k.alertsCritical} critical
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                stable
              </span>
            )}
          </div>
          <div className="mt-1">
            <div className="text-3xl md:text-4xl font-bold tabular-nums text-emerald-600 leading-tight">
              {fill}%
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                {fmtKg(k?.totalOcc ?? 0)} of {fmtKg(k?.totalCap ?? 0)}
              </span>
              <span className="text-[10px] text-muted-foreground">per-silo</span>
            </div>
            <Spark data={fillSpark ?? []} />
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, fill)}%` }} />
          </div>
        </Link>

        {/* Queues */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.label}>
                <Link
                  to={r.to}
                  search={r.search as never}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                >
                  <span className="text-xs text-foreground">{r.label}</span>
                  <span className="text-sm font-bold tabular-nums text-foreground w-10 text-right">{r.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}