import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage, StatusBadge } from "@/components/app/DataListPage";
import { listGrainAlerts } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/grain-alerts")({
  component: GrainAlertsPage,
});

function GrainAlertsPage() {
  const fetch = useServerFn(listGrainAlerts);
  return (
    <DataListPage
      title="Grain Alerts"
      subtitle="Environmental thresholds, spoilage risks and safety events"
      queryKey="grain-alerts"
      queryFn={() => fetch()}
      columns={[
        { key: "alert_type", label: "Type", render: (r) => <StatusBadge value={r.alert_type as string} /> },
        { key: "title", label: "Title" },
        { key: "message", label: "Message" },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status as string} /> },
        { key: "created_at", label: "Created", render: (r) => new Date(r.created_at as string).toLocaleString() },
      ]}
    />
  );
}