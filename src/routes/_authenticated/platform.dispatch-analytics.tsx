import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDispatchAnalytics, exportDispatchCsv } from "@/lib/dispatch-analytics.functions";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/platform/dispatch-analytics")({
  head: () => ({
    meta: [
      { title: "Platform · Dispatch Analytics — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Dispatch Analytics workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Dispatch Analytics — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Dispatch Analytics workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DispatchAnalyticsPage,
});

function DispatchAnalyticsPage() {
  const load = useServerFn(getDispatchAnalytics);
  const exportFn = useServerFn(exportDispatchCsv);
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["dispatch-analytics", days],
    queryFn: () => load({ data: { days } }),
  });
  const download = async () => {
    try {
      const res = await exportFn({ data: { days } });
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dispatch-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.rows} rows`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const totals = data?.totals;
  return (
    <AdminPageShell
      title="Dispatch analytics"
      subtitle="SLA compliance, delivery throughput, and courier performance."
      actions={
        <div className="flex gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      }
    >
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile label="Shipments" value={totals!.total} />
            <Tile label="Delivered" value={totals!.delivered} tone="emerald" />
            <Tile label="In transit" value={totals!.inTransit} />
            <Tile label="Overdue" value={totals!.overdue} tone="rose" />
            <Tile label="Exceptions" value={totals!.exception} tone="amber" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Tile label="Delivery rate" value={`${(data.deliveryRate * 100).toFixed(1)}%`} />
            <Tile label="On-time rate" value={`${(data.onTimeRate * 100).toFixed(1)}%`} />
            <Tile label="Avg transit" value={`${data.avgTransitHours.toFixed(1)} h`} />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Courier performance</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left">
                  <tr>
                    <th className="py-1">Courier</th>
                    <th>Shipments</th>
                    <th>Delivered</th>
                    <th>Overdue</th>
                    <th>Avg transit (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCourier.map((c) => (
                    <tr key={c.key} className="border-t">
                      <td className="py-2">{c.label}</td>
                      <td>{c.total}</td>
                      <td>{c.delivered}</td>
                      <td>
                        {c.overdue > 0 ? (
                          <Badge variant="destructive">{c.overdue}</Badge>
                        ) : (
                          c.overdue
                        )}
                      </td>
                      <td>{c.avgHours.toFixed(1)}</td>
                    </tr>
                  ))}
                  {data.byCourier.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No shipments in this window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="text-xs text-muted-foreground">
            SLA: in-transit {data.slaHours.inTransit}h · out-for-delivery{" "}
            {data.slaHours.outForDelivery}h · delivered {data.slaHours.delivered}h (from marketplace
            settings)
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "rose" | "amber";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "rose"
        ? "text-rose-600"
        : tone === "amber"
          ? "text-amber-600"
          : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
