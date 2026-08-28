import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listPushDeliveries,
  listRegisteredDevices,
  sendTestPush,
} from "@/lib/mobile-push-diagnostics.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/platform/mobile-push-diagnostics")({
  head: () => ({
    meta: [
      { title: "Platform · Mobile Push Diagnostics — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Mobile Push Diagnostics workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Mobile Push Diagnostics — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Mobile Push Diagnostics workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PushDiagnosticsPage,
});

function PushDiagnosticsPage() {
  const loadDev = useServerFn(listRegisteredDevices);
  const loadDel = useServerFn(listPushDeliveries);
  const test = useServerFn(sendTestPush);
  const qc = useQueryClient();
  const { data: devs } = useQuery({ queryKey: ["mobile-devices"], queryFn: () => loadDev() });
  const { data: dels } = useQuery({
    queryKey: ["mobile-push-deliveries"],
    queryFn: () => loadDel(),
  });

  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("GrainHero test");
  const [body, setBody] = useState("This is a diagnostic push.");

  const testMut = useMutation({
    mutationFn: () => test({ data: { device_id: deviceId, title, body } }),
    onSuccess: (r) => {
      const status = (r as { status?: string }).status ?? "unknown";
      toast.success(`Push ${status}`);
      qc.invalidateQueries({ queryKey: ["mobile-devices"] });
      qc.invalidateQueries({ queryKey: ["mobile-push-deliveries"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const devices = (devs?.rows ?? []) as Array<Record<string, unknown>>;
  const deliveries = (dels?.rows ?? []) as Array<Record<string, unknown>>;

  return (
    <AdminPageShell
      title="Mobile push diagnostics"
      subtitle="Inspect registered devices, recent push deliveries, and send a diagnostic message. Requires FCM_SERVICE_ACCOUNT_JSON secret."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send test push</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Device ID">
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="uuid from devices list"
              />
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Body">
              <Input value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Button onClick={() => testMut.mutate()} disabled={!deviceId || testMut.isPending}>
              Send test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {devices.length === 0 && (
              <p className="text-sm text-muted-foreground">No devices registered.</p>
            )}
            {devices.map((d) => (
              <div key={d.id as string} className="rounded-md border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{String(d.id).slice(0, 8)}…</span>
                  <Badge variant={d.revoked_at ? "destructive" : "secondary"}>
                    {String(d.platform)}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1">
                  seen: {d.last_seen_at ? new Date(d.last_seen_at as string).toLocaleString() : "—"}
                </div>
                {d.last_push_error ? (
                  <div className="text-red-600">err: {String(d.last_push_error)}</div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDeviceId(String(d.id))}
                  className="text-emerald-600 text-xs mt-1 hover:underline"
                >
                  Use for test
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent push deliveries (last 100)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto text-xs">
              {deliveries.length === 0 && (
                <p className="text-sm text-muted-foreground">No deliveries yet.</p>
              )}
              {deliveries.map((d) => (
                <div
                  key={d.id as string}
                  className="flex items-center justify-between border-b py-1.5"
                >
                  <span>{new Date(d.created_at as string).toLocaleString()}</span>
                  <Badge
                    variant={
                      d.status === "sent"
                        ? "secondary"
                        : d.status === "failed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {String(d.status)}
                  </Badge>
                  <span className="text-muted-foreground truncate max-w-[40%]">
                    {String(d.error ?? d.provider_message_id ?? "")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
