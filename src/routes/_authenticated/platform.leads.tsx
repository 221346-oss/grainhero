import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListHubspotContacts } from "@/lib/hubspot.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Building2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const listFn = useServerFn(adminListHubspotContacts);
  const { data, isLoading, error } = useQuery({ queryKey: ["platform-leads"], queryFn: () => listFn() });

  const totalLeads = data?.results?.length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Leads
          </h1>
          <p className="text-sm text-slate-600 mt-1">HubSpot contacts synced from GrainHero signups</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Total Leads</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">{totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">This Month</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">
                  {(data?.results ?? []).filter((c: any) => {
                    const created = c.properties?.createdate ? new Date(c.properties.createdate) : null;
                    if (!created) return false;
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return created >= monthAgo;
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Companies</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">
                  {new Set((data?.results ?? []).map((c: any) => c.properties?.company).filter(Boolean)).size}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg">All Contacts</CardTitle>
          <CardDescription>View and manage your HubSpot lead database</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Loading leads…</p>
            </div>
          )}
          {error && (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600">Error: {(error as Error).message}</p>
            </div>
          )}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600">
                      Company
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-slate-600">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.results ?? []).map((c: any) => {
                    const fullName = [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" ");
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{fullName || "—"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">{c.properties?.email ?? "—"}</div>
                        </td>
                        <td className="py-3 px-4">
                          {c.properties?.company ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {c.properties.company}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{c.properties?.phone ?? "—"}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {c.properties?.createdate ? new Date(c.properties.createdate).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {(!data || data.results.length === 0) && !isLoading && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <UserPlus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No leads yet.</p>
                        <p className="text-sm text-slate-400 mt-1">Leads will appear here when users sign up</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
