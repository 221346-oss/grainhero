import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListHubspotContacts } from "@/lib/hubspot.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const listFn = useServerFn(adminListHubspotContacts);
  const { data, isLoading, error } = useQuery({ queryKey: ["platform-leads"], queryFn: () => listFn() });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Leads</h2>
        <p className="text-xs text-slate-500 mt-1">HubSpot contacts synced from GrainHero signups.</p>
      </div>
      {isLoading && <div className="text-sm text-slate-500">Loading leads…</div>}
      {error && <div className="text-sm text-red-600">Error: {(error as Error).message}</div>}
      <Card>
        <CardHeader><CardTitle className="text-base">Contacts ({data?.results?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b">
              <tr>
                <th className="text-left py-2 px-2">Name</th>
                <th className="text-left py-2 px-2">Email</th>
                <th className="text-left py-2 px-2">Company</th>
                <th className="text-left py-2 px-2">Phone</th>
                <th className="text-left py-2 px-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.results ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 px-2">{[c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" ") || "—"}</td>
                  <td className="py-1.5 px-2">{c.properties?.email ?? "—"}</td>
                  <td className="py-1.5 px-2">{c.properties?.company ?? "—"}</td>
                  <td className="py-1.5 px-2">{c.properties?.phone ?? "—"}</td>
                  <td className="py-1.5 px-2 text-xs text-slate-500">{c.properties?.createdate ? new Date(c.properties.createdate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {(!data || data.results.length === 0) && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400 italic">No leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}