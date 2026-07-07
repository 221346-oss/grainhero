import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listAllHardwareOrders,
  updateHardwareOrder,
  sendOrderMessage,
} from "@/lib/hardware-orders.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Wrench, XCircle, CheckCircle2, PackageCheck, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/orders")({
  head: () => ({ meta: [{ title: "Install orders — Platform" }] }),
  component: PlatformOrdersPage,
});

const STATUSES = [
  "pending_payment", "new", "approved", "tech_assigned", "installed", "live", "cancelled",
] as const;

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-slate-200 text-slate-700",
  new: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  tech_assigned: "bg-indigo-100 text-indigo-800",
  installed: "bg-emerald-100 text-emerald-800",
  live: "bg-emerald-600 text-white",
  cancelled: "bg-red-100 text-red-700",
};

function PlatformOrdersPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAllHardwareOrders);
  const updateFn = useServerFn(updateHardwareOrder);
  const messageFn = useServerFn(sendOrderMessage);
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-orders"],
    queryFn: () => fetchFn(),
  });
  const orders = (data?.orders ?? []).filter((o) => filter === "all" || o.status === filter);

  const update = useMutation({
    mutationFn: (v: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-orders"] });
      toast.success("Order updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMsg = useMutation({
    mutationFn: (v: Parameters<typeof messageFn>[0]["data"]) => messageFn({ data: v }),
    onSuccess: (r) => toast.success(r.emailed ? "Message sent + emailed" : "Message sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = (data?.orders ?? []).reduce<Record<string, number>>((acc, o) => {
    const s = String(o.status);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Install orders</h2>
          <p className="text-xs text-slate-500">Manage every hardware install request placed by customers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Filter</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({data?.orders.length ?? 0})</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")} ({counts[s] ?? 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders…</div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">No orders match this filter.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => (
            <OrderRow key={o.id as string} order={o}
              onUpdate={(v) => update.mutate({ orderId: o.id as string, ...v })}
              onMessage={(v) => sendMsg.mutate({ orderId: o.id as string, ...v })}
              busy={update.isPending || sendMsg.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({
  order, onUpdate, onMessage, busy,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  onUpdate: (v: { status?: (typeof STATUSES)[number]; technicianName?: string; technicianPhone?: string; scheduledInstallDate?: string; cancelReason?: string; refunded?: boolean }) => void;
  onMessage: (v: { message: string; emailBuyer: boolean }) => void;
  busy: boolean;
}) {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(order.status);
  const [techName, setTechName] = useState<string>(order.technician_name ?? "");
  const [techPhone, setTechPhone] = useState<string>(order.technician_phone ?? "");
  const [scheduled, setScheduled] = useState<string>(
    order.scheduled_install_date ? new Date(order.scheduled_install_date).toISOString().slice(0, 16) : "",
  );
  const [message, setMessage] = useState("");
  const [emailBuyer, setEmailBuyer] = useState(true);
  const [cancelReason, setCancelReason] = useState("");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">
              {order.plan_name ?? order.plan_id} · {order.hardware_quantity} sensor{order.hardware_quantity === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription className="text-xs">
              {order.buyer?.name ?? "—"} · {order.buyer?.email ?? "—"} · placed {new Date(order.created_at).toLocaleString()}
            </CardDescription>
          </div>
          <Badge className={STATUS_STYLE[order.status] ?? ""}>{String(order.status).replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2 text-slate-700">
          <div><b>Address:</b> {order.install_address}, {order.install_city}, {order.install_country}</div>
          <div><b>Phone:</b> {order.contact_phone ?? "—"}</div>
          <div><b>Preferred:</b> {order.preferred_install_date ?? "—"}</div>
          <div><b>Hardware total:</b> Rs. {Number(order.hardware_total ?? 0).toLocaleString()}</div>
          {order.business_name && <div><b>Business:</b> {order.business_name}</div>}
          {order.tax_id && <div><b>Tax ID:</b> {order.tax_id}</div>}
          {order.notes && <div className="md:col-span-2"><b>Notes:</b> {order.notes}</div>}
        </div>

        <div className="grid gap-3 md:grid-cols-4 border-t border-slate-100 pt-4">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Technician name</Label>
            <Input className="h-9 text-xs" value={techName} onChange={(e) => setTechName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Technician phone</Label>
            <Input className="h-9 text-xs" value={techPhone} onChange={(e) => setTechPhone(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Scheduled install</Label>
            <Input type="datetime-local" className="h-9 text-xs" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => onUpdate({
            status,
            technicianName: techName,
            technicianPhone: techPhone,
            scheduledInstallDate: scheduled ? new Date(scheduled).toISOString() : null as unknown as string,
          })}>
            <Wrench className="h-3.5 w-3.5 mr-1" /> Save assignment
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onUpdate({ status: "installed" })}>
            <PackageCheck className="h-3.5 w-3.5 mr-1" /> Mark installed
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onUpdate({ status: "live" })}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark live
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Message buyer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send message to buyer</DialogTitle>
                <DialogDescription>Goes to their in-app notifications{emailBuyer ? " and email inbox" : ""}.</DialogDescription>
              </DialogHeader>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Hi, our technician will arrive at…" />
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={emailBuyer} onChange={(e) => setEmailBuyer(e.target.checked)} />
                Also send by email
              </label>
              <DialogFooter>
                <Button disabled={busy || message.trim().length === 0} onClick={() => onMessage({ message: message.trim(), emailBuyer })}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {order.status !== "cancelled" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive"><XCircle className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel this install order?</DialogTitle>
                  <DialogDescription>The buyer will be notified. Refunds are handled separately in Stripe.</DialogDescription>
                </DialogHeader>
                <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (optional)" />
                <DialogFooter>
                  <Button variant="destructive" disabled={busy} onClick={() => onUpdate({ status: "cancelled", cancelReason })}>
                    Confirm cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}