import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, Send, Calendar as CalIcon, Warehouse, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getInstallation, upsertInstallation, upsertDevices, addVisitEvent, advanceInstallStage } from "@/lib/installations.functions";
import { RouteMapCard } from "./RouteMapCard";
import { Link } from "@tanstack/react-router";
import { InstallStageTracker, deriveStage } from "./InstallStageTracker";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

interface Props { orderId: string | null; open: boolean; onOpenChange: (v: boolean) => void; canEdit: boolean }

const DEVICE_STATUS = ["shipped", "en_route", "installed", "verified"];

export function InstallationDrawer({ orderId, open, onOpenChange, canEdit }: Props) {
  const qc = useQueryClient();
  const getFn = useServerFn(getInstallation);
  const saveFn = useServerFn(upsertInstallation);
  const devFn = useServerFn(upsertDevices);
  const eventFn = useServerFn(addVisitEvent);
  const advanceFn = useServerFn(advanceInstallStage);
  const myProfile = useMyProfile();
  const isSuper = useIsSuperAdmin();

  const q = useQuery({
    queryKey: ["installation", orderId],
    queryFn: () => getFn({ data: { orderId: orderId! } }),
    enabled: !!orderId && open,
  });

  const install = q.data?.installation as any;
  const order = q.data?.order as any;
  const companyOrigin = (q.data as any)?.companyOrigin as string | undefined;
  const adminId = order?.admin_id as string | undefined;
  const events = ((q.data as any)?.events ?? []) as Array<Record<string, unknown>>;
  const { stage, blocked, blockerNote, history } = deriveStage(order, install, events);
  const canAdvanceAs = {
    superAdmin: !!isSuper.data,
    admin: !!myProfile.data?.id && myProfile.data.id === adminId,
  };

  // form state
  const [form, setForm] = useState<any>({});
  const [devices, setDevices] = useState<{ serial: string; model: string; status: string }[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    setForm({
      ...(install ?? {}),
      origin_address: install?.origin_address || companyOrigin || "",
    });
    setDevices((q.data?.devices as any[])?.map((d) => ({ serial: d.serial, model: d.model ?? "", status: d.status })) ?? []);
  }, [q.data, install, companyOrigin]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const saveM = useMutation({
    mutationFn: () => saveFn({ data: { orderId: orderId!, patch: {
      city: form.city, warehouse_id: form.warehouse_id ?? null, silo_id: form.silo_id ?? null,
      scheduled_visit_at: form.scheduled_visit_at ? new Date(form.scheduled_visit_at).toISOString() : null,
      origin_address: form.origin_address, origin_lat: form.origin_lat ? Number(form.origin_lat) : null, origin_lng: form.origin_lng ? Number(form.origin_lng) : null,
      destination_address: form.destination_address, destination_lat: form.destination_lat ? Number(form.destination_lat) : null, destination_lng: form.destination_lng ? Number(form.destination_lng) : null,
    } } }),
    onSuccess: () => { toast.success("Installation saved"); qc.invalidateQueries({ queryKey: ["installation", orderId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const saveDevM = useMutation({
    mutationFn: () => devFn({ data: { orderId: orderId!, devices: devices.filter((d) => d.serial.trim()) } }),
    onSuccess: () => { toast.success("Devices saved"); qc.invalidateQueries({ queryKey: ["installation", orderId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const noteM = useMutation({
    mutationFn: () => eventFn({ data: { orderId: orderId!, note } }),
    onSuccess: () => { toast.success("Note added"); setNote(""); qc.invalidateQueries({ queryKey: ["installation", orderId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const mapProps = useMemo(() => ({
    originAddress: form.origin_address ?? install?.origin_address,
    originLat: form.origin_lat ? Number(form.origin_lat) : install?.origin_lat,
    originLng: form.origin_lng ? Number(form.origin_lng) : install?.origin_lng,
    destAddress: form.destination_address ?? install?.destination_address ?? order?.install_address,
    destLat: form.destination_lat ? Number(form.destination_lat) : install?.destination_lat,
    destLng: form.destination_lng ? Number(form.destination_lng) : install?.destination_lng,
  }), [form, install, order]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Installation tracking {order?.id ? `· ${String(order.id).slice(0, 8)}` : ""}</SheetTitle>
        </SheetHeader>
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-4 space-y-6">
            <InstallStageTracker
              stage={stage}
              blocked={blocked}
              blockerNote={blockerNote}
              history={history}
              variant="full"
              canAdvanceAs={canAdvanceAs}
              onAdvance={async (next, note) => {
                if (next === "completed") {
                  // ensure devices are persisted so the provision trigger sees them
                  if (devices.filter((d) => d.serial.trim()).length === 0) {
                    toast.error("Add at least one device serial before completing — one silo is provisioned per serial.");
                    return;
                  }
                  await saveDevM.mutateAsync();
                }
                try {
                  await advanceFn({ data: { orderId: orderId!, next, note } });
                  toast.success(next === "completed" ? "Confirmed — warehouse & silos provisioned." : `Advanced to ${next.replace("_", " ")}`);
                  qc.invalidateQueries({ queryKey: ["installation", orderId] });
                  qc.invalidateQueries({ queryKey: ["platform-orders"] });
                  qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
                } catch (e: any) {
                  toast.error(e.message ?? "Failed to advance");
                }
              }}
            />
            {canEdit && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="City" v={form.city} onChange={(v) => set("city", v)} />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><CalIcon className="h-3 w-3" /> Scheduled visit</label>
                      <Input type="datetime-local" value={form.scheduled_visit_at ? new Date(form.scheduled_visit_at).toISOString().slice(0, 16) : ""} onChange={(e) => set("scheduled_visit_at", e.target.value)} />
                    </div>
                  </div>
                  {adminId && (
                    <Button asChild size="sm" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                      <Link to="/admins/$adminId" params={{ adminId }}>
                        <Warehouse className="h-3.5 w-3.5 mr-1" /> Open admin profile
                        <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Map */}
            <div>
              <div className="text-sm font-semibold text-foreground mb-2">Route</div>
              <RouteMapCard {...mapProps} />
              {canEdit && (
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <Field label="Origin address (company HQ — editable in Platform settings)" v={form.origin_address} onChange={(v) => set("origin_address", v)} full />
                  <Field label="Destination address (from buyer's install order)" v={form.destination_address} onChange={(v) => set("destination_address", v)} full />
                  <div className="text-[11px] text-muted-foreground">Coordinates are captured from the buyer's map pin at checkout; no need to enter lat/lng manually.</div>
                </div>
              )}
            </div>

            {canEdit && (
              <Button onClick={() => saveM.mutate()} disabled={saveM.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" /> {saveM.isPending ? "Saving…" : "Save installation details"}
              </Button>
            )}

            {/* Devices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-foreground">Devices ({devices.length})</div>
                {canEdit && <Button size="sm" variant="ghost" onClick={() => setDevices((d) => [...d, { serial: "", model: "", status: "shipped" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>}
              </div>
              <div className="space-y-2">
                {devices.length === 0 && <div className="text-xs text-muted-foreground">No devices linked yet.</div>}
                {devices.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                    <Input placeholder="Serial" value={d.serial} readOnly={!canEdit} onChange={(e) => setDevices((arr) => arr.map((x, idx) => idx === i ? { ...x, serial: e.target.value } : x))} />
                    <Input placeholder="Model" value={d.model} readOnly={!canEdit} onChange={(e) => setDevices((arr) => arr.map((x, idx) => idx === i ? { ...x, model: e.target.value } : x))} />
                    <select disabled={!canEdit} className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={d.status} onChange={(e) => setDevices((arr) => arr.map((x, idx) => idx === i ? { ...x, status: e.target.value } : x))}>
                      {DEVICE_STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    {canEdit && <Button size="icon" variant="ghost" onClick={() => setDevices((arr) => arr.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>}
                  </div>
                ))}
              </div>
              {canEdit && devices.length > 0 && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => saveDevM.mutate()} disabled={saveDevM.isPending}>Save devices</Button>
              )}
            </div>

            {/* Visit timeline */}
            <div>
              <div className="text-sm font-semibold text-foreground mb-2">Visit timeline</div>
              <div className="space-y-2 mb-3">
                {(q.data?.events ?? []).length === 0 && <div className="text-xs text-muted-foreground">No visit events yet.</div>}
                {(q.data?.events ?? []).map((e: any) => (
                  <div key={e.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="text-xs text-muted-foreground mb-1">{new Date(e.event_at).toLocaleString()}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{e.note}</div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Add note…" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button onClick={() => noteM.mutate()} disabled={!note.trim() || noteM.isPending}><Send className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, v, onChange, full }: { label: string; v: any; onChange: (v: string) => void; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={v ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
