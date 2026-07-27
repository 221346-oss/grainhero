import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listFieldIncidents, resolveFieldIncident } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare } from "lucide-react";
import { TicketDiscussionDialog, type TicketItem } from "@/components/app/TicketDiscussionDialog";

export const Route = createFileRoute("/_authenticated/platform/field-incidents")({
  component: FieldIncidentsPage,
});

type Row = {
  id: string; category: string; severity: string; status: string;
  notes: string | null; created_at: string; silo_id: string | null;
  reporter_user_id: string;
};

function FieldIncidentsPage() {
  const load = useServerFn(listFieldIncidents);
  const resolve = useServerFn(resolveFieldIncident);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["field-incidents"], queryFn: () => load() });
  const [active, setActive] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [activeDiscussionTicket, setActiveDiscussionTicket] = useState<TicketItem | null>(null);

  const mut = useMutation({
    mutationFn: (payload: { id: string; status: "resolved" | "dismissed" }) =>
      resolve({ data: { id: payload.id, status: payload.status, resolution_notes: note } }),
    onSuccess: () => {
      toast.success("Incident updated");
      setActive(null); setNote("");
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = (data ?? []) as Row[];

  return (
    <AdminPageShell
      title="Field incidents"
      subtitle="Moderation queue for technician-reported incidents from the mobile app."
    >
      <div className="grid gap-2">
        {rows.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No incidents reported.</CardContent></Card>
        )}
        {rows.map((r) => (
          <button key={r.id} onClick={() => setActive(r)} className="text-left">
            <Card className="hover:border-emerald-500/50 transition-colors">
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.category}</span>
                    <Badge variant="outline">{r.severity}</Badge>
                    <Badge variant="secondary">{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{r.notes ?? "—"}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleString()}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setNote(""); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{active?.category ?? "Incident"}</SheetTitle></SheetHeader>
          {active && (
            <div className="space-y-4 mt-4 text-sm">
              <div className="flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{active.severity}</Badge>
                  <Badge variant="secondary">{active.status}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100"
                  onClick={() => {
                    setActiveDiscussionTicket(active);
                    setDiscussionOpen(true);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Discussion Thread
                </Button>
              </div>
              <div><div className="text-xs text-muted-foreground mb-1">Notes</div><div className="whitespace-pre-wrap">{active.notes ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground mb-1">Reporter</div><div className="font-mono text-xs">{active.reporter_user_id}</div></div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Resolution notes</div>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => mut.mutate({ id: active.id, status: "resolved" })} disabled={mut.isPending}>Resolve</Button>
                <Button variant="outline" onClick={() => mut.mutate({ id: active.id, status: "dismissed" })} disabled={mut.isPending}>Dismiss</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <TicketDiscussionDialog
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
        incident={activeDiscussionTicket}
      />
    </AdminPageShell>
  );
}