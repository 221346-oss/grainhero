import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  listCarriers,
  getFleetOverview,
  upsertVehicle,
  upsertDriver,
} from "@/lib/logistics.functions";

export const Route = createFileRoute("/_authenticated/platform/logistics/fleet")({
  head: () => ({ meta: [{ title: "Fleet · GrainHero" }] }),
  component: FleetPage,
});

function FleetPage() {
  const qc = useQueryClient();
  const carriersFn = useServerFn(listCarriers);
  const fleetFn = useServerFn(getFleetOverview);
  const upVeh = useServerFn(upsertVehicle);
  const upDrv = useServerFn(upsertDriver);

  const { data: carriers } = useQuery({ queryKey: ["carriers-min"], queryFn: () => carriersFn() });
  const { data: fleet } = useQuery({ queryKey: ["fleet-overview"], queryFn: () => fleetFn() });

  const saveVeh = useMutation({
    mutationFn: (p: Record<string, unknown>) => upVeh({ data: p as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fleet-overview"] }); toast.success("Vehicle saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveDrv = useMutation({
    mutationFn: (p: Record<string, unknown>) => upDrv({ data: p as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fleet-overview"] }); toast.success("Driver saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const carrierOpts = (carriers?.carriers ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

  return (
    <AdminPageShell title="Fleet" subtitle="Manage vehicles and drivers assigned to carriers.">
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles ({fleet?.vehicles.length ?? 0})</TabsTrigger>
          <TabsTrigger value="drivers">Drivers ({fleet?.drivers.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <VehicleSheet carriers={carrierOpts} onSave={(p) => saveVeh.mutate(p)} />
          </div>
          {(fleet?.vehicles ?? []).map((v) => (
            <Card key={v.id} className="border-border/40/70 hover:border-emerald-400 transition-colors">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{v.registration_no}</div>
                  <p className="text-xs text-muted-foreground">
                    {v.type} · {Number(v.capacity_kg ?? 0)}kg · {v.carriers?.name ?? "—"}
                  </p>
                </div>
                <Badge variant={v.current_status === "idle" ? "outline" : "default"}>{v.current_status}</Badge>
                <VehicleSheet initial={v} carriers={carrierOpts} onSave={(p) => saveVeh.mutate({ ...p, id: v.id })} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="drivers" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <DriverSheet carriers={carrierOpts} onSave={(p) => saveDrv.mutate(p)} />
          </div>
          {(fleet?.drivers ?? []).map((d) => {
            const daysToExpiry = d.license_expiry
              ? Math.floor((new Date(d.license_expiry as string).getTime() - Date.now()) / 86_400_000)
              : null;
            const warn = daysToExpiry != null && daysToExpiry <= 30;
            const expired = daysToExpiry != null && daysToExpiry < 0;
            return (
              <Card key={d.id} className="border-border/40/70 hover:border-emerald-400 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{d.full_name}</div>
                    <p className="text-xs text-muted-foreground">
                      {d.carriers?.name ?? "—"} · {d.phone ?? "no phone"}
                      {d.license_no ? ` · Lic ${d.license_no}` : ""}
                    </p>
                  </div>
                  {expired ? <Badge variant="destructive">Licence expired</Badge>
                    : warn ? <Badge className="bg-amber-500">Expires {daysToExpiry}d</Badge>
                    : d.license_expiry ? <span className="text-xs text-muted-foreground">exp {String(d.license_expiry).slice(0, 10)}</span>
                    : null}
                  <DriverSheet initial={d} carriers={carrierOpts} onSave={(p) => saveDrv.mutate({ ...p, id: d.id })} />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}

function VehicleSheet({ initial, carriers, onSave }: {
  initial?: Record<string, unknown>;
  carriers: { id: string; name: string }[];
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    carrier_id: String(initial?.carrier_id ?? carriers[0]?.id ?? ""),
    registration_no: String(initial?.registration_no ?? ""),
    type: String(initial?.type ?? "truck"),
    capacity_kg: Number(initial?.capacity_kg ?? 5000),
    fuel_type: String(initial?.fuel_type ?? "diesel"),
    avg_kmpl: Number(initial?.avg_kmpl ?? 5),
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm">{initial ? "Edit" : "Add vehicle"}</Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{initial ? "Edit vehicle" : "New vehicle"}</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="space-y-1">
            <Label className="text-xs">Carrier</Label>
            <Select value={f.carrier_id} onValueChange={(v) => setF({ ...f, carrier_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Registration</Label>
            <Input value={f.registration_no} onChange={(e) => setF({ ...f, registration_no: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Type</Label>
              <Input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Capacity kg</Label>
              <Input type="number" value={f.capacity_kg} onChange={(e) => setF({ ...f, capacity_kg: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label className="text-xs">Fuel</Label>
              <Input value={f.fuel_type} onChange={(e) => setF({ ...f, fuel_type: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Avg km/L</Label>
              <Input type="number" step="0.1" value={f.avg_kmpl} onChange={(e) => setF({ ...f, avg_kmpl: Number(e.target.value) })} /></div>
          </div>
          <Button className="w-full" onClick={() => { onSave(f); setOpen(false); }}>Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DriverSheet({ initial, carriers, onSave }: {
  initial?: Record<string, unknown>;
  carriers: { id: string; name: string }[];
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    carrier_id: String(initial?.carrier_id ?? carriers[0]?.id ?? ""),
    full_name: String(initial?.full_name ?? ""),
    phone: String(initial?.phone ?? ""),
    license_no: String(initial?.license_no ?? ""),
    license_expiry: initial?.license_expiry ? String(initial.license_expiry).slice(0, 10) : "",
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm">{initial ? "Edit" : "Add driver"}</Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{initial ? "Edit driver" : "New driver"}</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="space-y-1">
            <Label className="text-xs">Carrier</Label>
            <Select value={f.carrier_id} onValueChange={(v) => setF({ ...f, carrier_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Full name</Label>
            <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Licence #</Label>
              <Input value={f.license_no} onChange={(e) => setF({ ...f, license_no: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Licence expiry</Label>
            <Input type="date" value={f.license_expiry} onChange={(e) => setF({ ...f, license_expiry: e.target.value })} /></div>
          <Button className="w-full" onClick={() => {
            onSave({
              carrier_id: f.carrier_id, full_name: f.full_name,
              phone: f.phone || null, license_no: f.license_no || null,
              license_expiry: f.license_expiry || null,
            });
            setOpen(false);
          }}>Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}