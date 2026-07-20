import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { InfoDot } from "@/components/ui/InfoDot";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  batch_id: string;
  grain_type: string;
  quantity_kg: number | string | null;
  status: string;
  risk_score: number | string | null;
  silos?: { name?: string | null } | null;
};

const STATUS_FILTERS = ["all", "storing", "qc", "dispatched", "rejected"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function riskDot(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}
function statusPill(s: string) {
  const l = s.toLowerCase();
  if (l.includes("reject")) return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30";
  if (l.includes("dispatch")) return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
  if (l.includes("qc") || l.includes("quality")) return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30";
}

export function BatchesTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all") {
        const s = String(r.status).toLowerCase();
        if (status === "storing" && !s.includes("stor")) return false;
        if (status === "qc" && !(s.includes("qc") || s.includes("quality"))) return false;
        if (status === "dispatched" && !s.includes("dispatch")) return false;
        if (status === "rejected" && !s.includes("reject")) return false;
      }
      if (!needle) return true;
      return (
        r.batch_id?.toLowerCase().includes(needle) ||
        r.grain_type?.toLowerCase().includes(needle) ||
        r.silos?.name?.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status]);

  return (
    <section className="rounded-xl border bg-card/60 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Your batches</h2>
          <InfoDot text="All batches for your tenant. Filter or search inline; open the full page for bulk actions." />
          <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] font-mono tabular-nums">{filtered.length}</Badge>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search batch, grain, silo"
              className="pl-7 pr-2 h-7 w-56 max-w-full rounded-full border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  "h-7 px-2.5 rounded-full text-[11px] font-medium capitalize transition " +
                  (status === s
                    ? "bg-emerald-600 text-white"
                    : "bg-muted/60 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10")
                }
              >
                {s}
              </button>
            ))}
          </div>
          <Link to="/grain-batches" className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 text-xs font-medium">
            Open <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/60 z-10">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Grain</th>
              <th className="px-3 py-2 font-medium">Silo</th>
              <th className="px-3 py-2 font-medium text-right">Qty (kg)</th>
              <th className="px-3 py-2 font-medium text-center">Risk</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No batches match</td></tr>
            )}
            {filtered.map((r, idx) => {
              const risk = Number(r.risk_score ?? 0);
              return (
                <tr key={r.id} className={`border-b border-border/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition ${idx % 2 ? "bg-muted/20" : ""}`}>
                  <td className="px-3 py-2 font-medium">{r.batch_id}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.grain_type}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">{r.silos?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(r.quantity_kg ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span title={`Risk ${risk.toFixed(0)}`} className={`inline-block h-2 w-2 rounded-full ${riskDot(risk)}`} />
                    <span className="ml-1 tabular-nums text-[10px] text-muted-foreground">{risk.toFixed(0)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block h-5 px-1.5 rounded-full text-[10px] font-medium border ${statusPill(String(r.status))}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link to="/grain-batches" aria-label={`Open batch ${r.batch_id}`} className="inline-grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}