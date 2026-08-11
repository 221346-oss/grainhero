import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listInvoiceEmailFailures,
  getInvoiceHistory,
  getInvoiceRetryHistory,
  bulkRetryInvoiceEmails,
  exportInvoiceFailuresCsv,
  exportInvoiceFailuresPdf,
} from "@/lib/invoice-failures.functions";
import { resendInvoiceEmail } from "@/lib/invoicing.functions";
import { Mail, AlertCircle, Download, FileText, History } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/platform/invoice-failures")({
  head: () => ({
    meta: [
      { title: "Platform · Invoice Failures — Grain Hero" },
      { name: "description", content: "Platform · Invoice Failures workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Invoice Failures — Grain Hero" },
      { property: "og:description", content: "Platform · Invoice Failures workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InvoiceFailuresPage,
});

function InvoiceFailuresPage() {
  const load = useServerFn(listInvoiceEmailFailures);
  const resend = useServerFn(resendInvoiceEmail);
  const bulk = useServerFn(bulkRetryInvoiceEmails);
  const csv = useServerFn(exportInvoiceFailuresCsv);
  const pdf = useServerFn(exportInvoiceFailuresPdf);
  const qc = useQueryClient();
  const [scope, setScope] = useState<"failed" | "attempted" | "all">("failed");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [historyInvoiceId, setHistoryInvoiceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-failures", scope],
    queryFn: () => load({ data: { scope, limit: 100 } }),
  });

  const retry = useMutation({
    mutationFn: (invoiceId: string) => resend({ data: { invoiceId } }),
    onSuccess: () => { toast.success("Invoice email resent"); qc.invalidateQueries({ queryKey: ["invoice-failures"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkRetry = useMutation({
    mutationFn: (invoiceIds: string[]) => bulk({ data: { invoiceIds } }),
    onSuccess: (r) => {
      toast.success(`Retried ${r.results.length}: ${r.succeeded} ok / ${r.failed} failed`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["invoice-failures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected((s) => {
    const ids = (data?.invoices ?? []).map((i) => i.id as string);
    return s.size === ids.length ? new Set() : new Set(ids);
  });

  const downloadCsv = async () => {
    const r = await csv({ data: { scope, limit: 500 } });
    const blob = new Blob([r.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-failures-${scope}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPdf = async () => {
    const r = await pdf({ data: { scope, limit: 200 } });
    const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-failures-${scope}-${Date.now()}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminPageShell
      title="Invoice email delivery"
      subtitle="Monitor and retry failed transactional invoice emails."
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadCsv}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPdf}>
            <FileText className="h-3 w-3 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="default" disabled={!selected.size || bulkRetry.isPending}
            onClick={() => bulkRetry.mutate(Array.from(selected))}>
            <Mail className="h-3 w-3 mr-1" /> Retry {selected.size || ""}
          </Button>
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="failed">Failed only</SelectItem>
              <SelectItem value="attempted">All attempts</SelectItem>
              <SelectItem value="all">All invoices</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                <th className="p-3 w-8">
                  <Checkbox
                    checked={!!data?.invoices.length && selected.size === data.invoices.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-3">Invoice</th><th>Buyer</th><th>Seller</th>
                <th>Amount</th><th>Status</th><th>Attempts</th><th>Last attempt</th><th>Error</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (data?.invoices.length ?? 0) === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No invoices in this view.</td></tr>
              )}
              {data?.invoices.map((inv) => (
                <tr key={inv.id as string} className="border-b hover:bg-emerald-50/30">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(inv.id as string)}
                      onCheckedChange={() => toggle(inv.id as string)}
                    />
                  </td>
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
                      onClick={() => retry.mutate(inv.id as string)}>
                      <Mail className="h-3 w-3 mr-1" /> Retry
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setHistoryInvoiceId(inv.id as string)}>
                      <History className="h-3 w-3 mr-1" /> History
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenOrderId(inv.order_id as string)}>
                      Order
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <HistorySheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
      <RetryHistorySheet invoiceId={historyInvoiceId} onClose={() => setHistoryInvoiceId(null)} />
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
              {(data.events as unknown[]).map((e, i: number) => {
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

function RetryHistorySheet({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const load = useServerFn(getInvoiceRetryHistory);
  const { data } = useQuery({
    queryKey: ["invoice-retry-history", invoiceId],
    queryFn: () => load({ data: { invoiceId: invoiceId! } }),
    enabled: !!invoiceId,
  });
  return (
    <Sheet open={!!invoiceId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Retry history</SheetTitle></SheetHeader>
        {data ? (
          <div className="space-y-4 mt-4">
            {data.invoice && (
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Invoice:</span> {(data.invoice as { invoice_number: string }).invoice_number}</div>
                <div><span className="text-muted-foreground">Recipient:</span> {(data.invoice as { buyer_email?: string }).buyer_email ?? "—"}</div>
                <div><span className="text-muted-foreground">Attempts:</span> {(data.invoice as { email_attempts?: number }).email_attempts ?? 0}</div>
                <div><span className="text-muted-foreground">Status:</span> {(data.invoice as { email_status?: string }).email_status ?? "—"}</div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Send log</div>
              {(data.history as unknown[]).length === 0 && (
                <div className="text-xs text-muted-foreground">No delivery log entries yet.</div>
              )}
              {(data.history as unknown[]).map((h, i) => {
                const e = h as { id?: string; template_key?: string; status?: string; error?: string; created_at: string; recipient?: string };
                return (
                  <div key={e.id ?? i} className={`text-xs border-l-2 pl-3 py-1 ${e.status === "sent" ? "border-emerald-500" : "border-rose-500"}`}>
                    <div className="font-medium">{e.template_key ?? "invoice"} · {e.status ?? "?"}</div>
                    {e.recipient && <div className="text-muted-foreground">→ {e.recipient}</div>}
                    {e.error && <div className="text-rose-600">{e.error}</div>}
                    <div className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
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