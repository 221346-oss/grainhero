import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage, StatusBadge } from "@/components/app/DataListPage";
import { listActuators } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/actuators")({
  component: ActuatorsPage,
});

function ActuatorsPage() {
  const fetch = useServerFn(listActuators);
  return (
    <DataListPage
      title="Actuators"
      subtitle="Fans, aerators and other controllable devices"
      queryKey="actuators"
      queryFn={() => fetch()}
      columns={[
        { key: "device_id", label: "Device ID" },
        { key: "actuator_type", label: "Type" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status as string} /> },
      ]}
    />
  );
}