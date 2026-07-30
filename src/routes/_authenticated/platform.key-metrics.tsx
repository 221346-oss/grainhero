import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { listAllHardwareOrders } from "@/lib/hardware-orders.functions";
import { getDeviceHealth } from "@/lib/operations2.functions";

export const Route = createFileRoute("/_authenticated/platform/key-metrics")({
  component: PlatformKeyMetricsPage,
});

function PlatformKeyMetricsPage() {
  const ordersFn = useServerFn(listAllHardwareOrders);
  const healthFn = useServerFn(getDeviceHealth);

  const ordersQ = useQuery({ queryKey: ["platform-hardware-orders"], queryFn: () => ordersFn() });
  const healthQ = useQuery({ queryKey: ["device-health"], queryFn: () => healthFn(), refetchInterval: 30_000 });

  const orders = ordersQ.data?.orders ?? [];
  // "Sold" = every non-cancelled order's device quantity. Deployed = devices
  // actually registered (sensor_devices rows) once install completes.
  const totalOrdered = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.hardware_quantity ?? 0), 0);
  const deployed = healthQ.data?.totals?.total ?? 0;
  const remaining = Math.max(0, totalOrdered - deployed);

  const stockTiles = [
    { key: "ordered", label: "Total devices sold", value: totalOrdered, hint: "Sum of ordered quantities" },
    { key: "deployed", label: "Deployed", value: deployed, hint: "Registered & installed" },
    { key: "remaining", label: "Remaining to deploy", value: remaining, hint: "Sold, not yet installed" },
  ];

  const statusTiles = [
    { key: "live", label: "Live", value: healthQ.data?.totals?.online ?? "—" },
    { key: "down", label: "Down", value: healthQ.data?.totals?.offline ?? "—" },
    { key: "lowBattery", label: "Low battery", value: healthQ.data?.totals?.lowBattery ?? "—" },
  ];

  return (
    <AdminPageShell
      title="Key Metrics"
      subtitle="IoT device stock and live status across the platform. Read-only."
    >
      <PlatformScopeBanner label="Derived from install orders and registered devices across every tenant." />

      <AdminSummaryTiles columns={3} tiles={stockTiles} />
      <AdminSummaryTiles columns={3} tiles={statusTiles} />
    </AdminPageShell>
  );
}
