import { useEffect, useId, useMemo, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_W = 150;
const CHART_H = 60;

function generateSmoothPath(data: number[], width: number, height: number) {
  if (!data || data.length < 2) return `M 0 ${height}`;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - (v / 100) * (height * 0.8) - height * 0.1;
    return [x, y] as const;
  });
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const mx = (x1 + x2) / 2;
    path += ` C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  return path;
}

export function StatsWidget({
  label,
  value,
  change,
  chartData,
  className,
}: {
  label: string;
  value: string | number;
  change: number;
  chartData: number[];
  className?: string;
}) {
  const gradientId = useId();
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  // Path generator expects 0–100 values; normalize raw counts against the max.
  const normalized = useMemo(() => {
    const max = Math.max(...chartData, 1);
    return chartData.map((v) => (v / max) * 100);
  }, [chartData]);

  const linePath = useMemo(() => generateSmoothPath(normalized, CHART_W, CHART_H), [normalized]);
  const areaPath = useMemo(
    () => (linePath.startsWith("M") ? `${linePath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z` : ""),
    [linePath],
  );

  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (line && area) {
      const length = line.getTotalLength();
      line.style.transition = "none";
      line.style.strokeDasharray = `${length} ${length}`;
      line.style.strokeDashoffset = `${length}`;
      area.style.transition = "none";
      area.style.opacity = "0";
      line.getBoundingClientRect();
      line.style.transition = "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease";
      line.style.strokeDashoffset = "0";
      area.style.transition = "opacity 0.8s ease-in-out 0.2s, fill 0.5s ease";
      area.style.opacity = "1";
    }
  }, [linePath]);

  const positive = change >= 0;
  const stroke = positive ? "#22C55E" : "#F97316";

  return (
    <div
      className={cn(
        "w-full max-w-md bg-card text-card-foreground rounded-3xl shadow-lg p-6 border",
        className,
      )}
    >
      <div className="flex justify-between items-center">
        <div className="flex flex-col w-1/2">
          <div className="flex items-center text-muted-foreground text-md">
            <span>{label}</span>
            <span
              className={cn(
                "ml-2 flex items-center font-semibold",
                positive ? "text-[#22C55E]" : "text-[#F97316]",
              )}
            >
              {Math.abs(change)}%
              {positive ? (
                <ArrowUp size={16} className="ml-1" />
              ) : (
                <ArrowDown size={16} className="ml-1" />
              )}
            </span>
          </div>
          <p className="text-4xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <div className="w-1/2 h-16">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path ref={areaRef} d={areaPath} fill={`url(#${gradientId})`} />
            <path
              ref={lineRef}
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
