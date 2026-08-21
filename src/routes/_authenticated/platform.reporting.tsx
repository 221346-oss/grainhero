import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import {
  ResponsiveTabs,
  ResponsiveTabsList,
  ResponsiveTabsTrigger,
  ResponsiveTabsContent,
} from "@/components/app/mobile/ResponsiveTabs";

import { Badge } from "@/components/ui/badge";
import {
  getPlatformOverviewWidgets,
  getPlatformReportingDetails,
} from "@/lib/platform-no-admin.functions";
import {
  getCustomerFeedback,
  getWarehouseOperationsMetrics,
  getTechnicianPerformance,
} from "@/lib/platform-reporting.functions";
import { listTickets, deleteTicket, type TicketRow } from "@/lib/tickets.functions";
import { TicketDetailSheet } from "@/components/app/tickets/TicketDetailSheet";
import { attachTicketForUser } from "@/lib/ticketMessages";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";

export const Route = createFileRoute("/_authenticated/platform/reporting")({
  head: () => ({ meta: [{ title: "Platform reporting — GrainHero" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "hardware",
  }),
  component: PlatformReportingPage,
});

function PlatformReportingPage() {
  const search = useSearch({ from: "/_authenticated/platform/reporting" });
  const navigate = useNavigate();
  const activeTab = (search as { tab?: string }).tab ?? "hardware";
  const [tabState, setTabState] = useState(activeTab);

  useEffect(() => {
    if (activeTab && activeTab !== tabState) {
      setTabState(activeTab);
    }
  }, [activeTab]);

  const handleTabChange = (val: string) => {
    setTabState(val);
    navigate({ to: "/platform/reporting", search: { tab: val }, replace: true });
  };

  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const detailsFn = useServerFn(getPlatformReportingDetails);
  const feedbackFn = useServerFn(getCustomerFeedback);
  const warehousesFn = useServerFn(getWarehouseOperationsMetrics);
  const techniciansFn = useServerFn(getTechnicianPerformance);
  const ticketsFn = useServerFn(listTickets);
  const deleteTicketFn = useServerFn(deleteTicket);
  const qc = useQueryClient();

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
  const { data: ticketData, isLoading: loadingTickets } = useQuery({
    queryKey: ["field-tickets", "all"],
    queryFn: () => ticketsFn({ data: { status: "all" } }),
    staleTime: 30_000,
  });

  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<
    "all" | "open" | "resolved" | "closed"
  >("all");

  const deleteTicketMut = useMutation({
    mutationFn: (id: string) => deleteTicketFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ticket deleted");
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Failed to delete"),
  });

  // Keep reporting tab live when tickets change
  useRealtimeInvalidate("field_tickets", [["field-tickets", "all"]]);

  const stats = w?.reportingStats ?? {
    hardwareIssues: 0,
    bugReports: 0,
    managerQueries: 0,
    totalTickets: 0,
  };
  const feedback = feedbackData ?? {
    feedback: [],
    aggregates: {
      totalCount: 0,
      avgOverallRating: 0,
      avgTechnicianRating: 0,
      avgInstallQuality: 0,
      recommendPercent: 0,
      recommendCount: 0,
    },
  };
  const warehouses = warehouseData ?? {
    warehouses: [],
    platformAggregates: {
      totalWarehouses: 0,
      avgUtilizationPercent: 0,
      totalActiveSilos: 0,
      totalRecentAlerts: 0,
      totalQualityIncidents: 0,
    },
    insights: { topUtilized: [], underUtilized: [], withIssues: [] },
  };
  const technicians = techData ?? { technicians: [] };
  const allTickets: TicketRow[] = ticketData?.tickets ?? [];

  // Bug-report tickets submitted through the field ticket form
  // Match exact dropdown value OR case-insensitive contains "bug"
  const bugTickets = allTickets.filter(
    (t) => t.title === "Bug report" || t.title.toLowerCase().includes("bug"),
  );

  const [currentUserId, setCurrentUserId] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ""));
  }, []);

  // Pre-attach channels with unread tracking
  useEffect(() => {
    if (!currentUserId) return;
    allTickets.forEach((t) => attachTicketForUser(t.id, currentUserId));
  }, [allTickets, currentUserId]);
  const filteredTickets = useMemo(
    () =>
      ticketStatusFilter === "all"
        ? allTickets
        : allTickets.filter((t) => t.status === ticketStatusFilter),
    [allTickets, ticketStatusFilter],
  );

  return (
    <AdminPageShell
      title="Platform reporting"
      subtitle="Hardware issues, bug reports, and manager queries from all tenants"
    >
      <AdminSummaryTiles
        columns={4}
        active={
          tabState === "tickets"
            ? "total"
            : tabState === "hardware"
              ? "hw"
              : tabState === "bugs"
                ? "bugs"
                : tabState === "queries"
                  ? "queries"
                  : undefined
        }
        onSelect={(key) => {
          if (key === "total") handleTabChange("tickets");
          else if (key === "hw") handleTabChange("hardware");
          else if (key === "bugs") handleTabChange("bugs");
          else if (key === "queries") handleTabChange("queries");
        }}
        tiles={[
          { key: "total", label: "Total tickets (30d)", value: stats.totalTickets },
          { key: "hw", label: "Hardware issues", value: stats.hardwareIssues },
          { key: "bugs", label: "Bug reports", value: stats.bugReports },
          { key: "queries", label: "Manager queries", value: stats.managerQueries },
        ]}
      />

      <ResponsiveTabs value={tabState} onValueChange={handleTabChange}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="hardware">
            Hardware ({details?.hardwareOrders?.length ?? 0})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="bugs">
            Bug reports ({(details?.bugReports?.length ?? 0) + bugTickets.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="queries">
            Manager queries ({details?.managerQueries?.length ?? 0})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="feedback">
            Customer Feedback ({feedback.feedback.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="warehouses">
            Warehouse Metrics ({warehouses.warehouses.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="technicians">
            Technicians ({technicians.technicians.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="tickets">
            Incident Tickets ({allTickets.length})
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>

        <ResponsiveTabsContent value="hardware" className="mt-4">
          <AdminDataCard
            title="Open hardware orders"
            description="Install and hardware orders needing attention"
          >
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
                        <p className="font-medium text-slate-900">
                          {String(o.customer_name ?? o.customer_email ?? "—")}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {String(o.customer_email ?? "")}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="outline" className="capitalize">
                          {String(o.status ?? "unknown").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-600 hidden md:table-cell">
                        {String(o.contact_phone ?? "—")}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                        {o.created_at ? new Date(String(o.created_at)).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {!details?.hardwareOrders?.length && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-400 py-8">
                        No open hardware orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </AdminDataCard>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="bugs" className="mt-4 space-y-4">
          {/* Bug reports from admins via the ticket system */}
          <AdminDataCard
            title={`Bug reports from admins (${bugTickets.length})`}
            description="Bug reports submitted by admins via the incident ticket form"
          >
            {bugTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                No bug report tickets submitted yet
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {bugTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicket(t)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {t.reporter_name}
                          </span>
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold uppercase border",
                              t.priority === "high"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : t.priority === "medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200",
                            )}
                          >
                            {t.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold uppercase",
                              t.status === "open"
                                ? "border-slate-300 text-slate-600"
                                : t.status === "resolved"
                                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                  : "bg-slate-100 text-slate-500 border-slate-200",
                            )}
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                        {(t.admin_name || t.admin_email) && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            From: {t.admin_name ?? t.admin_email}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </AdminDataCard>

          {/* System error / critical logs */}
          <AdminDataCard
            title="System error logs"
            description="Error and critical logs from the last 30 days"
          >
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
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {String(b.description ?? "")}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {String(b.user_name ?? b.user_role ?? "—")}
                    </td>
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
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8">
                      No system error logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="queries" className="mt-4">
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
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {String(q.action ?? "Query")}
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {String(q.user_name ?? "—")}
                      {q.user_role ? (
                        <span className="text-[11px] text-slate-400 ml-1">
                          ({String(q.user_role)})
                        </span>
                      ) : null}
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
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8">
                      No manager queries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </ResponsiveTabsContent>

        {/* Customer Feedback Tab */}
        <ResponsiveTabsContent value="feedback" className="mt-4 space-y-4">
          {/* Feedback stats - Neon hairline grid */}
          <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 md:grid-cols-5">
            <div className="bg-background px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Rating
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.avgOverallRating.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Technician
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.avgTechnicianRating.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Install Quality
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.avgInstallQuality.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommend
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-success">
                {feedback.aggregates.recommendPercent.toFixed(0)}%
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Total
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.totalCount}
              </div>
            </div>
          </div>

          <AdminDataCard
            title="Recent customer feedback"
            description="Post-installation reviews and ratings"
          >
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
                    {f.comments && <p className="text-sm text-slate-600 mt-2 mb-2">{f.comments}</p>}
                    <div className="flex items-center gap-4 text-xs">
                      {f.technician_rating && (
                        <span className="text-slate-500">Tech: {f.technician_rating}/5</span>
                      )}
                      {f.installation_quality && (
                        <span className="text-slate-500">Quality: {f.installation_quality}/5</span>
                      )}
                      {f.would_recommend !== null && (
                        <Badge
                          variant={f.would_recommend ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {f.would_recommend ? "Recommends" : "Doesn't recommend"}
                        </Badge>
                      )}
                      {f.follow_up_required && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-300 text-amber-700"
                        >
                          Follow-up needed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataCard>
        </ResponsiveTabsContent>

        {/* Warehouse Metrics Tab */}
        <ResponsiveTabsContent value="warehouses" className="mt-4 space-y-4">
          {/* Warehouse stats - Neon hairline grid */}
          <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 md:grid-cols-4">
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Total Warehouses
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {warehouses.platformAggregates.totalWarehouses}
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Avg Utilization
              </span>
              <div className="text-xl font-bold tabular-nums text-info">
                {warehouses.platformAggregates.avgUtilizationPercent}%
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Active Silos
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {warehouses.platformAggregates.totalActiveSilos}
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Incidents
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-warning">
                {warehouses.platformAggregates.totalQualityIncidents}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <AdminDataCard title="Top utilized warehouses" description="Highest capacity usage">
              {loadingWarehouses ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ) : warehouses.insights.topUtilized.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">No data</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {warehouses.insights.topUtilized.map((w: any) => (
                    <div
                      key={w.warehouse_id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-sm text-slate-900">{w.warehouse_name}</div>
                        <div className="text-xs text-slate-500">
                          {w.active_silos} silos · {(w.total_capacity_kg / 1000).toFixed(1)}t
                          capacity
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

            <AdminDataCard
              title="Warehouses with issues"
              description="Recent alerts or quality incidents"
            >
              {warehouses.insights.withIssues.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">No issues reported</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {warehouses.insights.withIssues.map((w: any) => (
                    <div key={w.warehouse_id} className="p-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-900">
                            {w.warehouse_name}
                          </div>
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
        </ResponsiveTabsContent>

        {/* Technician Performance Tab */}
        <ResponsiveTabsContent value="technicians" className="mt-4">
          <AdminDataCard
            title="Technician performance"
            description="Installation metrics and customer ratings"
          >
            {loadingTech ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
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
                      <td className="px-2 py-3 text-center font-medium">
                        {t.total_installations || 0}
                      </td>
                      <td className="px-2 py-3 text-center text-emerald-600 font-medium">
                        {t.completed_installations || 0}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {t.avg_technician_rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium">
                              {t.avg_technician_rating.toFixed(1)}
                            </span>
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
        </ResponsiveTabsContent>

        {/* Incident Tickets Tab — all tickets for super admin with status filter */}
        <ResponsiveTabsContent value="tickets" className="mt-4">
          <AdminDataCard
            title="Incident tickets"
            description="All tickets raised by admins — open, resolved, and closed"
          >
            {/* Filter bar */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
              {(["all", "open", "resolved", "closed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTicketStatusFilter(s)}
                  className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full border transition-colors capitalize",
                    ticketStatusFilter === s
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {s === "all"
                    ? `All (${allTickets.length})`
                    : `${s} (${allTickets.filter((t) => t.status === s).length})`}
                </button>
              ))}
            </div>

            {loadingTickets ? (
              <p className="p-6 text-sm text-slate-500">Loading tickets…</p>
            ) : filteredTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                {allTickets.length === 0
                  ? "No tickets raised yet"
                  : `No ${ticketStatusFilter} tickets`}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {ticket.title}
                          </span>
                          {/* Priority */}
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold uppercase border",
                              ticket.priority === "high"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : ticket.priority === "medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200",
                            )}
                          >
                            {ticket.priority}
                          </Badge>
                          {/* Status */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold uppercase",
                              ticket.status === "open"
                                ? "border-slate-300 text-slate-600"
                                : ticket.status === "resolved"
                                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                  : "bg-slate-100 text-slate-500 border-slate-200",
                            )}
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mb-1">
                          <span className="font-medium">{ticket.reporter_name}</span>
                          <span className="mx-1 opacity-50">·</span>
                          <span className="capitalize">{ticket.reporter_role}</span>
                          {(ticket.admin_name || ticket.admin_email) && (
                            <>
                              <span className="mx-1 opacity-50">·</span>
                              <span>From: {ticket.admin_name ?? ticket.admin_email}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                        {ticket.resolved_note && (
                          <p className="text-xs text-emerald-600 mt-1 line-clamp-1">
                            Resolution: {ticket.resolved_note}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-xs text-slate-400 text-right space-y-1 min-w-[90px]">
                        <div>{new Date(ticket.created_at).toLocaleDateString()}</div>
                        {ticket.resolved_at && (
                          <div className="text-emerald-600 font-medium flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3 w-3" />
                            {new Date(ticket.resolved_at).toLocaleDateString()}
                          </div>
                        )}
                        {ticket.closed_at && (
                          <div className="text-slate-400 font-medium">
                            Closed {new Date(ticket.closed_at).toLocaleDateString()}
                          </div>
                        )}
                        {/* Delete button — closed tickets only */}
                        {ticket.status === "closed" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTicketMut.mutate(ticket.id);
                            }}
                            disabled={deleteTicketMut.isPending}
                            className="flex items-center gap-1 ml-auto text-[10px] font-medium text-red-500 hover:text-red-700 transition"
                            title="Delete ticket"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </AdminDataCard>
        </ResponsiveTabsContent>
      </ResponsiveTabs>

      {/* Detail sheet — superadmin can resolve/discuss from reporting page too */}

      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => {
          setSelectedTicket(null);
          qc.invalidateQueries({ queryKey: ["field-tickets"] });
        }}
      />
    </AdminPageShell>
  );
}
