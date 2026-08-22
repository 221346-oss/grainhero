import { Link } from "@tanstack/react-router";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { InfoDot } from "@/components/ui/InfoDot";
import { Panel, DeltaChip } from "./super/super-ui";

type Tile = {
  key: string;
  label: string;
  value: number;
  hint: string;
  to: string;
  tone: "warning" | "success" | "critical";
  delta?: number | null;
  series: number[];
};

const toneVar = {
  warning: "var(--warning)",
  success: "var(--success)",
  critical: "var(--severity-critical)",
} as const;

const toneText = {
  warning: "text-warning",
  success: "text-success",
  critical: "text-severity-critical",
} as const;

function Spark({ series, tone, id }: { series: number[]; tone: keyof typeof toneVar; id: string }) {
  const data = (series.length ? series : [0, 0]).map((v, i) => ({ i, v }));
  return (
    <div className="h-[34px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={toneVar[tone]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={toneVar[tone]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="linear" dataKey="v" stroke={toneVar[tone]} strokeWidth={1.5}
            fill={`url(#spark-${id})`} dot={false} isAnimationActive animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Platform Insights — four headline counters, each with its own 14-day shape. */
export function SuperInsightsStrip({
  signupsTotal, wowDelta, ticketsTotal, pipelineTotal, criticalAlerts, series,
}: {
  signupsTotal: number;
  wowDelta: number;
  ticketsTotal: number;
  pipelineTotal: number;
  criticalAlerts: number;
  series?: { signups: number[]; tickets: number[]; pipeline: number[]; alerts: number[] };
}) {
  const tiles: Tile[] = [
    {
      key: "signups", label: "Signups (30d)", value: signupsTotal, hint: `${wowDelta >= 0 ? "+" : ""}${wowDelta}% WoW`,
      to: "/platform/users", tone: "warning", delta: wowDelta, series: series?.signups ?? [],
    },
    {
      key: "tickets", label: "Support tickets", value: ticketsTotal, hint: "Need attention",
      to: "/platform/health", tone: "warning", series: series?.tickets ?? [],
    },
    {
      key: "pipeline", label: "Pipeline", value: pipelineTotal, hint: "CRM contacts",
      to: "/platform/pipeline", tone: "success", series: series?.pipeline ?? [],
    },
    {
      key: "alerts", label: "Critical alerts", value: criticalAlerts, hint: criticalAlerts > 0 ? "Action required" : "All clear",
      to: "/platform/health", tone: criticalAlerts > 0 ? "critical" : "success", series: series?.alerts ?? [],
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">Platform Insights</h2>
        <InfoDot text="Signups, tickets, pipeline and alerts over the last 14 days." />
      </div>

      <Panel className="p-0">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <Link
              key={t.key}
              to={t.to}
              className="group flex flex-col gap-2 p-5 transition-colors hover:bg-muted/20"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.label}
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold leading-none tabular-nums ${toneText[t.tone]}`}>
                  {t.value}
                </span>
                {t.key === "signups" && <DeltaChip value={t.delta} className="bg-transparent px-0" />}
              </div>
              <span className="text-[11px] text-muted-foreground">{t.hint}</span>
              <Spark series={t.series} tone={t.tone} id={t.key} />
            </Link>
          ))}
        </div>
      </Panel>
    </section>
  );
}
