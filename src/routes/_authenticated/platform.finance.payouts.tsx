import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PayoutsSkeleton } from "@/components/app/skeletons";
import {
  listPayableSellers, createPayoutBatch, approvePayout, markPayoutPaid,
  cancelPayout, listPayouts,
} from "@/lib/payouts.functions";

export const Route = createFileRoute("/_authenticated/platform/finance/payouts")({
  head: () => ({
    meta: [
      { title: "Platform · Finance · Payouts — Grain Hero" },
      { name: "description", content: "Platform · Finance · Payouts workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Finance · Payouts — Grain Hero" },
      { property: "og:description", content: "Platform · Finance · Payouts workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const qc = useQueryClient();
  const payables = useServerFn(listPayableSellers);
  const payouts = useServerFn(listPayouts);
  const create = useServerFn(createPayoutBatch);
  const approve = useServerFn(approvePayout);
  const pay = useServerFn(markPayoutPaid);
  const cancel = useServerFn(cancelPayout);

  const [selected, setSelected] = useState<string[]>([]);
  const [reference, setReference] = useState("");

  const { data: payableData, isLoading: l1 } = useQuery({
    queryKey: ["payable-sellers"], queryFn: () => payables(),
  });
  const { data: payoutData, isLoading: l2 } = useQuery({
    queryKey: ["payouts-list"], queryFn: () => payouts({ data: {} }),
  });

  if (l1 || l2) return <PayoutsSkeleton />;

  async function runCreate() {
    if (!selected.length) return toast.error("Select at least one seller");
    try {
      const r = await create({ data: { sellerIds: selected } });
      toast.success(`Created ${r.created.length} payout(s)`);
      setSelected([]);
      qc.invalidateQueries();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Seller payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">Approve, batch and mark payouts as paid.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Payable balances</CardTitle>
          <Button size="sm" onClick={runCreate} disabled={!selected.length}>
            Create {selected.length ? `(${selected.length})` : ""} batch
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {(payableData?.rows ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No sellers have reached the minimum payable amount.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left w-10"></th>
                  <th className="p-3 text-left">Seller</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-right">Payable</th>
                </tr>
              </thead>
              <tbody>
                {(payableData?.rows ?? []).map((r: any) => (
                  <tr key={r.sellerId} className="border-t hover:bg-muted/20">
                    <td className="p-3"><Checkbox checked={selected.includes(r.sellerId)}
                      onCheckedChange={(v) => setSelected((s) => v ? [...s, r.sellerId] : s.filter((x) => x !== r.sellerId))} /></td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.email}</td>
                    <td className="p-3 text-right font-mono">${r.payable.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent payouts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(payoutData?.rows ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No payouts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Seller</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(payoutData?.rows ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs">{p.seller_id.slice(0,8)}</td>
                    <td className="p-3"><Badge variant={p.status === "paid" ? "default" : p.status === "cancelled" ? "destructive" : "secondary"}>{p.status}</Badge></td>
                    <td className="p-3 text-right font-mono">{p.currency} {Number(p.net_amount).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="p-3 text-right space-x-1">
                      {p.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={async () => { await approve({ data: { payoutId: p.id } }); toast.success("Approved"); qc.invalidateQueries(); }}>Approve</Button>
                      )}
                      {p.status === "approved" && (
                        <>
                          <Input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} className="inline-block w-32 h-8" />
                          <Button size="sm" onClick={async () => { await pay({ data: { payoutId: p.id, reference } }); toast.success("Marked paid"); setReference(""); qc.invalidateQueries(); }}>Mark paid</Button>
                        </>
                      )}
                      {(p.status === "pending" || p.status === "approved") && (
                        <Button size="sm" variant="ghost" onClick={async () => { await cancel({ data: { payoutId: p.id } }); toast.success("Cancelled"); qc.invalidateQueries(); }}>Cancel</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}