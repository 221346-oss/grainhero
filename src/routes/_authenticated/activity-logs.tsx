import { DashboardSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, Clock,
  Package, AlertTriangle, Users, Truck, DollarSign, Shield, FileText, BarChart3,
  Settings, Eye, Info, AlertCircle, XCircle, X,
} from "lucide-react";
import { listActivityLogs } from "@/lib/notifications-audit.functions";

export const Route = createFileRoute("/_authenticated/activity-logs")({
  component: ActivityLogsPage,
});

type Log = Awaited<ReturnType<typeof listActivityLogs>>["logs"][number];

const CATEGORY: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  batch: { label: "Batch", icon: <Package className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  spoilage: { label: "Spoilage", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  buyer: { label: "Buyer", icon: <Users className="h-4 w-4" />, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  dispatch: { label: "Dispatch", icon: <Truck className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  payment: { label: "Payment", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  insurance: { label: "Insurance", icon: <Shield className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  invoice: { label: "Invoice", icon: <FileText className="h-4 w-4" />, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  report: { label: "Report", icon: <BarChart3 className="h-4 w-4" />, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  system: { label: "System", icon: <Settings className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

const SEVERITY: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700 border-blue-300", icon: <Info className="h-3 w-3" /> },
  warning: { label: "Warning", color: "bg-amber-100 text-amber-700 border-amber-300", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-300", icon: <XCircle className="h-3 w-3" /> },
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
  const [selected, setSelected] = useState<Log | null>(null);

  const fetchLogs = useServerFn(listActivityLogs);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["activity-logs", page, search, category, severity, from, to, entityFilter],
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
        },
      }),
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination ?? { current_page: 1, total_pages: 1, total_items: 0, items_per_page: 20 };
  const catCounts = data?.summary.categories ?? {};
  const total = Object.values(catCounts).reduce((s, n) => s + n, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const exportCSV = () => {
    if (!logs.length) return toast.error("No logs to export");
    const header = ["Timestamp", "Action", "Category", "Severity", "User", "Role", "Entity", "Description"];
    const rows = logs.map((l) => [
      new Date(l.created_at).toISOString(),
      l.action, l.category, l.severity,
      l.user_name ?? "System", l.user_role ?? "",
      l.entity_ref ?? "", (l.description ?? "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Activity Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Complete audit trail of all system activities</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${category === "all" ? "ring-2 ring-emerald-400 shadow-md" : ""}`}
          onClick={() => { setCategory("all"); setPage(1); }}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span className="text-2xl font-bold text-slate-900">{total}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">All Events</p>
          </CardContent>
        </Card>
        {Object.entries(CATEGORY).slice(0, 4).map(([key, cfg]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all hover:shadow-md ${category === key ? "ring-2 ring-emerald-400 shadow-md" : ""}`}
            onClick={() => { setCategory(category === key ? "all" : key); setPage(1); }}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className={cfg.color}>{cfg.icon}</span>
                <span className="text-2xl font-bold text-slate-900">{catCounts[key] ?? 0}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{cfg.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search description, action, or ref…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Severity</label>
              <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="text-lg">Event Timeline</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  Showing {logs.length} of {pagination.total_items} events
                  {entityFilter && (
                    <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      {entityFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setEntityFilter("")} />
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <DashboardSkeleton />
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">No activity logs found</p>
                  <p className="text-sm mt-1">Logs will appear as actions are performed</p>
                </div>
              ) : (
                <div className="relative pl-8 pr-4 py-4 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-slate-300 before:to-slate-100 space-y-4">
                  {logs.map((log) => {
                    const cc = CATEGORY[log.category] ?? CATEGORY.system;
                    const sc = SEVERITY[log.severity] ?? SEVERITY.info;
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
                        <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded border ${cc.bg}`}>
                          <span className={cc.color}>{cc.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 leading-snug">{log.description}</p>
                            <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtRel(log.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.color}`}>
                              {sc.icon}<span className="ml-0.5">{sc.label}</span>
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">{cc.label}</Badge>
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
                              by {log.user_name ?? "System"} ({log.user_role ?? "—"})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
                  <p className="text-sm text-slate-500">Page {pagination.current_page} of {pagination.total_pages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page === pagination.total_pages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-slate-400" /> Event Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Action</h4>
                    <p className="text-sm font-medium text-slate-900">
                      {selected.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                    <p className="text-sm text-slate-700">{selected.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</h4>
                      <Badge variant="outline" className={CATEGORY[selected.category]?.bg ?? ""}>
                        {CATEGORY[selected.category]?.label ?? selected.category}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Severity</h4>
                      <Badge variant="outline" className={SEVERITY[selected.severity]?.color ?? ""}>
                        {SEVERITY[selected.severity]?.label ?? selected.severity}
                      </Badge>
                    </div>
                  </div>
                  {selected.entity_ref && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entity</h4>
                      <p className="text-sm text-slate-700">
                        <span className="text-slate-500">{selected.entity_type ?? "—"}:</span>{" "}
                        <span className="font-mono font-medium">{selected.entity_ref}</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Performed By</h4>
                    <p className="text-sm text-slate-700">
                      {selected.user_name ?? "System"} <span className="text-slate-400">({selected.user_role ?? "—"})</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Timestamp</h4>
                    <p className="text-sm text-slate-700">{fmtAbs(selected.created_at)}</p>
                  </div>
                  {selected.metadata && typeof selected.metadata === "object" && Object.keys(selected.metadata as object).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Details</h4>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                        {Object.entries(selected.metadata as Record<string, unknown>).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs gap-2">
                            <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                            <span className="text-slate-800 font-medium truncate">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Eye className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Select an event to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}