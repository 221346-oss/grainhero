import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";

const fmtPKR = new Intl.NumberFormat("en-PK", {
  style: "currency", currency: "PKR", maximumFractionDigits: 0,
});

function Spark({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 28 - (v / max) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-8">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500" />
    </svg>
  );
}

type Row = { label: string; value: number | string; to: string; danger?: boolean };

export function SuperKpiSummary({
  mrr, mrrDeltaPct, mrrSpark, activeSubs,
  totalTenants, totalUsers, ordersOpen, criticalAlerts,
}: {
  mrr: number;
  mrrDeltaPct?: number;
  mrrSpark?: number[];
  activeSubs: number;
  totalTenants: number;
  totalUsers: number;
  ordersOpen: number;
  criticalAlerts: number;
}) {
  const rows: Row[] = [
    { label: "Tenants", value: totalTenants, to: "/platform/users" },
    { label: "Users", value: totalUsers, to: "/platform/users" },
    { label: "Active subs", value: activeSubs, to: "/platform/plans" },
    { label: "Install orders", value: ordersOpen, to: "/platform/orders" },
    { label: "Critical alerts", value: criticalAlerts, to: "/platform/health", danger: criticalAlerts > 0 },
  ];
  const positive = (mrrDeltaPct ?? 0) >= 0;

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Platform KPI Summary</h2>
        <InfoDot text="MRR trend and live platform totals. Every number links to its full page." />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_35%]">
        <Link
          to="/platform/financials"
          className="group rounded-lg border bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Revenue</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {activeSubs} active
            </span>
          </div>
          <div className="mt-1 flex-1 flex flex-col justify-between gap-3">
            <div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-emerald-600 leading-tight">
                {fmtPKR.format(mrr)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
            </div>
            <div className="pt-3 border-t border-border/60">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Growth vs Last Month</span>
                <span className={`text-sm font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                  {positive ? "+" : ""}{mrrDeltaPct ?? 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${positive ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.abs(mrrDeltaPct ?? 0))}%` }}
                />
              </div>
              {mrrSpark && mrrSpark.length > 0 && (
                <div className="mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Spark data={mrrSpark} />
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="rounded-lg border bg-card overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.label}>
                <Link
                  to={r.to}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                >
                  <span className="text-xs text-foreground">{r.label}</span>
                  <span className={`text-sm font-bold tabular-nums w-12 text-right ${r.danger ? "text-red-600" : "text-foreground"}`}>
                    {r.value}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}