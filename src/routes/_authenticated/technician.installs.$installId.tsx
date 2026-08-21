import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInstallDetail,
  updateInstallStatus,
  logVisitEvent,
  commissionDevice,
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
import { ArrowLeft, CheckCircle2, Ban, Truck, HardHat, Cpu } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/technician/installs/$installId")({
  head: () => ({ meta: [{ title: "Install detail — Technician" }] }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw redirect({ to: "/auth/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", session.user.id)
      .maybeSingle();
    if (profile?.admin_id != null) throw redirect({ to: "/dashboard" });
  },
  component: TechnicianInstallDetailPage,
});

const STATUS_STEPS = ["scheduled", "en_route", "onsite", "completed"] as const;

function TechnicianInstallDetailPage() {
  const { installId } = Route.useParams();
  const qc = useQueryClient();

  // Realtime: invalidate when this install or its order changes
  useEffect(() => {
    const channel = supabase
      .channel("tech-install-detail")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_installations" },
        () => {
          qc.invalidateQueries({ queryKey: ["technician.install", installId] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["technician.install", installId] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_visit_events" },
        () => {
          qc.invalidateQueries({ queryKey: ["technician.install", installId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_devices" },
        () => {
          qc.invalidateQueries({ queryKey: ["technician.install", installId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, installId]);
  const fetchDetail = useServerFn(getInstallDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["technician.install", installId],
    queryFn: () => fetchDetail({ data: { installId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["technician.install", installId] });
  const statusFn = useServerFn(updateInstallStatus);
  const eventFn = useServerFn(logVisitEvent);
  const commissionFn = useServerFn(commissionDevice);

  const setStatus = useMutation({
    mutationFn: (v: {
      status: "scheduled" | "en_route" | "onsite" | "completed" | "blocked";
      blockerNote?: string;
    }) => statusFn({ data: { installId, status: v.status, blockerNote: v.blockerNote ?? null } }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });
  const addEvent = useMutation({
    mutationFn: (v: {
      eventType: "arrived" | "inspection" | "install" | "test" | "handover" | "issue";
      note?: string;
    }) => eventFn({ data: { installId, eventType: v.eventType, note: v.note ?? null } }),
    onSuccess: () => {
      toast.success("Event logged");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });
  const commission = useMutation({
    mutationFn: (v: {
      orderDeviceId: string;
      serialNumber: string;
      siloId: string;
      deviceType: string;
    }) => commissionFn({ data: { installId, ...v } }),
    onSuccess: () => {
      toast.success("Device commissioned");
      invalidate();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading || !data)
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  const { install, devices, events, silos, buyer } = data;
  const status = install.status as string;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link
        to="/technician/installs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My installs
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Install {install.id.slice(0, 8)}
          </h1>
          {install.scheduled_for && (
            <p className="text-sm text-muted-foreground">
              Scheduled {new Date(install.scheduled_for).toLocaleString()}
            </p>
          )}
        </div>
        <Badge className="capitalize">{status.replace("_", " ")}</Badge>
      </div>

      {/* Status stepper */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {STATUS_STEPS.map((s, idx) => {
          const currentIdx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
          const done = currentIdx >= idx && status !== "blocked";
          return (
            <button
              key={s}
              onClick={() => setStatus.mutate({ status: s })}
              className={`px-3 py-1.5 rounded text-xs capitalize border transition-colors ${
                done
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
              }`}
            >
              {idx + 1}. {s.replace("_", " ")}
            </button>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          className="ml-2 text-rose-700"
          onClick={() => {
            const note = prompt("Blocker reason?") || "";
            if (note.trim().length >= 3)
              setStatus.mutate({ status: "blocked", blockerNote: note.trim() });
          }}
        >
          <Ban className="h-4 w-4 mr-1" /> Mark blocked
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Buyer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{buyer?.name ?? "—"}</div>
            <div className="text-muted-foreground">{buyer?.email ?? "—"}</div>
            <div className="text-muted-foreground">{buyer?.phone ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>{install.hardware_orders?.install_address ?? "—"}</div>
            <div className="text-muted-foreground">
              {install.hardware_orders?.install_city ?? ""}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardHat className="h-4 w-4" /> Log a visit event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm onSubmit={(v) => addEvent.mutate(v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-muted-foreground">No events yet.</div>
          ) : (
            events.map((e) => (
              <div key={e.id as string} className="py-1.5 border-b last:border-0">
                <div className="font-medium capitalize">{e.event_type}</div>
                {e.note && <div className="text-muted-foreground">{e.note}</div>}
                <div className="text-xs text-muted-foreground">
                  {new Date(e.created_at as string).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No devices on this order.</div>
          ) : (
            devices.map((d) => (
              <div key={d.id as string} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{d.device_type ?? "device"}</div>
                  {d.commissioned_at ? (
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Commissioned
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
                {d.commissioned_at ? (
                  <div className="text-xs text-muted-foreground mt-1">Serial {d.serial_number}</div>
                ) : (
                  <CommissionForm
                    silos={silos}
                    onSubmit={(v) =>
                      commission.mutate({
                        orderDeviceId: d.id as string,
                        serialNumber: v.serial,
                        siloId: v.siloId,
                        deviceType: (d.device_type as string) ?? "sensor",
                      })
                    }
                  />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventForm({
  onSubmit,
}: {
  onSubmit: (v: {
    eventType: "arrived" | "inspection" | "install" | "test" | "handover" | "issue";
    note?: string;
  }) => void;
}) {
  const [type, setType] = useState<
    "arrived" | "inspection" | "install" | "test" | "handover" | "issue"
  >("arrived");
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["arrived", "inspection", "install", "test", "handover", "issue"].map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        rows={1}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
      />
      <Button
        onClick={() => {
          onSubmit({ eventType: type, note: note.trim() || undefined });
          setNote("");
        }}
      >
        Log
      </Button>
    </div>
  );
}

function CommissionForm({
  silos,
  onSubmit,
}: {
  silos: Array<Record<string, unknown>>;
  onSubmit: (v: { serial: string; siloId: string }) => void;
}) {
  const [serial, setSerial] = useState("");
  const [siloId, setSiloId] = useState("");
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] mt-2">
      <div className="space-y-1">
        <Label className="text-xs">Serial number</Label>
        <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Silo</Label>
        <Select value={siloId} onValueChange={setSiloId}>
          <SelectTrigger>
            <SelectValue placeholder="Pick silo" />
          </SelectTrigger>
          <SelectContent>
            {silos.map((s) => (
              <SelectItem key={s.id as string} value={s.id as string}>
                {s.name as string}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button
          disabled={serial.length < 3 || !siloId}
          onClick={() => onSubmit({ serial: serial.trim(), siloId })}
        >
          Commission
        </Button>
      </div>
    </div>
  );
}
