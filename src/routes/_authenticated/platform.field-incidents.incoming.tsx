import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listFieldIncidents } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, User, Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import {
  IncidentTabNav, DetailPanel,
  safeRows, extractReporterName, extractReporterRole,
  type IncidentRow,
} from "@/components/app/incidents/IncidentShared";

export const Route = createFileRoute("/_authenticated/platform/field-incidents/incoming")({
  head: () => ({ meta: [{ title: "Platform · Incoming Incidents — Grain Hero" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: IncomingIncidentsPage,
});

type ReporterGroup = {
  key: string;          // normalised name key
  name: string;         // display name
  role: string | null;
  userId: string;
  incidents: IncidentRow[];
};

function groupByReporter(rows: IncidentRow[]): ReporterGroup[] {
  const map = new Map<string, ReporterGroup>();
  for (const r of rows) {
    const name   = extractReporterName(r) ?? "Unknown reporter";
    const role   = extractReporterRole(r);
    const key    = name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { key, name, role, userId: r.reporter_user_id, incidents: [] });
    }
    map.get(key)!.incidents.push(r);
  }
  return Array.from(map.values()).sort((a, b) => b.incidents.length - a.incidents.length);
}

const STATUS_DOT: Record<string, string> = {
  open:          "bg-blue-500",
  investigating: "bg-indigo-500",
  resolved:      "bg-emerald-500",
  dismissed:     "bg-slate-400",
};

function IncomingIncidentsPage() {
  const loadFn = useServerFn(listFieldIncidents);
  const { data, isLoading } = useQuery({ queryKey: ["field-incidents"], queryFn: () => loadFn() });

  const [active,        setActive]        = useState<IncidentRow | null>(null);
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("all"); // reporter role filter: all/manager/technician
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  const allRows = useMemo(() => safeRows(data), [data]);

  const incomingRows = allRows; // For super admin, all visible rows are incoming from tenants

  const groups = useMemo(() => {
    let src = incomingRows;
    if (roleFilter !== "all") {
      src = src.filter((r) => {
        const rr = extractReporterRole(r);
        return rr === roleFilter;
      });
    }
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      src = src.filter((r) =>
        r.category?.toLowerCase().includes(t) ||
        r.notes?.toLowerCase().includes(t) ||
        extractReporterName(r)?.toLowerCase().includes(t)
      );
    }
    return groupByReporter(src);
  }, [incomingRows, roleFilter, search]);

  const splitView = !!active;

  return (
    <AdminPageShell title="Field incidents" subtitle="All incidents reported by team members, grouped by reporter.">
      <IncidentTabNav counts={{
        all:       allRows.length,
        active:    allRows.filter((r) => r.status === "open" || r.status === "investigating").length,
        resolved:  allRows.filter((r) => r.status === "resolved").length,
        dismissed: allRows.filter((r) => r.status === "dismissed").length,
        incoming:  incomingRows.length,
      }} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or reporter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue placeholder="Reporter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"        className="text-xs">All reporters</SelectItem>
            <SelectItem value="manager"    className="text-xs">Manager</SelectItem>
            <SelectItem value="technician" className="text-xs">Technician</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setNewTicketOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : groups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {allRows.length === 0 ? "No incidents reported yet." : "No incidents match your filters."}
        </CardContent></Card>
      ) : (
        <div className={splitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "space-y-3"}>

          {/* Left: reporter groups */}
          <div className="space-y-3">
            {groups.map((g) => {
              const isExpanded = expandedGroup === g.key;
              return (
                <div key={g.key} className="rounded-xl border border-border overflow-hidden">
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : g.key)}
                    className="w-full flex items-center justify-between p-3.5 bg-card hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{g.name}</p>
                        {g.role && <p className="text-[10px] text-muted-foreground capitalize">{g.role}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                      {g.incidents.length} incident{g.incidents.length === 1 ? "" : "s"}
                    </span>
                  </button>

                  {/* Incident cards for this reporter */}
                  {isExpanded && (
                    <div className="divide-y divide-border border-t border-border bg-muted/10">
                      {g.incidents.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActive(active?.id === r.id ? null : r)}
                          className={`w-full text-left p-3 hover:bg-muted/40 transition-colors ${
                            active?.id === r.id ? "bg-muted/60 border-l-2 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[r.status] ?? "bg-slate-400"}`} />
                              <p className={`text-xs font-medium truncate ${active?.id === r.id ? "text-primary" : ""}`}>
                                {r.category}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-muted-foreground capitalize">{r.status}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {new Date(r.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: detail panel */}
          {splitView && active && (
            <DetailPanel row={active} onClose={() => setActive(null)} />
          )}
        </div>
      )}

      <ReportTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} extraInvalidate={[["field-incidents"]]} />
    </AdminPageShell>
  );
}
