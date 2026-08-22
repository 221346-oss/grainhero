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

type Period = "day" | "week" | "month" | "year";
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, year: 365 };

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
    { title: "Batches report", desc: "All incoming and outgoing grain batches", rows: filtered.batches, filename: "batches-report", columns: batchColumns },
    { title: "Silo utilization", desc: "Silo details with batches and capacity information", rows: filtered.silos, filename: "silos-report", columns: siloColumns },
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
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-muted-foreground font-semibold">Batches</div><div className="text-2xl font-bold">{filtered.batches.length}</div><div className="text-xs text-muted-foreground">{(totalKg / 1000).toFixed(1)}t inventory</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-muted-foreground font-semibold">Revenue</div><div className="text-2xl font-bold">${totalRev.toLocaleString()}</div><div className="text-xs text-emerald-600">${totalProfit.toLocaleString()} profit</div></div><DollarSign className="h-6 w-6 text-emerald-600" /></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.rows.length} {r.title === "Batches report" ? "batches" : "silos"}</Badge>
                {r.rows.length > 0 && (
                  <ExportMenu filename={r.filename} title={r.title} rows={r.rows} columns={r.columns} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {r.rows.length > 0 ? (
                <div className="space-y-2">
                  {/* Scrollable data preview - 4 entries visible */}
                  <div className="h-[280px] overflow-y-auto border-border rounded-lg">
                    <div className="divide-y">
                      {r.title === "Batches report" && r.rows.map((batch: Row) => {
                        const isOutgoing = batch.status === "dispatched" || batch.status === "completed";
                        const isIncoming = batch.status === "intake" || batch.status === "stored" || batch.status === "active" || batch.status === "ready";
                        return (
                          <div key={batch.id} className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{batch.batch_id}</span>
                                  <Badge variant="outline" className="text-xs">{batch.grain_type}</Badge>
                                  <Badge className="text-xs" variant={
                                    isOutgoing ? "destructive" : 
                                    isIncoming ? "default" : "secondary"
                                  }>
                                    {isOutgoing ? "Outgoing" : isIncoming ? "Incoming" : batch.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Number(batch.quantity_kg ?? 0).toLocaleString()} kg
                                  {batch.revenue ? ` · $${Number(batch.revenue).toLocaleString()} revenue` : ""}
                                  {batch.profit ? ` · $${Number(batch.profit).toLocaleString()} profit` : ""}
                                </div>
                                {batch.spoilage_label && (
                                  <div className="text-xs text-amber-600 mt-0.5">
                                    Spoilage: {batch.spoilage_label}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {r.title === "Silo utilization" && r.rows.map((silo: Row) => {
                        const batchesInSilo = (silo.batches ?? []) as Row[];
                        const capacityUsed = Number(silo.current_occupancy_kg ?? 0);
                        const capacityTotal = Number(silo.capacity_kg ?? 1);
                        const capacityRemaining = Math.max(0, capacityTotal - capacityUsed);
                        const fillPercentage = (capacityUsed / capacityTotal) * 100;
                        
                        return (
                          <div key={silo.id} className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{silo.name}</span>
                                  {silo.silo_id && <Badge variant="outline" className="text-xs font-mono">{silo.silo_id}</Badge>}
                                  <Badge className="text-xs" variant={
                                    silo.status === "active" ? "default" : 
                                    silo.status === "maintenance" ? "secondary" : "outline"
                                  }>{silo.status ?? "inactive"}</Badge>
                                </div>
                                
                                {/* Number of batches */}
                                <div className="text-xs text-muted-foreground mt-1.5">
                                  <span className="font-semibold">{batchesInSilo.length} batch{batchesInSilo.length !== 1 ? "es" : ""}</span> stored
                                </div>
                                
                                {/* Grain types in batches */}
                                {batchesInSilo.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {Array.from(new Set(batchesInSilo.map(b => b.grain_type))).map((grainType, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1.5">
                                        {grainType}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Capacity information */}
                                <div className="text-xs text-muted-foreground mt-1.5">
                                  Capacity: <span className="font-semibold">{capacityUsed.toLocaleString()} kg</span> used
                                  {" · "}
                                  <span className="font-semibold text-emerald-600">{capacityRemaining.toLocaleString()} kg</span> remaining
                                </div>
                                
                                {/* Capacity bar */}
                                <div className="mt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          fillPercentage > 90 ? 'bg-red-600' : 
                                          fillPercentage > 75 ? 'bg-amber-600' : 'bg-emerald-600'
                                        }`}
                                        style={{ width: `${Math.min(100, fillPercentage)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                                      {fillPercentage.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground border-dashed border-border rounded-lg">
                  Nothing to show for this period.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
