import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listFieldIncidents } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, Plus } from "lucide-react";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import {
  IncidentTabNav, SearchCombobox, FilterChips, IncidentCard, DetailPanel,
  safeRows, extractTargetRole, extractReporterRole, isIncomingIncident,
  type IncidentRow,
} from "@/components/app/incidents/IncidentShared";

export const Route = createFileRoute("/_authenticated/manager/field-incidents/resolved")({
  head: () => ({ meta: [{ title: "Manager · Resolved Incidents — Grain Hero" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ResolvedIncidentsPage,
});

function ResolvedIncidentsPage() {
  const loadFn = useServerFn(listFieldIncidents);
  const { data, isLoading } = useQuery({ queryKey: ["field-incidents"], queryFn: () => loadFn() });

  const [active,         setActive]         = useState<IncidentRow | null>(null);
  const [search,         setSearch]         = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [roleFilter,     setRoleFilter]     = useState("all");
  const [newTicketOpen,  setNewTicketOpen]  = useState(false);

  const allRows       = useMemo(() => safeRows(data), [data]);
  const resolvedRows  = useMemo(() => allRows.filter((r) => r.status === "resolved"), [allRows]);

  const existingTitles = useMemo(
    () => Array.from(new Set(resolvedRows.map((r) => r.category).filter(Boolean))),
    [resolvedRows],
  );

  const filtered = useMemo(() => resolvedRows.filter((r) => {
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    if (roleFilter !== "all" && extractTargetRole(r) !== roleFilter) return false;
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      if (!r.category?.toLowerCase().includes(t) && !r.notes?.toLowerCase().includes(t) && !r.resolution_notes?.toLowerCase().includes(t)) return false;
    }
    return true;
  }), [resolvedRows, severityFilter, roleFilter, search]);

  const splitView = !!active;

  return (
    <AdminPageShell title="Field incidents" subtitle="Incidents that have been successfully resolved.">
      <IncidentTabNav 
        counts={{
          all:       allRows.length,
          active:    allRows.filter((r) => r.status === "open" || r.status === "investigating").length,
          resolved:  resolvedRows.length,
          dismissed: allRows.filter((r) => r.status === "dismissed").length,
          incoming:  allRows.filter(isIncomingIncident).length,
        }}
        basePath="/manager/field-incidents"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchCombobox value={search} onChange={setSearch} existingTitles={existingTitles} />

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
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
        search={search} severity={severityFilter} role={roleFilter}
        onClearSearch={() => setSearch("")}
        onClearSeverity={() => setSeverityFilter("all")}
        onClearRole={() => setRoleFilter("all")}
        onClearAll={() => { setSearch(""); setSeverityFilter("all"); setRoleFilter("all"); }}
      />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {resolvedRows.length === 0 ? "No resolved incidents yet." : "No incidents match your filters."}
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
              />
            ))}
          </div>
          {splitView && active && (
            <DetailPanel row={active} onClose={() => setActive(null)} />
          )}
        </div>
      )}

      <ReportTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} extraInvalidate={[["field-incidents"]]} />
    </AdminPageShell>
  );
}
