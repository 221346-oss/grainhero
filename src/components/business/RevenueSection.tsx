import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Search, Plus, Truck, RotateCcw } from "lucide-react";
import { getRevenueOverview, markInvoicePaid } from "@/lib/billing.functions";
import { kgToMan, pricePerKgToPerMan } from "@/lib/units";
import { DispatchSaleWizard } from "@/components/business/DispatchSaleWizard";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import type { AppRole } from "@/lib/roles.functions";

type Invoice = {
  id: string;
  invoice_number: string;
  buyer_name: string | null;
  buyer_company: string | null;
  batch_ref: string | null;
  total_amount: number;
  amount_paid: number | null;
  currency: string | null;
  payment_status: string | null;
  due_date: string | null;
  grain_dispatches: { dispatch_number: string } | null;
};

type OutstandingDispatch = {
  id: string;
  dispatch_number: string;
  total_amount: number;
  currency: string | null;
  status: string;
  dispatched_at: string | null;
  created_at: string;
  buyers: { name: string; company_name: string | null } | null;
  paid: number;
  remaining: number;
};

type Payment = {
  id: string;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  status: string | null;
  payment_date: string | null;
  grain_dispatches: { dispatch_number: string } | null;
};

const invoiceExportColumns: ExportColumn<Invoice>[] = [
  { header: "Invoice #", value: (i) => i.invoice_number },
  { header: "Buyer", value: (i) => i.buyer_name ?? "" },
  { header: "Company", value: (i) => i.buyer_company ?? "" },
  { header: "Batch ref", value: (i) => i.batch_ref ?? "" },
  { header: "Total", value: (i) => i.total_amount },
  { header: "Paid", value: (i) => i.amount_paid ?? 0 },
  { header: "Currency", value: (i) => i.currency ?? "" },
  { header: "Status", value: (i) => i.payment_status ?? "" },
  { header: "Due date", value: (i) => i.due_date ? new Date(i.due_date).toLocaleDateString() : "" },
  { header: "Dispatch #", value: (i) => i.grain_dispatches?.dispatch_number ?? "" },
];

const outstandingExportColumns: ExportColumn<OutstandingDispatch>[] = [
  { header: "Dispatch #", value: (d) => d.dispatch_number },
  { header: "Buyer", value: (d) => d.buyers?.name ?? "—" },
  { header: "Company", value: (d) => d.buyers?.company_name ?? "" },
  { header: "Total", value: (d) => d.total_amount },
  { header: "Paid", value: (d) => d.paid },
  { header: "Remaining", value: (d) => d.remaining },
  { header: "Currency", value: (d) => d.currency ?? "" },
  { header: "Status", value: (d) => d.status },
  { header: "Dispatched", value: (d) => d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString() : "" },
];

const paymentExportColumns: ExportColumn<Payment>[] = [
  { header: "Reference", value: (p) => p.payment_reference ?? p.id.slice(0, 8) },
  { header: "Amount", value: (p) => p.amount },
  { header: "Currency", value: (p) => p.currency ?? "" },
  { header: "Method", value: (p) => p.payment_method ?? "" },
  { header: "Status", value: (p) => p.status ?? "" },
  { header: "Date", value: (p) => p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "" },
  { header: "Dispatch #", value: (p) => p.grain_dispatches?.dispatch_number ?? "" },
];

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

export function RevenueSection({ role = "admin" }: { role?: AppRole }) {
  const fn = useServerFn(getRevenueOverview);
  const markFn = useServerFn(markInvoicePaid);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["revenue"], queryFn: () => fn() });

  const [q, setQ] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [resumeDispatch, setResumeDispatch] = useState<{ id: string; dispatchNumber: string } | null>(null);

  function openNewSale() { setResumeDispatch(null); setWizardOpen(true); }
  function openReopen(d: OutstandingDispatch) { setResumeDispatch({ id: d.id, dispatchNumber: d.dispatch_number }); setWizardOpen(true); }

  // Managers see revenue read-only: no outgoing sale creation, no mark-paid action
  const canWrite = role === "admin" || role === "super_admin";

  const markM = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => { toast.success("Invoice marked paid"); qc.invalidateQueries({ queryKey: ["revenue"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];
  const outstandingDispatches = (data?.outstandingDispatches ?? []) as OutstandingDispatch[];
  const totals = data?.totals ?? { invoiced: 0, paid: 0, collected: 0, outstanding: 0, due: 0, overdue: 0, countInvoices: 0, countPayments: 0 };
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
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openNewSale} className="gap-1.5">
            <Plus className="h-4 w-4" /> New sale (Invoice → Dispatch → Payment)
          </Button>
        </div>
      )}
      {!canWrite && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2">
          <span className="text-amber-500">●</span> Read-only — outgoing invoice creation is restricted to admin.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Invoiced</div><div className="text-2xl font-bold">{money(totals.invoiced, "PKR")}</div><div className="text-xs text-slate-500 mt-1">{totals.countInvoices} invoices</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Collected</div><div className="text-2xl font-bold text-emerald-600">{money(totals.collected, "PKR")}</div><div className="text-xs text-slate-500 mt-1">{totals.countPayments} payments</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Outstanding</div><div className="text-2xl font-bold text-amber-600">{money(totals.outstanding, "PKR")}</div><div className="text-xs text-slate-500 mt-1">invoiced − collected</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Due</div><div className="text-2xl font-bold text-red-600">{money(totals.due, "PKR")}</div><div className="text-xs text-slate-500 mt-1">{totals.overdue} past due invoice{totals.overdue === 1 ? "" : "s"}</div></div></CardContent></Card>
      </div>

      <DispatchSaleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["revenue"] })}
        resumeDispatch={resumeDispatch}
      />

      {outstandingDispatches.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row justify-between items-center gap-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" /> Outstanding payments</CardTitle>
              <CardDescription>Approved dispatches with no fully-recorded payment — closed out of the payment step before a receipt was added.</CardDescription>
            </div>
            <ExportMenu filename="outstanding-payments" title="Outstanding Payments" rows={outstandingDispatches} columns={outstandingExportColumns} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {outstandingDispatches.map((d) => (
                <div key={d.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3" /> {d.dispatch_number}</Badge>
                      <span className="text-sm font-medium">{d.buyers?.name ?? "—"}{d.buyers?.company_name ? ` · ${d.buyers.company_name}` : ""}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {d.dispatched_at ? `Dispatched ${new Date(d.dispatched_at).toLocaleDateString()}` : "Not yet dispatched"} · {d.paid > 0 ? `${money(d.paid, d.currency)} of ${money(d.total_amount, d.currency)} paid` : "No payment recorded"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-600 font-semibold">{money(d.remaining, d.currency)} due</div>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => openReopen(d)} className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" /> Reopen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center gap-3">
              <div><CardTitle>Buyer invoices</CardTitle><CardDescription>{filteredInv.length} of {invoices.length}</CardDescription></div>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 w-64" /></div>
                <ExportMenu filename="invoices" title="Buyer Invoices" rows={filteredInv} columns={invoiceExportColumns} />
              </div>
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
                      {remaining > 0 && canWrite && (
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
            <CardHeader className="flex flex-row justify-between items-center gap-3">
              <div><CardTitle>Recent payments</CardTitle><CardDescription>{payments.length} entries</CardDescription></div>
              <ExportMenu filename="payments" title="Payments" rows={payments} columns={paymentExportColumns} />
            </CardHeader>
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
