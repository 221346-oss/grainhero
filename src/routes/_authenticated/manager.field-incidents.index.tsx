import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { listMobileFieldIncidents, resolveFieldIncident } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X, CheckCircle2, MessageSquare, SlidersHorizontal } from "lucide-react";
import { TicketDiscussionDialog, type TicketItem } from "@/components/app/TicketDiscussionDialog";
import { ReportTicketDialog } from "@/components/app/ReportTicketDialog";
import {
  IncidentTabNav, SearchCombobox, FilterChips, IncidentCard, DetailPanel,
  safeRows, extractTargetRole, extractReporterRole, isIncomingIncident,
  type IncidentRow,
} from "@/components/app/incidents/IncidentShared";

export const Route = createFileRoute("/_authenticated/manager/field-incidents/")({
  head: () => ({ meta: [{ title: "Manager · Field Incidents — Grain Hero" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: FieldIncidentsPage,
});

function FieldIncidentsPage() {
  const loadFn    = useServerFn(listMobileFieldIncidents);
  const resolveFn = useServerFn(resolveFieldIncident);
  const qc        = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["mobile-field-incidents"], queryFn: () => loadFn() });

  const [active,         setActive]         = useState<IncidentRow | null>(null);
  const [note,           setNote]           = useState("");
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<TicketItem | null>(null);
  const [newTicketOpen,  setNewTicketOpen]  = useState(false);
  const [search,         setSearch]         = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [roleFilter,     setRoleFilter]     = useState("all");

  const allRows      = useMemo(() => safeRows(data), [data]);
  const activeRows   = useMemo(() => allRows.filter((r) => r.status === "open" || r.status === "investigating"), [allRows]);
  const resolvedCount  = useMemo(() => allRows.filter((r) => r.status === "resolved").length, [allRows]);
  const dismissedCount = useMemo(() => allRows.filter((r) => r.status === "dismissed").length, [allRows]);
  const incomingCount  = useMemo(() => allRows.filter(isIncomingIncident).length, [allRows]);

  const existingTitles = useMemo(
    () => Array.from(new Set(activeRows.map((r) => r.category).filter(Boolean))),
    [activeRows],
  );

  const filtered = useMemo(() => activeRows.filter((r) => {
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    if (roleFilter !== "all" && extractTargetRole(r) !== roleFilter) return false;
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      if (!r.category?.toLowerCase().includes(t) && !r.notes?.toLowerCase().includes(t)) return false;
    }
    return true;
  }), [activeRows, severityFilter, roleFilter, search]);

  const mut = useMutation({
    mutationFn: (p: { id: string; status: "resolved" | "dismissed" }) =>
      resolveFn({ data: { id: p.id, status: p.status, resolution_notes: note } }),
    onSuccess: () => {
      toast.success("Incident updated");
      setActive(null); setNote("");
      qc.invalidateQueries({ queryKey: ["mobile-field-incidents"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const splitView = !!active;

  return (
    <AdminPageShell title="Field incidents" subtitle="Active incidents requiring your attention — open or under investigation.">
      <IncidentTabNav 
        counts={{ 
          all: allRows.length,
          active: activeRows.length, 
          resolved: resolvedCount, 
          dismissed: dismissedCount, 
          incoming: incomingCount 
        }}
        basePath="/manager/field-incidents"
      />

      {/* Toolbar */}
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
          {activeRows.length === 0 ? "No active incidents." : "No incidents match your filters."}
        </CardContent></Card>
      ) : (
        <div className={splitView ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "space-y-2"}>
          <div className="space-y-2">
            {filtered.map((r) => (
              <IncidentCard
                key={r.id}
                row={r}
                isSelected={active?.id === r.id}
                onClick={() => active?.id === r.id ? (setActive(null), setNote("")) : (setActive(r), setNote(""))}
              />
            ))}
          </div>

          {splitView && active && (
            <DetailPanel row={active} onClose={() => { setActive(null); setNote(""); }}>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution notes</p>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add resolution details…" className="text-xs resize-none" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => mut.mutate({ id: active.id, status: "resolved" })} disabled={mut.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                </Button>
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: active.id, status: "dismissed" })} disabled={mut.isPending}>
                  <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-100 ml-auto"
                  onClick={() => { setActiveDiscussion(active); setDiscussionOpen(true); }}>
                  <MessageSquare className="h-3.5 w-3.5" /> Discussion
                </Button>
              </div>
            </DetailPanel>
          )}
        </div>
      )}

      <TicketDiscussionDialog open={discussionOpen} onOpenChange={setDiscussionOpen} incident={activeDiscussion} />
      <ReportTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} extraInvalidate={[["mobile-field-incidents"]]} />
    </AdminPageShell>
  );
}
