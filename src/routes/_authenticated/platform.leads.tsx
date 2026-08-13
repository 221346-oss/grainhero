import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListHubspotContacts } from "@/lib/hubspot.functions";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/platform/leads")({
  head: () => ({
    meta: [
      { title: "Platform · Leads — Grain Hero" },
      { name: "description", content: "Platform · Leads workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Leads — Grain Hero" },
      { property: "og:description", content: "Platform · Leads workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const listFn = useServerFn(adminListHubspotContacts);
  const { data, isLoading, error } = useQuery({ queryKey: ["platform-leads"], queryFn: () => listFn() });

  const totalLeads = data?.results?.length ?? 0;
  const thisMonth = (data?.results ?? []).filter((c: any) => {
    const created = c.properties?.createdate ? new Date(c.properties.createdate) : null;
    if (!created) return false;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;
  const companies = new Set((data?.results ?? []).map((c: any) => c.properties?.company).filter(Boolean)).size;

  return (
    <AdminPageShell title="Leads" subtitle="HubSpot contacts synced from GrainHero signups">
      <AdminSummaryTiles
        columns={3}
        tiles={[
          { key: "all", label: "Total leads", value: totalLeads },
          { key: "month", label: "This month", value: thisMonth },
          { key: "co", label: "Companies", value: companies },
        ]}
      />

      <AdminDataCard title="All contacts" description={`Showing ${totalLeads} leads`}>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading leads…</div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{(error as Error).message}</div>
        ) : totalLeads === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <p className="text-sm">No leads yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-transparent">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="text-left py-2 px-4 text-xs font-medium uppercase text-slate-500 hidden sm:table-cell">Email</th>
                  <th className="text-left py-2 px-4 text-xs font-medium uppercase text-slate-500 hidden sm:table-cell">Company</th>
                  <th className="text-left py-2 px-4 text-xs font-medium uppercase text-slate-500 hidden sm:table-cell">Phone</th>
                  <th className="text-left py-2 px-4 text-xs font-medium uppercase text-slate-500 hidden sm:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="">
                {(data?.results ?? []).map((c: any) => {
                  const fullName = [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" ");
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {fullName || "—"}
                        <div className="sm:hidden text-xs font-normal text-slate-500 mt-1 space-y-0.5">
                          <div className="truncate">{c.properties?.email ?? "—"}</div>
                          {c.properties?.company && (
                            <div className="font-semibold text-slate-600">{c.properties.company}</div>
                          )}
                          <div className="text-[11px]">{c.properties?.phone ?? ""}</div>
                          <div className="text-[10px] text-slate-400">
                            {c.properties?.createdate ? new Date(c.properties.createdate).toLocaleDateString() : ""}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-slate-700 hidden sm:table-cell">{c.properties?.email ?? "—"}</td>
                      <td className="py-2 px-4 hidden sm:table-cell">
                        {c.properties?.company ? (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                            {c.properties.company}
                          </Badge>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2 px-4 text-slate-600 hidden sm:table-cell">{c.properties?.phone ?? "—"}</td>
                      <td className="py-2 px-4 text-slate-500 hidden sm:table-cell">
                        {c.properties?.createdate ? new Date(c.properties.createdate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminDataCard>
    </AdminPageShell>
  );
}
