import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { getReportsData } from "@/lib/monitoring.functions";
import { ReportsSkeleton } from "@/components/app/skeletons";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";

type Period = "day" | "week" | "month" | "year" | "all";
const PERIOD_DAYS: Record<Period, number | null> = { day: 1, week: 7, month: 30, year: 365, all: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const batchColumns: ExportColumn<Row>[] = [
  { header: "Batch ID", value: (r) => r.batch_id },
  { header: "Grain Type", value: (r) => r.grain_type },
  { header: "Status", value: (r) => r.status },
  { header: "Qty (kg)", value: (r) => r.quantity_kg },
  { header: "Revenue", value: (r) => r.revenue },
  { header: "Profit", value: (r) => r.profit },
  { header: "Spoilage", value: (r) => r.spoilage_label },
  { header: "Created", value: (r) => r.created_at },
];
const alertColumns: ExportColumn<Row>[] = [
  { header: "Priority", value: (r) => r.priority },
  { header: "Status", value: (r) => r.status },
  { header: "Type", value: (r) => r.alert_type },
  { header: "Created", value: (r) => r.created_at },
  { header: "Resolved", value: (r) => r.resolved_at },
];
const invoiceColumns: ExportColumn<Row>[] = [
  { header: "Invoice #", value: (r) => r.invoice_number },
  { header: "Buyer", value: (r) => r.buyer_name },
  { header: "Total", value: (r) => r.total_amount },
  { header: "Paid", value: (r) => r.amount_paid },
  { header: "Status", value: (r) => r.payment_status },
  { header: "Currency", value: (r) => r.currency },
  { header: "Created", value: (r) => r.created_at },
];
const siloColumns: ExportColumn<Row>[] = [
  { header: "Name", value: (r) => r.name },
  { header: "Capacity (kg)", value: (r) => r.capacity_kg },
  { header: "Occupancy (kg)", value: (r) => r.current_occupancy_kg },
  { header: "Status", value: (r) => r.status },
];

export function ReportsSection() {
  const fn = useServerFn(getReportsData);
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => fn() });

  const [period, setPeriod] = useState<Period>("month");

  const filtered = useMemo(() => {
    if (!data) return { batches: [], alerts: [], invoices: [], silos: [] };
    const days = PERIOD_DAYS[period];
    if (days == null) return data;
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    const inRange = (t: string | null) => (t ? new Date(t).getTime() >= cutoff : false);
    return {
      batches: data.batches.filter((b: Row) => inRange(b.created_at ?? b.intake_date)),
      alerts: data.alerts.filter((a: Row) => inRange(a.created_at)),
      invoices: data.invoices.filter((i: Row) => inRange(i.created_at)),
      silos: data.silos,
    };
  }, [data, period]);

  if (isLoading) return <ReportsSkeleton />;

  const totalKg = filtered.batches.reduce((s: number, b: Row) => s + Number(b.quantity_kg ?? 0), 0);
  const totalRev = filtered.batches.reduce((s: number, b: Row) => s + Number(b.revenue ?? 0), 0);
  const totalProfit = filtered.batches.reduce((s: number, b: Row) => s + Number(b.profit ?? 0), 0);
  const alertsResolved = filtered.alerts.filter((a: Row) => a.status === "resolved").length;
  const spoiled = filtered.batches.filter((b: Row) => b.spoilage_label && String(b.spoilage_label).toLowerCase() !== "safe").length;
  const collected = filtered.invoices.reduce((s: number, i: Row) => s + Number(i.amount_paid ?? 0), 0);

  const reports: { title: string; desc: string; rows: Row[]; filename: string; columns: ExportColumn<Row>[] }[] = [
    { title: "Batches report", desc: "Grain batch inventory, quality and financials", rows: filtered.batches, filename: "batches-report", columns: batchColumns },
    { title: "Alerts report", desc: "Alerts triggered in the selected period", rows: filtered.alerts, filename: "alerts-report", columns: alertColumns },
    { title: "Invoices report", desc: "Buyer invoices and payment status", rows: filtered.invoices, filename: "invoices-report", columns: invoiceColumns },
    { title: "Silo utilization", desc: "Current capacity and stock across silos", rows: filtered.silos, filename: "silos-report", columns: siloColumns },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><FileBarChart className="h-5 w-5 text-emerald-600" /> Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Downloadable operational and financial reports.</p>
        </div>
        <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Batches</div><div className="text-2xl font-bold">{filtered.batches.length}</div><div className="text-xs text-slate-500">{(totalKg / 1000).toFixed(1)}t inventory</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Revenue</div><div className="text-2xl font-bold">${totalRev.toLocaleString()}</div><div className="text-xs text-emerald-600">${totalProfit.toLocaleString()} profit</div></div><DollarSign className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Collected</div><div className="text-2xl font-bold">${collected.toLocaleString()}</div><div className="text-xs text-slate-500">{filtered.invoices.length} invoices</div></div><TrendingUp className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Alerts</div><div className="text-2xl font-bold">{filtered.alerts.length}</div><div className="text-xs text-slate-500">{alertsResolved} resolved · {spoiled} spoiled</div></div><AlertTriangle className="h-6 w-6 text-red-600" /></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </div>
              <Badge variant="outline">{r.rows.length} rows</Badge>
            </CardHeader>
            <CardContent>
              {r.rows.length > 0 ? (
                <ExportMenu filename={r.filename} title={r.title} rows={r.rows} columns={r.columns} />
              ) : (
                <span className="text-xs text-muted-foreground">Nothing to export for this period.</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
