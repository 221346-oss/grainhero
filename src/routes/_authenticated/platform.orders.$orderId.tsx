import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import {
  getOrderDetail,
  assignTechnician,
  markShipped,
  cancelOrder,
  listTechniciansForAssignment,
} from "@/lib/hardware-lifecycle.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Truck, UserCheck, XCircle, Cpu } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HardwareOrderThread } from "@/components/app/orders/HardwareOrderThread";

export const Route = createFileRoute("/_authenticated/platform/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order detail — Platform" }] }),
  component: OrderDetailPage,
});

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-slate-200 text-slate-700",
  paid: "bg-blue-100 text-blue-800",
  packing: "bg-amber-100 text-amber-800",
  shipped: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  installing: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-600 text-white",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-slate-200 text-slate-700",
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getOrderDetail);
  const fetchTechs = useServerFn(listTechniciansForAssignment);

  const { data, isLoading } = useQuery({
    queryKey: ["platform.order", orderId],
    queryFn: () => fetchDetail({ data: { orderId } }),
  });
  const { data: techData } = useQuery({
    queryKey: ["platform.technicians"],
    queryFn: () => fetchTechs(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["platform.order", orderId] });

  const assignFn = useServerFn(assignTechnician);
  const shipFn = useServerFn(markShipped);
  const cancelFn = useServerFn(cancelOrder);

  const assign = useMutation({
    mutationFn: (v: { technicianId: string; scheduledFor?: string }) =>
      assignFn({
        data: { orderId, technicianId: v.technicianId, scheduledFor: v.scheduledFor || null },
      }),
    onSuccess: () => {
      toast.success("Technician assigned");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });
  const ship = useMutation({
    mutationFn: (v: {
      carrier: string;
      trackingNumber: string;
      eta?: string;
      driverName?: string;
      driverPhone?: string;
      vehiclePlate?: string;
    }) =>
      shipFn({
        data: {
          orderId,
          carrier: v.carrier,
          trackingNumber: v.trackingNumber,
          expectedArrivalAt: v.eta || null,
          driverName: v.driverName || null,
          driverPhone: v.driverPhone || null,
          vehiclePlate: v.vehiclePlate || null,
        },
      }),
    onSuccess: () => {
      toast.success("Marked shipped");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });
  const cancel = useMutation({
    mutationFn: (v: { reason: string }) => cancelFn({ data: { orderId, reason: v.reason } }),
    onSuccess: () => {
      toast.success("Order cancelled");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading || !data) {
    return (
      <AdminPageShell title="Order Detail" subtitle="">
        <div className="p-6">
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        </div>
      </AdminPageShell>
    );
  }
  const { order, installs, history, devices, buyer, technician } = data;
  const status = order.status_normalized as string;

  return (
    <AdminPageShell
      title={`Order ${order.id.slice(0, 8)}`}
      subtitle={`Created ${new Date(order.created_at).toLocaleString()}`}
      actions={
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLOR[status]}>{status.replace("_", " ")}</Badge>
          <AssignSheet
            technicians={techData?.technicians ?? []}
            onSubmit={(v) => assign.mutate(v)}
          />
          <ShipSheet onSubmit={(v) => ship.mutate(v)} />
          <CancelSheet onSubmit={(v) => cancel.mutate(v)} />
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <Link
          to="/platform/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All orders
        </Link>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Buyer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{buyer?.name ?? order.customer_name ?? "—"}</div>
              <div className="text-muted-foreground">{buyer?.email ?? order.customer_email}</div>
              <div className="text-muted-foreground">{buyer?.phone ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Technician</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {technician ? (
                <>
                  <div className="font-medium">{technician.name}</div>
                  <div className="text-muted-foreground">{technician.email}</div>
                  <div className="text-muted-foreground">{technician.phone ?? "—"}</div>
                </>
              ) : (
                <div className="text-muted-foreground">Not assigned yet</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Shipping</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {order.tracking_carrier ? (
                <>
                  <div className="font-medium">{order.tracking_carrier}</div>
                  <div className="text-muted-foreground">#{order.tracking_number}</div>
                  {order.expected_arrival_at && (
                    <div className="text-muted-foreground">
                      ETA {new Date(order.expected_arrival_at).toLocaleDateString()}
                    </div>
                  )}
                  {order.driver_name && (
                    <div className="pt-1 mt-1 border-t">
                      <div className="font-medium">
                        🚚 {order.driver_name}
                        {order.driver_phone ? ` · ${order.driver_phone}` : ""}
                      </div>
                      {order.vehicle_plate && (
                        <div className="text-xs text-muted-foreground">
                          Vehicle: {order.vehicle_plate}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Not shipped yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="text-sm text-muted-foreground">No devices on this order.</div>
            ) : (
              <ul className="divide-y">
                {devices.map((d) => (
                  <li
                    key={d.id as string}
                    className="py-2 flex items-center justify-between text-sm"
                  >
                    <span>
                      {d.device_type ?? "device"} ·{" "}
                      {d.serial_number ?? (
                        <span className="italic text-muted-foreground">no serial</span>
                      )}
                    </span>
                    {d.commissioned_at ? (
                      <Badge className="bg-emerald-100 text-emerald-800">Commissioned</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Installations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {installs.length === 0 ? (
                <div className="text-muted-foreground">None scheduled</div>
              ) : (
                installs.map((i) => (
                  <div
                    key={i.id as string}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium capitalize">{i.status?.replace("_", " ")}</div>
                      {i.scheduled_for && (
                        <div className="text-muted-foreground">
                          {new Date(i.scheduled_for).toLocaleString()}
                        </div>
                      )}
                      {i.blocker_note && (
                        <div className="text-rose-700">Blocked: {i.blocker_note}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status history</CardTitle>
            </CardHeader>
            <CardContent className="text-sm max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-muted-foreground">No transitions yet</div>
              ) : (
                history.map((h) => (
                  <div key={h.id as string} className="py-1.5 border-b last:border-0">
                    <div className="font-medium">
                      {h.from_status} → {h.to_status}
                    </div>
                    {h.note && <div className="text-muted-foreground">{h.note}</div>}
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <HardwareOrderThread orderId={orderId} as="super_admin" />
      </div>
    </AdminPageShell>
  );
}

function AssignSheet({
  technicians,
  onSubmit,
}: {
  technicians: Array<Record<string, unknown>>;
  onSubmit: (v: { technicianId: string; scheduledFor?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [techId, setTechId] = useState("");
  const [when, setWhen] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserCheck className="h-4 w-4 mr-1" />
        Assign
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Assign technician</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Technician</Label>
              <Select value={techId} onValueChange={setTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id as string} value={t.id as string}>
                      {(t.name as string) || (t.email as string)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled for (optional)</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!techId}
              onClick={() => {
                onSubmit({
                  technicianId: techId,
                  scheduledFor: when ? new Date(when).toISOString() : undefined,
                });
                setOpen(false);
              }}
            >
              Assign
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ShipSheet({
  onSubmit,
}: {
  onSubmit: (v: {
    carrier: string;
    trackingNumber: string;
    eta?: string;
    driverName?: string;
    driverPhone?: string;
    vehiclePlate?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tn, setTn] = useState("");
  const [eta, setEta] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [plate, setPlate] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Truck className="h-4 w-4 mr-1" />
        Mark shipped
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Mark as shipped</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="TCS / Leopards / DHL"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tracking number</Label>
              <Input value={tn} onChange={(e) => setTn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ETA (optional)</Label>
              <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Driver contact — for delivery coordination
              </p>
              <div className="space-y-1.5">
                <Label>Driver name</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver's full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Driver phone</Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle plate</Label>
                <Input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="e.g. LES-1234"
                />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!carrier || !tn}
              onClick={() => {
                onSubmit({
                  carrier,
                  trackingNumber: tn,
                  eta: eta ? new Date(eta).toISOString() : undefined,
                  driverName: driverName.trim() || undefined,
                  driverPhone: driverPhone.trim() || undefined,
                  vehiclePlate: plate.trim() || undefined,
                });
                setOpen(false);
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CancelSheet({ onSubmit }: { onSubmit: (v: { reason: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" className="text-rose-700" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4 mr-1" />
        Cancel
      </Button>
      {/* Confirmation, not a form — popup modal per the side-panel convention (see components/ui/sheet.tsx). */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3}
              onClick={() => {
                onSubmit({ reason: reason.trim() });
                setOpen(false);
              }}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
