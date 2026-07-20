import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, History } from "lucide-react";
import { transitionBatch, getAllowedTransitions, listBatchEvents } from "@/lib/grain-batch-lifecycle.functions";

export function BatchLifecycleActions({ batchId, batchLabel }: { batchId: string; batchLabel: string }) {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toState, setToState] = useState<string>("");
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const getAllowed = useServerFn(getAllowedTransitions);
  const transition = useServerFn(transitionBatch);
  const listEvents = useServerFn(listBatchEvents);

  const allowed = useQuery({
    queryKey: ["batch-allowed", batchId],
    queryFn: () => getAllowed({ data: { batchId } }),
    enabled: open,
  });
  const events = useQuery({
    queryKey: ["batch-events", batchId],
    queryFn: () => listEvents({ data: { batchId } }),
    enabled: historyOpen,
  });

  const doTransition = useMutation({
    mutationFn: () => transition({ data: { batchId, toState: toState as never, note: note || undefined } }),
    onSuccess: () => {
      toast.success(`Batch → ${toState}`);
      setOpen(false); setNote(""); setToState("");
      qc.invalidateQueries({ queryKey: ["silo-cockpit"] });
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["batch-events", batchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const next = ((allowed.data as { next?: string[] } | undefined)?.next) ?? [];
  const from = ((allowed.data as { from?: string } | undefined)?.from) ?? "";

  return (
    <>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <ArrowRight className="h-3.5 w-3.5 mr-1" /> Transition
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setHistoryOpen(true)} title="History">
          <History className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transition {batchLabel}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">Current state: <span className="font-medium capitalize">{from || "…"}</span></div>
            <div className="space-y-1">
              <Label>Next state</Label>
              <Select value={toState} onValueChange={setToState}>
                <SelectTrigger><SelectValue placeholder={next.length ? "Select" : "No transitions"} /></SelectTrigger>
                <SelectContent>
                  {next.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => doTransition.mutate()} disabled={!toState || doTransition.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {doTransition.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Timeline — {batchLabel}</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {(((events.data as { events?: Array<Record<string, unknown>> } | undefined)?.events) ?? []).map((e) => {
              const ev = e as Record<string, unknown>;
              return (
                <div key={ev.id as string} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium">{String(ev.from_state)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="capitalize font-medium">{String(ev.to_state)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(ev.created_at as string).toLocaleString()}</span>
                  </div>
                  {ev.note ? <div className="text-xs text-muted-foreground mt-1">{String(ev.note)}</div> : null}
                </div>
              );
            })}
            {events.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
