import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

/** Batch status breakdown for one silo — same donut style as platform.financials.tsx. */
export function SiloStatusPie({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <p className="text-[11px] text-muted-foreground text-center py-6">No batches yet</p>;
  }
  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={32} outerRadius={52} dataKey="value" nameKey="name" paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={TONE_HEX[d.tone]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={20}
            iconSize={8}
            wrapperStyle={{ fontSize: 10 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
