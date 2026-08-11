import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, X, FileText } from "lucide-react";
import { listActivityLogs } from "@/lib/notifications-audit.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { AdminDetailPanel, DetailField } from "@/components/app/admin/AdminDetailPanel";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";

export const Route = createFileRoute("/_authenticated/activity-logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs — Grain Hero" },
      { name: "description", content: "Activity Logs workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Activity Logs — Grain Hero" },
      { property: "og:description", content: "Activity Logs workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivityLogsPage,
});

type Log = Awaited<ReturnType<typeof listActivityLogs>>["logs"][number];

const CATEGORY_LABEL: Record<string, string> = {
  batch: "Batch", spoilage: "Spoilage", buyer: "Buyer", dispatch: "Dispatch",
  payment: "Payment", insurance: "Insurance", invoice: "Invoice", report: "Report",
  system: "System",
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
  return new Date(s).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtRel(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return fmtAbs(s);
}

function ActivityLogsPage() {
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
    queryKey: ["activity-logs", page, search, category, severity, from, to, entityFilter, actorRole],
    queryFn: () =>
      fetchLogs({
        data: {
          page, limit: 20,
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
  const pagination = data?.pagination ?? { current_page: 1, total_pages: 1, total_items: 0, items_per_page: 20 };
  const catCounts = data?.summary.categories ?? {};
  const callerRole = data?.caller_role ?? "admin";
  const isSuper = callerRole === "super_admin";
  const total = Object.values(catCounts).reduce((s, n) => s + n, 0);

  const applySearch = () => { setPage(1); setSearch(searchInput); };

  const activityLogExportColumns: ExportColumn<Log>[] = [
    { header: "Timestamp", value: (l) => new Date(l.created_at).toISOString() },
    { header: "Action", value: (l) => l.action },
    { header: "Category", value: (l) => l.category },
    { header: "Severity", value: (l) => l.severity },
    { header: "User", value: (l) => l.user_name ?? "System" },
    { header: "Role", value: (l) => l.user_role ?? "" },
    { header: "Entity", value: (l) => l.entity_ref ?? "" },
    { header: "Description", value: (l) => l.description ?? "" },
  ];

  const scopeText = isSuper
    ? "Own actions plus every admin across all tenants."
    : callerRole === "admin"
      ? "All actions performed by users in your tenant."
      : "Your own actions.";

  const tiles = [
    { key: "all", label: "All events", value: total },
    { key: "batch", label: "Batch", value: catCounts.batch ?? 0 },
    { key: "spoilage", label: "Spoilage", value: catCounts.spoilage ?? 0 },
    { key: "buyer", label: "Buyer", value: catCounts.buyer ?? 0 },
    { key: "dispatch", label: "Dispatch", value: catCounts.dispatch ?? 0 },
  ];

  return (
    <AdminPageShell
      title="Activity logs"
      subtitle={scopeText}
      actions={
        <>
          <ExportMenu filename="activity-logs" title="Activity Logs" rows={logs} columns={activityLogExportColumns} />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </>
      }
    >
      <AdminSummaryTiles
        tiles={tiles}
        active={category === "all" ? "all" : category}
        onSelect={(k) => { setCategory(k); setPage(1); }}
        columns={5}
      />

      <AdminFilterBar onSubmit={applySearch}>
        <AdminFilterField label="Search" width="flex-1 min-w-[200px]">
          <Input placeholder="Search description, action, or ref…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </AdminFilterField>
        <AdminFilterField label="Category">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </AdminFilterField>
        <AdminFilterField label="Severity" width="w-36">
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </AdminFilterField>
        {isSuper && (
          <AdminFilterField label="Actor role" width="w-40">
            <Select value={actorRole} onValueChange={(v) => { setActorRole(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </AdminFilterField>
        )}
        <AdminFilterField label="From">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </AdminFilterField>
        <AdminFilterField label="To">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </AdminFilterField>
      </AdminFilterBar>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AdminDataCard
            title="Event timeline"
            description={
              <span className="flex flex-wrap items-center gap-2">
                Showing {logs.length} of {pagination.total_items} events
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
              <div className="p-4"><TableSkeleton rows={8} cols={4} /></div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="h-12 w-12 mb-3" />
                <p className="text-lg font-medium">No activity logs found</p>
                <p className="text-sm mt-1">Logs will appear as actions are performed</p>
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
                        <div className={`absolute -left-5 top-4 w-3 h-3 rounded-full border-2 ${node} z-10 shadow-sm`} />
                        <div className="flex items-center gap-2 mt-1 flex-wrap flex-1">
                          <span className="text-xs font-medium text-slate-700">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SEVERITY_STYLE[log.severity] ?? ""}`}>
                            {log.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                            {CATEGORY_LABEL[log.category] ?? log.category}
                          </Badge>
                          {log.entity_ref && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-blue-100"
                              onClick={(e) => { e.stopPropagation(); setEntityFilter(log.entity_ref!); setPage(1); }}
                            >
                              {log.entity_ref}
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {log.user_name ?? "System"} · {log.user_role ?? "—"} · {fmtRel(log.created_at)}
                          </span>
                        </div>
                      </div>
                  );
                })}
              </div>
            )}
          </AdminDataCard>
        </div>

        <AdminDetailPanel title="Event details" isEmpty={!selected} emptyText="Select an event to view details">
          {selected && (
            <div className="space-y-4">
              <DetailField label="Action">
                <p className="text-sm font-medium text-slate-900">
                  {selected.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              </DetailField>
              <DetailField label="Description">{selected.description}</DetailField>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Category">
                  <Badge variant="outline" className="text-slate-600">
                    {CATEGORY_LABEL[selected.category] ?? selected.category}
                  </Badge>
                </DetailField>
                <DetailField label="Severity">
                  <Badge variant="outline" className={SEVERITY_STYLE[selected.severity] ?? ""}>
                    {selected.severity}
                  </Badge>
                </DetailField>
              </div>
              {selected.entity_ref && (
                <DetailField label="Entity">
                  <span className="text-slate-500">{selected.entity_type ?? "—"}:</span>{" "}
                  <span className="font-mono font-medium">{selected.entity_ref}</span>
                </DetailField>
              )}
              <DetailField label="Performed by">
                {selected.user_name ?? "System"}{" "}
                <span className="text-slate-400">({selected.user_role ?? "—"})</span>
              </DetailField>
              <DetailField label="Timestamp">{fmtAbs(selected.created_at)}</DetailField>
              {selected.metadata && typeof selected.metadata === "object" && Object.keys(selected.metadata as object).length > 0 && (
                <DetailField label="Details">
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                    {Object.entries(selected.metadata as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs gap-2">
                        <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                        <span className="text-slate-800 font-medium truncate">{String(v)}</span>
                      </div>
                    ))}
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