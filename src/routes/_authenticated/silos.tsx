import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage, StatusBadge } from "@/components/app/DataListPage";
import { listSilos } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/silos")({
  component: SilosPage,
});

function SilosPage() {
  const fetch = useServerFn(listSilos);
  return (
    <DataListPage
      title="Silos"
      subtitle="Storage units inside your warehouses"
      queryKey="silos"
      queryFn={() => fetch()}
      columns={[
        { key: "name", label: "Silo" },
        { key: "warehouse", label: "Warehouse", render: (r) => {
          const w = r.warehouses as { name?: string } | null;
          return w?.name ?? "—";
        } },
        { key: "capacity_tons", label: "Capacity (t)" },
        { key: "current_grain_type", label: "Grain" },
        { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status as string} /> },
      ]}
    />
  );
}