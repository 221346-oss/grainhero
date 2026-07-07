import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, FileText, TrendingUp, AlertCircle, CheckCircle2, Search, Wallet } from "lucide-react";
import { getRevenueOverview, markInvoicePaid } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/revenue")({
  component: RevenuePage,
});

function payBadge(s: string | null) {
  switch (s) {
    case "paid": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "partial": return "bg-amber-100 text-amber-800 border-amber-200";
    case "overdue": return "bg-red-100 text-red-800 border-red-200";
    case "cancelled": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function money(n: number, ccy: string | null | undefined) {
  return `${ccy ?? "USD"} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RevenuePage() {
  const fn = useServerFn(getRevenueOverview);
  const markFn = useServerFn(markInvoicePaid);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["revenue"], queryFn: () => fn() });

  const [q, setQ] = useState("");

  const markM = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => { toast.success("Invoice marked paid"); qc.invalidateQueries({ queryKey: ["revenue"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];
  const totals = data?.totals ?? { invoiced: 0, paid: 0, outstanding: 0, overdue: 0, countInvoices: 0, countPayments: 0, collected: 0 };
  const byStatus = data?.byStatus ?? {};

  const filteredInv = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((i: any) =>
      i.invoice_number?.toLowerCase().includes(term) ||
      i.buyer_name?.toLowerCase().includes(term) ||
      i.buyer_company?.toLowerCase().includes(term) ||
      i.batch_ref?.toLowerCase().includes(term)
    );
  }, [invoices, q]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Wallet className="h-6 w-6 text-emerald-600" /> Revenue</h1>
        <p className="text-sm text-slate-500 mt-1">Buyer invoices, collections and cash flow.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Invoiced</div><div className="text-2xl font-bold">{money(totals.invoiced, "USD")}</div><div className="text-xs text-slate-500 mt-1">{totals.countInvoices} invoices</div></div><FileText className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Collected</div><div className="text-2xl font-bold text-emerald-600">{money(totals.paid, "USD")}</div><div className="text-xs text-slate-500 mt-1">{totals.countPayments} payments</div></div><CheckCircle2 className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Outstanding</div><div className="text-2xl font-bold text-amber-600">{money(totals.outstanding, "USD")}</div></div><TrendingUp className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Overdue</div><div className="text-2xl font-bold text-red-600">{totals.overdue}</div><div className="text-xs text-slate-500 mt-1">past due</div></div><AlertCircle className="h-6 w-6 text-red-600" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">By status</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([k, v]) => (
            <Badge key={k} className={payBadge(k)}>{k}: {String(v)}</Badge>
          ))}
          {Object.keys(byStatus).length === 0 && <span className="text-sm text-slate-500">No invoices yet.</span>}
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center gap-3">
              <div><CardTitle>Buyer invoices</CardTitle><CardDescription>{filteredInv.length} of {invoices.length}</CardDescription></div>
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 w-64" /></div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredInv.map((i: any) => {
                  const remaining = Math.max(0, Number(i.total_amount) - Number(i.amount_paid ?? 0));
                  return (
                    <div key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{i.invoice_number}</span>
                          <Badge className={payBadge(i.payment_status)}>{i.payment_status ?? "pending"}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{i.buyer_name ?? "—"}{i.buyer_company ? ` · ${i.buyer_company}` : ""}{i.batch_ref ? ` · ${i.batch_ref}` : ""}{i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{money(i.total_amount, i.currency)}</div>
                        {remaining > 0 && <div className="text-xs text-amber-600">{money(remaining, i.currency)} due</div>}
                      </div>
                      {remaining > 0 && (
                        <Button size="sm" variant="outline" onClick={() => markM.mutate(i.id)} disabled={markM.isPending}>
                          <DollarSign className="h-3.5 w-3.5 mr-1" /> Mark paid
                        </Button>
                      )}
                    </div>
                  );
                })}
                {filteredInv.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No invoices.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Recent payments</CardTitle><CardDescription>{payments.length} entries</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {payments.map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.payment_reference ?? p.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">{p.payment_method}{p.payment_date ? ` · ${new Date(p.payment_date).toLocaleDateString()}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(p.amount, p.currency)}</span>
                      <Badge variant="outline">{p.status ?? "completed"}</Badge>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No payments recorded.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}