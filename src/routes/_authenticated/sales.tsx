import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, DollarSign } from "lucide-react";
import { listOrders, getOrder, transitionOrder, getAllowedOrderTransitions } from "@/lib/buyer-orders.functions";
import { generateInvoice, recordPayment, getSalesSummary } from "@/lib/invoicing.functions";
import { OrdersSkeleton } from "@/components/app/skeletons";
import { ShipmentPanel } from "@/components/app/marketplace/ShipmentPanel";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Grain Hero" },
      { name: "description", content: "Sales workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Sales — Grain Hero" },
      { property: "og:description", content: "Sales workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SalesPage,
  pendingComponent: OrdersSkeleton,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  invoiced: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700",
  dispatched: "bg-cyan-100 text-cyan-700",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-rose-100 text-rose-700",
};

function SalesPage() {
  const [status, setStatus] = useState<string>("all");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const qc = useQueryClient();
  const listFn = useServerFn(listOrders);
  const summaryFn = useServerFn(getSalesSummary);

  const summaryQ = useQuery({ queryKey: ["sales-summary"], queryFn: () => summaryFn() });
  const ordersQ = useQuery({
    queryKey: ["buyer-orders", status],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => listFn({ data: { status: status as any } }),
  });

  const s = summaryQ.data;
  const tiles = useMemo(() => ([
    { key: "listings", label: "Active listings", value: s?.activeListings ?? 0 },
    { key: "open", label: "Open orders", value: s?.openOrders ?? 0 },
    { key: "rev", label: "Revenue (30d)", value: `$${Number(s?.revenue30d ?? 0).toLocaleString()}`, hint: "paid invoices" },
    { key: "out", label: "Outstanding", value: `$${Number(s?.outstanding ?? 0).toLocaleString()}`, hint: "invoiced not paid" },
  ]), [s]);

  const rows = ordersQ.data?.orders ?? [];

  return (
    <AdminPageShell title="Sales" subtitle="Buyer orders, invoices & payments">
      <AdminSummaryTiles tiles={tiles} columns={4}
        active={status === "all" ? undefined : status}
        onSelect={(k) => setStatus(k === "open" ? "pending" : "all")}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Orders</CardTitle>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {ordersQ.isLoading ? (
            <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No orders yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order #</TableHead><TableHead>Buyer</TableHead>
                <TableHead>Listing</TableHead><TableHead className="text-right">Qty (kg)</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
                <TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {rows.map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-emerald-50/40">
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell>{o.buyers?.company_name ?? o.buyers?.name ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{o.grain_listings?.title ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(o.quantity_kg).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{o.currency} {Number(o.subtotal).toLocaleString()}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[o.status] ?? ""}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenOrderId(o.id)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {openOrderId && (
        <OrderDrawer
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onChanged={() => {
            void qc.invalidateQueries({ queryKey: ["buyer-orders"] });
            void qc.invalidateQueries({ queryKey: ["sales-summary"] });
          }}
        />
      )}
    </AdminPageShell>
  );
}

function OrderDrawer({ orderId, onClose, onChanged }: { orderId: string; onClose: () => void; onChanged: () => void }) {
  const getFn = useServerFn(getOrder);
  const nextFn = useServerFn(getAllowedOrderTransitions);
  const transitionFn = useServerFn(transitionOrder);
  const invoiceFn = useServerFn(generateInvoice);
  const payFn = useServerFn(recordPayment);
  const qc = useQueryClient();
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [note, setNote] = useState("");

  const orderQ = useQuery({ queryKey: ["order", orderId], queryFn: () => getFn({ data: { orderId } }) });
  const nextQ = useQuery({ queryKey: ["order-next", orderId], queryFn: () => nextFn({ data: { orderId } }) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["order", orderId] });
    void qc.invalidateQueries({ queryKey: ["order-next", orderId] });
    onChanged();
  };

  const transMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (to: string) => transitionFn({ data: { orderId, toState: to as any, note: note || undefined } }),
    onSuccess: () => { toast.success("Order updated"); setNote(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const invMut = useMutation({
    mutationFn: () => invoiceFn({ data: { orderId } }),
    onSuccess: (r) => { toast.success(r.existed ? "Invoice already exists" : `Invoice ${r.invoiceNumber} generated`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const payMut = useMutation({
    mutationFn: (invoiceId: string) => payFn({ data: {
      invoiceId, amount: Number(payAmount), paymentMethod: payMethod, reference: payRef || undefined,
    } }),
    onSuccess: () => { toast.success("Payment recorded"); setPayAmount(""); setPayRef(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const o = orderQ.data?.order;
  const inv = orderQ.data?.invoice;
  const payments = orderQ.data?.payments ?? [];
  const events = orderQ.data?.events ?? [];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {o?.order_number ?? "…"}</DialogTitle>
        </DialogHeader>
        {orderQ.isLoading || !o ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-slate-500">Buyer</div><div className="font-medium">{o.buyers?.company_name ?? o.buyers?.name}</div></div>
              <div><div className="text-slate-500">Listing</div><div className="font-medium">{o.grain_listings?.title}</div></div>
              <div><div className="text-slate-500">Quantity</div><div className="font-medium">{Number(o.quantity_kg).toLocaleString()} kg</div></div>
              <div><div className="text-slate-500">Total</div><div className="font-medium">{o.currency} {Number(o.subtotal).toLocaleString()}</div></div>
              <div><div className="text-slate-500">Status</div><Badge className={STATUS_COLORS[o.status] ?? ""}>{o.status}</Badge></div>
              <div><div className="text-slate-500">Placed</div><div className="font-medium">{new Date(o.created_at).toLocaleString()}</div></div>
            </div>

            {/* Transitions */}
            {(nextQ.data?.next ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Advance</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                  <div className="flex flex-wrap gap-2">
                    {nextQ.data!.next.map((s) => (
                      <Button key={s} size="sm" variant={s === "cancelled" ? "destructive" : "default"}
                        disabled={transMut.isPending}
                        onClick={() => transMut.mutate(s)}>
                        {s}
                      </Button>
                    ))}
                    {o.status === "confirmed" && !inv && (
                      <Button size="sm" variant="secondary" disabled={invMut.isPending} onClick={() => invMut.mutate()}>
                        Generate invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoice + payment */}
            {inv && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Invoice {inv.invoice_number}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm flex justify-between">
                    <span>Total: <b>{inv.currency} {Number(inv.total_amount).toLocaleString()}</b></span>
                    <span>Paid: <b>{inv.currency} {Number(inv.amount_paid ?? 0).toLocaleString()}</b></span>
                    <Badge>{inv.payment_status}</Badge>
                  </div>
                  {inv.payment_status !== "paid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" type="number" />
                      </div>
                      <div>
                        <Label className="text-xs">Method</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Reference</Label>
                        <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="TXN-…" />
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full"
                          disabled={payMut.isPending || !payAmount || Number(payAmount) <= 0}
                          onClick={() => payMut.mutate(inv.id)}>
                          Record payment
                        </Button>
                      </div>
                    </div>
                  )}
                  {payments.length > 0 && (
                    <div className="text-xs space-y-1 border-t pt-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between text-slate-600">
                          <span>{new Date(p.payment_date ?? p.created_at).toLocaleDateString()} · {p.payment_method}{p.payment_reference ? ` · ${p.payment_reference}` : ""}</span>
                          <span className="font-medium">{p.currency ?? inv.currency} {Number(p.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                {events.length === 0 && <p className="text-slate-500">No events.</p>}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {events.map((e: any) => (
                  <div key={e.id} className="flex justify-between text-slate-600 border-b py-1 last:border-0">
                    <span>{e.from_state ?? "—"} → <b>{e.to_state}</b>{e.note ? ` · ${e.note}` : ""}</span>
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <ShipmentPanel orderId={o.id} canManage orderStatus={o.status} />
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
