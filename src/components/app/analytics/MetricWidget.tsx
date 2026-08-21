import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runMetricPreview } from "@/lib/metric-registry.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";

type Format = "number" | "currency" | "percent" | "ratio" | "duration";

function formatValue(v: unknown, format: Format = "number", unit?: string | null): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  switch (format) {
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: unit || "USD",
        maximumFractionDigits: 2,
      }).format(n);
    case "percent":
      return `${(n * 100).toFixed(1)}%`;
    case "ratio":
      return n.toFixed(2);
    case "duration":
      return `${Math.round(n)}${unit || "m"}`;
    default:
      return new Intl.NumberFormat().format(n) + (unit ? ` ${unit}` : "");
  }
}

export function MetricWidget({
  metricKey,
  label,
  format = "number",
  unit,
  filters,
  size = "sm",
  className,
}: {
  metricKey: string;
  label: string;
  format?: Format;
  unit?: string | null;
  filters?: Record<string, unknown>;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const run = useServerFn(runMetricPreview);
  const query = useQuery({
    queryKey: ["metric", metricKey, filters ?? {}],
    queryFn: () => run({ data: { key: metricKey, filters: filters ?? {} } }),
    staleTime: 60_000,
  });

  const display = useMemo(() => {
    if (!query.data || !query.data.ok) return { value: "—", extra: null as string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = query.data.result as any;
    if (result && typeof result === "object" && "value" in result) {
      return { value: formatValue(result.value, format, unit), extra: result.label ?? null };
    }
    if (result && typeof result === "object") {
      const firstKey = Object.keys(result)[0];
      return { value: formatValue(result[firstKey], format, unit), extra: firstKey };
    }
    return { value: formatValue(result, format, unit), extra: null };
  }, [query.data, format, unit]);

  const sizeClass = size === "lg" ? "col-span-2" : size === "md" ? "" : "";
  return (
    <Card
      className={cn(
        "border-emerald-100/60 hover:border-emerald-300 transition-colors",
        sizeClass,
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : query.data && !query.data.ok ? (
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs truncate">{query.data.error}</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{display.value}</div>
            {display.extra && <div className="text-xs text-slate-400 mt-1">{display.extra}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
