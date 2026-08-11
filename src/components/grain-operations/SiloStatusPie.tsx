import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  NeonPatternDefs,
  NeonLegend,
  ChartEmpty,
  useNeonCharts,
  neonTooltipStyle,
  neonAnim,
  NEON,
} from "@/components/charts/neon";

export type StatusSlice = { name: string; value: number; tone: "yellow" | "orange" | "green" | "blue" | "purple" | "red" };

// 6-stage scheme: yellow = pending, orange = QC, green = stored,
// blue = processing, purple = dispatched, red = issue.
const TONE_HEX: Record<StatusSlice["tone"], string> = {
  yellow: "#f59e0b",
  orange: "#f97316",
  green: "#10b981",
  blue: "#3b82f6",
  purple: "#a855f7",
  red: "#ef4444",
};

/** Batch status breakdown for one silo — hatched neon donut. */
export function SiloStatusPie({ data }: { data: StatusSlice[] }) {
  const { getFill } = useNeonCharts();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <ChartEmpty label="No batches yet" height={140} />;

  return (
    <div className="w-full">
      <NeonPatternDefs />
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={34}
              outerRadius={54}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              {...neonAnim}
            >
              {data.map((d, i) => (
                <Cell key={i} {...getFill(TONE_TOKEN[d.tone])} />
              ))}
            </Pie>
            <Tooltip {...neonTooltipStyle} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <NeonLegend
        items={data.map((d) => ({ label: d.name, color: TONE_TOKEN[d.tone], value: d.value }))}
      />
    </div>
  );
}
