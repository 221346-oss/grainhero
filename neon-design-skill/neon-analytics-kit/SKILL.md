---
name: neon-analytics-kit
description: Build the Triage-style neon analytics UI — hatched/outlined Recharts bar, pie, line, stacked-area charts, hairline stat grids, and dense data tables with status/severity badges. Use whenever the user asks for dashboards, analytics pages, charts, KPI tiles, or data tables that should look like this project.
---

# Neon Analytics Kit

Self-contained recipe for the visual language used across this project's Dashboard and Analytics pages:
Linear-inspired density, square corners, hairline `1px` dividers made from `gap-px bg-border`, and charts
whose fills are **diagonal hatch patterns tinted by the series colour** with a bright 1.5px neon outline.

Reference screenshots: `assets/screenshots/dashboard.png`, `assets/screenshots/analytics.png`, `assets/screenshots/bugs.png`.

## Non-negotiable rules

1. Never hardcode colour utilities (`text-white`, `bg-black`, `bg-[#...]`). Every colour is an HSL design token
   read as `hsl(var(--token))`.
2. Charts never use flat fills. Always `fill: url(#neon-<color>)` + `stroke: <color>` + `strokeWidth: 1.5`.
3. `radius={0}` on bars, `rounded-md` only on outer containers. Square, technical look.
4. Grid separators are achieved with `grid gap-px bg-border rounded-md overflow-hidden` and `bg-background` children —
   not borders on each cell.
5. Type scale is small and explicit: `text-[13px]` body, `text-[12px]` muted labels, `text-[11px]`/`text-[10px]` axis and meta,
   `text-2xl font-medium` for stat values. Header bars are `h-11`.
6. Dark mode is the default; every token below has a light and dark value.

## Step 1 — design tokens

Add to `src/index.css` inside `@layer base` (values here are the project's; keep both `:root` and `.dark`):

```css
:root {
  --background: 0 0% 100%; --foreground: 0 0% 9%;
  --primary: 234 55% 58%; --primary-foreground: 0 0% 100%;
  --muted: 0 0% 96%; --muted-foreground: 0 0% 45%;
  --border: 0 0% 90%; --radius: 0.375rem;
  --success: 142 70% 40%; --warning: 38 92% 50%; --info: 199 89% 48%;
  --severity-critical: 345 72% 51%;
  --severity-high: 25 95% 53%;
  --severity-medium: 38 92% 50%;
  --severity-low: 142 70% 40%;
}
.dark {
  --background: 240 6% 6%; --foreground: 0 0% 90%;
  --primary: 234 55% 60%;
  --muted: 240 4% 14%; --muted-foreground: 0 0% 50%;
  --border: 240 4% 26%;
  --success: 145 100% 50%; --warning: 38 100% 55%; --info: 199 100% 55%;
  --severity-critical: 345 90% 60%;
  --severity-high: 25 100% 58%;
  --severity-medium: 38 100% 55%;
  --severity-low: 145 100% 50%;
}
```

`tailwind.config.ts` must map them:

```ts
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  border: "hsl(var(--border))",
  muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
  primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
  severity: {
    critical: "hsl(var(--severity-critical))",
    high: "hsl(var(--severity-high))",
    medium: "hsl(var(--severity-medium))",
    low: "hsl(var(--severity-low))",
  },
},
borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
```

## Step 2 — the neon pattern engine

`src/components/NeonPatternDefs.tsx` — renders one 6×6 diagonal-hatch `<pattern>` per colour into a hidden SVG.
Pattern ids are document-global, so a single instance per page serves every chart.

```tsx
export function neonPatternId(color: string) {
  return `neon-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function NeonPatternDefs({ colors }: { colors: string[] }) {
  const unique = [...new Set(colors)];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
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
            <rect width="6" height="6" fill={color} opacity="0.10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.2" opacity="0.6" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
```

`src/hooks/use-neon-charts.ts` — the single source of truth for series styling:

```ts
import { useCallback } from "react";
import { neonPatternId } from "@/components/NeonPatternDefs";

export function useNeonCharts() {
  /** Fill props for any Recharts shape (Bar Cell, Pie Cell, Area, ...) */
  const getFill = useCallback(
    (color: string) => ({
      fill: `url(#${neonPatternId(color)})`,
      stroke: color,
      strokeWidth: 1.5,
    }),
    []
  );

  return { getFill };
}
```

## Step 3 — colour maps

Keep chart colours as plain `Record<string, string>` of `hsl(var(--token))` strings so tokens keep theming.

```ts
const STATUS_COLORS: Record<string, string> = {
  new: "hsl(var(--info))",
  assigned: "hsl(var(--primary))",
  in_progress: "hsl(var(--warning))",
  testing: "hsl(280, 60%, 55%)",
  resolved: "hsl(var(--success))",
  closed: "hsl(var(--muted-foreground))",
};
const STATUS_LABELS: Record<string, string> = {
  new: "New", assigned: "Assigned", in_progress: "In Progress",
  testing: "Testing", resolved: "Resolved", closed: "Closed",
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(var(--severity-critical))",
  high: "hsl(var(--severity-high))",
  medium: "hsl(var(--severity-medium))",
  low: "hsl(var(--severity-low))",
};
const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};
```

## Step 4 — stat tile row (hairline grid)

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
  {[
    { label: "Total bugs", value: counts.total },
    { label: "Critical", value: counts.critical },
    { label: "Open", value: counts.open },
    { label: "Resolved", value: counts.resolved },
  ].map((stat) => (
    <div key={stat.label} className="bg-background p-4">
      <p className="text-[12px] text-muted-foreground">{stat.label}</p>
      <p className="text-2xl font-medium mt-1">{stat.value}</p>
    </div>
  ))}
</div>
```

## Step 5 — the four chart types

Mount the pattern defs once per page, before any chart:

```tsx
<NeonPatternDefs colors={[...Object.values(STATUS_COLORS), ...Object.values(SEVERITY_COLORS)]} />
```

All charts sit in a `ChartContainer` (shadcn chart primitive) with a fixed height and `w-full`.

### 5a. Hatched bar chart (per-bar colour)

```tsx
const { getFill } = useNeonCharts();

const statusData = useMemo(() => {
  const c: Record<string, number> = {};
  rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
  return Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: label, count: c[key] || 0, fill: STATUS_COLORS[key],
  }));
}, [rows]);

const statusChartConfig: ChartConfig = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([k, label]) => [k, { label, color: STATUS_COLORS[k] }])
);

<ChartContainer config={statusChartConfig} className="h-[220px] w-full">
  <BarChart data={statusData}>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="count" radius={0}>
      {statusData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
    </Bar>
  </BarChart>
</ChartContainer>
```

### 5b. Hatched donut

```tsx
<ChartContainer config={severityChartConfig} className="h-[220px] w-full">
  <PieChart>
    <ChartTooltip content={<ChartTooltipContent />} />
    <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
         innerRadius={50} outerRadius={80} paddingAngle={2}>
      {severityData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
    </Pie>
  </PieChart>
</ChartContainer>
```

### 5c. Thin neon trend line

```tsx
<ChartContainer config={trendChartConfig} className="h-[220px] w-full">
  <LineChart data={trendData}>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line type="monotone" dataKey="count" stroke="hsl(234, 55%, 60%)" strokeWidth={1.5} dot={{ r: 2 }} />
  </LineChart>
</ChartContainer>
```

### 5d. Stacked hatched area (cumulative)

```tsx
<AreaChart data={areaData}>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
  <ChartTooltip content={<ChartTooltipContent />} />
  <Area type="monotone" dataKey="open" stackId="1"
        stroke="hsl(38, 92%, 50%)"
        fill={`url(#${neonPatternId("hsl(38, 92%, 50%)")})`} fillOpacity={1} strokeWidth={1.5} />
  <Area type="monotone" dataKey="resolved" stackId="1"
        stroke="hsl(142, 70%, 40%)"
        fill={`url(#${neonPatternId("hsl(142, 70%, 40%)")})`} fillOpacity={1} strokeWidth={1.5} />
</AreaChart>
```

### 5e. Stacked bars with outline-only segment borders

Stacked segments must not draw a full box or the stack reads as separate bars. Use a custom `shape`
that strokes side edges at 1.5px and the shared seams at 0.5px:

```tsx
const segmentShape = (stroke: string, topSeam = 0.5) => (props: any) => {
  const { x, y, width, height, fill } = props;
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

{(["critical", "high", "medium", "low"] as const).map((sev, idx) => (
  <Bar key={sev} dataKey={sev} stackId="a"
       fill={`url(#${neonPatternId(SEVERITY_COLORS[sev])})`}
       stroke={SEVERITY_COLORS[sev]} strokeWidth={1.5}
       shape={segmentShape(SEVERITY_COLORS[sev], idx === 0 ? 1.5 : 0.5)} />
))}
```

## Step 6 — badges

`StatusBadge` — coloured dot + muted label:

```tsx
const statusConfig = {
  new: { label: "New", dotClass: "bg-info" },
  assigned: { label: "Assigned", dotClass: "bg-primary" },
  in_progress: { label: "In Progress", dotClass: "bg-warning" },
  testing: { label: "Testing", dotClass: "bg-[hsl(280,60%,55%)]" },
  resolved: { label: "Resolved", dotClass: "bg-success" },
  closed: { label: "Closed", dotClass: "bg-muted-foreground" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}
```

`SeverityBadge` — signal-bar glyph, filled to the severity level:

```tsx
const severityConfig = {
  critical: { label: "Critical", className: "text-severity-critical" },
  high: { label: "High", className: "text-severity-high" },
  medium: { label: "Medium", className: "text-severity-medium" },
  low: { label: "Low", className: "text-severity-low" },
} as const;

export function SeverityBadge({ severity }: { severity: keyof typeof severityConfig }) {
  const config = severityConfig[severity];
  const on = (cond: boolean) => (cond ? 1 : 0.3);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", config.className)}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="10" width="3" height="4" rx="0.5" opacity={on(severity === "low")} />
        <rect x="6.5" y="7" width="3" height="7" rx="0.5" opacity={on(severity !== "low")} />
        <rect x="11" y="4" width="3" height="10" rx="0.5" opacity={on(severity === "high" || severity === "critical")} />
      </svg>
      {config.label}
    </span>
  );
}
```

## Step 7 — dense data table

```tsx
<div className="border border-border rounded-md overflow-hidden">
  <table className="w-full text-[13px]">
    <thead>
      <tr className="border-b border-border bg-muted/30">
        {["ID", "Title", "Status", "Priority", "Created"].map((h) => (
          <th key={h} className="text-left font-medium text-muted-foreground px-3 py-2">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-[13px]">No records found</td></tr>
      ) : rows.map((row) => (
        <tr key={row.id}
            className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => navigate(`/bugs/${row.id}`)}>
          <td className="px-3 py-2 text-muted-foreground font-mono text-[12px]">{row.tracking_id}</td>
          <td className="px-3 py-2 font-medium">{row.title}</td>
          <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
          <td className="px-3 py-2"><SeverityBadge severity={row.severity} /></td>
          <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
            {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Search + view toggle strip that sits above it:

```tsx
<div className="flex items-center gap-2">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
           className="pl-8 h-8 text-[13px] bg-transparent" />
  </div>
  <div className="flex items-center border rounded-md">
    <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")} className="h-8 w-8 p-0">
      <List className="h-3.5 w-3.5" />
    </Button>
    <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setView("kanban")} className="h-8 w-8 p-0">
      <LayoutGrid className="h-3.5 w-3.5" />
    </Button>
  </div>
</div>
```

## Step 8 — page shell

```tsx
<div className="flex flex-col h-full">
  <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
    <h1 className="text-[13px] font-medium">Dashboard</h1>
    <Button asChild size="sm" className="h-7 text-[12px] gap-1.5">
      <Link to="/bugs/new"><Plus className="h-3.5 w-3.5" /> Report bug</Link>
    </Button>
  </div>
  <div className="flex-1 overflow-auto">
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">{/* tiles, charts, table */}</div>
  </div>
</div>
```

Charts pair inside the same hairline grid pattern:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
  <div className="bg-background p-4">
    <p className="text-[13px] font-medium mb-1">Bugs by status</p>
    <p className="text-[12px] text-muted-foreground mb-4">Distribution across workflow stages</p>
    {/* chart */}
  </div>
  {/* second panel */}
</div>
```

## Step 9 — live data + realtime (optional)

```tsx
useEffect(() => {
  const fetchRows = async () => {
    const { data } = await supabase.from("bugs").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  fetchRows();
  const channel = supabase
    .channel("bugs-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "bugs" }, () => fetchRows())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

Loading state: centered `<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />`, or `Skeleton`
blocks matching the tile grid on analytics-heavy pages.

## Dependencies

`recharts`, `date-fns`, `lucide-react`, shadcn `chart`, `button`, `input`, `badge`, `select`, `skeleton`.

## Checklist before finishing

- [ ] `NeonPatternDefs` mounted once per page with every colour used by its charts
- [ ] every bar/pie/area fill goes through `getFill()` or `url(#neonPatternId(...))`
- [ ] no hardcoded hex/`text-white`/`bg-black`
- [ ] `radius={0}` on bars, axes at `fontSize` 10–11, grid `strokeDasharray="3 3"` in `--border`
- [ ] stat and chart grids use `gap-px bg-border` + `bg-background` children
- [ ] table rows navigate on click and show an empty state
- [ ] verified in dark **and** light mode
