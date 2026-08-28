import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, X, FileText } from "lucide-react";
import { listActivityLogs } from "@/lib/notifications-audit.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { AdminDetailPanel, DetailField } from "@/components/app/admin/AdminDetailPanel";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/activity-logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — Grain Hero" },
      {
        name: "description",
        content: "Activity Logs workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Activity Logs — Grain Hero" },
      {
        property: "og:description",
        content: "Activity Logs workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivityLogsPage,
});

type Log = Awaited<ReturnType<typeof listActivityLogs>>["logs"][number];

// Category ids map to dictionary keys so labels follow the active language.
const CATEGORY_KEY: Record<string, string> = {
  batch: "batch",
  spoilage: "spoilage",
  buyer: "buyer",
  dispatch: "dispatch",
  payment: "payment",
  insurance: "insurance",
  invoice: "invoice",
  report: "report",
  system: "system",
};
const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 border-blue-300",
  warning: "bg-amber-100 text-amber-700 border-amber-300",
  critical: "bg-red-100 text-red-700 border-red-300",
};
const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  warning: "bg-amber-400",
  critical: "bg-red-500",
};

function fmtAbs(s: string) {
  return new Date(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function useFmtRel() {
  const { t } = useTranslation();
  return (s: string) => {
    const d = (Date.now() - new Date(s).getTime()) / 1000;
    if (d < 60) return t("activityLogs.justNow");
    if (d < 3600) return t("activityLogs.minutesAgo", { count: Math.floor(d / 60) });
    if (d < 86400) return t("activityLogs.hoursAgo", { count: Math.floor(d / 3600) });
    if (d < 604800) return t("activityLogs.daysAgo", { count: Math.floor(d / 86400) });
    return fmtAbs(s);
  };
}

function ActivityLogsPage() {
  const { t } = useTranslation();
  const fmtRel = useFmtRel();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorRole, setActorRole] = useState("all");
  const [selected, setSelected] = useState<Log | null>(null);

  const fetchLogs = useServerFn(listActivityLogs);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      "activity-logs",
      page,
      search,
      category,
      severity,
      from,
      to,
      entityFilter,
      actorRole,
    ],
    queryFn: () =>
      fetchLogs({
        data: {
          page,
          limit: 20,
          search: search || null,
          category: category === "all" ? null : category,
          severity: severity === "all" ? null : severity,
          from: from || null,
          to: to || null,
          entity_ref: entityFilter || null,
          actor_role: actorRole === "all" ? null : actorRole,
        },
      }),
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination ?? {
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20,
  };
  const catCounts = data?.summary.categories ?? {};
  const callerRole = data?.caller_role ?? "admin";
  const isSuper = callerRole === "super_admin";
  const total = Object.values(catCounts).reduce((s, n) => s + n, 0);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const activityLogExportColumns: ExportColumn<Log>[] = [
    { header: t("activityLogs.timestamp"), value: (l) => new Date(l.created_at).toISOString() },
    { header: t("activityLogs.action"), value: (l) => l.action },
    { header: t("activityLogs.category"), value: (l) => l.category },
    { header: t("activityLogs.severity"), value: (l) => l.severity },
    { header: t("common.name"), value: (l) => l.user_name ?? t("activityLogs.systemUser") },
    { header: t("activityLogs.actorRole"), value: (l) => l.user_role ?? "" },
    { header: t("activityLogs.entity"), value: (l) => l.entity_ref ?? "" },
    { header: t("activityLogs.description"), value: (l) => l.description ?? "" },
  ];

  const scopeText = isSuper
    ? t("activityLogs.scopeSuper")
    : callerRole === "admin"
      ? t("activityLogs.scopeAdmin")
      : t("activityLogs.scopeSelf");

  const tiles = [
    { key: "all", label: t("activityLogs.allEvents"), value: total },
    { key: "batch", label: t("activityLogs.batch"), value: catCounts.batch ?? 0 },
    { key: "spoilage", label: t("activityLogs.spoilage"), value: catCounts.spoilage ?? 0 },
    { key: "buyer", label: t("activityLogs.buyer"), value: catCounts.buyer ?? 0 },
    { key: "dispatch", label: t("activityLogs.dispatch"), value: catCounts.dispatch ?? 0 },
  ];

  return (
    <AdminPageShell
      title={t("activityLogs.title")}
      subtitle={scopeText}
      actions={
        <>
          <ExportMenu
            filename="activity-logs"
            title={t("activityLogs.title")}
            rows={logs}
            columns={activityLogExportColumns}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> {t("activityLogs.refresh")}
          </Button>
        </>
      }
    >
      <AdminSummaryTiles
        tiles={tiles}
        active={category === "all" ? "all" : category}
        onSelect={(k) => {
          setCategory(k);
          setPage(1);
        }}
        columns={5}
      />

      <AdminFilterBar onSubmit={applySearch}>
        <AdminFilterField label={t("activityLogs.search")} width="flex-1 min-w-[200px]">
          <Input
            placeholder={t("activityLogs.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </AdminFilterField>
        <AdminFilterField label={t("activityLogs.category")}>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("activityLogs.allCategories")}</SelectItem>
              {Object.entries(CATEGORY_KEY).map(([k]) => (
                <SelectItem key={k} value={k}>
                  {t(`activityLogs.${CATEGORY_KEY[k]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AdminFilterField>
        <AdminFilterField label={t("activityLogs.severity")} width="w-36">
          <Select
            value={severity}
            onValueChange={(v) => {
              setSeverity(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("activityLogs.allSeverity")}</SelectItem>
              <SelectItem value="info">{t("activityLogs.info")}</SelectItem>
              <SelectItem value="warning">{t("activityLogs.warning")}</SelectItem>
              <SelectItem value="critical">{t("activityLogs.critical")}</SelectItem>
            </SelectContent>
          </Select>
        </AdminFilterField>
        {isSuper && (
          <AdminFilterField label={t("activityLogs.actorRole")} width="w-40">
            <Select
              value={actorRole}
              onValueChange={(v) => {
                setActorRole(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("activityLogs.allRoles")}</SelectItem>
                <SelectItem value="admin">{t("activityLogs.admin")}</SelectItem>
                <SelectItem value="super_admin">{t("activityLogs.superAdmin")}</SelectItem>
              </SelectContent>
            </Select>
          </AdminFilterField>
        )}
        <AdminFilterField label={t("activityLogs.from")}>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </AdminFilterField>
        <AdminFilterField label={t("activityLogs.to")}>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </AdminFilterField>
      </AdminFilterBar>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AdminDataCard
            title={t("activityLogs.eventTimeline")}
            description={
              <span className="flex flex-wrap items-center gap-2">
                {t("activityLogs.showingEvents", { showing: logs.length, total: pagination.total_items })}
                {entityFilter && (
                  <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    {entityFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setEntityFilter("")} />
                  </span>
                )}
              </span>
            }
            page={page}
            totalPages={pagination.total_pages}
            onPageChange={setPage}
          >
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={8} cols={4} />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="h-12 w-12 mb-3" />
                <p className="text-lg font-medium">{t("activityLogs.noActivityFound")}</p>
                <p className="text-sm mt-1">{t("activityLogs.logsWillAppear")}</p>
              </div>
            ) : (
              <div className="relative pl-8 pr-4 py-4 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-slate-300 before:to-slate-100 space-y-4">
                {logs.map((log) => {
                  const isSel = selected?.id === log.id;
                  let node = "bg-blue-400 border-blue-100";
                  if (log.severity === "critical") node = "bg-red-500 border-red-100";
                  else if (log.severity === "warning") node = "bg-amber-400 border-amber-100";
                  return (
                    <div
                      key={log.id}
                      className={`relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSel ? "bg-slate-50 ring-1 ring-slate-200" : "hover:bg-slate-50/60"}`}
                      onClick={() => setSelected(log)}
                    >
                      <div
                        className={`absolute -left-5 top-4 w-3 h-3 rounded-full border-2 ${node} z-10 shadow-sm`}
                      />
                      <div className="flex items-center gap-2 mt-1 flex-wrap flex-1">
                        <span className="text-xs font-medium text-slate-700">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${SEVERITY_STYLE[log.severity] ?? ""}`}
                        >
                          {log.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                          {CATEGORY_KEY[log.category]
                            ? t(`activityLogs.${CATEGORY_KEY[log.category]}`)
                            : log.category}
                        </Badge>
                        {log.entity_ref && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntityFilter(log.entity_ref!);
                              setPage(1);
                            }}
                          >
                            {log.entity_ref}
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {log.user_name ?? t("activityLogs.systemUser")} · {log.user_role ?? "—"} ·{" "}
                          {fmtRel(log.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminDataCard>
        </div>

        <AdminDetailPanel
          title={t("activityLogs.eventDetails")}
          isEmpty={!selected}
          emptyText={t("activityLogs.selectEvent")}
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label={t("activityLogs.action")}>
                <p className="text-sm font-medium text-slate-900">
                  {selected.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              </DetailField>
              <DetailField label={t("activityLogs.description")}>{selected.description}</DetailField>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label={t("activityLogs.category")}>
                  <Badge variant="outline" className="text-slate-600">
                    {CATEGORY_KEY[selected.category]
                      ? t(`activityLogs.${CATEGORY_KEY[selected.category]}`)
                      : selected.category}
                  </Badge>
                </DetailField>
                <DetailField label={t("activityLogs.severity")}>
                  <Badge variant="outline" className={SEVERITY_STYLE[selected.severity] ?? ""}>
                    {selected.severity}
                  </Badge>
                </DetailField>
              </div>
              {selected.entity_ref && (
                <DetailField label={t("activityLogs.entity")}>
                  <span className="text-slate-500">{selected.entity_type ?? "—"}:</span>{" "}
                  <span className="font-mono font-medium">{selected.entity_ref}</span>
                </DetailField>
              )}
              <DetailField label={t("activityLogs.performedBy")}>
                {selected.user_name ?? t("activityLogs.systemUser")}{" "}
                <span className="text-slate-400">({selected.user_role ?? "—"})</span>
              </DetailField>
              <DetailField label={t("activityLogs.timestamp")}>{fmtAbs(selected.created_at)}</DetailField>
              {selected.metadata &&
                typeof selected.metadata === "object" &&
                Object.keys(selected.metadata as object).length > 0 && (
                  <DetailField label={t("activityLogs.details")}>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      {Object.entries(selected.metadata as Record<string, unknown>).map(
                        ([k, v]) => (
                          <div key={k} className="flex justify-between text-xs gap-2">
                            <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                            <span className="text-slate-800 font-medium truncate">{String(v)}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </DetailField>
                )}
            </div>
          )}
        </AdminDetailPanel>
      </div>
    </AdminPageShell>
  );
}
