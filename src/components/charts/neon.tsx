/**
 * Neon Analytics Kit — shared chart primitives.
 *
 * Every chart in the app renders through these helpers so the visual language
 * stays identical: diagonal hatch fills tinted by the series colour, a bright
 * 1.5px outline, square corners, hairline grids and a small explicit type scale.
 *
 * Colours are ALWAYS design tokens (`var(--token)`), never hex literals, so
 * light/dark theming keeps working.
 */
import { useCallback } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── palette ─────────────────────────────────────────────────────────────── */

/** Brand-first series palette. Emerald family leads, semantics only where they mean something. */
export const NEON: Record<string, string> = {
  brand: "var(--chart-1)",
  brand2: "var(--chart-2)",
  accent: "var(--chart-3)",
  amber: "var(--chart-4)",
  red: "var(--chart-5)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
};

/** Ordered palette for anonymous / dynamic series (categories, plans, regions…). */
export const NEON_SERIES: string[] = [
  NEON.brand,
  NEON.brand2,
  NEON.accent,
  NEON.amber,
  NEON.info,
  NEON.red,
  NEON.neutral,
];

export function seriesColor(index: number): string {
  return NEON_SERIES[index % NEON_SERIES.length];
}

/** Semantic tone → token, for status / severity / risk series. */
export const NEON_TONE: Record<string, string> = {
  ok: NEON.success,
  safe: NEON.success,
  good: NEON.success,
  green: NEON.success,
  resolved: NEON.success,
  active: NEON.success,
  paid: NEON.success,
  warning: NEON.warning,
  warn: NEON.warning,
  yellow: NEON.warning,
  pending: NEON.warning,
  medium: NEON.medium,
  risk: NEON.high,
  high: NEON.high,
  danger: NEON.critical,
  critical: NEON.critical,
  red: NEON.critical,
  spoiled: NEON.critical,
  overdue: NEON.critical,
  info: NEON.info,
  blue: NEON.info,
  low: NEON.low,
  neutral: NEON.neutral,
  closed: NEON.neutral,
};

export function toneColor(tone?: string | null, fallback = NEON.brand): string {
  if (!tone) return fallback;
  return NEON_TONE[String(tone).toLowerCase()] ?? fallback;
}

/* ── hatch pattern engine ────────────────────────────────────────────────── */

export function neonPatternId(color: string) {
  return `neon-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Renders one 6×6 diagonal-hatch <pattern> per colour into a hidden SVG.
 * Pattern ids are document-global — one instance per page serves every chart.
 */
export function NeonPatternDefs({ colors = NEON_SERIES }: { colors?: string[] }) {
  const unique = [...new Set([...colors, ...Object.values(NEON)])];
  return (
    <svg width="0" height="0" aria-hidden className="absolute pointer-events-none">
      <defs>
        {unique.map((color) => (
          <pattern
            key={color}
            id={neonPatternId(color)}
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(-45)"
          >
            <rect width="6" height="6" fill={color} opacity="0.12" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.2" opacity="0.6" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}

/** Single source of truth for series styling. */
export function useNeonCharts() {
  /** Fill props for any Recharts shape (Bar Cell, Pie Cell, Area, …). */
  const getFill = useCallback(
    (color: string) => ({
      fill: `url(#${neonPatternId(color)})`,
      stroke: color,
      strokeWidth: 1.5,
    }),
    [],
  );
  return { getFill, NEON, seriesColor, toneColor };
}

export function neonFill(color: string) {
  return { fill: `url(#${neonPatternId(color)})`, stroke: color, strokeWidth: 1.5 };
}

/** Stacked-bar segment shape: side edges at 1.5px, shared seams hairline. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const neonSegmentShape = (stroke: string, topSeam = 0.5) => (props: any) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return <g />;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="none" />
      <line x1={x} y1={y + height} x2={x + width} y2={y + height} stroke={stroke} strokeWidth={topSeam} />
      <line x1={x} y1={y} x2={x} y2={y + height} stroke={stroke} strokeWidth={1.5} />
      <line x1={x + width} y1={y} x2={x + width} y2={y + height} stroke={stroke} strokeWidth={1.5} />
      <line x1={x} y1={y} x2={x + width} y2={y} stroke={stroke} strokeWidth={0.5} />
    </g>
  );
};

/* ── shared recharts axis / grid / tooltip config ────────────────────────── */

export const neonGrid = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  vertical: false,
} as const;

export const neonAxis = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  stroke: "var(--border)",
  tickLine: false,
  axisLine: false,
} as const;

export const neonTooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--popover-foreground)",
    boxShadow: "0 4px 20px -6px rgb(0 0 0 / 0.35)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11, marginBottom: 2 },
  itemStyle: { color: "var(--popover-foreground)", fontSize: 12 },
  cursor: { fill: "var(--muted)", opacity: 0.35 },
} as const;

/** Consistent entry animation for every chart. */
export const neonAnim = {
  isAnimationActive: true,
  animationDuration: 700,
  animationEasing: "ease-out",
} as const;

/* ── layout primitives ───────────────────────────────────────────────────── */

/** Hairline grid: tiles sit on the card surface, separated by 1px of border. No outer edge. */
export function HairlineGrid({
  cols = "grid-cols-1 lg:grid-cols-2",
  className,
  children,
}: {
  cols?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-px bg-border/60 rounded-2xl overflow-hidden", cols, className)}>
      {children}
    </div>
  );
}

/** A single chart panel inside a HairlineGrid. */
export function NeonPanel({
  title,
  subtitle,
  action,
  index,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  /** Two-digit section number — renders the title as a numbered eyebrow. */
  index?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("bg-card/50 p-4 transition-colors hover:bg-muted/20", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && (index
              ? (
                <p className="flex items-center gap-2.5 truncate">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/40">{index}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
                </p>
              )
              : <p className="text-[13px] font-medium text-foreground truncate">{title}</p>
            )}
            {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** Hairline stat tile row. */
export function StatGrid({
  stats,
  cols = "grid-cols-2 md:grid-cols-4",
  className,
}: {
  stats: Array<{
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    tone?: string;
    onClick?: () => void;
  }>;
  cols?: string;
  className?: string;
}) {
  return (
    <HairlineGrid cols={cols} className={className}>
      {stats.map((s, i) => {
        const color = s.tone ? toneColor(s.tone) : undefined;
        const Tag = s.onClick ? "button" : "div";
        return (
          <Tag
            key={i}
            onClick={s.onClick}
            className={cn(
              "bg-background p-4 text-left transition-colors",
              s.onClick && "hover:bg-muted/40 cursor-pointer",
            )}
          >
            <p className="text-[12px] text-muted-foreground truncate">{s.label}</p>
            <p
              className="text-2xl font-medium mt-1 tabular-nums"
              style={color ? { color } : undefined}
            >
              {s.value}
            </p>
            {s.hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.hint}</p>}
          </Tag>
        );
      })}
    </HairlineGrid>
  );
}

/** Coloured-dot status label. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = toneColor(status, NEON.neutral);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground whitespace-nowrap">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

/** Signal-bar severity glyph. */
export function SeverityBadge({ severity }: { severity: string }) {
  const s = String(severity).toLowerCase();
  const color = toneColor(s, NEON.low);
  const on = (cond: boolean) => (cond ? 1 : 0.3);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium capitalize whitespace-nowrap"
      style={{ color }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="2" y="10" width="3" height="4" rx="0.5" opacity={on(true)} />
        <rect x="6.5" y="7" width="3" height="7" rx="0.5" opacity={on(s !== "low")} />
        <rect x="11" y="4" width="3" height="10" rx="0.5" opacity={on(s === "high" || s === "critical")} />
      </svg>
      {s}
    </span>
  );
}

/** Compact legend matching the hatch swatches. */
export function NeonLegend({ items }: { items: Array<{ label: string; color: string; value?: ReactNode }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ background: it.color, opacity: 0.35, border: `1px solid ${it.color}` }}
          />
          {it.label}
          {it.value !== undefined && (
            <span className="text-foreground font-medium tabular-nums">{it.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Empty state shared by all charts. */
export function ChartEmpty({ label = "No data yet", height = 200 }: { label?: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-[12px] text-muted-foreground border-dashed border-border rounded-md"
      style={{ height }}
    >
      {label}
    </div>
  );
}