import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Panel — the flat, borderless surface every block on the overview sits on. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl bg-card/50 p-5", className)}>{children}</section>;
}

/** `01 PLATFORM HEALTH` — the numbered eyebrow that indexes each block. */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/40">
        {index}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/** Header row: numbered eyebrow on the left, an optional link on the right. */
export function PanelHeader({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <SectionLabel index={index}>{title}</SectionLabel>
      {action && (
        <Link
          to={action.to}
          className="group flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success transition-colors hover:text-success/80"
        >
          {action.label}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </Link>
      )}
    </div>
  );
}

/** Delta pill — ▲/▼ plus a percentage, tinted by whether the move is good news. */
export function DeltaChip({
  value,
  good,
  className,
}: {
  value: number | null | undefined;
  good?: boolean;
  className?: string;
}) {
  if (value === null || value === undefined || value === 0) return null;
  const up = value >= 0;
  const positive = good ?? up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        positive ? "bg-success/15 text-success" : "bg-severity-critical/15 text-severity-critical",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

/** Thin capacity/progress rail used under each platform total. */
export function Rail({
  pct,
  tone = "success",
}: {
  pct: number;
  tone?: "success" | "critical" | "warning";
}) {
  const bg =
    tone === "critical" ? "bg-severity-critical" : tone === "warning" ? "bg-warning" : "bg-success";
  return (
    <div className="h-px w-full bg-border/60">
      <div
        className={cn("h-px transition-[width] duration-700", bg)}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export const fmtPKR = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}
