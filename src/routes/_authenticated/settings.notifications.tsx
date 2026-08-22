import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Bell, Loader2, Send } from "lucide-react";
import {
  getMyNotificationPrefs,
  updateMyNotificationPrefs,
  sendTestNotification,
  getRecentDeliveries,
} from "@/lib/notification-prefs.functions";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Settings · Notifications — Grain Hero" },
      { name: "description", content: "Settings · Notifications workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Settings · Notifications — Grain Hero" },
      { property: "og:description", content: "Settings · Notifications workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationSettingsPage,
});

type Channel = "email" | "sms" | "push";

const CATEGORY_LABEL: Record<string, string> = {
  billing: "Billing & subscription",
  plan: "Plan changes",
  order: "Hardware orders",
  install: "Installations",
  security: "Security alerts",
  system: "System notices",
  ops: "Operations & alerts",
};

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  push: { label: "Push", icon: Bell },
};

function statusTone(s: string) {
  if (s === "sent" || s === "delivered") return "border-emerald-200 text-emerald-700 bg-emerald-50";
  if (s === "failed") return "border-rose-200 text-rose-700 bg-rose-50";
  if (s === "skipped") return "border-slate-200 text-slate-500 bg-slate-50";
  return "border-amber-200 text-amber-700 bg-amber-50";
}

function NotificationSettingsPage() {
  const getFn = useServerFn(getMyNotificationPrefs);
  const updateFn = useServerFn(updateMyNotificationPrefs);
  const testFn = useServerFn(sendTestNotification);
  const deliveriesFn = useServerFn(getRecentDeliveries);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["notif-prefs"], queryFn: () => getFn() });
  const { data: deliveries = [] } = useQuery({ queryKey: ["notif-deliveries"], queryFn: () => deliveriesFn() });

  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(false);
  const [pushOn, setPushOn] = useState(true);
  const [phone, setPhone] = useState("");
  const [cats, setCats] = useState<Record<string, Partial<Record<Channel, boolean>>>>({});

  useEffect(() => {
    if (!data) return;
    setEmailOn(data.prefs.email_enabled);
    setSmsOn(data.prefs.sms_enabled);
    setPushOn(data.prefs.push_enabled);
    setPhone(data.profile?.phone_e164 ?? "");
    setCats((data.prefs.categories as Record<string, Partial<Record<Channel, boolean>>>) ?? {});
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          email_enabled: emailOn,
          sms_enabled: smsOn,
          push_enabled: pushOn,
          categories: cats,
          phone_e164: phone.trim() ? phone.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["notif-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Save failed"),
  });

  const test = useMutation({
    mutationFn: (channel: Channel) => testFn({ data: { channel } }),
    onSuccess: () => {
      toast.success("Test dispatched — check your inbox / SMS");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["notif-deliveries"] }), 1500);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed"),
  });

  function toggleCat(cat: string, ch: Channel, on: boolean) {
    setCats((prev) => ({ ...prev, [cat]: { ...(prev[cat] ?? {}), [ch]: on } }));
  }

  return (
    <AdminPageShell
      title="Notification preferences"
      subtitle="Control where alerts reach you and pick which topics matter"
      actions={
        <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save preferences
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Master toggle per channel. Security &amp; billing always email regardless of toggles.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(["email", "sms", "push"] as Channel[]).map((ch) => {
            const Icon = CHANNEL_META[ch].icon;
            const on = ch === "email" ? emailOn : ch === "sms" ? smsOn : pushOn;
            const setOn = ch === "email" ? setEmailOn : ch === "sms" ? setSmsOn : setPushOn;
            return (
              <div key={ch} className="rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-emerald-600" /> {CHANNEL_META[ch].label}
                  </div>
                  <Switch checked={on} onCheckedChange={setOn} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={test.isPending || !on || (ch === "sms" && !phone.trim())}
                  onClick={() => test.mutate(ch)}
                >
                  <Send className="h-3.5 w-3.5 mr-2" /> Send test
                </Button>
                {ch === "push" && (
                  <p className="text-xs text-muted-foreground">Web push is coming soon — toggle is stored for later use.</p>
                )}
                {ch === "sms" && (
                  <p className="text-xs text-muted-foreground">Requires phone number below and a Twilio connection.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone number for SMS</CardTitle>
          <CardDescription>Use E.164 format, e.g. +14155551234</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-2">
          <Label htmlFor="phone">Mobile</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14155551234"
            inputMode="tel"
            maxLength={16}
          />
        </CardContent>
      </Card>

      <AdminDataCard title="Category overrides" description="Fine-tune per topic. Leave a toggle off to mute that combination.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 dark:bg-slate-900/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                {(["email", "sms", "push"] as Channel[]).map((ch) => (
                  <th key={ch} className="text-center px-4 py-2 font-medium">{CHANNEL_META[ch].label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.categories ?? []).map((cat) => (
                <tr key={cat}>
                  <td className="px-4 py-2 font-medium text-foreground dark:text-slate-200">{CATEGORY_LABEL[cat] ?? cat}</td>
                  {(["email", "sms", "push"] as Channel[]).map((ch) => {
                    const master = ch === "email" ? emailOn : ch === "sms" ? smsOn : pushOn;
                    const override = cats[cat]?.[ch];
                    const effective = override === undefined ? master : override;
                    return (
                      <td key={ch} className="text-center px-4 py-2">
                        <Switch
                          checked={effective}
                          disabled={!master}
                          onCheckedChange={(v) => toggleCat(cat, ch, v)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataCard>

      <AdminDataCard title="Recent deliveries" description="Latest 50 attempts across channels">
        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No deliveries yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {deliveries.map((d) => (
              <li key={d.id} className="px-4 py-2 flex items-center gap-3">
                <span className="w-16 text-xs uppercase text-muted-foreground">{d.channel}</span>
                <span className="text-muted-foreground text-xs w-32">{d.provider ?? "—"}</span>
                <Badge variant="outline" className={statusTone(d.status)}>{d.status}</Badge>
                <span className="flex-1 truncate text-muted-foreground text-xs">{d.error ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminDataCard>
    </AdminPageShell>
  );
}