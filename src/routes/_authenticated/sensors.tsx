import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage, StatusBadge } from "@/components/app/DataListPage";
import { listSensorDevices } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/sensors")({
  component: SensorsPage,
});

function SensorsPage() {
  const fetch = useServerFn(listSensorDevices);
  return (
    <DataListPage
      title="Sensors"
      subtitle="Environmental sensors reporting from your silos"
      queryKey="sensors"
      queryFn={() => fetch()}
      columns={[
        { key: "device_id", label: "Device ID" },
        { key: "sensor_type", label: "Type" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status as string} /> },
        { key: "last_seen", label: "Last seen", render: (r) => r.last_seen ? new Date(r.last_seen as string).toLocaleString() : "—" },
      ]}
    />
  );
}