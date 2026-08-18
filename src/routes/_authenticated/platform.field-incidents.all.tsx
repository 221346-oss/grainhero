import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listMobileFieldIncidents } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import {
  IncidentTabNav, SearchCombobox, FilterChips, IncidentCard, DetailPanel,
  safeRows, extractTargetRole, isIncomingIncident,
  type IncidentRow,
  STATUS_COLOR,
  SEVERITY_COLOR,
} from "@/components/app/incidents/IncidentShared";

export const Route = createFileRoute("/_authenticated/platform/field-incidents/all")({
  head: () => ({ meta: [{ title: "Platform · All Incidents — Grain Hero" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AllIncidentsPage,
});

function AllIncidentsPage() {
  const loadFn = useServerFn(listMobileFieldIncidents);
  const { data, isLoading } = useQuery({ queryKey: ["mobile-field-incidents"], queryFn: () => loadFn() });

  const [active,         setActive]         = useState<IncidentRow | null>(null);
  const [search,         setSearch]         = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [roleFilter,     setRoleFilter]     = useState("all");
  const [newTicketOpen,  setNewTicketOpen]  = useState(false);

  const allRows = useMemo(() => safeRows(data), [data]);

  const existingTitles = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.category).filter(Boolean))),
    [allRows],
  );

  const filtered = useMemo(() => allRows.filter((r) => {
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (roleFilter !== "all" && extractTargetRole(r) !== roleFilter) return false;
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      if (!r.category?.toLowerCase().includes(t) && !r.notes?.toLowerCase().includes(t)) return false;
    }
    return true;
  }), [allRows, severityFilter, statusFilter, roleFilter, search]);

  const splitView = !!active;

  return (
    <AdminPageShell title="Field incidents" subtitle="Complete overview of all incidents across all statuses.">
      <IncidentTabNav 
        counts={{ 
          all: allRows.length,
          active: allRows.filter((r) => r.status === "open" || r.status === "investigating").length,
          resolved: allRows.filter((r) => r.status === "resolved").length,
          dismissed: allRows.filter((r) => r.status === "dismissed").length,
          incoming: allRows.filter(isIncomingIncident).length,
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchCombobox value={search} onChange={setSearch} existingTitles={existingTitles} />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"          className="text-xs">All statuses</SelectItem>
            <SelectItem value="open"         className="text-xs">Open</SelectItem>
            <SelectItem value="investigating" className="text-xs">Investigating</SelectItem>
            <SelectItem value="resolved"     className="text-xs">Resolved</SelectItem>
            <SelectItem value="dismissed"    className="text-xs">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"      className="text-xs">All severities</SelectItem>
            <SelectItem value="critical" className="text-xs"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Critical</span></SelectItem>
            <SelectItem value="medium"   className="text-xs"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />Medium</span></SelectItem>
            <SelectItem value="low"      className="text-xs"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Low</span></SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <SelectValue placeholder="Recipient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"        className="text-xs">All recipients</SelectItem>
            <SelectItem value="admin"      className="text-xs">→ Admin</SelectItem>
            <SelectItem value="technician" className="text-xs">→ Technician</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setNewTicketOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Button>
        </div>
      </div>

      <FilterChips
        search={search} 
        severity={severityFilter} 
        role={roleFilter}
        onClearSearch={() => setSearch("")}
        onClearSeverity={() => setSeverityFilter("all")}
        onClearRole={() => setRoleFilter("all")}
        onClearAll={() => { setSearch(""); setSeverityFilter("all"); setStatusFilter("all"); setRoleFilter("all"); }}
      />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {allRows.length === 0 ? "No incidents reported yet." : "No incidents match your filters."}
        </CardContent></Card>
      ) : (
        <div className={splitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "space-y-2"}>
          <div className="space-y-2">
            {filtered.map((r) => (
              <IncidentCard
                key={r.id}
                row={r}
                isSelected={active?.id === r.id}
                onClick={() => active?.id === r.id ? setActive(null) : setActive(r)}
                extra={
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLOR[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </Badge>
                    <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLOR[r.severity] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.severity}
                    </Badge>
                  </div>
                }
              />
            ))}
          </div>

          {splitView && active && (
            <DetailPanel row={active} onClose={() => setActive(null)} />
          )}
        </div>
      )}

      <ReportTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} extraInvalidate={[["mobile-field-incidents"]]} />
    </AdminPageShell>
  );
}
