import { createFileRoute } from '@tanstack/react-router'
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
import { PlatformOrdersSkeleton } from "@/components/app/skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { InstallationDrawer } from "@/components/app/orders/InstallationDrawer";
import { Truck, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [installOrderId, setInstallOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-orders"],
    queryFn: () => fetchFn(),
  });
  const orders = (data?.orders ?? []).filter((o) => filter === "all" || o.status === filter);

  const update = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-orders"] });
      toast.success("Order updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMsg = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (v: any) => messageFn({ data: v }),
    onSuccess: (r) => toast.success(r.emailed ? "Message sent + emailed" : "Message sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = (data?.orders ?? []).reduce<Record<string, number>>((acc, o) => {
    const s = String(o.status);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  // Calculate total revenue from hardware orders
  const totalRevenue = (data?.orders ?? []).reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);
  const completedRevenue = (data?.orders ?? [])
    .filter((o) => o.status === "installed" || o.status === "live")
    .reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);
  const pendingRevenue = (data?.orders ?? [])
    .filter((o) => o.status !== "cancelled" && o.status !== "installed" && o.status !== "live")
    .reduce((sum, o) => sum + (Number(o.hardware_total) || 0), 0);

  return (
    <AdminPageShell title="Install orders" subtitle="Hardware installation requests from customers">
      <AdminSummaryTiles
        columns={3}
        tiles={[
          { key: "t", label: "Total revenue", value: `PKR ${totalRevenue.toLocaleString()}`, hint: `${data?.orders.length ?? 0} orders` },
          { key: "c", label: "Completed", value: `PKR ${completedRevenue.toLocaleString()}`, hint: `${(data?.orders ?? []).filter((o) => o.status === "installed" || o.status === "live").length} installed` },
          { key: "p", label: "Pending", value: `PKR ${pendingRevenue.toLocaleString()}`, hint: `${(data?.orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "installed" && o.status !== "live").length} in progress` },
        ]}
      />

      <AdminFilterBar onSubmit={() => { /* client-side */ }}>
        <AdminFilterField label="Status" width="w-56">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All orders ({data?.orders.length ?? 0})</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")} ({counts[s] ?? 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AdminFilterField>
      </AdminFilterBar>

      {isLoading ? (
        <PlatformOrdersSkeleton />
      ) : orders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">No orders match this filter</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <OrderTableRow
                    key={o.id as string}
                    order={o}
                    onUpdate={(v) => update.mutate({ orderId: o.id as string, ...v })}
                    onMessage={(v) => sendMsg.mutate({ orderId: o.id as string, ...v })}
                    busy={update.isPending || sendMsg.isPending}
                    onOpenInstall={() => setInstallOrderId(o.id as string)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <InstallationDrawer
        orderId={installOrderId}
        open={!!installOrderId}
        onOpenChange={(v) => !v && setInstallOrderId(null)}
        canEdit
      />
    </AdminPageShell>
  );
}

function OrderTableRow({
  order, onUpdate, onMessage, busy, onOpenInstall,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  onUpdate: (v: { status?: (typeof STATUSES)[number]; technicianName?: string; technicianPhone?: string; scheduledInstallDate?: string; cancelReason?: string; refunded?: boolean }) => void;
  onMessage: (v: { message: string; emailBuyer: boolean }) => void;
  busy: boolean;
  onOpenInstall: () => void;
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="font-medium text-sm">{order.plan_name ?? order.plan_id}</div>
          <div className="text-xs text-muted-foreground">{order.hardware_quantity} sensor{order.hardware_quantity === 1 ? "" : "s"} · {String(order.id).slice(0, 8)}</div>
        </TableCell>
        <TableCell>
          <div className="text-sm">{order.buyer?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{order.buyer?.email ?? "—"}</div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
          {[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}
        </TableCell>
        <TableCell className="text-sm font-medium">Rs. {Number(order.hardware_total ?? 0).toLocaleString()}</TableCell>
        <TableCell><Badge className={STATUS_STYLE[order.status] ?? ""}>{String(order.status).replace("_", " ")}</Badge></TableCell>
        <TableCell className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>Details & assignment</DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenInstall}><Truck className="h-3.5 w-3.5 mr-1.5" /> Installation tracking</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMsgOpen(true)}>Message buyer</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={busy} onClick={() => onUpdate({ status: "installed" })}>Mark installed</DropdownMenuItem>
              <DropdownMenuItem disabled={busy} onClick={() => onUpdate({ status: "live" })}>Mark live</DropdownMenuItem>
              {order.status !== "cancelled" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => setCancelOpen(true)}>Cancel order</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Details / assignment dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>{order.plan_name ?? order.plan_id} · {String(order.id).slice(0, 8)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:grid-cols-2 text-sm">
            <div><b>Address:</b> {order.install_address}, {order.install_city}, {order.install_country}</div>
            <div><b>Phone:</b> {order.contact_phone ?? "—"}</div>
            <div><b>Preferred:</b> {order.preferred_install_date ?? "—"}</div>
            <div><b>Hardware total:</b> Rs. {Number(order.hardware_total ?? 0).toLocaleString()}</div>
            {order.business_name && <div><b>Business:</b> {order.business_name}</div>}
            {order.tax_id && <div><b>Tax ID:</b> {order.tax_id}</div>}
            {order.notes && <div className="md:col-span-2"><b>Notes:</b> {order.notes}</div>}
          </div>
          <div className="grid gap-2 md:grid-cols-2 border-t pt-3">
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
              <Label className="text-xs">Scheduled install</Label>
              <Input type="datetime-local" className="h-9 text-xs" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Technician name</Label>
              <Input className="h-9 text-xs" value={techName} onChange={(e) => setTechName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Technician phone</Label>
              <Input className="h-9 text-xs" value={techPhone} onChange={(e) => setTechPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy} onClick={() => { onUpdate({ status, technicianName: techName, technicianPhone: techPhone, scheduledInstallDate: scheduled ? new Date(scheduled).toISOString() : null as unknown as string }); setDetailsOpen(false); }}>
              Save assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message dialog */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
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
            <Button disabled={busy || message.trim().length === 0} onClick={() => { onMessage({ message: message.trim(), emailBuyer }); setMsgOpen(false); }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this install order?</DialogTitle>
            <DialogDescription>The buyer will be notified. Refunds are handled separately in Stripe.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="destructive" disabled={busy} onClick={() => { onUpdate({ status: "cancelled", cancelReason }); setCancelOpen(false); }}>Confirm cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
