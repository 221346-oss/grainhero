import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { RangeChip, type RangeKey } from "./RangeChip";

type Card = { key: string; label: string; value: number; to: string; info: string; tone: "amber" | "red" | "emerald" | "sky" | "violet"; prevPct?: number };

const toneMap: Record<Card["tone"], { bar: string; text: string; bg: string }> = {
  amber:   { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50/60 dark:bg-amber-500/5" },
  red:     { bar: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50/60 dark:bg-red-500/5" },
  emerald: { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50/60 dark:bg-emerald-500/5" },
  sky:     { bar: "bg-sky-500",     text: "text-sky-700",     bg: "bg-sky-50/60 dark:bg-sky-500/5" },
  violet:  { bar: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50/60 dark:bg-violet-500/5" },
};

export function InsightsStrip({
  range, onRange,
  insights,
}: {
  range: RangeKey;
  onRange: (v: RangeKey) => void;
  insights?: { pendingQC: number; rejectedQC: number; atRisk: number; readyToShip: number; actuatorsOn: number; actuatorsTotal: number };
}) {
  const i = insights ?? { pendingQC: 0, rejectedQC: 0, atRisk: 0, readyToShip: 0, actuatorsOn: 0, actuatorsTotal: 0 };
  const cards: Card[] = [
    { key: "pending", label: "Pending QC",    value: i.pendingQC,   to: "/grain-batches", info: "Batches awaiting quality inspection.", tone: "amber", prevPct: 70 },
    { key: "rejected",label: "Rejected QC",   value: i.rejectedQC,  to: "/grain-batches", info: "Batches that failed the last quality check.", tone: "red", prevPct: 50 },
    { key: "risk",    label: "At-Risk",       value: i.atRisk,      to: "/grain-batches", info: "Batches with risk score above 70.", tone: "amber", prevPct: 60 },
    { key: "ready",   label: "Ready to Ship", value: i.readyToShip, to: "/grain-batches", info: "Batches ready for dispatch.", tone: "emerald", prevPct: 80 },
    { key: "act",     label: "Actuators On",  value: i.actuatorsOn, to: "/actuators",     info: `Actuators currently active out of ${i.actuatorsTotal}.`, tone: "sky", prevPct: 65 },
  ];
  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Insights & Performance</h2>
          <InfoDot text="Operational signals across your storage and dispatch pipeline." />
        </div>
        <RangeChip value={range} onChange={onRange} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {cards.map((c) => {
          const tone = toneMap[c.tone];
          const curPct = Math.min(100, (c.value / Math.max(1, c.value + 4)) * 100);
          return (
            <Link
              key={c.key}
              to={c.to}
              className={`rounded-lg border p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40 ${tone.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground truncate">{c.label}</span>
                <InfoDot text={c.info} />
              </div>
              <div className={`text-2xl font-bold tabular-nums leading-tight ${tone.text}`}>{c.value}</div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] w-8 text-muted-foreground">now</span>
                  <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden"><div className={`h-full ${tone.bar}`} style={{ width: `${curPct}%` }} /></div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] w-8 text-muted-foreground">prev</span>
                  <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-muted-foreground/30" style={{ width: `${c.prevPct}%` }} /></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}