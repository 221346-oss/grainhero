import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage, StatusBadge } from "@/components/app/DataListPage";
import { listGrainBatches } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/grain-batches")({
  component: GrainBatchesPage,
});

function GrainBatchesPage() {
  const fetch = useServerFn(listGrainBatches);
  return (
    <DataListPage
      title="Grain Batches"
      subtitle="Procurement, intake, storage and dispatch batches"
      queryKey="grain-batches"
      queryFn={() => fetch()}
      columns={[
        { key: "batch_id", label: "Batch ID" },
        { key: "grain_type", label: "Grain" },
        { key: "quantity_kg", label: "Quantity (kg)" },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status as string} /> },
        { key: "quality_grade", label: "Quality" },
        { key: "intake_date", label: "Intake", render: (r) => r.intake_date ? new Date(r.intake_date as string).toLocaleDateString() : "—" },
      ]}
    />
  );
}