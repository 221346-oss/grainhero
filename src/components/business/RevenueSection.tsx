import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, FileText, TrendingUp, AlertCircle, CheckCircle2, Search, Plus, Truck } from "lucide-react";
import { getRevenueOverview, markInvoicePaid } from "@/lib/billing.functions";
import { kgToMan, pricePerKgToPerMan } from "@/lib/units";
import { DispatchSaleWizard } from "@/components/business/DispatchSaleWizard";

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
  return `${ccy ?? "PKR"} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RevenueSection() {
  const fn = useServerFn(getRevenueOverview);
  const markFn = useServerFn(markInvoicePaid);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["revenue"], queryFn: () => fn() });

  const [q, setQ] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const markM = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => { toast.success("Invoice marked paid"); qc.invalidateQueries({ queryKey: ["revenue"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];
  const totals = data?.totals ?? { invoiced: 0, paid: 0, collected: 0, outstanding: 0, overdue: 0, countInvoices: 0, countPayments: 0 };
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New sale (Invoice → Dispatch → Payment)
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Invoiced</div><div className="text-2xl font-bold">{money(totals.invoiced, "PKR")}</div><div className="text-xs text-slate-500 mt-1">{totals.countInvoices} invoices</div></div><FileText className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Collected</div><div className="text-2xl font-bold text-emerald-600">{money(totals.collected, "PKR")}</div><div className="text-xs text-slate-500 mt-1">{totals.countPayments} payments</div></div><CheckCircle2 className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Outstanding</div><div className="text-2xl font-bold text-amber-600">{money(totals.outstanding, "PKR")}</div><div className="text-xs text-slate-500 mt-1">invoiced − collected</div></div><TrendingUp className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Overdue</div><div className="text-2xl font-bold text-red-600">{totals.overdue}</div><div className="text-xs text-slate-500 mt-1">past due</div></div><AlertCircle className="h-6 w-6 text-red-600" /></CardContent></Card>
      </div>

      <DispatchSaleWizard open={wizardOpen} onOpenChange={setWizardOpen} onDone={() => qc.invalidateQueries({ queryKey: ["revenue"] })} />

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
                  const dispatch = i.grain_dispatches;
                  const qtyKg = dispatch ? Number(dispatch.total_qty_kg ?? 0) : null;
                  const pricePerKg = qtyKg ? Number(i.total_amount) / qtyKg : null;
                  return (
                    <div key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{i.invoice_number}</span>
                          <Badge className={payBadge(i.payment_status)}>{i.payment_status ?? "pending"}</Badge>
                          {dispatch && <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3" /> {dispatch.dispatch_number}</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{i.buyer_name ?? "—"}{i.buyer_company ? ` · ${i.buyer_company}` : ""}{i.batch_ref ? ` · ${i.batch_ref}` : ""}{i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""}</div>
                        {qtyKg != null && pricePerKg != null && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{qtyKg.toLocaleString()} kg (~{kgToMan(qtyKg).toFixed(1)} man) · {money(pricePerKg, i.currency)}/kg · {money(pricePerKgToPerMan(pricePerKg), i.currency)}/man</div>
                        )}
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
                      <div className="font-medium flex items-center gap-2">
                        {p.payment_reference ?? p.id.slice(0, 8)}
                        {p.grain_dispatches && <Badge variant="outline" className="gap-1 text-[10px]"><Truck className="h-3 w-3" /> {p.grain_dispatches.dispatch_number}</Badge>}
                        {p.receipt_url && <Badge variant="outline" className="text-[10px]">OCR receipt</Badge>}
                      </div>
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
