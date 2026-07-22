import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformOverviewWidgets, getPlatformReportingDetails } from "@/lib/platform-no-admin.functions";
import { getCustomerFeedback, getWarehouseOperationsMetrics, getTechnicianPerformance } from "@/lib/platform-reporting.functions";
import { Star, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/reporting")({
  head: () => ({ meta: [{ title: "Platform reporting — GrainHero" }] }),
  component: PlatformReportingPage,
});

function PlatformReportingPage() {
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const detailsFn = useServerFn(getPlatformReportingDetails);
  const feedbackFn = useServerFn(getCustomerFeedback);
  const warehousesFn = useServerFn(getWarehouseOperationsMetrics);
  const techniciansFn = useServerFn(getTechnicianPerformance);

  const { data: w } = useQuery({ queryKey: ["platform-widgets"], queryFn: () => widgetsFn() });
  const { data: details, isLoading } = useQuery({
    queryKey: ["platform-reporting-details"],
    queryFn: () => detailsFn(),
  });
  const { data: feedbackData, isLoading: loadingFeedback } = useQuery({
    queryKey: ["customer-feedback"],
    queryFn: () => feedbackFn({ data: { limit: 50 } }),
  });
  const { data: warehouseData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["warehouse-metrics"],
    queryFn: () => warehousesFn(),
  });
  const { data: techData, isLoading: loadingTech } = useQuery({
    queryKey: ["technician-performance"],
    queryFn: () => techniciansFn(),
  });

  const stats = w?.reportingStats ?? { hardwareIssues: 0, bugReports: 0, managerQueries: 0, totalTickets: 0 };
  const feedback = feedbackData ?? { feedback: [], aggregates: { totalCount: 0, avgOverallRating: 0, avgTechnicianRating: 0, avgInstallQuality: 0, recommendPercent: 0, recommendCount: 0 } };
  const warehouses = warehouseData ?? { warehouses: [], platformAggregates: { totalWarehouses: 0, avgUtilizationPercent: 0, totalActiveSilos: 0, totalRecentAlerts: 0, totalQualityIncidents: 0 }, insights: { topUtilized: [], underUtilized: [], withIssues: [] } };
  const technicians = techData ?? { technicians: [] };

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
          <TabsTrigger value="feedback">Customer Feedback ({feedback.feedback.length})</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouse Metrics ({warehouses.warehouses.length})</TabsTrigger>
          <TabsTrigger value="technicians">Technicians ({technicians.technicians.length})</TabsTrigger>
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

        {/* Customer Feedback Tab */}
        <TabsContent value="feedback" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Star className="h-3 w-3" />
                <span>Avg Rating</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {feedback.aggregates.avgOverallRating.toFixed(1)}
                <span className="text-sm text-slate-400">/5</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Technician</div>
              <div className="text-2xl font-bold text-slate-900">
                {feedback.aggregates.avgTechnicianRating.toFixed(1)}
                <span className="text-sm text-slate-400">/5</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Install Quality</div>
              <div className="text-2xl font-bold text-slate-900">
                {feedback.aggregates.avgInstallQuality.toFixed(1)}
                <span className="text-sm text-slate-400">/5</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Would Recommend</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {feedback.aggregates.recommendPercent.toFixed(0)}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Total Responses</div>
              <div className="text-2xl font-bold text-slate-900">{feedback.aggregates.totalCount}</div>
            </div>
          </div>

          <AdminDataCard title="Recent customer feedback" description="Post-installation reviews and ratings">
            {loadingFeedback ? (
              <p className="p-6 text-sm text-slate-500">Loading feedback...</p>
            ) : feedback.feedback.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No feedback yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {feedback.feedback.map((f: any) => (
                  <div key={f.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900">
                            {f.admin?.name || "Anonymous"}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">
                            {f.order?.install_city || "Unknown location"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>Order: {f.order?.plan_name || "N/A"}</span>
                          {f.technician && <span>· Tech: {f.technician.name}</span>}
                          {f.warehouse && <span>· {f.warehouse.name}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-sm">{f.overall_rating}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(f.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {f.comments && (
                      <p className="text-sm text-slate-600 mt-2 mb-2">{f.comments}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      {f.technician_rating && (
                        <span className="text-slate-500">Tech: {f.technician_rating}/5</span>
                      )}
                      {f.installation_quality && (
                        <span className="text-slate-500">Quality: {f.installation_quality}/5</span>
                      )}
                      {f.would_recommend !== null && (
                        <Badge variant={f.would_recommend ? "default" : "secondary"} className="text-xs">
                          {f.would_recommend ? "Recommends" : "Doesn't recommend"}
                        </Badge>
                      )}
                      {f.follow_up_required && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Follow-up needed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataCard>
        </TabsContent>

        {/* Warehouse Metrics Tab */}
        <TabsContent value="warehouses" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Total Warehouses</div>
              <div className="text-2xl font-bold text-slate-900">
                {warehouses.platformAggregates.totalWarehouses}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Avg Utilization</div>
              <div className="text-2xl font-bold text-blue-600">
                {warehouses.platformAggregates.avgUtilizationPercent}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Active Silos</div>
              <div className="text-2xl font-bold text-slate-900">
                {warehouses.platformAggregates.totalActiveSilos}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Quality Incidents</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {warehouses.platformAggregates.totalQualityIncidents}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <AdminDataCard title="Top utilized warehouses" description="Highest capacity usage">
              {loadingWarehouses ? (
                <p className="p-6 text-sm text-slate-500">Loading...</p>
              ) : warehouses.insights.topUtilized.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">No data</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {warehouses.insights.topUtilized.map((w: any) => (
                    <div key={w.warehouse_id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{w.warehouse_name}</div>
                        <div className="text-xs text-slate-500">
                          {w.active_silos} silos · {(w.total_capacity_kg / 1000).toFixed(1)}t capacity
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-emerald-600">
                          {w.utilization_percent?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminDataCard>

            <AdminDataCard title="Warehouses with issues" description="Recent alerts or quality incidents">
              {warehouses.insights.withIssues.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">No issues reported</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {warehouses.insights.withIssues.map((w: any) => (
                    <div key={w.warehouse_id} className="p-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-900">{w.warehouse_name}</div>
                          <div className="text-xs text-slate-500">{w.location_desc || "—"}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs">
                          {w.recent_alerts > 0 && (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              {w.recent_alerts} alerts
                            </Badge>
                          )}
                          {w.quality_incidents > 0 && (
                            <Badge variant="outline" className="border-red-300 text-red-700">
                              {w.quality_incidents} incidents
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminDataCard>
          </div>
        </TabsContent>

        {/* Technician Performance Tab */}
        <TabsContent value="technicians" className="mt-4">
          <AdminDataCard title="Technician performance" description="Installation metrics and customer ratings">
            {loadingTech ? (
              <p className="p-6 text-sm text-slate-500">Loading...</p>
            ) : technicians.technicians.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No technicians yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Technician</th>
                    <th className="text-center px-2 py-2 font-medium">Status</th>
                    <th className="text-center px-2 py-2 font-medium">Installations</th>
                    <th className="text-center px-2 py-2 font-medium">Completed</th>
                    <th className="text-center px-2 py-2 font-medium">Avg Rating</th>
                    <th className="text-left px-2 py-2 font-medium">Warehouses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicians.technicians.map((t: any) => (
                    <tr key={t.technician_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{t.technician_name}</div>
                        <div className="text-xs text-slate-500">{t.technician_email}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            t.technician_status === "available"
                              ? "border-emerald-300 text-emerald-700"
                              : t.technician_status === "busy"
                              ? "border-amber-300 text-amber-700"
                              : "border-slate-300 text-slate-600"
                          }
                        >
                          {t.technician_status || "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-center font-medium">{t.total_installations || 0}</td>
                      <td className="px-2 py-3 text-center text-emerald-600 font-medium">
                        {t.completed_installations || 0}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {t.avg_technician_rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{t.avg_technician_rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-600">
                        {t.assigned_warehouses || 0} assigned
                        {t.service_cities?.length > 0 && (
                          <div className="text-slate-400 mt-0.5">
                            {t.service_cities.slice(0, 2).join(", ")}
                            {t.service_cities.length > 2 && ` +${t.service_cities.length - 2}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminDataCard>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
