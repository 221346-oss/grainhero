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
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/platform/reporting")({
  head: () => ({ meta: [{ title: "Platform reporting — GrainHero" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "hardware",
  }),
  component: PlatformReportingPage,
});

function PlatformReportingPage() {
  const { t } = useTranslation();
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
      toast.success(t("platformReporting.ticketDeleted"));
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? t("platformReporting.failedToDelete")),
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
      title={t("platformReporting.title")}
      subtitle={t("platformReporting.subtitle")}
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
          { key: "total", label: t("platformReporting.totalTickets"), value: stats.totalTickets },
          { key: "hw", label: t("platformReporting.hardwareIssues"), value: stats.hardwareIssues },
          { key: "bugs", label: t("platformReporting.bugReports"), value: stats.bugReports },
          { key: "queries", label: t("platformReporting.managerQueries"), value: stats.managerQueries },
        ]}
      />

      <ResponsiveTabs value={tabState} onValueChange={handleTabChange}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="hardware">
            {t("platformReporting.hardware")} ({details?.hardwareOrders?.length ?? 0})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="bugs">
            {t("platformReporting.bugReports")} ({(details?.bugReports?.length ?? 0) + bugTickets.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="queries">
            {t("platformReporting.managerQueries")} ({details?.managerQueries?.length ?? 0})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="feedback">
            {t("platformReporting.customerFeedback")} ({feedback.feedback.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="warehouses">
            {t("platformReporting.warehouseMetrics")} ({warehouses.warehouses.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="technicians">
            {t("platformReporting.technicians")} ({technicians.technicians.length})
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="tickets">
            {t("platformReporting.incidentTickets")} ({allTickets.length})
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>

        <ResponsiveTabsContent value="hardware" className="mt-4">
          <AdminDataCard
            title={t("platformReporting.openHardwareOrders")}
            description={t("platformReporting.installAndHardwareOrders")}
          >
            {isLoading ? (
              <p className="p-6 text-sm text-slate-500">{t("common.loading")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left rtl:text-right px-4 py-2 font-medium">{t("platformReporting.customer")}</th>
                    <th className="text-left rtl:text-right px-2 py-2 font-medium">{t("common.status")}</th>
                    <th className="text-left rtl:text-right px-2 py-2 font-medium hidden md:table-cell">{t("common.phone")}</th>
                    <th className="text-right px-4 py-2 font-medium">{t("common.date")}</th>
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
                      {t("platformReporting.noOpenHardwareOrders")}
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
            title={t("platformReporting.bugReportsFromAdmins", { count: bugTickets.length })}
            description={t("platformReporting.bugReportsDescription")}
          >
            {bugTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                {t("platformReporting.noBugTickets")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {bugTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full text-left rtl:text-right p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {ticket.reporter_name}
                          </span>
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
                            {t(`platformReporting.${ticket.priority}`)}
                          </Badge>
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
                            {t(`platformReporting.${ticket.status}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{ticket.description}</p>
                        {(ticket.admin_name || ticket.admin_email) && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {t("platformReporting.from")}: {ticket.admin_name ?? ticket.admin_email}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </AdminDataCard>

          {/* System error / critical logs */}
          <AdminDataCard
            title={t("platformReporting.systemErrorLogs")}
            description={t("platformReporting.systemErrorDescription")}
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left rtl:text-right px-4 py-2 font-medium">{t("common.actions")}</th>
                  <th className="text-left rtl:text-right px-2 py-2 font-medium">{t("platformReporting.user")}</th>
                  <th className="text-left rtl:text-right px-2 py-2 font-medium">{t("platformReporting.severity")}</th>
                  <th className="text-right px-4 py-2 font-medium">{t("common.date")}</th>
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
                      {t("platformReporting.noErrorLogs")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="queries" className="mt-4">
          <AdminDataCard
            title={t("platformReporting.managerQueriesTitle")}
            description={t("platformReporting.managerQueriesDescription")}
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                    <th className="text-left px-4 py-2 font-medium">{t("platformReporting.subject")}</th>
                    <th className="text-left px-2 py-2 font-medium">{t("platformReporting.from")}</th>
                    <th className="text-left px-2 py-2 font-medium hidden md:table-cell">{t("platformReporting.message")}</th>
                  <th className="text-right px-4 py-2 font-medium">{t("common.date")}</th>
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
                      {t("platformReporting.noQueries")}
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
                  {t("platformReporting.avgRating")}
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.avgOverallRating.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("platformReporting.technicians")}
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.avgTechnicianRating.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("platformReporting.installQuality")}
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
                  {t("platformReporting.recommend")}
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-success">
                {feedback.aggregates.recommendPercent.toFixed(0)}%
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("platformReporting.total")}
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {feedback.aggregates.totalCount}
              </div>
            </div>
          </div>

          <AdminDataCard
            title={t("platformReporting.recentFeedback")}
            description={t("platformReporting.feedbackDescription")}
          >
            {loadingFeedback ? (
              <p className="p-6 text-sm text-slate-500">{t("common.loading")}</p>
            ) : feedback.feedback.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">{t("platformReporting.noFeedback")}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {feedback.feedback.map((f: any) => (
                  <div key={f.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900">
                            {f.admin?.name || t("platformReporting.anonymous")}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">
                            {f.order?.install_city || t("platformReporting.unknownLocation")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>{t("platformReporting.order")}: {f.order?.plan_name || "N/A"}</span>
                          {f.technician && <span>· {t("platformReporting.tech")}: {f.technician.name}</span>}
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
                        <span className="text-slate-500">{t("platformReporting.tech")}: {f.technician_rating}/5</span>
                      )}
                      {f.installation_quality && (
                        <span className="text-slate-500">{t("platformReporting.quality")}: {f.installation_quality}/5</span>
                      )}
                      {f.would_recommend !== null && (
                        <Badge
                          variant={f.would_recommend ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {f.would_recommend ? t("platformReporting.recommends") : t("platformReporting.doesNotRecommend")}
                        </Badge>
                      )}
                      {f.follow_up_required && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-300 text-amber-700"
                        >
                          {t("platformReporting.followUpNeeded")}
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
                {t("platformReporting.totalWarehouses")}
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {warehouses.platformAggregates.totalWarehouses}
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("platformReporting.avgUtilization")}
              </span>
              <div className="text-xl font-bold tabular-nums text-info">
                {warehouses.platformAggregates.avgUtilizationPercent}%
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("platformReporting.activeSilos")}
              </span>
              <div className="text-xl font-bold tabular-nums text-foreground">
                {warehouses.platformAggregates.totalActiveSilos}
              </div>
            </div>
            <div className="bg-background px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("platformReporting.incidents")}
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-warning">
                {warehouses.platformAggregates.totalQualityIncidents}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <AdminDataCard
              title={t("platformReporting.topUtilizedTitle")}
              description={t("platformReporting.topUtilizedDesc")}
            >
              {loadingWarehouses ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ) : warehouses.insights.topUtilized.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">{t("commonLabels.noData")}</p>
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
                          {t("platformReporting.silosCapacity", {
                            count: w.active_silos,
                            tons: (w.total_capacity_kg / 1000).toFixed(1),
                          })}
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
              title={t("platformReporting.warehousesWithIssues")}
              description={t("platformReporting.withIssuesDesc")}
            >
              {warehouses.insights.withIssues.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">{t("platformReporting.noIssuesReported")}</p>
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
                              {t("platformReporting.alertsCount", { count: w.recent_alerts })}
                            </Badge>
                          )}
                          {w.quality_incidents > 0 && (
                            <Badge variant="outline" className="border-red-300 text-red-700">
                              {t("platformReporting.incidentsCount", { count: w.quality_incidents })}
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
            title={t("platformReporting.techPerformance")}
            description={t("platformReporting.techPerformanceDesc")}
          >
            {loadingTech ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ) : technicians.technicians.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">{t("platformReporting.noTechniciansYet")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left rtl:text-right px-4 py-2 font-medium">{t("install.technician")}</th>
                    <th className="text-center px-2 py-2 font-medium">{t("common.status")}</th>
                    <th className="text-center px-2 py-2 font-medium">{t("platformReporting.installations")}</th>
                    <th className="text-center px-2 py-2 font-medium">{t("install.completed")}</th>
                    <th className="text-center px-2 py-2 font-medium">{t("platformReporting.avgRating")}</th>
                    <th className="text-left rtl:text-right px-2 py-2 font-medium">{t("grainOps.warehouses")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicians.technicians.map((tech: any) => (
                    <tr key={tech.technician_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{tech.technician_name}</div>
                        <div className="text-xs text-slate-500">{tech.technician_email}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            tech.technician_status === "available"
                              ? "border-emerald-300 text-emerald-700"
                              : tech.technician_status === "busy"
                                ? "border-amber-300 text-amber-700"
                                : "border-slate-300 text-slate-600"
                          }
                        >
                          {tech.technician_status === "available"
                            ? t("silos.active")
                            : tech.technician_status === "busy"
                              ? t("install.busy")
                              : tech.technician_status || "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-center font-medium">
                        {tech.total_installations || 0}
                      </td>
                      <td className="px-2 py-3 text-center text-emerald-600 font-medium">
                        {tech.completed_installations || 0}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {tech.avg_technician_rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium">
                              {tech.avg_technician_rating.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-600">
                        {tech.assigned_warehouses || 0} {t("platformReporting.assigned")}
                        {tech.service_cities?.length > 0 && (
                          <div className="text-slate-400 mt-0.5">
                            {tech.service_cities.slice(0, 2).join(", ")}
                            {tech.service_cities.length > 2 && ` +${tech.service_cities.length - 2}`}
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
            title={t("platformReporting.incidentTicketsTitle")}
            description={t("platformReporting.incidentTicketsDescription")}
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
                    ? `${t("platformReporting.all")} (${allTickets.length})`
                    : `${t(`platformReporting.${s}`)} (${allTickets.filter((t) => t.status === s).length})`}
                </button>
              ))}
            </div>

            {loadingTickets ? (
              <p className="p-6 text-sm text-slate-500">{t("platformReporting.loadingTickets")}</p>
            ) : filteredTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                {allTickets.length === 0
                  ? t("platformReporting.noTickets")
                  : t("platformReporting.noStatusTickets", {
                      status: t(`platformReporting.${ticketStatusFilter}`),
                    })}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full text-left rtl:text-right p-4 hover:bg-slate-50 transition-colors"
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
                            {t(`platformReporting.${ticket.priority}`)}
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
                            {t(`platformReporting.${ticket.status}`)}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mb-1">
                          <span className="font-medium">{ticket.reporter_name}</span>
                          <span className="mx-1 opacity-50">·</span>
                          <span className="capitalize">{ticket.reporter_role}</span>
                          {(ticket.admin_name || ticket.admin_email) && (
                            <>
                              <span className="mx-1 opacity-50">·</span>
                              <span>
                                {t("platformReporting.fromLabel")}: {ticket.admin_name ?? ticket.admin_email}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                        {ticket.resolved_note && (
                          <p className="text-xs text-emerald-600 mt-1 line-clamp-1">
                            {t("platformReporting.resolution")}: {ticket.resolved_note}
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
                            {t("platformReporting.closed")} {new Date(ticket.closed_at).toLocaleDateString()}
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
                            title={t("platformReporting.deleteTicket")}
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("common.delete")}
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
