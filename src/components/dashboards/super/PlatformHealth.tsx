import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from "recharts";
import { Panel, SectionLabel } from "./super-ui";

type Point = { date: string; score: number };

const tones = {
  success: { text: "text-success", stroke: "var(--success)", glow: "color-mix(in oklab, var(--success) 45%, transparent)" },
  warning: { text: "text-warning", stroke: "var(--warning)", glow: "color-mix(in oklab, var(--warning) 45%, transparent)" },
  critical: { text: "text-severity-critical", stroke: "var(--severity-critical)", glow: "color-mix(in oklab, var(--severity-critical) 45%, transparent)" },
};

function toneFor(score: number) {
  return score >= 80 ? tones.success : score >= 60 ? tones.warning : tones.critical;
}

function labelFor(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Needs attention";
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

/** Score ring — a 270° arc that fills to the score, with a soft coloured glow. */
function Gauge({ score, tone }: { score: number; tone: (typeof tones)[keyof typeof tones] }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const sweep = 0.78; // leave a gap at the bottom
  const filled = circumference * sweep * (Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative h-[130px] w-[130px] shrink-0">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-[145deg]">
        <circle
          cx="65" cy="65" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke="color-mix(in oklab, var(--muted-foreground) 14%, transparent)"
          strokeDasharray={`${circumference * sweep} ${circumference}`}
        />
        <circle
          cx="65" cy="65" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={tone.stroke}
          strokeDasharray={`${filled} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 6px ${tone.glow})`, transition: "stroke-dasharray 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold tabular-nums leading-none ${tone.text}`}>{score}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">of 100</span>
      </div>
    </div>
  );
}

export function PlatformHealth({
  score, trend, peak, low, asOf,
}: {
  score: number;
  trend: Point[];
  peak: number;
  low: number;
  asOf?: string;
}) {
  const tone = toneFor(score);
  const time = asOf
    ? new Date(asOf).toISOString().slice(11, 16)
    : new Date().toISOString().slice(11, 16);
  const ticks = trend.length
    ? [trend[0], trend[Math.floor(trend.length / 3)], trend[Math.floor((trend.length * 2) / 3)], trend[trend.length - 1]]
    : [];

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionLabel index="01">Platform health</SectionLabel>
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.text}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {labelFor(score)} · {time} UTC
        </span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Gauge score={score} tone={tone} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">14-day trend</span>
            <span className="text-[11px] tabular-nums text-muted-foreground/70">Peak {peak} · Low {low}</span>
          </div>

          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="healthTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tone.stroke} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={tone.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[(dataMin: number) => Math.max(0, dataMin - 12), (dataMax: number) => Math.min(100, dataMax + 12)]} />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={{
                    background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8,
                    fontSize: 11, color: "var(--popover-foreground)",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)", fontSize: 11 }}
                  labelFormatter={(_label, payload) => shortDate(String(payload?.[0]?.payload?.date ?? ""))}
                  formatter={(v: number) => [`${v} / 100`, "Health"]}
                />
                <Area
                  type="linear" dataKey="score" stroke={tone.stroke} strokeWidth={1.75}
                  fill="url(#healthTrendFill)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground/60">
            {ticks.map((t, i) => <span key={`${t.date}-${i}`}>{shortDate(t.date)}</span>)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
