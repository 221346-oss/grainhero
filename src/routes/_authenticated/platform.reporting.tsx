import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformOverviewWidgets, getPlatformReportingDetails } from "@/lib/platform-no-admin.functions";

export const Route = createFileRoute("/_authenticated/platform/reporting")({
  head: () => ({ meta: [{ title: "Platform reporting — GrainHero" }] }),
  component: PlatformReportingPage,
});

function PlatformReportingPage() {
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const detailsFn = useServerFn(getPlatformReportingDetails);

  const { data: w } = useQuery({ queryKey: ["platform-widgets"], queryFn: () => widgetsFn() });
  const { data: details, isLoading } = useQuery({
    queryKey: ["platform-reporting-details"],
    queryFn: () => detailsFn(),
  });

  const stats = w?.reportingStats ?? { hardwareIssues: 0, bugReports: 0, managerQueries: 0, totalTickets: 0 };

  return (
    <AdminPageShell
      title="Platform reporting"
      subtitle="Hardware issues, bug reports, and manager queries from all tenants"
    >
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "total", label: "Total tickets (30d)", value: stats.totalTickets },
          { key: "hw", label: "Hardware issues", value: stats.hardwareIssues },
          { key: "bugs", label: "Bug reports", value: stats.bugReports },
          { key: "queries", label: "Manager queries", value: stats.managerQueries },
        ]}
      />

      <Tabs defaultValue="hardware">
        <TabsList>
          <TabsTrigger value="hardware">Hardware ({details?.hardwareOrders?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="alerts">Sensor alerts ({details?.hardwareAlerts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bugs">Bug reports ({details?.bugReports?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="queries">Manager queries ({details?.managerQueries?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="hardware" className="mt-4">
          <AdminDataCard title="Open hardware orders" description="Install and hardware orders needing attention">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-500">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-left px-2 py-2 font-medium">Status</th>
                    <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Phone</th>
                    <th className="text-right px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(details?.hardwareOrders ?? []).map((o: Record<string, unknown>) => (
                    <tr key={String(o.id)} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">{String(o.customer_name ?? o.customer_email ?? "—")}</p>
                        <p className="text-[11px] text-slate-500">{String(o.customer_email ?? "")}</p>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="outline" className="capitalize">
                          {String(o.status ?? "unknown").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-600 hidden md:table-cell">{String(o.contact_phone ?? "—")}</td>
                      <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                        {o.created_at ? new Date(String(o.created_at)).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {!details?.hardwareOrders?.length && (
                    <tr><td colSpan={4} className="text-center text-slate-400 py-8">No open hardware orders</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </AdminDataCard>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AdminDataCard title="Hardware & sensor alerts" description="Device-related alerts across tenants">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Alert</th>
                  <th className="text-left px-2 py-2 font-medium">Priority</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(details?.hardwareAlerts ?? []).map((a: Record<string, unknown>) => (
                  <tr key={String(a.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{String(a.alert_type ?? "Alert")}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{String(a.message ?? "")}</p>
                    </td>
                    <td className="px-2 py-2">
                      <Badge
                        variant="outline"
                        className={a.priority === "critical" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}
                      >
                        {String(a.priority ?? "—")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                      {a.created_at ? new Date(String(a.created_at)).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {!details?.hardwareAlerts?.length && (
                  <tr><td colSpan={3} className="text-center text-slate-400 py-8">No hardware alerts</td></tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </TabsContent>

        <TabsContent value="bugs" className="mt-4">
          <AdminDataCard title="Bug reports" description="Error and critical logs from the last 30 days">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-left px-2 py-2 font-medium">User</th>
                  <th className="text-left px-2 py-2 font-medium">Severity</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(details?.bugReports ?? []).map((b: Record<string, unknown>) => (
                  <tr key={String(b.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{String(b.action ?? "Error")}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{String(b.description ?? "")}</p>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{String(b.user_name ?? b.user_role ?? "—")}</td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="border-red-300 text-red-700 capitalize">
                        {String(b.severity ?? "error")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                      {b.created_at ? new Date(String(b.created_at)).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {!details?.bugReports?.length && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-8">No bug reports</td></tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </TabsContent>

        <TabsContent value="queries" className="mt-4">
          <AdminDataCard
            title="Manager queries"
            description="Questions and support requests sent by tenant admins and managers"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Subject</th>
                  <th className="text-left px-2 py-2 font-medium">From</th>
                  <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Message</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(details?.managerQueries ?? []).map((q: Record<string, unknown>) => (
                  <tr key={String(q.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{String(q.action ?? "Query")}</td>
                    <td className="px-2 py-2 text-slate-600">
                      {String(q.user_name ?? "—")}
                      {q.user_role ? <span className="text-[11px] text-slate-400 ml-1">({String(q.user_role)})</span> : null}
                    </td>
                    <td className="px-2 py-2 text-slate-500 hidden md:table-cell truncate max-w-xs">
                      {String(q.description ?? "")}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                      {q.created_at ? new Date(String(q.created_at)).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {!details?.managerQueries?.length && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-8">No manager queries yet</td></tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
