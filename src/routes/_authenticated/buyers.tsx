import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DataListPage } from "@/components/app/DataListPage";
import { listBuyers } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/buyers")({
  component: BuyersPage,
});

function BuyersPage() {
  const fetch = useServerFn(listBuyers);
  return (
    <DataListPage
      title="Buyers"
      subtitle="Customers purchasing your grain"
      queryKey="buyers"
      queryFn={() => fetch()}
      columns={[
        { key: "name", label: "Name" },
        { key: "company_name", label: "Company" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
      ]}
    />
  );
}