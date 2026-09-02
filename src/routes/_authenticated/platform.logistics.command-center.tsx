import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLogisticsCommandCenter } from "@/lib/logistics.functions";

export const Route = createFileRoute("/_authenticated/platform/logistics/command-center")({
  head: () => ({ meta: [{ title: "Logistics Command Center · GrainHero" }] }),
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const fetchFn = useServerFn(getLogisticsCommandCenter);
  const { data, isLoading } = useQuery({
    queryKey: ["logistics", "command-center"],
    queryFn: () => fetchFn(),
  });
  const k = data?.kpis;
  return (
    <AdminPageShell
      title="Logistics Command Center"
      subtitle="Live view of fleet utilization, cost per kg, on-time delivery and driver compliance."
    >
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "active", label: "Active shipments", value: k?.activeShipments ?? "—" },
          { key: "ontime", label: "On-time delivery", value: k ? `${k.onTimePct}%` : "—" },
          {
            key: "cost",
            label: "Logistics spend",
            value: k ? `PKR ${k.totalLogisticsCost.toLocaleString()}` : "—",
            hint: k ? `PKR ${k.costPerKg}/kg` : undefined,
          },
          { key: "util", label: "Fleet utilization", value: k ? `${k.fleetUtilizationPct}%` : "—" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Delivery performance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Delivered</span>
              <span className="font-medium">{k?.deliveredCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>On-time</span>
              <span className="font-medium">{k?.onTimePct ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Active drivers</span>
              <span className="font-medium">{k?.driversCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Licence alerts</span>
              {(k?.licenseAlertsCount ?? 0) > 0 ? (
                <Badge variant="destructive">{k?.licenseAlertsCount}</Badge>
              ) : (
                <span className="font-medium text-emerald-600">0</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Getting started</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              1. Add carriers under <span className="font-medium">Platform → Carriers</span>.
            </p>
            <p>
              2. Register vehicles & drivers under <span className="font-medium">Fleet</span>.
            </p>
            <p>
              3. Assign a carrier to any dispatched shipment to start capturing cost & SLA data.
            </p>
            <p>4. Tune limits under Marketplace Settings → Logistics.</p>
          </CardContent>
        </Card>
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
    </AdminPageShell>
  );
}
