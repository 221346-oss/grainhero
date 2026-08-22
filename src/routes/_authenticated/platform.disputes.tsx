import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listDisputes, getDispute, resolveDispute, getDisputeAttachmentUrls } from "@/lib/disputes.functions";
import { getMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { initiateRefund } from "@/lib/refunds.functions";

export const Route = createFileRoute("/_authenticated/platform/disputes")({
  head: () => ({
    meta: [
      { title: "Platform · Disputes — Grain Hero" },
      { name: "description", content: "Platform · Disputes workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Disputes — Grain Hero" },
      { property: "og:description", content: "Platform · Disputes workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformDisputesPage,
});

function PlatformDisputesPage() {
  const list = useServerFn(listDisputes);
  const [status, setStatus] = useState<"open" | "under_review" | "resolved" | "rejected" | "all">("open");
  const { data } = useQuery({ queryKey: ["disputes", status], queryFn: () => list({ data: { status } }) });
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <AdminPageShell
      title="Buyer disputes"
      subtitle="Review, moderate and resolve disputes according to marketplace settings."
      actions={
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["open","under_review","resolved","rejected","all"].map((s) =>
              <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    >
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr><th className="p-3">Order</th><th>Buyer</th><th>Category</th><th>Opened</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(data?.disputes ?? []).map((d) => {
                const o = d.buyer_orders as { order_number?: string } | null;
                const b = d.buyers as { name?: string; company_name?: string } | null;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{o?.order_number ?? d.order_id}</td>
                    <td>{b?.company_name ?? b?.name ?? "—"}</td>
                    <td>{d.category}</td>
                    <td>{new Date(d.opened_at).toLocaleString()}</td>
                    <td><Badge variant="secondary">{d.status}</Badge></td>
                    <td className="text-right pr-3">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(d.id)}>Review</Button>
                    </td>
                  </tr>
                );
              })}
              {!(data?.disputes ?? []).length && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No disputes.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {openId && <DisputeDialog id={openId} onClose={() => setOpenId(null)} />}
    </AdminPageShell>
  );
}

function DisputeDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const getFn = useServerFn(getDispute);
  const resolveFn = useServerFn(resolveDispute);
  const refundFn = useServerFn(initiateRefund);
  const settingsFn = useServerFn(getMarketplaceSettings);
  const signFn = useServerFn(getDisputeAttachmentUrls);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dispute", id], queryFn: () => getFn({ data: { id } }) });
  const { data: settings } = useQuery({ queryKey: ["marketplace-settings"], queryFn: () => settingsFn() });
  const attachments = ((data?.dispute?.attachments ?? []) as Array<{ path: string; name: string }>);
  const { data: attUrls } = useQuery({
    enabled: attachments.length > 0,
    queryKey: ["dispute-attachments", id, attachments.map((a) => a.path).join("|")],
    queryFn: () => signFn({ data: { id, paths: attachments.map((a) => a.path) } }),
  });
  const [rezKey, setRezKey] = useState("");
  const [note, setNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const rezOpts = settings?.settings.disputes.resolutions ?? [];
  const selectedRez = rezOpts.find((r) => r.key === rezKey);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dispute", id] });
    qc.invalidateQueries({ queryKey: ["disputes"] });
  };

  const resolveMut = useMutation({
    mutationFn: async () => {
      await resolveFn({ data: { disputeId: id, resolutionKey: rezKey, note, refundAmount: refundAmount ? Number(refundAmount) : undefined } });
      if (selectedRez && selectedRez.refund !== "none" && data) {
        const amt = refundAmount ? Number(refundAmount) : Number((data.dispute.buyer_orders as { subtotal?: number } | null)?.subtotal ?? 0);
        if (amt > 0) {
          await refundFn({ data: {
            orderId: data.dispute.order_id as string,
            amount: selectedRez.refund === "partial" ? amt : undefined,
            reasonKey: rezKey, disputeId: id,
          } });
        }
      }
    },
    onSuccess: () => { toast.success("Dispute resolved"); invalidate(); onClose(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const d = data?.dispute;
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>Dispute #{id.slice(0,8)}</SheetTitle></SheetHeader>
        {!d ? <div className="text-sm text-muted-foreground mt-4">Loading…</div> : (
          <div className="space-y-3 text-sm mt-4">
            <div><b>Category:</b> {d.category}</div>
            <div className="rounded p-2 bg-muted/40 whitespace-pre-wrap">{d.description}</div>
            {attachments.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1">Attachments</div>
                <ul className="space-y-1">
                  {attachments.map((a) => {
                    const u = attUrls?.urls.find((x) => x.path === a.path)?.url;
                    return (
                      <li key={a.path} className="text-xs">
                        {u ? <a href={u} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">{a.name}</a> : <span>{a.name} (loading…)</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {(data?.events?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-medium mb-1">Audit trail</div>
                <ul className="space-y-1 text-xs">
                  {data!.events.map((ev) => (
                    <li key={ev.id} className="flex justify-between border-b py-1 last:border-0">
                      <span>
                        <b>{ev.action}</b>
                        {ev.note && <span className="text-muted-foreground"> · {ev.note}</span>}
                      </span>
                      <span className="text-muted-foreground">{new Date(ev.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2 border-t pt-3">
              <Label>Resolution</Label>
              <Select value={rezKey} onValueChange={setRezKey}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {rezOpts.map((r) => <SelectItem key={r.key} value={r.key}>{r.label} ({r.refund})</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedRez?.refund === "partial" && (
                <div>
                  <Label>Refund amount</Label>
                  <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" />
                </div>
              )}
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
        )}
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={!rezKey || resolveMut.isPending} onClick={() => resolveMut.mutate()}>
            {resolveMut.isPending ? "Working…" : "Resolve"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}