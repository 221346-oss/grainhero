import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Loader2, Clock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listDispatches, approveDispatch, confirmDispatchBuyer, rejectDispatch } from "@/lib/dispatches.functions";

/**
 * Admin-only approve/reject queue for a silo's pending ("draft") dispatch
 * requests — the stock-effective moment (allocation + occupancy decrement)
 * happens on approve, not on request creation. See approveDispatch in
 * dispatches.functions.ts for why.
 */
export function DispatchApprovalPanel({ siloId, isAdmin }: { siloId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listDispatches);
  const approveFn = useServerFn(approveDispatch);
  const confirmBuyerFn = useServerFn(confirmDispatchBuyer);
  const rejectFn = useServerFn(rejectDispatch);

  const { data, isLoading } = useQuery({
    queryKey: ["silo-dispatch-drafts", siloId],
    queryFn: () => listFn({ data: { siloId, status: "draft", limit: 20 } }),
  });

  const drafts = (data?.dispatches ?? []) as Array<{
    id: string; dispatch_number: string; total_qty_kg: number; grain_type: string;
    price_per_kg: number; total_amount: number; buyers?: { name: string } | null;
    buyer_confirmed_at: string | null;
  }>;

  function invalidateAfterDecision() {
    qc.invalidateQueries({ queryKey: ["silo-dispatch-drafts", siloId] });
    qc.invalidateQueries({ queryKey: ["silos"] });
    qc.invalidateQueries({ queryKey: ["silo-dispatches", siloId] });
    qc.invalidateQueries({ queryKey: ["grain-batches"] });
    qc.invalidateQueries({ queryKey: ["dashboard-extras"] });
  }

  const approveMut = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id } }),
    onSuccess: () => { toast.success("Sale approved — stock deducted"); invalidateAfterDecision(); },
    onError: (e: Error) => toast.error(e.message || "Approval failed"),
  });
  const confirmBuyerMut = useMutation({
    mutationFn: (id: string) => confirmBuyerFn({ data: { id } }),
    onSuccess: () => { toast.success("Buyer confirmation recorded"); invalidateAfterDecision(); },
    onError: (e: Error) => toast.error(e.message || "Failed to record buyer confirmation"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { id } }),
    onSuccess: () => { toast.success("Sale rejected"); invalidateAfterDecision(); },
    onError: (e: Error) => toast.error(e.message || "Rejection failed"),
  });

  if (isLoading) return null;
  if (drafts.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending sale approval ({drafts.length})
      </p>
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-2 rounded bg-background/60 border border-border/50 px-2 py-1 text-[11px]">
          <div className="min-w-0">
            <p className="font-medium truncate">{d.buyers?.name ?? "New buyer"} · {d.grain_type}</p>
            <p className="text-muted-foreground tabular-nums">{Number(d.total_qty_kg).toLocaleString()}kg @ {Number(d.price_per_kg).toFixed(2)}/kg</p>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-1 shrink-0">
              {!d.buyer_confirmed_at ? (
                <Button
                  size="sm" variant="outline"
                  className="h-6 px-1.5 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50 text-[10px]"
                  title="Confirm on buyer's behalf — buyers have no account in this system"
                  disabled={confirmBuyerMut.isPending || rejectMut.isPending}
                  onClick={() => confirmBuyerMut.mutate(d.id)}
                >
                  {confirmBuyerMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />} Confirm buyer
                </Button>
              ) : (
                <Button
                  size="sm" variant="outline"
                  className="h-6 w-6 p-0 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                  title="Approve"
                  disabled={approveMut.isPending || rejectMut.isPending}
                  onClick={() => approveMut.mutate(d.id)}
                >
                  {approveMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
              )}
              <Button
                size="sm" variant="outline"
                className="h-6 w-6 p-0 border-red-300 text-red-600 hover:bg-red-50"
                title="Reject"
                disabled={approveMut.isPending || rejectMut.isPending || confirmBuyerMut.isPending}
                onClick={() => rejectMut.mutate(d.id)}
              >
                {rejectMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </Button>
            </div>
          ) : (
            <span className="shrink-0 text-[10px] text-amber-700 dark:text-amber-400 font-medium">Awaiting admin</span>
          )}
        </div>
      ))}
    </div>
  );
}
