import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { Panel, SectionLabel, DeltaChip, fmtPKR, compact } from "./super-ui";

type MonthPoint = { month: string; revenue: number; lastYear: number };

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });

/** Small floating annotation used for the peak and the current month. */
function Marker({
  viewBox,
  text,
  tone,
  side = "above",
}: {
  viewBox?: { x: number; y: number };
  text: string;
  tone: string;
  side?: "above" | "left";
}) {
  if (!viewBox) return null;
  const w = Math.max(52, text.length * 6.5 + 12);
  const x = side === "left" ? viewBox.x - w - 10 : Math.max(viewBox.x - w / 2, 2);
  const y = side === "left" ? viewBox.y - 8 : viewBox.y - 22;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={w} height={16} rx={4} fill="var(--card)" stroke={tone} strokeOpacity={0.5} />
      <text
        x={w / 2}
        y={11}
        textAnchor="middle"
        fontSize={9.5}
        fill="var(--foreground)"
        letterSpacing="0.04em"
      >
        {text}
      </text>
    </g>
  );
}

export function RevenueCard({
  mrr,
  deltaPct,
  activeSubs,
  series,
}: {
  mrr: number;
  deltaPct: number;
  activeSubs: number;
  series: MonthPoint[];
}) {
  const data = series.length ? series : [];
  const hasLastYear = data.some((d) => d.lastYear > 0);
  const peak = data.reduce((best, d) => (best && best.revenue >= d.revenue ? best : d), data[0]);
  const now = data[data.length - 1];
  // The chart plots booked revenue (paid invoices + hardware); the headline is the
  // current month of that same series, so number, delta and NOW marker all agree.
  const headline = now ? now.revenue : mrr;
  const positive = deltaPct >= 0;

  return (
    <Panel className="flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionLabel index="02">Monthly revenue</SectionLabel>
        <Link
          to="/platform/plans"
          className="rounded-md bg-success/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-success transition-colors hover:bg-success/20"
        >
          {activeSubs} active
        </Link>
      </div>

      <Link to="/platform/financials" className="group block">
        <div className="text-3xl font-bold leading-none tracking-tight text-foreground transition-colors group-hover:text-success">
          {fmtPKR.format(headline)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Total platform revenue this month
          <span className="text-muted-foreground/60"> · MRR {fmtPKR.format(mrr)}</span>
        </p>
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <DeltaChip value={deltaPct} good={positive} />
        <span className="text-xs text-muted-foreground">vs last month</span>
      </div>

      <div className="mt-6 h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 26, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="superRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tickFormatter={(v: number) => compact(v)}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelFormatter={(m: string) => monthLabel(m)}
              formatter={(v: number, name: string) => [
                fmtPKR.format(v),
                name === "revenue" ? "This year" : "Last year",
              ]}
            />
            {hasLastYear && (
              <Line
                type="monotone"
                dataKey="lastYear"
                stroke="var(--muted-foreground)"
                strokeWidth={1.25}
                strokeDasharray="4 4"
                strokeOpacity={0.55}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--success)"
              strokeWidth={2}
              fill="url(#superRevenueFill)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={900}
            />
            {peak && peak.revenue > 0 && (
              <ReferenceDot
                x={peak.month}
                y={peak.revenue}
                r={3}
                fill="var(--success)"
                stroke="none"
                label={<Marker text={`PEAK ${compact(peak.revenue)}`} tone="var(--success)" />}
              />
            )}
            {now && now.month !== peak?.month && (
              <ReferenceDot
                x={now.month}
                y={now.revenue}
                r={3}
                fill="var(--card)"
                stroke="var(--success)"
                strokeWidth={1.5}
                label={
                  <Marker text={`NOW ${compact(now.revenue)}`} tone="var(--border)" side="left" />
                }
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-success" /> This year (Rs)
        </span>
        {hasLastYear && (
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-muted-foreground/60" /> Last
            year
          </span>
        )}
      </div>
    </Panel>
  );
}
