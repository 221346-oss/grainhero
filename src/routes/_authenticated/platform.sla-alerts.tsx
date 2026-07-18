import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSlaAlerts, getSlaDrilldown } from "@/lib/sla-alerts.functions";
import { AlertTriangle, TrendingDown, ExternalLink, ScrollText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/platform/sla-alerts")({
  component: SlaAlertsPage,
});

function SlaAlertsPage() {
  const load = useServerFn(getSlaAlerts);
  const drill = useServerFn(getSlaDrilldown);
  const [days, setDays] = useState(30);
  const [drillKey, setDrillKey] = useState<{ day: string; bucket: "all" | "overdue" | "delivered" | "in_flight" } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["sla-alerts", days],
    queryFn: () => load({ data: { days } }),
    refetchInterval: 60_000,
  });
  const drillQuery = useQuery({
    queryKey: ["sla-drilldown", drillKey],
    queryFn: () => drill({ data: drillKey! }),
    enabled: !!drillKey,
  });

  const trendData = data ? data.trend.current.map((c) => ({
    day: c.day,
    rate: Number((c.rate * 100).toFixed(1)),
    overdue: c.overdue,
    dispatched: c.dispatched,
  })) : [];
  const baselinePct = data ? Number((data.totals.baselineRate * 100).toFixed(1)) : 0;
  const dropThreshold = data ? baselinePct - data.config.deliveryRateAlertDropPct : 0;

  return (
    <AdminPageShell
      title="SLA alerts"
      subtitle="Overdue shipments and delivery-rate regressions across the marketplace."
      actions={
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Overdue now" value={data.totals.overdue} tone="rose" />
            <Kpi label="Shipments (window)" value={data.totals.current} />
            <Kpi label="Delivery rate" value={`${(data.totals.currentRate * 100).toFixed(1)}%`} tone="emerald" />
            <Kpi
              label="Δ vs prior window"
              value={`${((data.totals.currentRate - data.totals.previousRate) * 100).toFixed(1)} pp`}
              tone={data.totals.currentRate - data.totals.previousRate < 0 ? "rose" : "emerald"}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
                Delivery-rate trend
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Baseline (prior window): {baselinePct}% · alert if drop &gt; {data.config.deliveryRateAlertDropPct} pp
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64 p-2">
              {trendData.length === 0 ? (
                <div className="text-sm text-muted-foreground p-6">No dispatched shipments in this window.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                    onClick={(e: { activeLabel?: string }) => {
                      if (e?.activeLabel) setDrillKey({ day: e.activeLabel, bucket: "all" });
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={baselinePct} stroke="#059669" strokeDasharray="4 4" label={{ value: "baseline", fontSize: 10, fill: "#059669" }} />
                    <ReferenceLine y={dropThreshold} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: "alert", fontSize: 10, fill: "#f43f5e" }} />
                    <Line type="monotone" dataKey="rate" name="Delivery rate %" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6, cursor: "pointer" }} />
                    <Line type="monotone" dataKey="overdue" name="Overdue count" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Overdue shipments ({data.overdue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left border-b">
                  <tr>
                    <th className="p-3">Order</th><th>Buyer</th><th>Courier</th>
                    <th>Status</th><th>Overdue by</th><th>Dispatched</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No overdue shipments — nice.</td></tr>
                  )}
                  {data.overdue.map((s) => {
                    const bo = (s as { buyer_orders?: { order_number?: string; buyers?: { name?: string; company_name?: string } } }).buyer_orders;
                    const buyer = bo?.buyers?.company_name ?? bo?.buyers?.name ?? "—";
                    const hours = (s as { overdueHours: number }).overdueHours;
                    return (
                      <tr key={s.id} className="border-b hover:bg-emerald-50/30">
                        <td className="p-3 font-mono text-xs">{bo?.order_number ?? s.order_id}</td>
                        <td>{buyer}</td>
                        <td>{s.courier_label ?? s.courier_key}</td>
                        <td><Badge variant="outline">{s.status}</Badge></td>
                        <td><Badge variant="destructive">{hours < 1 ? `${(hours * 60).toFixed(0)}m` : `${hours.toFixed(1)}h`}</Badge></td>
                        <td className="text-xs text-muted-foreground">{s.dispatched_at ? new Date(s.dispatched_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <Link to="/platform/orders/$orderId" params={{ orderId: s.order_id as string }}>
                            <Button variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                          </Link>
                          <Link to="/platform/orders/$orderId/audit" params={{ orderId: s.order_id as string }}>
                            <Button variant="ghost" size="sm" title="Audit timeline"><ScrollText className="h-3 w-3" /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                Seller delivery-rate drops
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left border-b">
                  <tr>
                    <th className="p-3">Seller</th><th>Shipments</th><th>Overdue</th>
                    <th>Current rate</th><th>Previous</th><th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellerDrops.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No regressions detected.</td></tr>
                  )}
                  {data.sellerDrops.map((s) => (
                    <tr key={s.adminId} className="border-b hover:bg-emerald-50/30">
                      <td className="p-3">{s.sellerName}</td>
                      <td>{s.shipments}</td>
                      <td>{s.overdue > 0 ? <Badge variant="destructive">{s.overdue}</Badge> : 0}</td>
                      <td>{(s.currentRate * 100).toFixed(1)}%</td>
                      <td className="text-muted-foreground">{(s.previousRate * 100).toFixed(1)}%</td>
                      <td className={s.delta < 0 ? "text-rose-600 font-medium" : "text-emerald-600"}>
                        {(s.delta * 100).toFixed(1)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            SLA thresholds (from marketplace settings): in-transit {data.slaHours.inTransit}h · out-for-delivery {data.slaHours.outForDelivery}h · delivered {data.slaHours.delivered}h.
            {" "}Cooldown: {data.config.alertCooldownMinutes}m · Overdue grace: {data.config.overdueGraceMinutes}m.
          </p>
        </div>
      )}

      <Sheet open={!!drillKey} onOpenChange={(v) => !v && setDrillKey(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Shipments on {drillKey?.day}</SheetTitle></SheetHeader>
          <div className="flex gap-2 mt-3">
            {(["all", "overdue", "delivered", "in_flight"] as const).map((b) => (
              <Button key={b} size="sm" variant={drillKey?.bucket === b ? "default" : "outline"}
                onClick={() => drillKey && setDrillKey({ ...drillKey, bucket: b })}>
                {b.replace("_", " ")}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {drillQuery.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {drillQuery.data?.shipments.length === 0 && (
              <div className="text-sm text-muted-foreground">No shipments in this bucket.</div>
            )}
            {drillQuery.data?.shipments.map((s) => {
              const bo = (s as { buyer_orders?: { order_number?: string; buyers?: { name?: string; company_name?: string } } }).buyer_orders;
              const buyer = bo?.buyers?.company_name ?? bo?.buyers?.name ?? "—";
              return (
                <div key={s.id} className="border rounded px-3 py-2 flex items-center justify-between text-sm hover:border-emerald-500">
                  <div>
                    <div className="font-mono text-xs">{bo?.order_number ?? s.order_id}</div>
                    <div className="text-xs text-muted-foreground">{buyer} · {s.courier_label ?? s.courier_key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    <Link to="/platform/orders/$orderId" params={{ orderId: s.order_id as string }}>
                      <Button variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}