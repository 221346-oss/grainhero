import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSlaAlerts, getSlaDrilldown } from "@/lib/sla-alerts.functions";
import { AlertTriangle, TrendingDown, ExternalLink, ScrollText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  NEON,
  NeonPatternDefs,
  neonGrid,
  neonAxis,
  neonTooltipStyle,
  neonAnim,
  HairlineGrid,
  NeonPanel,
  StatGrid,
  ChartEmpty,
} from "@/components/charts/neon";

export const Route = createFileRoute("/_authenticated/platform/sla-alerts")({
  head: () => ({
    meta: [
      { title: "Platform · Sla Alerts — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Sla Alerts workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Sla Alerts — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Sla Alerts workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SlaAlertsPage,
});

function SlaAlertsPage() {
  const load = useServerFn(getSlaAlerts);
  const drill = useServerFn(getSlaDrilldown);
  const [days, setDays] = useState(30);
  const [drillKey, setDrillKey] = useState<{
    day: string;
    bucket: "all" | "overdue" | "delivered" | "in_flight";
  } | null>(null);
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

  const trendData = data
    ? data.trend.current.map((c) => ({
        day: c.day,
        rate: Number((c.rate * 100).toFixed(1)),
        overdue: c.overdue,
        dispatched: c.dispatched,
      }))
    : [];
  const baselinePct = data ? Number((data.totals.baselineRate * 100).toFixed(1)) : 0;
  const dropThreshold = data ? baselinePct - data.config.deliveryRateAlertDropPct : 0;

  return (
    <AdminPageShell
      title="SLA alerts"
      subtitle="Overdue shipments and delivery-rate regressions across the marketplace."
      actions={
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <NeonPatternDefs />
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          <StatGrid
            cols="grid-cols-2 md:grid-cols-4"
            stats={[
              { label: "Overdue now", value: data.totals.overdue, tone: "critical" },
              { label: "Shipments (window)", value: data.totals.current },
              {
                label: "Delivery rate",
                value: `${(data.totals.currentRate * 100).toFixed(1)}%`,
                tone: "ok",
              },
              {
                label: "Δ vs prior window",
                value: `${((data.totals.currentRate - data.totals.previousRate) * 100).toFixed(1)} pp`,
                tone: data.totals.currentRate - data.totals.previousRate < 0 ? "critical" : "ok",
              },
            ]}
          />

          <HairlineGrid cols="grid-cols-1">
            <NeonPanel
              index="01"
              title={
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" style={{ color: NEON.brand }} />
                  Delivery-rate trend
                </span>
              }
              subtitle={`Baseline (prior window): ${baselinePct}% · alert if drop > ${data.config.deliveryRateAlertDropPct} pp`}
            >
              <div className="h-64">
                {trendData.length === 0 ? (
                  <ChartEmpty label="No dispatched shipments in this window." height={256} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                      onClick={(e: { activeLabel?: string }) => {
                        if (e?.activeLabel) setDrillKey({ day: e.activeLabel, bucket: "all" });
                      }}
                    >
                      <CartesianGrid {...neonGrid} />
                      <XAxis dataKey="day" {...neonAxis} />
                      <YAxis {...neonAxis} unit="%" domain={[0, 100]} />
                      <Tooltip {...neonTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine
                        y={baselinePct}
                        stroke={NEON.brand}
                        strokeDasharray="4 4"
                        label={{ value: "baseline", fontSize: 10, fill: NEON.brand }}
                      />
                      <ReferenceLine
                        y={dropThreshold}
                        stroke={NEON.critical}
                        strokeDasharray="4 4"
                        label={{ value: "alert", fontSize: 10, fill: NEON.critical }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Delivery rate %"
                        stroke={NEON.brand}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6, cursor: "pointer" }}
                        {...neonAnim}
                      />
                      <Line
                        type="monotone"
                        dataKey="overdue"
                        name="Overdue count"
                        stroke={NEON.critical}
                        strokeWidth={1.5}
                        dot={false}
                        {...neonAnim}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </NeonPanel>
          </HairlineGrid>

          <NeonPanel
            index="02"
            title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: NEON.critical }} />
                Overdue shipments ({data.overdue.length})
              </span>
            }
            className="rounded-md"
          >
            <div className="rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Order</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Buyer</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Courier
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Status
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Overdue by
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Dispatched
                    </th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        No overdue shipments — nice.
                      </td>
                    </tr>
                  )}
                  {data.overdue.map((s) => {
                    const bo = (
                      s as {
                        buyer_orders?: {
                          order_number?: string;
                          buyers?: { name?: string; company_name?: string };
                        };
                      }
                    ).buyer_orders;
                    const buyer = bo?.buyers?.company_name ?? bo?.buyers?.name ?? "—";
                    const hours = (s as { overdueHours: number }).overdueHours;
                    return (
                      <tr
                        key={s.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          {bo?.order_number ?? s.order_id}
                        </td>
                        <td className="px-3 py-2">{buyer}</td>
                        <td className="px-3 py-2">{s.courier_label ?? s.courier_key}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{s.status}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums"
                            style={{
                              color: NEON.critical,
                              background:
                                "color-mix(in oklch, var(--severity-critical) 15%, transparent)",
                            }}
                          >
                            {hours < 1 ? `${(hours * 60).toFixed(0)}m` : `${hours.toFixed(1)}h`}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground tabular-nums">
                          {s.dispatched_at ? new Date(s.dispatched_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to="/platform/orders/$orderId"
                            params={{ orderId: s.order_id as string }}
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Link
                            to="/platform/orders/$orderId/audit"
                            params={{ orderId: s.order_id as string }}
                          >
                            <Button variant="ghost" size="sm" title="Audit timeline">
                              <ScrollText className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </NeonPanel>

          <NeonPanel
            index="03"
            title={
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" style={{ color: NEON.warning }} />
                Seller delivery-rate drops
              </span>
            }
            className="rounded-md"
          >
            <div className="rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Seller
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Shipments
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Overdue
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Current rate
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">
                      Previous
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellerDrops.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        No regressions detected.
                      </td>
                    </tr>
                  )}
                  {data.sellerDrops.map((s) => (
                    <tr
                      key={s.adminId}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2">{s.sellerName}</td>
                      <td className="px-3 py-2 tabular-nums">{s.shipments}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {s.overdue > 0 ? <Badge variant="destructive">{s.overdue}</Badge> : 0}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {(s.currentRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {(s.previousRate * 100).toFixed(1)}%
                      </td>
                      <td
                        className="px-3 py-2 tabular-nums font-medium"
                        style={{ color: s.delta < 0 ? NEON.critical : NEON.success }}
                      >
                        {(s.delta * 100).toFixed(1)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeonPanel>

          <p className="text-xs text-muted-foreground">
            SLA thresholds (from marketplace settings): in-transit {data.slaHours.inTransit}h ·
            out-for-delivery {data.slaHours.outForDelivery}h · delivered {data.slaHours.delivered}h.{" "}
            Cooldown: {data.config.alertCooldownMinutes}m · Overdue grace:{" "}
            {data.config.overdueGraceMinutes}m.
          </p>
        </div>
      )}

      <Sheet open={!!drillKey} onOpenChange={(v) => !v && setDrillKey(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Shipments on {drillKey?.day}</SheetTitle>
          </SheetHeader>
          <div className="flex gap-2 mt-3">
            {(["all", "overdue", "delivered", "in_flight"] as const).map((b) => (
              <Button
                key={b}
                size="sm"
                variant={drillKey?.bucket === b ? "default" : "outline"}
                onClick={() => drillKey && setDrillKey({ ...drillKey, bucket: b })}
              >
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
              const bo = (
                s as {
                  buyer_orders?: {
                    order_number?: string;
                    buyers?: { name?: string; company_name?: string };
                  };
                }
              ).buyer_orders;
              const buyer = bo?.buyers?.company_name ?? bo?.buyers?.name ?? "—";
              return (
                <div
                  key={s.id}
                  className="border rounded px-3 py-2 flex items-center justify-between text-sm hover:border-emerald-500"
                >
                  <div>
                    <div className="font-mono text-xs">{bo?.order_number ?? s.order_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {buyer} · {s.courier_label ?? s.courier_key}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    <Link to="/platform/orders/$orderId" params={{ orderId: s.order_id as string }}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
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
