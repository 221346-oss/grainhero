import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage } from "@/components/app/DataListPage";
import { listWarehouses } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const fetch = useServerFn(listWarehouses);
  return (
    <DataListPage
      title="Warehouses"
      subtitle="Physical facilities storing your grain"
      queryKey="warehouses"
      queryFn={() => fetch()}
      columns={[
        { key: "name", label: "Name" },
        { key: "location", label: "Location" },
        { key: "capacity_tons", label: "Capacity (t)" },
        { key: "created_at", label: "Added", render: (r) => new Date(r.created_at as string).toLocaleDateString() },
      ]}
    />
  );
}