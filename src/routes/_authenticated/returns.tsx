import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listReturns, approveReturn, denyReturn, markReturnReceived, finalizeReturn, getReturnDetail } from "@/lib/returns.functions";
import { getMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { toast } from "sonner";
import { PackageX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/returns")({
  head: () => ({
    meta: [
      { title: "Returns — Grain Hero" },
      { name: "description", content: "Returns workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Returns — Grain Hero" },
      { property: "og:description", content: "Returns workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const list = useServerFn(listReturns);
  const settingsFn = useServerFn(getMarketplaceSettings);
  const detail = useServerFn(getReturnDetail);
  const approve = useServerFn(approveReturn);
  const deny = useServerFn(denyReturn);
  const received = useServerFn(markReturnReceived);
  const finalize = useServerFn(finalizeReturn);
  const qc = useQueryClient();
  const [scope, setScope] = useState<"mine-seller" | "platform">("mine-seller");
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolutionKey, setResolutionKey] = useState<string>("");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["returns", scope],
    queryFn: () => list({ data: { scope } }),
  });
  const { data: settingsResp } = useQuery({
    queryKey: ["marketplace-settings"], queryFn: () => settingsFn(),
  });
  const settings = settingsResp?.settings;
  const { data: detailData } = useQuery({
    queryKey: ["return", openId],
    queryFn: () => detail({ data: { returnId: openId! } }),
    enabled: !!openId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["returns"] });
    if (openId) qc.invalidateQueries({ queryKey: ["return", openId] });
  };

  const mApprove = useMutation({
    mutationFn: () => approve({ data: { returnId: openId!, resolutionKey, note: note || undefined } }),
    onSuccess: () => { toast.success("Approved"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDeny = useMutation({
    mutationFn: () => deny({ data: { returnId: openId!, note: note || undefined } }),
    onSuccess: () => { toast.success("Denied"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mReceived = useMutation({
    mutationFn: () => received({ data: { returnId: openId!, note: note || undefined } }),
    onSuccess: () => { toast.success("Marked received"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mFinalize = useMutation({
    mutationFn: () => finalize({ data: { returnId: openId!, note: note || undefined } }),
    onSuccess: () => { toast.success("Finalized"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPageShell
      title="Returns"
      subtitle="Review buyer return requests and drive refunds or replacements."
      actions={
        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mine-seller">My returns (seller)</SelectItem>
            <SelectItem value="platform">All returns (super-admin)</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PackageX className="h-4 w-4 text-emerald-600" />
            {data?.returns?.length ?? 0} return{(data?.returns?.length ?? 0) === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left border-b">
              <tr>
                <th className="p-3">Order</th><th>Reason</th><th>Status</th>
                <th>Resolution</th><th>Requested</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (data?.returns?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No returns.</td></tr>
              )}
              {data?.returns?.map((r) => (
                <tr key={r.id as string} className="border-b hover:bg-emerald-50/30">
                  <td className="p-3 font-mono text-xs">
                    {(r.buyer_orders as { order_number?: string } | null)?.order_number ?? String(r.order_id).slice(0, 8)}
                  </td>
                  <td>{r.reason_label as string}</td>
                  <td><Badge variant="outline" className="capitalize">{r.status as string}</Badge></td>
                  <td className="capitalize">{(r.resolution as string) ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(r.created_at as string).toLocaleString()}
                  </td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => { setOpenId(r.id as string); setResolutionKey(""); setNote(""); }}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-[520px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader><SheetTitle>Return detail</SheetTitle></SheetHeader>
          {detailData?.return && (
            <div className="mt-4 space-y-4 text-sm">
              <div><span className="text-muted-foreground">Reason: </span>{detailData.return.reason_label as string}</div>
              <div><span className="text-muted-foreground">Notes: </span>{(detailData.return.notes as string) || "—"}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{detailData.return.status as string}</Badge>
                {detailData.return.resolution && <Badge className="capitalize">{detailData.return.resolution as string}</Badge>}
              </div>
              {Array.isArray(detailData.return.attachments) && (detailData.return.attachments as unknown[]).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {(detailData.return.attachments as Array<{ name: string }>).length} attachment(s)
                </div>
              )}

              <div className="space-y-2 border-t pt-3">
                <div className="text-xs font-medium">Timeline</div>
                <ul className="space-y-1 text-xs">
                  {detailData.events?.map((e: Record<string, unknown>) => (
                    <li key={String(e.id)}>
                      <span className="text-muted-foreground">{new Date(String(e.created_at)).toLocaleString()}: </span>
                      <span className="capitalize">{e.from_state ? `${String(e.from_state)} → ` : ""}{String(e.to_state)}</span>
                      {e.note ? <span> — {String(e.note)}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-3 space-y-2">
                <Textarea placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                {detailData.return.status === "requested" && (
                  <div className="space-y-2">
                    <Select value={resolutionKey} onValueChange={setResolutionKey}>
                      <SelectTrigger><SelectValue placeholder="Resolution" /></SelectTrigger>
                      <SelectContent>
                        {settings?.returns.resolutions.map((r) => (
                          <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!resolutionKey || mApprove.isPending} onClick={() => mApprove.mutate()}>Approve</Button>
                      <Button size="sm" variant="destructive" disabled={mDeny.isPending} onClick={() => mDeny.mutate()}>Deny</Button>
                    </div>
                  </div>
                )}
                {detailData.return.status === "approved" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={mReceived.isPending} onClick={() => mReceived.mutate()}>Mark received</Button>
                    <Button size="sm" disabled={mFinalize.isPending} onClick={() => mFinalize.mutate()}>Finalize / refund</Button>
                  </div>
                )}
                {detailData.return.status === "received" && (
                  <Button size="sm" disabled={mFinalize.isPending} onClick={() => mFinalize.mutate()}>Finalize / refund</Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}