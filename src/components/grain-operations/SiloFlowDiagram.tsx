import { motion } from "framer-motion";
import { ArrowRight, Warehouse } from "lucide-react";

export type FlowGroup = {
  label: string;
  count: number;
  kg: number;
  tone: "yellow" | "orange" | "green" | "blue" | "purple" | "red";
};

// 6-stage scheme: yellow = pending, orange = QC, green = stored,
// blue = processing, purple = dispatched, red = issue.
const TONE_CLS: Record<FlowGroup["tone"], { dot: string; text: string; bg: string }> = {
  yellow: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  orange: {
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
  green: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  blue: {
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  purple: {
    dot: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  red: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
};

/**
 * Incoming batches (left) -> silo (center) -> outgoing dispatches (right),
 * animated arrows flowing toward/away from the silo. Color follows the
 * spec's 6-stage scheme: yellow = pending, orange = QC, green = stored,
 * blue = processing, purple = dispatched, red = issue.
 */
export function SiloFlowDiagram({
  siloName,
  occupancyPct,
  incoming,
  outgoing,
}: {
  siloName: string;
  occupancyPct: number;
  incoming: FlowGroup[];
  outgoing: FlowGroup[];
}) {
  const pct = Math.max(0, Math.min(100, occupancyPct));
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
      {/* Incoming */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
          Incoming
        </p>
        {incoming.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-right">None</p>
        ) : (
          incoming.map((g) => (
            <div
              key={g.label}
              className={`flex items-center justify-end gap-1.5 rounded-md border px-2 py-1 ${TONE_CLS[g.tone].bg}`}
            >
              <div className="text-right">
                <p className={`text-[10px] font-semibold ${TONE_CLS[g.tone].text}`}>
                  {g.label} · {g.count}
                </p>
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {g.kg.toLocaleString()}kg
                </p>
              </div>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${TONE_CLS[g.tone].dot}`} />
              <motion.div className="overflow-hidden w-5 shrink-0" aria-hidden>
                <motion.div
                  animate={{ x: [-16, 4] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className={`h-3.5 w-3.5 ${TONE_CLS[g.tone].text}`} />
                </motion.div>
              </motion.div>
            </div>
          ))
        )}
      </div>

      {/* Silo */}
      <div className="flex flex-col items-center gap-1 px-2">
        <div className="relative h-14 w-11 rounded-t-full rounded-b-md border-2 border-border overflow-hidden bg-muted/40 flex items-end">
          <motion.div
            className={`w-full ${barColor}`}
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <Warehouse className="absolute inset-0 m-auto h-5 w-5 text-foreground/70" />
        </div>
        <p className="text-[10px] font-semibold tabular-nums">{pct}%</p>
        <p
          className="text-[9px] text-muted-foreground truncate max-w-[64px] text-center"
          title={siloName}
        >
          {siloName}
        </p>
      </div>

      {/* Outgoing */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Outgoing
        </p>
        {outgoing.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">None</p>
        ) : (
          outgoing.map((g) => (
            <div
              key={g.label}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${TONE_CLS[g.tone].bg}`}
            >
              <motion.div className="overflow-hidden w-5 shrink-0" aria-hidden>
                <motion.div
                  animate={{ x: [-4, 16] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className={`h-3.5 w-3.5 ${TONE_CLS[g.tone].text}`} />
                </motion.div>
              </motion.div>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${TONE_CLS[g.tone].dot}`} />
              <div>
                <p className={`text-[10px] font-semibold ${TONE_CLS[g.tone].text}`}>
                  {g.label} · {g.count}
                </p>
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {g.kg.toLocaleString()}kg
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
