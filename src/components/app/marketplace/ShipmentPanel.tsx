import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createShipment,
  appendShipmentEvent,
  markDelivered,
  getShipmentTracking,
} from "@/lib/dispatch.functions";
import { getMarketplaceSettings } from "@/lib/marketplace-settings.functions";

export function ShipmentPanel({
  orderId,
  canManage,
  orderStatus,
}: {
  orderId: string;
  canManage: boolean;
  orderStatus: string;
}) {
  const trackFn = useServerFn(getShipmentTracking);
  const settingsFn = useServerFn(getMarketplaceSettings);
  const createFn = useServerFn(createShipment);
  const appendFn = useServerFn(appendShipmentEvent);
  const deliverFn = useServerFn(markDelivered);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["shipment", orderId],
    queryFn: () => trackFn({ data: { orderId } }),
    refetchInterval: 15000,
  });
  const { data: settings } = useQuery({
    queryKey: ["marketplace-settings"],
    queryFn: () => settingsFn(),
    enabled: canManage,
  });

  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [nextStatus, setNextStatus] = useState<string>("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shipment", orderId] });
    qc.invalidateQueries({ queryKey: ["buyer-order", orderId] });
  };
  const cMut = useMutation({
    mutationFn: () =>
      createFn({ data: { orderId, courierKey: courier, trackingNumber: tracking || null } }),
    onSuccess: () => {
      toast.success("Shipment created");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const aMut = useMutation({
    mutationFn: () =>
      appendFn({
        data: {
          shipmentId: data!.shipment!.id,
          code: nextStatus || "update",
          label: eventLabel || "Update",

          setStatus: (nextStatus || undefined) as any,
        },
      }),
    onSuccess: () => {
      toast.success("Event added");
      setEventLabel("");
      setNextStatus("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const dMut = useMutation({
    mutationFn: () => deliverFn({ data: { shipmentId: data!.shipment!.id } }),
    onSuccess: () => {
      toast.success("Marked delivered");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const ship = data?.shipment ?? null;
  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Shipment & tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!ship && canManage && orderStatus === "paid" && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              No shipment yet. Dispatch this order:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Courier</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.settings.dispatch.couriers ?? []).map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tracking #</Label>
                <Input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  disabled={!courier || cMut.isPending}
                  onClick={() => cMut.mutate()}
                >
                  Create shipment
                </Button>
              </div>
            </div>
          </div>
        )}
        {!ship && !canManage && (
          <div className="text-sm text-muted-foreground">Waiting for the seller to dispatch.</div>
        )}
        {ship && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{ship.status}</Badge>
              <span>{ship.courier_label}</span>
              {ship.tracking_number && (
                <span className="text-muted-foreground">#{ship.tracking_number}</span>
              )}
              {ship.tracking_url && (
                <a
                  href={ship.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Track on courier
                </a>
              )}
            </div>
            <div className="space-y-1 text-xs border-t pt-2">
              {events.length === 0 ? (
                <div className="text-muted-foreground">No tracking events yet.</div>
              ) : (
                (
                  events as Array<{
                    id: string;
                    label: string;
                    location: string | null;
                    at: string;
                  }>
                ).map((e) => (
                  <div
                    key={e.id}
                    className="flex justify-between border-b py-1 last:border-0 text-slate-600"
                  >
                    <span>
                      <b>{e.label}</b>
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                    <span>{new Date(e.at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            {canManage && ship.status !== "delivered" && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-t pt-3">
                <Input
                  placeholder="Event label"
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                />
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_transit">in_transit</SelectItem>
                    <SelectItem value="out_for_delivery">out_for_delivery</SelectItem>
                    <SelectItem value="exception">exception</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={aMut.isPending || !eventLabel}
                  onClick={() => aMut.mutate()}
                >
                  Append event
                </Button>
                <Button disabled={dMut.isPending} onClick={() => dMut.mutate()}>
                  Mark delivered
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
