import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { getReportsData } from "@/lib/monitoring.functions";
import { ReportsSkeleton } from "@/components/app/skeletons";

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsSection() {
  const fn = useServerFn(getReportsData);
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => fn() });

  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");

  const filtered = useMemo(() => {
    if (!data) return { batches: [], alerts: [], invoices: [], silos: [] };
    if (period === "all") return data;
    const cutoff = Date.now() - Number(period) * 24 * 3600 * 1000;
    const inRange = (t: string | null) => (t ? new Date(t).getTime() >= cutoff : false);
    return {
      batches: data.batches.filter((b: any) => inRange(b.created_at ?? b.intake_date)),
      alerts: data.alerts.filter((a: any) => inRange(a.created_at)),
      invoices: data.invoices.filter((i: any) => inRange(i.created_at)),
      silos: data.silos,
    };
  }, [data, period]);

  if (isLoading) return <ReportsSkeleton />;

  const totalKg = filtered.batches.reduce((s: number, b: any) => s + Number(b.quantity_kg ?? 0), 0);
  const totalRev = filtered.batches.reduce((s: number, b: any) => s + Number(b.revenue ?? 0), 0);
  const totalProfit = filtered.batches.reduce((s: number, b: any) => s + Number(b.profit ?? 0), 0);
  const alertsResolved = filtered.alerts.filter((a: any) => a.status === "resolved").length;
  const spoiled = filtered.batches.filter(
    (b: any) => b.spoilage_label && String(b.spoilage_label).toLowerCase() !== "safe",
  ).length;
  const collected = filtered.invoices.reduce(
    (s: number, i: any) => s + Number(i.amount_paid ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Downloadable operational and financial reports.
        </p>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Batches</div>
              <div className="text-2xl font-bold">{filtered.batches.length}</div>
              <div className="text-xs text-slate-500">{(totalKg / 1000).toFixed(1)}t inventory</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Revenue</div>
              <div className="text-2xl font-bold">${totalRev.toLocaleString()}</div>
              <div className="text-xs text-emerald-600">${totalProfit.toLocaleString()} profit</div>
            </div>
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Collected</div>
              <div className="text-2xl font-bold">${collected.toLocaleString()}</div>
              <div className="text-xs text-slate-500">{filtered.invoices.length} invoices</div>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Alerts</div>
              <div className="text-2xl font-bold">{filtered.alerts.length}</div>
              <div className="text-xs text-slate-500">
                {alertsResolved} resolved · {spoiled} spoiled
              </div>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          {
            title: "Batches report",
            desc: "Grain batch inventory, quality and financials",
            rows: filtered.batches,
            file: "batches.csv",
          },
          {
            title: "Alerts report",
            desc: "Alerts triggered in the selected period",
            rows: filtered.alerts,
            file: "alerts.csv",
          },
          {
            title: "Invoices report",
            desc: "Buyer invoices and payment status",
            rows: filtered.invoices,
            file: "invoices.csv",
          },
          {
            title: "Silo utilization",
            desc: "Current capacity and stock across silos",
            rows: filtered.silos,
            file: "silos.csv",
          },
        ].map((r) => (
          <Card key={r.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </div>
              <Badge variant="outline">{r.rows.length} rows</Badge>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                disabled={r.rows.length === 0}
                onClick={() => download(r.file, toCsv(r.rows))}
              >
                <Download className="h-4 w-4 mr-2" /> Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
