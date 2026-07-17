import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listInvoiceEmailFailures, getInvoiceHistory } from "@/lib/invoice-failures.functions";
import { resendInvoiceEmail } from "@/lib/invoicing.functions";
import { RefreshCw, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/platform/invoice-failures")({
  component: InvoiceFailuresPage,
});

function InvoiceFailuresPage() {
  const load = useServerFn(listInvoiceEmailFailures);
  const resend = useServerFn(resendInvoiceEmail);
  const qc = useQueryClient();
  const [scope, setScope] = useState<"failed" | "attempted" | "all">("failed");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-failures", scope],
    queryFn: () => load({ data: { scope, limit: 100 } }),
  });

  const retry = useMutation({
    mutationFn: (orderId: string) => resend({ data: { orderId } }),
    onSuccess: () => { toast.success("Invoice email resent"); qc.invalidateQueries({ queryKey: ["invoice-failures"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPageShell
      title="Invoice email delivery"
      subtitle="Monitor and retry failed transactional invoice emails."
      actions={
        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="failed">Failed only</SelectItem>
            <SelectItem value="attempted">All attempts</SelectItem>
            <SelectItem value="all">All invoices</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            {data?.invoices.length ?? 0} invoice{(data?.invoices.length ?? 0) === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left border-b">
              <tr>
                <th className="p-3">Invoice</th><th>Buyer</th><th>Seller</th>
                <th>Amount</th><th>Status</th><th>Attempts</th><th>Last attempt</th><th>Error</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (data?.invoices.length ?? 0) === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No invoices in this view.</td></tr>
              )}
              {data?.invoices.map((inv) => (
                <tr key={inv.id as string} className="border-b hover:bg-emerald-50/30">
                  <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td>{inv.buyer_company ?? inv.buyer_name ?? "—"}</td>
                  <td>{inv.sellerName as string}</td>
                  <td>{inv.currency} {Number(inv.total_amount ?? 0).toLocaleString()}</td>
                  <td>
                    <Badge variant={inv.email_status === "sent" ? "outline" : inv.email_status === "failed" ? "destructive" : "secondary"}>
                      {inv.email_status ?? "pending"}
                    </Badge>
                  </td>
                  <td>{inv.email_attempts ?? 0}</td>
                  <td className="text-xs text-muted-foreground">
                    {inv.email_last_attempt_at ? new Date(inv.email_last_attempt_at as string).toLocaleString() : "—"}
                  </td>
                  <td className="text-xs text-rose-600 max-w-[240px] truncate" title={inv.email_error as string ?? ""}>
                    {inv.email_error ?? "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <Button size="sm" variant="outline" disabled={retry.isPending}
                      onClick={() => retry.mutate(inv.order_id as string)}>
                      <Mail className="h-3 w-3 mr-1" /> Retry
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenOrderId(inv.order_id as string)}>
                      History
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <HistorySheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </AdminPageShell>
  );
}

function HistorySheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const load = useServerFn(getInvoiceHistory);
  const { data } = useQuery({
    queryKey: ["invoice-history", orderId],
    queryFn: () => load({ data: { orderId: orderId! } }),
    enabled: !!orderId,
  });
  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Invoice & order history</SheetTitle></SheetHeader>
        {data ? (
          <div className="space-y-4 mt-4">
            {data.invoice && (
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Invoice:</span> {(data.invoice as { invoice_number: string }).invoice_number}</div>
                <div><span className="text-muted-foreground">Status:</span> {(data.invoice as { email_status?: string }).email_status ?? "—"}</div>
                <div><span className="text-muted-foreground">Attempts:</span> {(data.invoice as { email_attempts?: number }).email_attempts ?? 0}</div>
                {(data.invoice as { email_error?: string }).email_error && (
                  <div className="text-rose-600 text-xs">{(data.invoice as { email_error?: string }).email_error}</div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Order timeline</div>
              {data.events.map((e, i) => {
                const ev = e as { id?: string; from_state?: string; to_state: string; note?: string; created_at: string };
                return (
                  <div key={ev.id ?? i} className="text-xs border-l-2 border-emerald-500 pl-3 py-1">
                    <div className="font-medium">{ev.from_state ?? "—"} → {ev.to_state}</div>
                    {ev.note && <div className="text-muted-foreground">{ev.note}</div>}
                    <div className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-4">Loading…</div>
        )}
      </SheetContent>
    </Sheet>
  );
}